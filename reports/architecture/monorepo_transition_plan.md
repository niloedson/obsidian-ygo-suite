# Master Transition Plan: Modular Independence & Monorepo Hardening

**Target System:** Obsidian Yu-Gi-Oh! AI Suite (`@obsidian/ygo-suite`)  
**Document ID:** `PLAN-2026-001`  
**Status:** Ready for Execution  
**Date:** October 8, 2026  
**Scope:** `mcp-servers/ygoprodeck`, `skills/ygo-deck-architect`, `skills/ygo-judge`, CI/CD, and Workspace Governance

---

## 1. Architectural Philosophy: Independent Evolution with Strict Contracts

The overarching objective of this transition plan is **Subsystem Isolation**:
> **Guiding Principle:** Any contributor must be able to develop, test, and iterate on a specific skill or the MCP server in complete isolation, without being blocked by dependencies, broken tests, or incomplete work in other subsystems.

```text
┌────────────────────────────────────────────────────────────────────────┐
│                        OBSIDIAN MONOREPO ROOT                          │
│        (Unified linting, composite test runners, path-filtered CI)      │
└───────────────────┬────────────────────────────────┬───────────────────┘
                    │                                │
    ┌───────────────▼──────────────┐  ┌──────────────▼───────────────────┐
    │     DATA & META ENGINE       │  │       AGENT REASONING LAYER      │
    │   (mcp-servers/ygoprodeck)   │  │             (skills/)            │
    ├──────────────────────────────┤  ├──────────────────────────────────┤
    │ • Stack: Node.js / TS / SQL  │  │ • Stack: Markdown, Python, JSON  │
    │ • Zero Python dependency     │  │ • Zero TypeScript build req      │
    │ • Hermetic In-Memory tests   │  │ • Standalone CLI math engines    │
    │ • Local SQLite (cards.db)    │  │ • PSCT syntactic specifications  │
    └───────────────▲──────────────┘  └──────────────▲───────────────────┘
                    │                                │
                    └────── CONTRACT BOUNDARY ───────┘
                     (JSON-RPC over stdio / schemas)
                     - Tools: search_cards, get_card_details, etc.
                     - Resources: ygo://cards/{id}, ygo://meta/{format}
```

### Decoupling Rules:
1. **The MCP Server is Agnostic of Skills:** `mcp-servers/ygoprodeck` never imports, references, or depends on files in `skills/`. Its test suite must run purely on Node.js without Python.
2. **The Skills are Agnostic of MCP Internals:** Skills declare tool requirements via their schema contracts (`tools` parameter specifications). Offline scripts (`calculate_odds.py`, `kde_decklist.py`) remain runnable standalone without starting the MCP server.
3. **No Cross-Contamination of Test Environments:** Integration tests for the MCP server must never write to or read from the user's local `data/cards.db`. Tests must use an isolated in-memory database (`:memory:`).

---

## 2. Subsystem Isolation Matrix (Developer Loops)

| Subsystem | Primary Tech Stack | Local Dependencies | Standalone Test Command | Contract Boundary / Export |
| :--- | :--- | :--- | :--- | :--- |
| **`mcp-servers/ygoprodeck`** | TypeScript 5.7+, Node.js 22+, SQLite | `node:sqlite`, `@modelcontextprotocol/sdk`, `zod` | `npm test` *(within `mcp-servers/ygoprodeck`)* | Exposes stdio MCP tools & resources conforming to `types.ts` schemas. |
| **`skills/ygo-deck-architect`** | Python 3.10+, Markdown | Python standard library, `pypdf` | `npm run test:math`<br>`npm run test:kde` | Produces ASCII scorecards, `.ydk` strings, and filled `KDE_DeckList.pdf`. |
| **`skills/ygo-judge`** | Markdown, Text Fixtures | None (Pure Knowledge) | `npm run lint:skills` | Produces 4-step PSCT ruling traces and Dueling Book rewind verdicts. |
| **Monorepo Orchestrator** | Node.js, GitHub Actions | Workspace npm packages | `npm run test:all` | Validates inter-package integrity, relative links, and runs all test suites. |

---

## 3. Phased Execution Roadmap

```text
  Phase 1: Test & Pipeline Decoupling (Hermetic SQLite, test:all, Polyglot CI)
     │
  Phase 2: CI Subsystem Path Filtering (Independent PR checks)
     │
  Phase 3: MCP Internal Refactoring (Crawler deduplication, Dynamic backoff)
     │
  Phase 4: Contract Testing & Mock Fixtures (Contract verification)
     │
  Phase 5: Directory Structure Normalization (Structured reports)
```

---

### Phase 1: Test & Pipeline Decoupling (Immediate - Sprint 1)

**Goal:** Fix test collisions, make MCP unit tests hermetic, and unify the root developer verification command.

#### Step 1.1: Isolate `verify-tech-tools.js` with In-Memory SQLite
* **Current Issue:** Test connects to `data/cards.db`. If live data was synced, date queries match real tournament decks, failing the `assert.strictEqual(techResults.total_decks_analyzed, 2)` assertion.
* **Target File:** `mcp-servers/ygoprodeck/test/verify-tech-tools.js`
* **Implementation Plan:**
  1. Instantiate an in-memory SQLite database (`new DatabaseSync(":memory:")`).
  2. Execute `initDbSchema(memDb)`.
  3. Pass `memDb` directly into `queryTopTechCards`, `queryTournamentDecklists`, and `queryEvaluateTechCounters`.
  4. Keep the live `data/cards.db` untouched.
* **Verification:** Run `npm test` from the root; it must pass 100% regardless of whether `npm run sync` has been executed.

#### Step 1.2: Add Composite Script `test:all` to Root `package.json`
* **Target File:** `package.json`
* **Implementation Plan:** Add script:
  ```json
  "test:all": "npm test && npm run test:math && npm run test:kde && npm run lint:skills"
  ```
* **Verification:** Running `npm run test:all` executes all 4 test suites sequentially and exits with code 0.

#### Step 1.3: Enable Polyglot GitHub Actions Workflow
* **Current Issue:** CI workflows only provision Node.js. Python tests (`calculate_odds.py`, `kde_decklist.py`) are never run in CI.
* **Target Files:** `.github/workflows/test-mcp.yml` or a new consolidated `.github/workflows/ci.yml`.
* **Implementation Plan:**
  1. Add Python setup step (`actions/setup-python@v5` with Python 3.11).
  2. Install `pypdf` (`pip install pypdf`).
  3. Run `npm run test:all`.

---

### Phase 2: Independent Subsystem CI (Sprint 1–2)

**Goal:** Ensure developers working only on skills do not trigger or wait for MCP builds, and vice-versa.

#### Step 2.1: Implement Granular Path-Filtered Workflows
* **Target Files:**
  * `.github/workflows/mcp-ci.yml`: Triggers ONLY when files in `mcp-servers/**` change.
  * `.github/workflows/skills-ci.yml`: Triggers ONLY when files in `skills/**` or `scripts/validate-skills.mjs` change.
  * `.github/workflows/full-ci.yml`: Triggers on releases, merges to `main`, or changes affecting root config (`package.json`).
* **Workflow Matrix:**
  ```yaml
  # skills-ci.yml excerpt
  on:
    pull_request:
      paths:
        - 'skills/**'
        - 'scripts/validate-skills.mjs'
  jobs:
    test-skills:
      steps:
        - uses: actions/checkout@v4
        - uses: actions/setup-node@v4
        - uses: actions/setup-python@v5
          with: { python-version: '3.11' }
        - run: pip install pypdf
        - run: npm run lint:skills
        - run: npm run test:math
        - run: npm run test:kde
  ```

---

### Phase 3: MCP Internal Refactoring & Resilience (Sprint 2)

**Goal:** Eliminate code duplication in synchronization scripts and improve rate-limit recovery without changing any external tool signatures.

#### Step 3.1: Centralize Shared Crawler Logic
* **Target File (New):** `mcp-servers/ygoprodeck/src/cli/common.ts`
* **Components to Move & Share:**
  * Lockfile management (`checkRateLimitLock`, `triggerRateLimitLock`).
  * Header builders (`User-Agent`, `If-None-Match`).
  * Sleep / delay helper (`delay(ms)`).
* **Refactor:** `sync.ts` and `syncTournaments.ts` import from `common.ts`.

#### Step 3.2: Implement Adaptive Rate-Limit Backoff
* **Feature:** When receiving HTTP 429 / 403:
  1. Check for `Retry-After` header.
  2. If present and $\le 10$ minutes, wait and retry automatically.
  3. If missing or $> 10$ minutes, trigger the safety `.rate_limit_lock` (70 min) and exit cleanly.

#### Step 3.3: Expose Standard MCP Prompts
* **Target File:** `mcp-servers/ygoprodeck/src/server.ts`
* **Exposed Prompts:**
  * `deck-audit`: Pre-populates the prompt with the Deck Audit Scorecard structure.
  * `ruling-arbitration`: Pre-populates with the 4-step PSCT adjudication prompt.
* **Benefit:** Allows client UIs (Claude Desktop, Cursor) to offer ready-made prompts directly from the server.

---

### Phase 4: Contract Testing & Mock Fixtures (Sprint 2–3)

**Goal:** Allow skills to test and demonstrate MCP interactions without requiring an active database or network connection.

#### Step 4.1: Add Synthetic Contract Verification Tests
* **Target File (New):** `mcp-servers/ygoprodeck/test/contract-tests.js`
* **Test Scope:** Verifies that tool outputs (`search_cards`, `get_card_details`, `get_top_tech_cards`, `get_genesys_points`) strictly conform to the JSON structure expected by `SKILL.md` scorecards.

#### Step 4.2: Synthetic Dueling Book Log Test Runner
* **Target File (New):** `skills/ygo-judge/test/test_log_parser.py` (or JS equivalent)
* **Test Scope:** Ingests `skills/ygo-judge/references/duel_log_example.txt` and validates that:
  1. Illegal activation on "Placed" vs "Added" is flagged accurately.
  2. Target coordinates (`M-1`, `S-2`) are parsed without syntax errors.

---

### Phase 5: Workspace Organization & Reports Hygiene (Sprint 3)

**Goal:** Clean up the repository root and structure generated outputs cleanly.

#### Step 5.1: Structure the `reports/` Directory
* **Target Structure:**
  ```text
  reports/
  ├── architecture/          # System evaluations, ADR reviews, transition plans
  │   ├── mcp_and_skills_structural_evaluation.md
  │   ├── scamper_repo_structural_improvement.md
  │   └── monorepo_transition_plan.md
  └── deck-audits/           # User deck audit scorecards & generated PDFs
      ├── .gitkeep
      └── ...
  ```
* **Gitignore Hygiene:**
  Update `.gitignore` so that `reports/deck-audits/` and all `*.pdf` files are ignored, while `reports/architecture/` remains tracked in version control.

---

## 4. Execution Protocol: Step-by-Step Task Breakdown

| Task # | Subsystem | Action Description | Verification Command | Backward Compatible? |
| :---: | :--- | :--- | :--- | :---: |
| **1.1** | `mcp-servers` | Isolate test DB in `verify-tech-tools.js` using `:memory:` | `npm test` | **YES** |
| **1.2** | `root` | Add `"test:all"` script to root `package.json` | `npm run test:all` | **YES** |
| **1.3** | `ci` | Update CI workflow to install Python, `pypdf`, and run `test:all` | Push to branch & verify CI | **YES** |
| **2.1** | `ci` | Implement path filtering for `mcp-ci.yml` and `skills-ci.yml` | Trigger PR with skill-only edit | **YES** |
| **3.1** | `mcp-servers` | Extract `src/cli/common.ts` for shared crawler utilities | `npm run build && npm test` | **YES** |
| **3.2** | `mcp-servers` | Add `Retry-After` header handling in `common.ts` | Test simulated 429 response | **YES** |
| **3.3** | `mcp-servers` | Register MCP Prompts in `src/server.ts` | Test MCP prompt listing via CLI | **YES** |
| **4.1** | `skills` | Add synthetic Dueling Book duel log test runner | `npm run test:judge` | **YES** |
| **5.1** | `reports` | Partition `reports/` into `architecture/` and `deck-audits/` | Check git status & path resolution | **YES** |

---

## 5. Risk Assessment & Contingency Management

| Risk | Severity | Probability | Mitigation Strategy |
| :--- | :---: | :---: | :--- |
| **Python Environment Variance:** Discrepancies between contributor Python versions (e.g., 3.10 vs 3.12). | Low | Medium | `calculate_odds.py` uses standard library only (`math.comb` introduced in Python 3.8). `kde_decklist.py` requires only `pypdf`. Document exact requirements in `README.md`. |
| **Node.js `--experimental-sqlite` Deprecation / Changes:** Future Node.js releases changing the `node:sqlite` API. | Medium | Low | Node 22/24 `DatabaseSync` API is currently stable. If changes occur, encapsulating DB calls inside `connection.ts` allows swapping to `better-sqlite3` in one place without modifying query code. |
| **Broken Markdown Links during Subfolder Reorganization:** Moving files in `reports/` or `skills/` breaks relative links. | Low | Low | Enforced in CI via `scripts/validate-skills.mjs`. Any broken relative link fails the build before merge. |

---

## 6. Acceptance Criteria for Completion

1. ✅ **Zero Shared Test State:** `npm test` inside `mcp-servers/ygoprodeck` runs in `<200ms` against an in-memory database and never fails due to existing local synced data.
2. ✅ **One-Command Full Verification:** Running `npm run test:all` at root executes Skill Linter, Math Tests, KDE Tests, and MCP Tests, passing with 0 exit code.
3. ✅ **Independent Contributor Autonomy:**
   - A contributor working exclusively on `skills/ygo-deck-architect` can edit Python math or KDE form logic and verify via `npm run test:math` / `npm run test:kde` without compiling TypeScript.
   - A contributor working exclusively on `skills/ygo-judge` can add ruling cases and verify via `npm run lint:skills` without running Python or Node servers.
   - A contributor working on `mcp-servers/ygoprodeck` can build and test with pure Node.js.
4. ✅ **No Untracked Bloat in Version Control:** `reports/deck-audits/` and `data/cards.db` remain excluded from Git commits, while architectural documentation and plans are safely tracked.

---
*Plan created autonomously by Gemini CLI. Ready for user confirmation to begin Phase 1 execution.*
