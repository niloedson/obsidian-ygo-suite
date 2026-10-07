# ADR-004: Monorepo Architecture, Git Bloat Protection & Obsidian Branding

* **Status:** Accepted  
* **Date:** 2026-10-06  
* **Context:** Monorepo Restructuring & Repository Governance  
* **Author / Team:** Obsidian Team  
* **Affected Assets:** Root workspace, `skills/`, `mcp-servers/`, `docs/`  

---

## 1. Context & Problem Statement

The repository originated as an exploratory local workspace (`ygo_card_crawler`) with flat folder placement:
* An unnamespaced MCP server sitting at the root (`ygoprodeck-mcp-server/`).
* A 100MB+ SQLite database (`cards.db`) sitting untracked and unprotected in the working tree, creating severe risk of permanently bloating Git commit history.
* Agent skills in `skills/` operating alongside ad-hoc research documents in `preparation/`.
* Deprecated replay notation experiments (YGN) introducing cognitive confusion.

The project needed a production-grade, modular Monorepo structure branded for the **Obsidian Team**, establishing clean separation of concerns, eliminating Git bloat, and providing unified workspace execution.

---

## 2. Decision & SCAMPER Analysis

The Obsidian Team designed the Monorepo structure using SCAMPER:

| Dimension | Transformation |
| :--- | :--- |
| **S - Substitute** | Substitute `preparation/` with a formal **Architecture Decision Records (ADR) Ledger** (`docs/decisions/`). Substitute generic folder naming with Obsidian team branding (`obsidian-ygo-suite`). |
| **C - Combine** | Combine decision records into an interactive **Decision Traceability Matrix** (`docs/decisions/README.md`) linking upstream requirements $\rightarrow$ ADRs $\rightarrow$ operational code. |
| **A - Adapt** | Adapt knowledge-vault conventions (cross-referenced markdown) so `docs/` is natively navigable as an Obsidian vault or GitHub wiki. |
| **M - Modify / Magnify / Minify** | **Magnify** design provenance and traceability. **Minify** Git repository footprint by strictly excluding `*.db` via `.gitignore`. Minify root clutter into 4 primary folders. |
| **P - Put to Another Use** | Repurpose the ADRs as replicable engineering blueprints for the Obsidian team to build future MCP servers and agent skills. |
| **E - Eliminate** | Eliminate all deprecated YGN files and eliminate directory-switching friction via root npm workspaces. |
| **R - Reverse / Rearrange** | Rearrange hierarchy so operational deliverables (`skills/`, `mcp-servers/`) are primary, with historical ADRs (`docs/decisions/`) as foundational documentation. |

---

## 3. Directory Layout Specification

```text
obsidian-ygo-suite/                     # Root folder (renamed for Obsidian Team)
├── .github/
│   └── workflows/
│       ├── test-mcp.yml                # CI: Run TypeCheck, SQLite tests, and verify-tech-tools
│       ├── validate-skills.yml         # CI: Validate skill frontmatter, references & Markdown
│       └── publish-mcp.yml             # CD: Automated npm release pipeline on semver release
├── docs/                               # Permanent documentation & decision vault
│   ├── decisions/                      # Architecture Decision Records (ADRs)
│   │   ├── README.md                   # Traceability index linking ADRs to production artifacts
│   │   ├── ADR-000-upstream-api-constraints.md
│   │   ├── ADR-001-hardened-mcp-server.md
│   │   ├── ADR-002-deck-architect-skill.md
│   │   ├── ADR-003-judge-skill.md
│   │   └── ADR-004-root-monorepo-structure.md
│   └── guides/
│       ├── getting_started.md          # Developer onboarding for Obsidian team
│       └── mcp_setup_guide.md          # Guide for Claude Desktop, Cursor, Gemini CLI
├── mcp-servers/                        # Plural container for MCP tools
│   └── ygoprodeck/                     # Relocated from ygoprodeck-mcp-server
│       ├── data/
│       │   ├── .gitkeep
│       │   └── schema.sql              # Version-controlled SQLite DDL
│       │   # cards.db excluded by .gitignore (<100MB bloat prevention)
│       ├── src/
│       ├── test/
│       ├── package.json
│       ├── tsconfig.json
│       └── README.md
├── skills/                             # Agent reasoning layer (deployable to ~/.gemini/skills)
│   ├── ygo-deck-architect/
│   │   ├── SKILL.md                    # Core prompt, taxonomy rules, >90% consistency
│   │   └── references/
│   └── ygo-judge/
│       ├── SKILL.md                    # Core prompt, 4-step PSCT adjudication trace
│       └── references/
├── .gitignore                          # Root ignore protecting against DB & build bloat
├── .gitattributes                      # Line endings & binary file definitions
├── LICENSE                             # MIT License
├── package.json                        # Root npm workspace coordinator (@obsidian/ygo-suite)
└── README.md                           # Master ecosystem documentation for Obsidian Team
```

---

## 4. Consequences & Downstream Artifacts

* **Root Workspace:** Single root `npm test` and `npm run build` runs across all workspaces.
* **Database Hygiene:** Binary `cards.db` files are strictly excluded before Git initialization.
* **Obsidian Alignment:** Repository is structured and documented for Obsidian Team stewardship.
