# The 5 Substeps of the Damage Step

The Damage Step is the most restrictive phase of gameplay in Yu-Gi-Oh!. Most spells, traps, and monster effects CANNOT be activated during the Damage Step.

---

## What CAN Activate in the Damage Step (General Rules):
1. **Counter Traps** (e.g., *Solemn Strike*, *Solemn Judgment*).
2. **Mandatory Trigger Effects** (e.g., mandatory destruction or search effects).
3. **Effects that specifically state "during the Damage Step"** or refer to Damage Calculation.
4. **Fast effects that directly alter ATK/DEF** (Only during Substep 1 and Substep 2, NOT after damage calculation).
5. **Effects that negate activations** (e.g., *Baronne de Fleur*, *Apollousa*). Note: Effects that negate *effects* (like *Ash Blossom*) generally CANNOT activate in the Damage Step unless explicitly stated.

---

## The 5 Substeps Breakdown

### Substep 1: Start of the Damage Step
* **Monsters flipped face-up?** NO. Face-down monsters remain face-down.
* **Permitted:** Cards stating *"at the start of the Damage Step"* (e.g., *Ally of Justice Catastor*), and fast effects modifying ATK/DEF.

### Substep 2: Before Damage Calculation
* **Monsters flipped face-up?** YES. Face-down attack targets are flipped face-up.
* **Continuous effects apply?** YES (*Jinzo* takes effect immediately).
* **Flip Effects activate?** NO. Flip effects are held until Substep 4.
* **Permitted:** Fast effects modifying ATK/DEF. This is the LAST window to activate ATK/DEF modifying effects.

### Substep 3: During Damage Calculation
* **ATK/DEF comparison:** Determine battle damage and battle destruction.
* **Permitted:** ONLY effects that specifically say *"during damage calculation"* (e.g., *Honest*, *Kuriboh*), and Counter Traps that negate an activation. General ATK/DEF modifiers can no longer be activated.

### Substep 4: After Damage Calculation
* **Damage inflicted:** Battle damage is deducted from Life Points.
* **Flip Effects activate:** Monsters flipped in Substep 2 now activate their Flip effects.
* **Battle damage triggers activate:** e.g., *"When this card inflicts battle damage to your opponent"*.

### Substep 5: End of the Damage Step
* **Monsters sent to GY:** Monsters destroyed by battle are sent to the GY (or banished if macro effects exist).
* **Triggers activate:** Effects triggering on battle destruction (e.g., *"When this card is destroyed by battle and sent to the GY"*).

---

## Architectural Provenance & Monorepo Links
* **ADR Design Record:** [ADR-003: Deterministic PSCT Adjudication & Rulings Engine](../../../docs/decisions/ADR-003-judge-skill.md)
* **Monorepo Architecture:** [ADR-004: Monorepo Architecture, Git Bloat Protection & Obsidian Branding](../../../docs/decisions/ADR-004-root-monorepo-structure.md)
* **Core Skill Definition:** [`ygo-judge` SKILL.md](../SKILL.md)
