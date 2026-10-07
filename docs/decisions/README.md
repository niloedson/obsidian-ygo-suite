# Architecture Decision Records (ADR) & Design Provenance Ledger

**Project:** `obsidian-ygo-suite`  
**Team:** Obsidian Team  
**Status:** Active  

This directory preserves the **Architecture Decision Records (ADRs)** and design provenance artifacts mapping how the **2 Agent Skills** and **1 MCP Server** were conceived, hardened, and transformed into production software.

---

## Decision Traceability Map

```text
+-------------------------------------------------------------------------------------------------+
|                                    DECISION TRACEABILITY MAP                                    |
+-------------------------------------------------------------------------------------------------+
|                                                                                                 |
|   UPSTREAM REQUIREMENTS                 ARCHITECTURE DECISION (ADR)        OPERATIONAL ASSET    |
|                                                                                                 |
|   +-----------------------+             +-----------------------+          +----------------+   |
|   | YGOPRODeck Terms      | ----------> | ADR-000: Upstream API | -------> | Isolated Sync  |   |
|   | & Rate Limit Policies |             | Constraints & Safety  |          | CLI Runner     |   |
|   +-----------------------+             +-----------------------+          +----------------+   |
|                                                     |                                           |
|   +-----------------------+             +-----------------------+          +----------------+   |
|   | Sub-5ms Queries &     | ----------> | ADR-001: Air-Gapped   | -------> | mcp-servers/   |   |
|   | Zero-Network Runtime  |             | Local-First SQLite    |          | ygoprodeck/    |   |
|   +-----------------------+             +-----------------------+          +----------------+   |
|                                                     |                                           |
|   +-----------------------+             +-----------------------+          +----------------+   |
|   | Competitive Deck Math | ----------> | ADR-002: Hypergeom.   | -------> | skills/ygo-    |   |
|   | & Garnet Modeling     |             | Consistency & Axioms  |          | deck-architect |   |
|   +-----------------------+             +-----------------------+          +----------------+   |
|                                                     |                                           |
|   +-----------------------+             +-----------------------+          +----------------+   |
|   | PSCT Adjudication &   | ----------> | ADR-003: 4-Step PSCT  | -------> | skills/ygo-    |   |
|   | Tournament Arbitration|             | Trace & Discrepancies |          | judge/         |   |
|   +-----------------------+             +-----------------------+          +----------------+   |
|                                                     |                                           |
|   +-----------------------+             +-----------------------+          +----------------+   |
|   | Monorepo Governance   | ----------> | ADR-004: Monorepo     | -------> | Root Workspace |   |
|   | & Obsidian Branding   |             | Architecture & Layout |          | & CI/CD Config |   |
|   +-----------------------+             +-----------------------+          +----------------+   |
|                                                                                                 |
+-------------------------------------------------------------------------------------------------+
```

---

## Index of Records

| Record | Title | Scope / Impact | Status |
| :--- | :--- | :--- | :---: |
| [ADR-000](./ADR-000-upstream-api-constraints.md) | **Upstream API Constraints & Fair-Use Safety** | Documents external rate limits (20 req/s, 1-hr ban) and mandates local-only runtime storage. | Accepted |
| [ADR-001](./ADR-001-hardened-mcp-server.md) | **Air-Gapped, Local-First MCP Server Architecture** | Eliminates HTTP calls from agent queries; adopts SQLite + WAL + FTS5, and circuit breakers. | Accepted |
| [ADR-002](./ADR-002-deck-architect-skill.md) | **Competitive Deck Architecture & Hypergeometric Engine** | Enforces $>90\%$ opening consistency, the Asymmetric Hand Size Axiom ($n=5$ vs $n=6$), and Genesys points. | Accepted |
| [ADR-003](./ADR-003-judge-skill.md) | **Deterministic PSCT Adjudication & Rulings Engine** | Mandates 4-step syntactic PSCT trace, backward chain resolution, TCG vs OCG matrix, and log parsing. | Accepted |
| [ADR-004](./ADR-004-root-monorepo-structure.md) | **Monorepo Architecture, Git Hygiene & Obsidian Branding** | Unifies skills and MCP server in a single repo, prevents 100MB DB bloat in Git, and brands for Obsidian. | Accepted |
