# PSCT Syntax Reference: Anatomy & Conjunctions

Grounded in YGOrganization’s *Demystifying Rulings* series.

## 1. The Structure of Card Text
Every card effect in modern Yu-Gi-Oh! follows this structure:

$$\mathbf{[Condition] : [Cost / Target] ; [Effect]}$$

* **No Colon (`:`):** If an effect has no colon, it **does not activate** and **never starts a chain**.
  * Examples: Continuous effects (*Skill Drain*, *Jinzo*), Summoning procedures (*Cyber Dragon*, Link/Synchro summons), Lingering unclassified conditions (*"Cannot be Normal Summoned/Set"*).
* **Colon (`:`):** Preceded by the condition under which the effect can be activated.
  * Examples: *"When this card is Normal Summoned:"*, *"If this card is sent to the GY:"*, *"During your Main Phase:"*.
* **Semicolon (`;`):** Preceded by targeting actions and costs paid immediately at the moment of activation.
  * Examples: *"Discard 1 card, then target 1 monster on the field;"*.
  * If the activation is negated, the cost is NOT refunded, and the target cannot be changed.
* **Everything after the Semicolon:** Resolves strictly on the chain.

---

## 2. Conjunctions Truth Table

Conjunctions determine whether parts A and B of an effect happen simultaneously and whether one is required for the other.

| Conjunction | Simultaneity | Dependency | Effect Failure Behavior | Timing Implication (`When... you can`) |
| :--- | :---: | :---: | :--- | :--- |
| **"and if you do"** | **Simultaneous** | **B requires A** | If A fails, B does not resolve. If B fails, A still resolves. | Both A and B are considered the last event. Triggers for both A and B can activate without missing timing. |
| **"then"** | **Sequential** (A, then B) | **B requires A** | If A fails, B does not resolve. If B fails, A still resolves. | **B is the only last event.** Any "When... you can" trigger that relied on event A will **MISS TIMING**. |
| **"also"** | **Simultaneous** | **Independent** | Neither requires the other. Resolve as much of both as possible. | Both A and B are considered the last event. |
| **"and"** | **Simultaneous** | **Both Required** | Both A and B must resolve. If either cannot be done, neither happens. | Both A and B are considered the last event. |

---

## 3. "Activate" vs. "Use"
* **"You can only activate 1 [Card Name] per turn":** If the card or effect **activation is negated** (e.g. by *Solemn Judgment* or *Baronne de Fleur*), you **CAN** activate another copy of that card during the same turn.
* **"You can only use this effect of [Card Name] once per turn":** If the activation is negated, or the effect is negated, you **CANNOT** use or activate another copy during that turn.

---

## 4. Architectural Provenance & Monorepo Links
* **ADR Design Record:** [ADR-003: Deterministic PSCT Adjudication & Rulings Engine](../../../docs/decisions/ADR-003-judge-skill.md)
* **Monorepo Architecture:** [ADR-004: Monorepo Architecture, Git Bloat Protection & Obsidian Branding](../../../docs/decisions/ADR-004-root-monorepo-structure.md)
* **Core Skill Definition:** [`ygo-judge` SKILL.md](../SKILL.md)
