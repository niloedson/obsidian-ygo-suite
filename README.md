# Obsidian Yu-Gi-Oh! AI Suite (`obsidian-ygo-suite`)

An end-to-end, high-performance competitive Yu-Gi-Oh! ecosystem developed by the **Obsidian Team**, unifying **deterministic card and tournament data**, **mathematical probability engineering**, and **tournament policy arbitration**.

```text
+-------------------------------------------------------------------------------------------------+
|                                    WORKSPACE ARCHITECTURE MAP                                    |
+-------------------------------------------------------------------------------------------------+
|                                                                                                 |
|   1. AGENT REASONING LAYER (`skills/`)                                                          |
|      • `ygo-deck-architect`:                                                                    |
|         - Enforces >90% Opening Consistency via Hypergeometric Combinatorics.                   |
|         - The Asymmetric Hand Size Axiom (Turn 0 n=5 Hand Traps vs Turn 2 n=6 Breakers).        |
|         - Multi-Engine "Pile Deck" Clustering (protects secondary engines from tech confusion).|
|         - Full .YDK Lifecycle: Ingestion, parsing, and verbatim simulator exports.              |
|         - Dual Format Support: Advanced vs. Genesys 100-Point Budget Audits.                    |
|      • `ygo-judge`:                                                                             |
|         - Head Tournament Judge rulings arbitrator grounded in YGOrganization PSCT rules.       |
|         - 4-Step Adjudication Protocol (Location, Timing When vs If, Cost/Target, Conjunction). |
|         - Regional Catalog: TCG vs. OCG vs. Master Duel discrepancies.                          |
|         - Native Dueling Book Match Log Parsing & Dispute Arbitration (`duel_log_example.txt`). |
|                                                                                                 |
|   2. DETERMINISTIC DATA LAYER (`mcp-servers/ygoprodeck/`)                                       |
|      • Local-First SQLite + WAL architecture with zero outbound network calls during runtime.   |
|      • Circuit Breaker Sync (70-minute lockdown on HTTP 429/403) adhering to YGOPRODeck terms.  |
|      • Full-Text Search (FTS5) over 13,000+ cards and exact Problem-Solving Card Text (PSCT).   |
|      • Top-Cut Tournament Decks Ingestion (Main, Extra, Side, and raw `.ydk` simulator storage).|
|      • Empirical Tech Card Frequency Tracking (`get_top_tech_cards`) with `since_date` filters. |
|      • Genesys Point System Integration: 760 pointed cards indexed & `get_genesys_points`.      |
|                                                                                                 |
|   3. ARCHITECTURE DECISION RECORDS & PROVENANCE (`docs/decisions/`)                             |
|      • ADR-000: Upstream API Constraints & Fair-Use Safety Guarantees.                          |
|      • ADR-001: Air-Gapped, Local-First MCP Server Architecture.                                |
|      • ADR-002: Competitive Deck Architecture & Hypergeometric Probability Engine.              |
|      • ADR-003: Deterministic PSCT Adjudication & Rulings Engine.                               |
|      • ADR-004: Monorepo Architecture, Git Bloat Protection & Obsidian Branding.                 |
+-------------------------------------------------------------------------------------------------+
```

---

## Workspace Directory Breakdown

### 1. `mcp-servers/ygoprodeck/` (Local-First MCP Knowledge Server)
Provides AI agents (Claude Desktop, Cursor, Gemini CLI) with zero-latency (<5ms), authoritative card mechanics, format banlists, and live tournament top cuts.

* **Tools Exposed:**
  * `search_cards`: Multi-attribute and FTS5 full-text effect searches.
  * `get_card_details`: Unabridged PSCT text, full stats, banlist statuses, and `genesys_points`.
  * `check_banlist`: Format legality verification (`tcg`, `ocg`, `masterduel`, `goat`, `edison`, `genesys`).
  * `get_genesys_points`: Tallies point costs against the 100-point budget and flags illegal Link/Pendulum cards.
  * `get_top_archetypes`: Macro competitive representation shares and tournament top-cut quantities.
  * `list_recent_tournaments`: Premier and Regional tournament events with dates, winners, and formats.
  * `get_tournament_breakdown`: Event metadata and direct YGOPRODeck URL.
  * `get_top_tech_cards`: Calculates empirical tech card adoption rates (Main vs. Side Deck) across top-cut decks with multi-engine pile-deck filtering and `since_date` filtering.
  * `get_tournament_decklists`: Retrieves full top-cut deck profiles with card names, types, placement, and raw `.ydk` simulator strings.
  * `evaluate_tech_counters`: Evaluates dominant meta threats and provides empirical side-deck counters and strategic recommendations.
  * `get_database_info`: Database staleness auditor and last-synced timestamp.

* **Top-Level Monorepo Commands:**
  ```bash
  npm install             # Installs all workspace dependencies
  npm run build           # Compiles TypeScript across all MCP workspaces
  npm test                # Executes full integration test suite
  npm run lint:skills     # Validates YAML frontmatter and references in skills/
  npm run sync:all        # Runs complete bulk card and tournament meta synchronization
  ```

---

### 2. `skills/` (Specialized Agent Capabilities)

#### A. `ygo-deck-architect` (`skills/ygo-deck-architect/`)
A mathematical deck engineering skill enforcing competitive tournament reliability.
* **>90% Consistency Standard:** Mandates that 40-card decks run $\ge 14$ primary starters to ensure $P(X \ge 1) > 90\%$ in a 5-card opening hand.
* **Asymmetric Hand Size Axiom:** Strictly evaluates Turn 0 Hand Traps at $n=5$ (opening hand) and Turn 2 Board Breakers at $n=6$ (draw phase).
* **Multi-Engine Pile Deck Clustering:** Automatically clusters Main Deck archetypes with $\ge 3$ cards as *Engine Packages*, preventing secondary splash engines (*Bystials*, *Horus*, *Azamina*) from polluting generic tech card statistics.
* **Full .YDK Lifecycle:** Ingests raw `.ydk` text, resolves passcodes via the MCP server, and exports copy-pasteable standard `.ydk` simulator code blocks.
* **Dual Format Support:** Full Advanced format banlist compliance + Genesys format 100-point budget auditing.
* **Reference Library:**
  * `hypergeometric_matrices.md`: Lookup tables for 40, 42, 45, 50, and 60-card decks.
  * `asymmetric_hand_axiom.md`: Mathematical proof of the $n=5$ vs $n=6$ going-second paradigm.
  * `card_taxonomy_guide.md`: Strict functional taxonomy tags (`[STARTER-NS]`, `[STARTER-SS]`, `[EXTENDER]`, `[TECH-HT]`, `[TECH-BREAKER]`, `[BRICK]`).
  * `ydk_handling_guide.md`: Specification for .ydk syntax, passcode resolution, and simulator exports.
  * `genesys_format_architecture.md`: Genesys 100-point budget, mechanical bans (0 Links / 0 Pendulums), and 0-point engine optimization.
  * `graph_generation_engine.md`: ASCII and Mermaid probability curve templates.

#### B. `ygo-judge` (`skills/ygo-judge/`)
A tournament-grade rulings arbitrator grounded in YGOrganization's *Demystifying Rulings*.
* **4-Step Adjudication Protocol:** (1) Location Verification $\rightarrow$ (2) Timing/Trigger Check (`When` vs `If`) $\rightarrow$ (3) Cost/Target Validation $\rightarrow$ (4) Backward Chain Resolution Trace.
* **Dueling Book Match Log Adjudication:** Directly parses raw Dueling Book duel transcripts (`duel_log_example.txt`), maps zone coordinates (`M1..M5`, `S1..S5`, `EMZ`, `H`, `GY`), detects illegal activations (e.g. *Droll & Lock Bird* on placed cards), and prescribes official tournament policy state-repair rewinds.
* **Reference Library:**
  * `psct_syntax.md`: Conjunction truth table (`then`, `and if you do`, `also`, `and`), colons, and semicolons.
  * `missing_timing.md`: "When... you can" vs "If... you can" decision trees.
  * `tcg_ocg_differences.md`: Complete catalog of regional rule splits (TCG vs. OCG vs. Master Duel).
  * `damage_step_substeps.md`: Permitted activations across the 5 Damage Step substeps.
  * `segoc_priority.md`: Simultaneous trigger order and chain-blocking priority trees.
  * `duelingbook_log_parsing.md`: Dueling Book action primitives, zone notation, and dispute arbitration procedures.
  * `duel_log_example.txt`: 734-line verbatim Dueling Book match transcript used as the golden benchmark.

---

### 3. `docs/decisions/` (Architecture Decision Records Ledger)
Preserves the complete design history and technical rationale behind the suite:
* [README.md](docs/decisions/README.md): Master decision traceability matrix.
* [ADR-000: Upstream API Constraints & Safety](docs/decisions/ADR-000-upstream-api-constraints.md): Rate limits and offline mandates.
* [ADR-001: Air-Gapped MCP Architecture](docs/decisions/ADR-001-hardened-mcp-server.md): Local SQLite, FTS5, and circuit breakers.
* [ADR-002: Deck Architect Skill Design](docs/decisions/ADR-002-deck-architect-skill.md): Hypergeometric formulas and asymmetric hand axioms.
* [ADR-003: Judge Skill Design](docs/decisions/ADR-003-judge-skill.md): 4-step PSCT adjudication and regional rule splits.
* [ADR-004: Monorepo Architecture](docs/decisions/ADR-004-root-monorepo-structure.md): Monorepo governance and Git bloat prevention.

---

## Client Integration Guide (Connecting to MCP)

### Claude Desktop / Cursor (`claude_desktop_config.json`)
```json
{
  "mcpServers": {
    "ygoprodeck": {
      "command": "node",
      "args": [
        "--experimental-sqlite",
        "/absolute/path/to/obsidian-ygo-suite/mcp-servers/ygoprodeck/dist/server.js"
      ]
    }
  }
}
```

---

## Core Competitive Principles Codified in this Repo

### 1. The >90% Opening Consistency Threshold
In Tier-1 competitive play, an 85% starter consistency rate means dropping ~2 games purely due to unplayable hands over an 8-round Swiss tournament. To guarantee championship-level reliability, decks must target:
$$P(X \ge 1) = 1 - \frac{\binom{N - K}{5}}{\binom{N}{5}} > 90\%$$
* **40 Cards:** Requires **$\ge 14$ Starters** (Exact $90.4\%$).
* **60 Cards:** Requires **$\ge 21$ Starters** (Exact $90.1\%$).

### 2. The Asymmetric Hand Size Axiom
* **Turn 0 Hand Traps ($n = 5$):** Must interrupt the opponent during Turn 1 before their end-board is established. A hand trap drawn as the 6th card on Turn 2 is typically dead against built negations. Evaluated using $n=5$.
* **Turn 2 Board Breakers ($n = 6$):** Board breakers (*Dark Ruler No More*, *Super Polymerization*, *Evenly Matched*) and engine cards are utilized after drawing for turn. Evaluated using $n=6$.

### 3. Problem-Solving Card Text (PSCT) Adjudication
Adjudication follows strict semantic parsing of colons and semicolons:
$$\text{[Activation Condition]} : \text{[Cost / Targeting / Action at Activation]} ; \text{[Effect at Resolution]}$$
Conjunctions (`then`, `and if you do`, `also`, `and`) govern simultaneous timing resolution and determine whether trigger conditions like `"When... you can"` miss timing.

---

## License

* **MCP Server & Skills:** MIT License © 2026 Obsidian Team
