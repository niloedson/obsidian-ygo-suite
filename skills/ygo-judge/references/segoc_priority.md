# SEGOC & Fast Effect Timing Reference

SEGOC stands for **Simultaneous Effects Go On Chain**. It dictates how chains are constructed when multiple trigger conditions are met at the same time.

---

## 1. The SEGOC Sequence
Whenever multiple trigger effects meet their conditions simultaneously, the chain MUST be built in this strict priority:

1. **Turn Player's Mandatory Trigger Effects**
2. **Opponent's Mandatory Trigger Effects**
3. **Turn Player's Optional Trigger Effects**
4. **Opponent's Optional Trigger Effects**

### Chain Ordering Within the Same Category:
* If a single player has multiple effects in the same category (e.g., two Optional triggers), that player **chooses the order** in which they are placed on the chain.
* **Chain Blocking Strategy:** A player can place a high-priority effect at CL1, and a secondary optional effect at CL2. Since fast effects like *Ash Blossom & Joyous Spring* must respond directly to the previous Chain Link, placing another effect at CL2 "chain blocks" CL1 from being directly targeted by *Ash Blossom*.

---

## 2. Passing Priority to Fast Effects
After all SEGOC trigger effects are placed on the chain:
* Priority passes to the **opponent** of the player who placed the last effect on the chain to activate a **Fast Effect** (Spell Speed 2: Quick Effect, Quick-Play Spell, Normal/Continuous Trap).
* Fast effects alternate back and forth between players until both players pass.
* The chain then resolves in **strict reverse order** (from the highest Chain Link down to CL1).

---

## 3. Architectural Provenance & Monorepo Links
* **ADR Design Record:** [ADR-003: Deterministic PSCT Adjudication & Rulings Engine](../../../docs/decisions/ADR-003-judge-skill.md)
* **Monorepo Architecture:** [ADR-004: Monorepo Architecture, Git Bloat Protection & Obsidian Branding](../../../docs/decisions/ADR-004-root-monorepo-structure.md)
* **Core Skill Definition:** [`ygo-judge` SKILL.md](../SKILL.md)
