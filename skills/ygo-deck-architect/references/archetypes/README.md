# Yu-Gi-Oh! Archetype Knowledge Library

**Location:** `skills/ygo-deck-architect/references/archetypes/`  
**Parent Skill:** [`ygo-deck-architect`](../../SKILL.md)  
**Maintained by:** Obsidian Team & Open Source Contributors  

---

## 1. Purpose & Architecture

This directory serves as the **domain-specific knowledge base** for competitive Yu-Gi-Oh! archetypes. 

While `ygo-deck-architect` provides the **universal mathematical engine** (hypergeometric probability, Asymmetric Hand Size Axiom, and KDE tournament form generation), these archetype profiles provide the **tactical specifics**:
* Canonical engine ratios ($3\times, 2\times, 1\times$)
* Normal Summon vs. Special Summon starter classifications
* Chronological boss sequencing and fallback routing
* Emergency generic bridges (e.g. 2-Effect monster recovery lines)
* Sideboard setup-shedding swaps (going first $\rightarrow$ going second)
* Known chokepoints and hand trap vulnerability matrices

When auditing or building a deck, the `ygo-deck-architect` agent consults the matching profile in this directory to apply verified engine ratios and combo taxonomy.

---

## 2. Archetype Catalog & Registry

| Archetype Code / Name | Primary Attribute / Type | Key Mechanics | Status | File Link |
| :--- | :--- | :--- | :---: | :--- |
| **R.B. (Revol-Bots)** | FIRE / EARTH Machine | Link Climbing, Quick Trap Setup, Camellia Bridge | **Canonical** | [`revol_bots.md`](./revol_bots.md) |
| *[Add New Archetype]* | *[Attribute / Type]* | *[Core Summoning / End-Board]* | *[Proposal]* | Follow [`_template.md`](./_template.md) |

---

## 3. Contributor Guide: Adding a New Archetype

We welcome contributions from the community to expand the archetype knowledge base! To submit a new archetype profile:

1. **Copy the Schema Template:**
   Copy [`_template.md`](./_template.md) to a new file named `<archetype_name>.md` (use lowercase snake_case, e.g., `snake_eye.md`, `earth_machine.md`, `branded.md`).

2. **Fill All 6 Mandatory Sections:**
   Every profile must contain all six required sections:
   * `## 1. Canonical Engine Core & Ratios`
   * `## 2. Functional Taxonomy Classifications`
   * `## 3. End-Board Routing & Sequencing`
   * `## 4. Proven Secondary Engine Synergies (Pile Clustering)`
   * `## 5. Chokepoints & Counter-Play Matrix`
   * `## 6. Hypergeometric Benchmarks`

3. **Verify Links & Run Linter:**
   Execute the automated monorepo skill validator from the root:
   ```bash
   npm run lint:skills
   ```
   The linter will automatically verify frontmatter, required section headers, and relative link integrity.

4. **Submit a Pull Request:**
   Submit your PR on GitHub with the title `feat(archetype): add <Archetype Name> profile`.

---

## 4. Architectural Provenance & Monorepo Links
* **ADR Design Record:** [ADR-002: Competitive Deck Architecture & Hypergeometric Probability Engine](../../../../docs/decisions/ADR-002-deck-architect-skill.md)
* **Monorepo Architecture:** [ADR-004: Monorepo Architecture, Git Bloat Protection & Obsidian Branding](../../../../docs/decisions/ADR-004-root-monorepo-structure.md)
* **Core Skill Definition:** [`ygo-deck-architect` SKILL.md](../../SKILL.md)
