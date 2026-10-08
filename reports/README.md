# Reports & Evaluations Vault

This directory contains system evaluations, architectural governance reports, and generated deck audits for the **Obsidian Yu-Gi-Oh! AI Suite** (`@obsidian/ygo-suite`).

---

## Directory Organization

```text
reports/
├── README.md                      # Directory guide (this file)
├── architecture/                  # Version-controlled system & ADR reports
│   ├── mcp_and_skills_structural_evaluation.md
│   ├── scamper_repo_structural_improvement.md
│   └── monorepo_transition_plan.md
└── deck-audits/                   # User-generated deck audit scorecards & PDFs (git-ignored)
    ├── .gitkeep
    └── ...
```

### 1. `architecture/` (Tracked in Git)
Contains authoritative architectural reviews, monorepo assessments, and transition plans:
* **`mcp_and_skills_structural_evaluation.md`**: Comprehensive architectural assessment of `mcp-servers/ygoprodeck` and `skills/`.
* **`scamper_repo_structural_improvement.md`**: Systematic repository optimization plan using the SCAMPER engineering framework.
* **`monorepo_transition_plan.md`**: Formal phased transition roadmap and subsystem decoupling specification.

### 2. `deck-audits/` (Ignored in Git)
Stores transient and user-specific deck evaluations, Markdown scorecards, and generated official tournament PDF decklists (`KDE_DeckList_*.pdf`).
* **Git Bloat Protection:** All files inside `deck-audits/` and all `*.pdf` files are strictly excluded from version control via `.gitignore` to prevent repository bloat.
