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
|         - Normal Summon Contention Engine: Maximizes P(NS=1) sweet spot & caps clashes <= 20%.  |
|         - Brick Dilution & Rebalancing: Expands deck size & scales [STARTER-SS] to dilute bricks.|
|         - Format Auto-Detection & Gating: Distinguishes Advanced vs Genesys; bypasses budget    |
|           audits if Link/Pendulum monsters or >100 points are detected.                         |
|         - Turn 1 Combo Routing & Tier-1 Hand Trap Resiliency Matrix (Ash, Droll, Nibiru, etc.).  |
|         - Turn 2 Going-Second Quality Hand Analysis under the Asymmetric Hand Size Axiom.       |
|         - Official Konami (KDE) 183-Field Decklist PDF Engine (bidirectional filling & audits).|
|         - Archetype Profiles Library (`references/archetypes/` with Revol-Bots profile).        |
|         - Zero-Google Grounding: Mandates local PSCT & `ygo-judge` rulings arbitration.         |
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
|      • ADR-005: Konami Official Tournament Decklist (KDE) Engine.                               |
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
  * `get_top_archetypes`: Macro competitive representation shares and tournament top-cut quantities (`timeframe: '1-month'` recommended).
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
  npm run test:kde        # Executes Konami KDE PDF AcroForm filling and auditing tests
  npm run test:judge      # Executes Dueling Book log dispute parser tests
  npm run test:all        # Runs polyglot test suite across Node and Python engines
  npm run lint:skills     # Validates YAML frontmatter, markdown links, and schemas in skills/
  npm run sync:all        # Runs complete bulk card and tournament meta synchronization
  ```

---

### 2. `skills/` (Specialized Agent Capabilities)

#### A. `ygo-deck-architect` (`skills/ygo-deck-architect/`)
A mathematical deck engineering skill enforcing competitive tournament reliability.
* **>90% Consistency Standard:** Mandates running sufficient primary starters to guarantee $P(X \ge 1) > 90\%$ in a 5-card opening hand (e.g. $\ge 14$ starters in 40 cards, $\ge 22$ in 60 cards).
* **Normal Summon Contention Engine:** Evaluates $P(NS = 1)$ (optimal tempo sweet spot, maximized at 4–6 NS starters) against $P(NS \ge 2)$ (conflicting normal summons stranded in hand). Triggers a contention warning if $P(NS \ge 2) > 20\%$.
* **Brick Dilution & Rebalancing Blueprint:** If an engine requires irreducible hard bricks (`[HARD-BRICK]` / Garnets), calculates expanded deck sizes ($40 \rightarrow 42, 45, 50, 60$) to dilute brick risk, rebalancing total starters, optimal normal summons, and hand traps. Enforces that all added starters must strictly be `[STARTER-SS]`.
* **Format Auto-Detection & Gating:** Distinguishes between Advanced and Genesys formats. Automatically detects disqualifiers (any Link or Pendulum card, or total points exceeding the 100-point cap) and bypasses the Genesys budget table to evaluate strictly as Advanced.
* **Turn 1 Combo Routing & Resiliency Matrix:** Maps primary uninterrupted combo lines, fallback branches, and evaluates vulnerability severity (`Fatal`, `High`, `Med`, `Low`) against Tier-1 disruptions (*Ash Blossom, Droll & Lock Bird, Nibiru, Impermanence, Dimension Shifter*).
* **Turn 2 Going-Second Quality Hands:** Evaluates joint probabilities under the Asymmetric Hand Size Axiom: Turn 0 Hand Trap access ($n=5$) combined with Turn 2 engine starter and board breaker/extender access ($n=6$).
* **Official Konami (KDE) Tournament Decklist Engine:** Populates the official 183-field AcroForm PDF (`KDE_DeckList.pdf`), performs double-entry discrepancy audits ($\Delta = \sum \text{Count} - \text{Total}$) against Section IX penalties, and handles bidirectional `.ydk` $\leftrightarrow$ PDF conversion.
* **Archetype Knowledge Base:** Dedicated tactical profiles in `references/archetypes/` (including *Revol-Bots / R.B.* in `revol_bots.md` and contributor schema in `_template.md`).
* **Zero-Google Grounding:** Prohibits web searching for rulings or card text. Grounds all PSCT analysis in local MCP data and internal `ygo-judge` arbitration.
* **Reference Library:**
  * `hypergeometric_matrices.md`: Pre-computed tables for 40, 42, 45, 50, 60-card decks, Normal Summon contention, and Brick Dilution rebalancing.
  * `card_taxonomy_guide.md`: Functional taxonomy tags (`[STARTER-NS]`, `[STARTER-SS]`, `[STARTER-1.5]`, `[EXTENDER]`, `[TECH-HT]`, `[TECH-BREAKER]`, `[HARD-BRICK]`, `[ENGINE-BRICK]`).
  * `asymmetric_hand_axiom.md`: Mathematical proof of the $n=5$ (Turn 0) vs $n=6$ (Turn 2) going-second paradigm.
  * `graph_generation_engine.md`: ASCII and Mermaid probability curve templates with NS contention and quality hand meters.
  * `kde_decklist_guide.md`: Official Konami 183-field AcroForm PDF standard, slot capacity limits, and discrepancy auditing.
  * `KDE_DeckList.pdf`: Official empty Konami Digital Entertainment Decklist AcroForm PDF template.
  * `genesys_format_architecture.md`: Genesys 100-point budget, mechanical bans (0 Links / 0 Pendulums), and 0-point engine optimization.
  * `ydk_handling_guide.md`: Specifications for `.ydk` syntax, passcode resolution, pile deck clustering, and setup-shedding sideboards.
  * `archetypes/`: Dedicated archetype profiles catalog (`revol_bots.md`, `_template.md`).

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
* [ADR-005: Konami Official Tournament Decklist (KDE) Engine](docs/decisions/ADR-005-kde-decklist-support.md): AcroForm PDF population, arithmetic audits, and .ydk translation.

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
* **40 Cards:** Requires **$\ge 14$ Starters** (Exact $90.0\%$).
* **60 Cards:** Requires **$\ge 22$ Starters** (Exact $90.8\%$).

### 2. Normal Summon Optimization & Contention Capping
Because players are mechanically restricted to **one Normal Summon per turn**:
* **Sweet Spot ($K_{NS} = 4\text{--}6$ in 40 cards):** Maximizes $P(NS = 1)$ between **35.8% and 42.3%** while keeping hand contention $P(NS \ge 2)$ safely below the **20% danger ceiling** (6.9% to 15.4%).
* **Contention Warning ($K_{NS} \ge 7$):** Running 8–9 normal summons means 25%–32% of opening hands hold clashing, dead normal summons. Additional starters must strictly be `[STARTER-SS]`.

### 3. Brick Dilution & The `[STARTER-SS]` Rebalancing Mandate
When hard bricks (`[HARD-BRICK]` / Garnets) cannot be cut from an engine:
* Expanding deck size ($40 \rightarrow 45, 50, 60$) dilutes brick draw risk (e.g. 2 Garnets drop from 23.7% in 40 cards to 21.2% in 45 cards and 16.1% in 60 cards).
* **The Golden Rebalancing Rule:** All additional starters added to rebalance consistency must be Special Summon starters (`[STARTER-SS]`) or free bodies—never extra normal summons.

### 4. The Asymmetric Hand Size Axiom
* **Turn 0 Hand Traps ($n = 5$):** Must interrupt the opponent during Turn 1 before their end-board is established. A hand trap drawn as the 6th card on Turn 2 is typically dead against built negations. Evaluated using $n=5$.
* **Turn 2 Board Breakers ($n = 6$):** Board breakers (*Dark Ruler No More*, *Super Polymerization*, *Evenly Matched*) and engine cards are utilized after drawing for turn. Evaluated using $n=6$.

### 5. Problem-Solving Card Text (PSCT) Adjudication & Zero-Google Policy
Adjudication follows strict semantic parsing of colons and semicolons:
$$\text{[Activation Condition]} : \text{[Cost / Targeting / Action at Activation]} ; \text{[Effect at Resolution]}$$
Conjunctions (`then`, `and if you do`, `also`, `and`) govern simultaneous timing resolution and determine whether trigger conditions like `"When... you can"` miss timing. Internet forum searches are strictly prohibited in favor of authoritative local PSCT and the internal `ygo-judge` engine.

---

## License

* **MCP Server & Skills:** MIT License © 2026 Obsidian Team
