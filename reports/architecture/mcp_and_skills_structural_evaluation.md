# Architecture Evaluation & Structural Revision: MCP Servers & Agent Skills

**Date:** October 8, 2026  
**Project:** Obsidian Yu-Gi-Oh! AI Suite (`@obsidian/ygo-suite`)  
**Scope:** `mcp-servers/ygoprodeck` & `skills/` (`ygo-deck-architect`, `ygo-judge`)

---

## Executive Summary

The **Obsidian Yu-Gi-Oh! AI Suite** is a monorepo architecture combining an **air-gapped, local-first Model Context Protocol (MCP) data server** (`ygoprodeck-mcp`) with two **domain-specialized Agent Skills** (`ygo-deck-architect` and `ygo-judge`).

The design prioritizes:
1. **Sub-millisecond Deterministic Latency:** All runtime card lookups, PSCT queries, and tournament analytics run entirely against a local SQLite database (`cards.db`) using native `node:sqlite`, with zero outbound HTTP requests during MCP server execution.
2. **Context Window Protection (Token-Lean Payloads):** Search outputs deliver compact card summaries; full card texts are requested on-demand.
3. **Mathematical & Rule-Strict Adjudication:** Decisions are governed by exact hypergeometric combinatorics ($P(X \ge 1) > 90\%$), the Asymmetric Hand Size Axiom ($n=5$ vs $n=6$), Problem-Solving Card Text (PSCT) syntax, and official Konami Digital Entertainment (KDE) Tournament Policy.

---

## Directory & Monorepo Structure

```text
obsidian-ygo-suite/
├── .github/workflows/                 # CI/CD Workflows
│   ├── test-mcp.yml                   # Automated MCP server build & tests
│   └── validate-skills.yml            # Skill link & frontmatter validation
├── docs/decisions/                    # Architectural Decision Records (ADR-000 to ADR-005)
├── mcp-servers/
│   └── ygoprodeck/                    # ygoprodeck-mcp (Local-First MCP Server)
│       ├── data/                      # Local SQLite storage (cards.db, rate-limit lock)
│       ├── src/
│       │   ├── cli/
│       │   │   ├── sync.ts            # Bulk card & banlist crawler with circuit breaker
│       │   │   └── syncTournaments.ts # Tournament meta crawler & top-cut deck scraper
│       │   ├── db/
│       │   │   ├── connection.ts      # node:sqlite connection manager & FTS5 check
│       │   │   ├── queries.ts         # High-performance SQL queries & pile-deck filters
│       │   │   └── schema.sql         # DDL: cards, FTS5 virtual table, tournaments, decks
│       │   ├── server.ts              # McpServer registration (11 Tools, 3 Resources)
│       │   └── types.ts               # Zod validation schemas & TypeScript types
│       └── test/
│           └── verify-tech-tools.js   # Integration tests for HTML parsing & tech queries
├── skills/
│   ├── ygo-deck-architect/            # Competitive Deck Construction & Probability Engine
│   │   ├── SKILL.md                   # Core skill mandates, prompts, and scorecards
│   │   ├── scripts/
│   │   │   ├── calculate_odds.py      # Zero-dependency hypergeometric math engine
│   │   │   └── kde_decklist.py        # Official KDE PDF form filler & discrepancy auditor
│   │   └── references/                # Deep technical guides (Axiom, Taxonomy, Genesys, KDE)
│   └── ygo-judge/                     # Tournament Rulings Arbitrator & PSCT Parser
│       ├── SKILL.md                   # Adjudication protocol, DB log parser, templates
│       └── references/                # Rulings guides (Damage Step, Timing, SEGOC, DB logs)
├── scripts/
│   └── validate-skills.mjs            # Monorepo skill validator & broken link linter
└── reports/                           # Deck audit reports, PDF exports, system evaluations
```

---

## Component Deep Dive: `mcp-servers/ygoprodeck`

### 1. Architectural Mandates
* **Zero Outbound HTTP at Runtime:** The MCP server process (`dist/server.js`) contains no networking libraries. All queries execute against `cards.db` in read-only mode (`readonly: true`).
* **Circuit Breaker Rate Limiting:** Offline synchronizers (`sync.ts` and `syncTournaments.ts`) monitor upstream HTTP 429/403 responses. If triggered, a 70-minute lockfile (`.rate_limit_lock`) pauses requests to protect duelist IPs from blacklisting. ETag caching minimizes bandwidth.
* **Full-Text Search (FTS5):** SQLite FTS5 with Unicode diacritics removal and synchronization triggers index card names, effect descriptions, and archetypes.

### 2. Exposed MCP Tools
| Category | Tool | Parameters | Functionality |
| :--- | :--- | :--- | :--- |
| **Card Database** | `search_cards` | `query`, `name`, `type`, `attribute`, `race`, `archetype`, `level`, `atk_min`, `atk_max`, `limit` | Token-compact card list using FTS5 effect text search and parameter filters. |
| **Card Database** | `get_card_details` | `name_or_id` | Verbatim PSCT, stats, all format legalities (TCG, OCG, MD, Goat, Edison), and Genesys points. |
| **Legality** | `check_banlist` | `format`, `cards` | Batch legality checks returning Forbidden, Limited, Semi-Limited, Unlimited, or Genesys points. |
| **Legality** | `get_genesys_points` | `cards` | Evaluates mechanical legality (0 Link/0 Pendulum) and 100-point budget compliance. |
| **System** | `get_database_info` | None | DB path, total indexed cards, last sync timestamp, and feature flags. |
| **Meta Engine** | `get_top_archetypes` | `format`, `timeframe`, `limit` | Live tournament representation, top-cut counts, and meta shares (TCG, OCG, Master Duel). |
| **Meta Engine** | `list_recent_tournaments`| `format`, `country`, `limit` | Concluded Premier/Regional tournaments (YCS, WCQ) with winners, dates, and player counts. |
| **Meta Engine** | `get_tournament_breakdown`| `slug_or_id` | Event metadata and direct link to tournament breakdown. |
| **Meta Engine** | `get_top_tech_cards` | `format`, `archetype`, `section`, `since_date`, `limit` | Tech card adoption rates (%) and average copy counts. Filters out splash engines in pile decks. |
| **Meta Engine** | `get_tournament_decklists`| `tournament_id_or_slug`, `archetype`, `placement`, `include_ydk`, `limit` | Complete tournament deck profiles with card rosters and valid `.ydk` simulator strings. |
| **Meta Engine** | `evaluate_tech_counters` | `format`, `target_archetype`, `since_date`, `limit` | Analyses meta deck choke points (GY, search, summon limits) and recommends empirical side counters. |

### 3. Exposed MCP Resources
* `ygo://database/info`: System database metadata and sync timestamp.
* `ygo://cards/{id}`: Direct URI template for card retrieval by 8-digit passcode.
* `ygo://meta/{format}`: Direct URI template for top meta archetype snapshot.

---

## Component Deep Dive: `skills/`

### 1. `ygo-deck-architect` (Deck Construction & Probability Engine)

* **Consistency Target:** Enforces $>90\%$ probability of opening at least 1 primary starter ($P(X \ge 1) > 90\%$) in a 5-card opening hand (e.g., 14 starters in 40 cards, 22 in 60 cards).
* **Asymmetric Hand Size Axiom:**
  * Hand Traps evaluated at **$n = 5$** (Turn 0 interaction window; 6th card on Turn 2 is dead against established boards).
  * Defensive Tech (*Called by the Grave*) evaluated at **$n = 5$** (Turn 1 combo insulation).
  * Board Breakers evaluated at **$n = 6$** (drawn before Turn 2 Main Phase 1 actions).
* **Functional Card Taxonomy:**
  * Starters: `[STARTER-NS]` (capped at 4–6 to prevent Normal Summon clashes), `[STARTER-SS]`, `[STARTER-1.5]`.
  * Extenders: `[EXTENDER]`.
  * Non-Engine / Tech: `[TECH-HANDTRAP]`, `[TECH-DEFENSIVE]`, `[TECH-BREAKER]`.
  * Bricks: `[HARD-BRICK]` (Garnets), `[ENGINE-BRICK]` (context-dependent splash bricks), `[SOFT-BRICK]`.
* **Pile Deck Clustering:** For 50–60 card pile decks, clusters secondary archetypes with $\ge 3$ cards as engine packages to prevent misclassifying them as generic tech.
* **Dual Format Coverage:**
  * **Advanced Format:** TCG/OCG banlists, Link/Pendulum monsters, heavy hand trap/breaker optimization.
  * **Genesys Format:** Mechanical ban enforcement (0 Link, 0 Pendulum monsters), 100-point total budget calculation across all 70–90 cards, 0-point engine optimization.
* **Official Konami (KDE) PDF Form Engine (`kde_decklist.py`):**
  * Ingests `.ydk` or JSON, auto-categorizes cards into Monsters, Spells, and Traps using `cards.db`.
  * Fills all 183 AcroForm fields in `references/KDE_DeckList.pdf` with appearance streams (`/NeedAppearances: True`).
  * Parses physical PDF decklists and conducts double-entry arithmetic audits ($\Delta = \sum \text{Count}_i - \text{Total}_{\text{Recorded}}$) to prevent KDE Tournament Policy Section IX Deck Error penalties (Game Loss / DQ).
* **Math Engine (`calculate_odds.py`):** Standard-library Python engine computing univariate/multivariate hypergeometric probabilities, joint distributions, and ASCII probability bars.

### 2. `ygo-judge` (Tournament Rulings Arbitrator & PSCT Parser)

* **Ground-Before-Stating Mandate:** Must invoke `get_card_details` via `ygoprodeck-mcp` before rendering an official ruling.
* **Deconstructive PSCT Protocol:** Separates card text into `[Condition] : [Cost / Target] ; [Effect at Resolution]`.
* **4-Step Adjudication Protocol:**
  1. *Location & Trigger Validation:* Verifies trigger location and tracks whether the card moved prior to activation.
  2. *Timing Classification:* Classifies `"When... you can"` (can miss timing), `"If... you can"` (never misses timing), and Mandatory triggers.
  3. *Cost & Targeting Verification:* Distinguishes activation costs/targets (pre-semicolon) from resolution choices.
  4. *Conjunction Resolution:* Analyzes `"and if you do"`, `"then"`, `"also"`, and `"and"` for simultaneity and sequential failure propagation.
* **Dueling Book Match Log Arbitration (`duelingbook_log_parsing.md`):**
  * Ingests raw timestamped logs from Dueling Book (`M-1..5`, `S-1..5`, `EMZ`, `GY`, `hand (X/Y)`).
  * Decodes player intents (`Declared effect`, `Pointed at`, `Signaled OK`).
  * Catches illegal activations (e.g., *Droll & Lock Bird* responding to a card *Placed* from Deck rather than *Added*).
  * Prescribes official tournament policy state-repairs (Rewind vs. Accepted Game State) and penalties.
* **Comprehensive Rulings Reference Library:**
  * `damage_step_substeps.md`: Permitted actions across all 5 Damage Step substeps.
  * `missing_timing.md`: Flowcharts for Chain Link 2+, material tribute, and sequential conjunctions.
  * `segoc_priority.md`: Turn player mandatory $\to$ opponent mandatory $\to$ turn player optional $\to$ opponent optional.
  * `tcg_ocg_differences.md`: Discrepancy catalog (e.g., cards leaving trigger location, multiple hand triggers per chain).

---

## Structural Revision & Architectural Critique

### Strengths
1. **Decoupled Architecture:** Clean boundary between the data access layer (`ygoprodeck-mcp`) and reasoning agents (`skills`). The MCP server contains no tournament ruling logic, and the skills contain no direct HTTP networking code.
2. **Deterministic Reliability:** Python scripts avoid heavy external libraries; `calculate_odds.py` relies strictly on Python's built-in `math.comb`, and `kde_decklist.py` uses standard library plus `pypdf`.
3. **Monorepo Traceability:** Every skill and reference file references its corresponding Architecture Decision Record (ADR-000 through ADR-005), maintaining clear architectural provenance.
4. **Validation Tooling:** `validate-skills.mjs` provides automated CI linting for YAML frontmatter, path resolution, and legacy name deprecations.

### Identified Areas for Improvement & Recommendations

#### 1. Integration Test Database Isolation (`mcp-servers/ygoprodeck/test/verify-tech-tools.js`)
* **Finding:** The integration test suite executes against `getDbConnection(false)`, binding to the active SQLite file (`data/cards.db`). When live tournament data has been synced (`since_date: "2026-10-01"`), the assertion `assert.strictEqual(techResults.total_decks_analyzed, 2)` fails because live tournament decks are present alongside test decks.
* **Revision:** Update `verify-tech-tools.js` to run against an isolated in-memory SQLite database (`:memory:`) or a temporary test file (`test_cards.db`), ensuring reproducible, idempotent CI test runs.

#### 2. Root NPM Script Unification (`package.json`)
* **Finding:** The root `npm test` script only runs `npm run test --workspaces`. Testing the Python math engine (`npm run test:math`), KDE PDF engine (`npm run test:kde`), and skill linter (`npm run lint:skills`) requires separate manual commands.
* **Revision:** Define a consolidated `npm run test:all` script in root `package.json`:
  ```json
  "test:all": "npm test && npm run test:math && npm run test:kde && npm run lint:skills"
  ```

#### 3. Dynamic HTTP Backoff in Synchronizers
* **Finding:** Both `sync.ts` and `syncTournaments.ts` rely on a static 70-minute file lock (`.rate_limit_lock`) upon encountering 429/403 responses.
* **Revision:** Enhance synchronizers to inspect upstream HTTP `Retry-After` headers when provided, falling back to exponential backoff before triggering the full 70-minute circuit breaker lock.

#### 4. Type Safety & Schema Drift Prevention
* **Finding:** Database schemas (`schema.sql`) and Zod schemas (`types.ts`) are manually synchronized.
* **Revision:** Add a schema test or code generator to ensure TypeScript/Zod types reflect database columns automatically, especially for optional fields (`genesys_points`, `linkmarkers`, `arch_2`, `arch_3`).

---

## Monorepo Health & Validation Status

| Subsystem | Test Command | Status | Notes |
| :--- | :--- | :---: | :--- |
| **Agent Skills Linter** | `npm run lint:skills` | **PASS** | Validates frontmatter, references, and relative links. |
| **Hypergeometric Math Engine** | `npm run test:math` | **PASS** | Exact benchmarks verified ($N=40, 45, 60$). |
| **KDE Decklist PDF Engine** | `npm run test:kde` | **PASS** | 183 fields, AcroForm generation, discrepancy detection. |
| **MCP Server Build** | `npm run build` | **PASS** | TypeScript compilation clean. |
| **MCP Tech Tools Test** | `npm test` | **NEEDS ISOLATION** | Passes on clean DB; requires `:memory:` isolation when DB is populated. |

---
*Report generated autonomously by Gemini CLI for the Obsidian Development Team.*
