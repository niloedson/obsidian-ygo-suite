# ADR-001: Air-Gapped, Local-First MCP Server Architecture

* **Status:** Accepted  
* **Date:** 2026-10-06  
* **Context:** Local Data Ingestion & Deterministic Tool Delivery  
* **Author / Team:** Obsidian Team  
* **Affected Assets:** `mcp-servers/ygoprodeck`  

---

## 1. Context & Problem Statement

AI coding and analysis agents require authoritative card details, Problem-Solving Card Text (PSCT), format banlists, and live meta statistics. Relying on remote HTTP queries during agent runtime introduces latency, network fragility, and fair-use violations against third-party endpoints. 

Furthermore, naive full-text card searches without proper indexing lead to high token payloads, slow response times, and context window bloat.

---

## 2. Decision & SCAMPER Analysis

To solve these constraints, the Obsidian Team designed and deployed a hardened, air-gapped local MCP server (`mcp-servers/ygoprodeck`) using the SCAMPER framework:

| Dimension | Creative Prompt | Architecture Implementation |
| :--- | :--- | :--- |
| **S - Substitute** | Substitute live error retries and dynamic network fetches | **Air-Gapped MCP Runtime:** Replace dynamic API calls with 100% offline local SQLite execution using native `node:sqlite`. Use conditional HTTP requests (`If-None-Match` / ETag) during sync. |
| **C - Combine** | Combine setup steps and queries | **Denormalized Views & FTS5:** Combine cards, banlists, and FTS tables into a pre-indexed SQL view (`v_agent_card_search`) to eliminate runtime joins. |
| **A - Adapt** | Adapt to upstream server caching and OS quirks | **Windows SQLite Concurrency:** Configure SQLite with `PRAGMA journal_mode = WAL;`, `PRAGMA busy_timeout = 5000;`, and read-only connection pooling to prevent file locking on Windows. |
| **M - Modify / Magnify / Minify** | Magnify rate-limit protection; minify token payload | **Token-Bucket Throttling & Output Minification:** Cap sync client to 1 req/5s. Strip non-essential fields (image URLs, duplicate card set printings) from `search_cards` responses. |
| **P - Put to Another Use** | Repurpose the local database beyond MCP tools | **Dual-Purpose CLI & Analytics:** Expose database tools to MCP clients while also providing direct CLI synchronization scripts (`npm run sync:all`). |
| **E - Eliminate** | Eliminate points of failure and fair-use violations | **Eliminate Live Market Price Calls:** Real-time pricing is excluded from v1 to eliminate volatile network traffic. |
| **R - Reverse / Rearrange** | Rearrange initialization lifecycle | **Fail-Fast Boot:** Server aborts with a clear setup instruction if `cards.db` does not exist, guaranteeing zero sudden network attempts on startup. |

---

## 3. System Architecture Diagram

```text
                                [ ISOLATED SYNC CLI ]
                                          |
                                          | Conditional GET (ETag)
                                          | Token-Bucket Throttled (< 0.2 req/s)
                                          v
                               +---------------------+
                               |   YGOPRODeck API    |
                               +---------------------+
                                          |
                                          | ~20MB Bulk JSON (Once / month)
                                          v
                               +---------------------+
                               |  Atomic Ingestion   |
                               | (BEGIN IMMEDIATE)   |
                               +---------------------+
                                          |
                                          | Writes to disk
                                          v
+---------------------------------------------------------------------------------+
| LOCAL ENVIRONMENT                                                               |
|                                                                                 |
|   +-------------------------------------------------------------------------+   |
|   |                       data/cards.db (SQLite + WAL)                      |   |
|   |   - cards (Passcode PK, Name, Type, Stats, PSCT desc)                   |   |
|   |   - card_banlists (tcg, ocg, goat, edison status)                       |   |
|   |   - cards_fts (FTS5 virtual table for full-text search)                 |   |
|   |   - tournaments & tournament_decklists                                  |   |
|   +-------------------------------------------------------------------------+   |
|                                     ^                                           |
|                                     | Read-Only Queries (< 5ms)                 |
|                                     | Zero Network Capabilities                 |
|   +---------------------------------+---------------------------------------+   |
|   |                       ygoprodeck-mcp (stdio)                            |   |
|   |                                                                         |   |
|   |   Tools:                                                                |   |
|   |     • search_cards(filters, query, limit <= 25)                         |   |
|   |     • get_card_details(name_or_id)                                      |   |
|   |     • check_banlist(format, card_names)                                 |   |
|   |     • get_genesys_points(card_names)                                    |   |
|   |     • get_top_tech_cards(archetype, top_n, since_date)                  |   |
|   |     • get_tournament_decklists(event_id)                                |   |
|   |     • evaluate_tech_counters(deck_list, target_archetypes)              |   |
|   |     • get_database_info()                                               |   |
|   +-------------------------------------------------------------------------+   |
|                                     ^                                           |
|                                     | stdio (JSON-RPC 2.0)                      |
|                                     v                                           |
|   +-------------------------------------------------------------------------+   |
|   |        MCP Client (Claude Desktop / Cursor / Gemini CLI)                |   |
|   +-------------------------------------------------------------------------+   |
+---------------------------------------------------------------------------------+
```

---

## 4. Consequences & Downstream Artifacts

* **Performance:** Card queries and full-text searches execute consistently in $<5\text{ms}$.
* **Data Integrity:** Database hydration processes 13,000+ cards within an atomic `BEGIN IMMEDIATE ... COMMIT` transaction in $<1.5\text{s}$.
* **Production Implementation:** Packaged under `mcp-servers/ygoprodeck/`.
