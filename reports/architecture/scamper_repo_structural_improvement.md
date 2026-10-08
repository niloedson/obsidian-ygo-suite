# SCAMPER Evaluation & Strategic Repository Improvement Plan

**Target Document:** `reports/mcp_and_skills_structural_evaluation.md`  
**Repository:** Obsidian Yu-Gi-Oh! AI Suite (`@obsidian/ygo-suite`)  
**Methodology:** SCAMPER Framework (Substitute, Combine, Adapt, Modify/Magnify/Minify, Put to Another Use, Eliminate, Reverse/Rearrange)  
**Date:** October 8, 2026  
**Auditor:** Gemini CLI (Architectural Review)

---

## Executive Overview

Following the initial architectural evaluation of `mcp-servers/` and `skills/`, this report applies the **SCAMPER** creative engineering framework to synthesize concrete, actionable structural optimizations. The objective is to elevate the repository from a functional collection of tools into a robust, enterprise-grade, and maintainable monorepo architecture.

---

## 1. S — Substitute (Substituição)

| Current Implementation | Proposed Substitution | Rationale & Architectural Gain |
| :--- | :--- | :--- |
| **Live Database Testing:** `verify-tech-tools.js` opens `data/cards.db` via `getDbConnection(false)`. | **Hermetic In-Memory SQLite (`:memory:`):** Substitute with an ephemeral in-memory database initialized with `schema.sql` and seeded fixtures. | Eliminates test failures caused by local synced tournament data (`since_date: "2026-10-01"` collision). Guarantees deterministic, idempotent test runs in CI and local dev. |
| **Fixed 70-Min Lockout:** `sync.ts` & `syncTournaments.ts` write a hardcoded 70-minute lockfile upon receiving HTTP 429/403. | **Adaptive Exponential Backoff & Header Inspection:** Substitute static timeout with inspection of HTTP `Retry-After` headers, falling back to a capped exponential backoff. | Prevents unnecessarily long lockouts when upstream rate limits are brief (e.g. 1-minute bursts), while preserving the ultimate circuit breaker safety. |
| **Manual Schema Synchronization:** SQLite DDL in `schema.sql` and TypeScript/Zod types in `types.ts` are maintained manually. | **Type-Safe Schema Derivation:** Substitute manual duplication with automated type extraction (e.g., using a lightweight generator or type assertion suite). | Prevents schema drift across optional database columns (`genesys_points`, `arch_2`, `arch_3`, `linkmarkers`). |
| **Subprocess Execution in Agents:** AI agents invoke Python scripts (`calculate_odds.py`) via shell commands. | **Hybrid Execution Model (Native TS Engine + Standalone CLI):** Implement a native TypeScript hypergeometric function in `mcp-servers/ygoprodeck` for MCP tool queries, retaining Python for deep multivariate research. | Reduces execution overhead, removes Python runtime dependency for basic agent probability checks, and unifies MCP tooling. |

---

## 2. C — Combine (Combinação)

| Isolated Components | Proposed Combination | Rationale & Architectural Gain |
| :--- | :--- | :--- |
| **Split Crawler Scripts:** `sync.ts` (cards) and `syncTournaments.ts` (tournaments) have duplicate lockfile handling, headers, and DB connection boilerplate. | **Unified CLI Crawler Hub:** Combine into `src/cli/sync.ts` with subcommands (`sync cards`, `sync tournaments`, `sync all`) and shared utility modules (`src/cli/common.ts`). | Eliminates ~100 lines of duplicated networking, logging, and rate-limit logic. Simplifies package.json scripts and developer ergonomics. |
| **Fragmented Test Scripts:** Root `package.json` contains `test`, `test:math`, `test:kde`, and `lint:skills` as separate commands. | **Composite Test Script (`test:all` / `test:ci`):** Combine all test targets into a single authoritative pipeline: `"test:all": "npm test && npm run test:math && npm run test:kde && npm run lint:skills"`. | Prevents incomplete local validations and guarantees that all monorepo subsystems are verified with a single command. |
| **Segmented CI Workflows:** `test-mcp.yml` (Node only) and `validate-skills.yml` (Node only) run in parallel without executing Python engines. | **Unified CI Verification Matrix:** Combine testing pipelines into a single comprehensive workflow (`.github/workflows/ci.yml`) testing Node.js and Python 3.11+ in a structured pipeline. | Ensures zero regression across both TypeScript MCP services and Python mathematical engines on every pull request. |
| **Unsorted `reports/` Directory:** Flat folder containing mixed artifacts (system evaluations, PDF tournament sheets, markdown audits). | **Structured Reports Taxonomy:** Combine and partition into categorized subfolders: `reports/audits/` (user deck evaluations) and `reports/architecture/` (system evaluations and ADR reviews). | Enhances repository organization and allows targeted `.gitignore` rules (e.g. ignoring user audits while tracking architecture evaluations). |

---

## 3. A — Adapt (Adaptação)

| Source Domain / Asset | Adaptation Strategy | Value Added |
| :--- | :--- | :--- |
| **CI Environment (`.github/workflows`):** Currently provisions Node.js only. | **Polyglot CI Pipeline:** Adapt CI steps to setup Python (`actions/setup-python@v5`), install `pypdf`, and run `npm run test:math` and `npm run test:kde`. | Closes the critical CI gap where Python engine regressions could pass undetected in pull requests. |
| **Obsidian Vault Integration:** Repository named `obsidian-ygo-suite`, but files are primarily CLI/terminal focused. | **Native Obsidian Vault Layout:** Adapt reference markdown files to include Obsidian Callouts (`> [!INFO]`, `> [!WARNING]`), Dataview-compatible YAML frontmatter, and Mermaid canvas links. | Transforms the repository into a drop-in Obsidian knowledge vault that duelists can open directly in the Obsidian desktop application. |
| **MCP Prompts Protocol:** MCP server currently only exposes Tools (`server.tool`) and Resources (`server.resource`). | **McpServer Prompts Exposure (`server.prompt`):** Adapt the deck audit scorecard and judge ruling formats from `SKILL.md` into native MCP Prompts. | Enables AI clients (Claude Desktop, Cursor, Gemini CLI) to select standardized templates via native UI dropdowns without prompt engineering. |

---

## 4. M — Modify / Magnify / Minify (Modificar / Ampliar / Reduzir)

### Magnify (Enrich & Expand)
* **Rule Engine Testing:** Magnify test coverage for `ygo-judge` by creating a synthetic Dueling Book duel-log test fixture runner (`test/verify-judge-log.js` or Python equivalent) that verifies chain-order parsing, timing checks, and illegal activation detection against ground truth expectations.
* **Tournament Meta Query Performance:** Magnify SQL performance in `queries.ts` by creating materialized indexes or summary views for complex aggregations (e.g., tech card frequency calculations across large tournament datasets).
* **Multi-Engine Pile Clustering:** Magnify the pile-deck detection algorithm in `queryTopTechCards` to evaluate card co-occurrence matrices, automatically detecting 3-card engine splashes without relying solely on archetype name substrings.

### Minify (Prune & Compact)
* **Token Overhead in MCP Responses:** Minify context token consumption in `get_card_details` by introducing a `fields` filter parameter (e.g., `fields: ["psct", "banlist"]`), preventing unnecessary pricing and image URL data from bloating agent prompt windows during pure ruling arbitrations.
* **Database Size on Disk:** Minify `cards.db` footprint by vacuuming after sync and indexing only relevant search columns with FTS5 tokenizers.
* **Root Clutter:** Minify untracked root pollution by ensuring all generated PDFs, temp databases, and runtime logs are strictly scoped within ignored output folders.

---

## 5. P — Put to Another Use (Propor Outro Uso / Repropósito)

| Component | Alternative / Extended Use Case | Execution Path |
| :--- | :--- | :--- |
| **`kde_decklist.py` (KDE Engine)** | **Tournament Organizer (TO) Desk Audit Utility:** Repurpose the engine as a standalone CLI or local web utility for Head Judges and Tournament Organizers to batch-audit physical registration PDFs at Tier-2+ events before Round 1. | Add a `--batch <folder>` flag that generates a single summary discrepancy CSV for all player registration sheets. |
| **`calculate_odds.py` (Math Engine)** | **Universal Multi-TCG Combinatorics Library:** Repurpose the core combinatorics module into a game-agnostic probability package for other card games (Magic: The Gathering, Pokémon, One Piece). | Abstract the deck size $N$, hand size $n$, and multi-pool joint conditions into a standalone Python library (`tcg-hypergeom`). |
| **`cards.db` Local Cache** | **Offline Card API & Microservice:** Repurpose the SQLite schema and sync pipeline to power a headless local REST/gRPC API for duel simulators or local web apps without hitting upstream YGOPRODeck rate limits. | Expose an optional `--http` flag on `dist/server.js` or build an express/fastify companion service. |

---

## 6. E — Eliminate (Eliminação)

| Redundancy / Anti-Pattern | Elimination Target | Impact |
| :--- | :--- | :--- |
| **Test Environment Pollution:** Test suite coupling to disk database. | **Eliminate Direct `cards.db` Dependency in Tests:** Move `verify-tech-tools.js` to an in-memory SQLite schema. | Prevents state leakage, eliminates test flaky results, and removes manual database resetting before tests. |
| **Boilerplate Duplication:** Identical rate-limit checking and lockfile code in `sync.ts` and `syncTournaments.ts`. | **Eliminate Duplicated Code via Shared Module:** Centralize circuit breaker, sleep delays, and error wrappers into `src/cli/common.ts`. | Reduces maintenance burden and ensures consistent rate-limit handling across all synchronization tasks. |
| **Legacy Artifacts & Dead Links:** Outdated references to `ygoprodeck-mcp-server` or unreferenced test files. | **Eliminate Deprecated Paths:** Keep the validation script (`validate-skills.mjs`) strictly enforcing the elimination of legacy naming conventions. | Prevents broken documentation and ensures clean developer onboarding. |

---

## 7. R — Reverse / Rearrange (Reversão / Reorganização)

| Current Structure | Proposed Rearrangement | Rationale & Architectural Gain |
| :--- | :--- | :--- |
| **Shared Scripts Nested in Skills:** `calculate_odds.py` and `kde_decklist.py` live under `skills/ygo-deck-architect/scripts/`. | **Top-Level `tools/` or `packages/` Directory:** Rearrange shared CLI utilities into a dedicated `tools/` directory (e.g. `tools/deck-engine/` and `tools/pdf-engine/`), leaving `skills/` strictly for agent prompts and reference knowledge. | Clarifies distinction between agent behavior instructions (`skills/`) and deterministic CLI software utilities (`tools/`). |
| **CI Execution Sequence:** Linters and tests run in arbitrary order across separate jobs. | **Fail-Fast Pipeline Order:** Rearrange CI steps: (1) Skill Frontmatter & Link Linter $\to$ (2) TypeScript Compilation $\to$ (3) Python Math Unit Tests $\to$ (4) In-Memory MCP Server Integration Tests. | Short-circuits failed builds in under 5 seconds for syntax or markdown errors before compiling or running heavy integration suites. |
| **Unidirectional Deck Audit Pipeline:** Currently, `.ydk` is analyzed and fed into KDE PDF, but suggestions require manual user edits. | **Bidirectional Auto-Patching Pipeline:** Rearrange workflow so that `ygo-deck-architect` can take an existing deck, generate the probability audit, and emit a patched `.ydk` file directly to `decks/optimized/`. | Closes the loop from inspection $\to$ diagnosis $\to$ automated deck remediation. |

---

## Prioritized Implementation Roadmap

Based on impact vs. effort, the recommended structural improvements should be executed in three phases:

```text
┌────────────────────────────────────────────────────────────────────────┐
│ PHASE 1: IMMEDIATE RELIABILITY & CI HARDENING (Sprint 1)              │
│ 1. Isolate test DB in verify-tech-tools.js using in-memory SQLite      │
│ 2. Unify root package.json scripts (add "test:all")                    │
│ 3. Add Python setup and test runs to GitHub Actions CI workflows      │
│ 4. Organize reports/ into reports/audits/ and reports/architecture/    │
└──────────────────────────────────┬─────────────────────────────────────┘
                                   │
┌──────────────────────────────────▼─────────────────────────────────────┐
│ PHASE 2: CODE DEDUPLICATION & REFACTORING (Sprint 2)                   │
│ 1. Extract common crawler logic (sync.ts + syncTournaments.ts)         │
│ 2. Add Retry-After header inspection for dynamic rate limiting         │
│ 3. Expose MCP Prompts in server.ts (Scorecard & Ruling templates)      │
│ 4. Implement field projection in get_card_details (token reduction)    │
└──────────────────────────────────┬─────────────────────────────────────┘
                                   │
┌──────────────────────────────────▼─────────────────────────────────────┐
│ PHASE 3: MODULAR REORGANIZATION & EXTENSIONS (Sprint 3)                │
│ 1. Relocate Python engines to top-level tools/ directory               │
│ 2. Implement synthetic Dueling Book duel-log test runner for ygo-judge │
│ 3. Enable bidirectional .ydk optimization patching                     │
│ 4. Adapt markdown assets with Obsidian Callouts and Dataview metadata  │
└────────────────────────────────────────────────────────────────────────┘
```

---
*Report generated autonomously by Gemini CLI for the Obsidian Development Team.*
