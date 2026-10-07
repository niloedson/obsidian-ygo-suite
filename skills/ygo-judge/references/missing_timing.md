# Missing the Timing Reference & Decision Tree

Grounded in YGOrganization’s *Demystifying Rulings* series.

## 1. The Core Principle
"Missing the timing" occurs only with **optional trigger effects that use the word "When"**.

* **Rule 1:** Mandatory trigger effects **NEVER** miss timing.
* **Rule 2:** "If... you can" trigger effects **NEVER** miss timing.
* **Rule 3:** Only **"When... you can"** trigger effects can miss timing.

---

## 2. Trigger Phrasing Categories

| Wording | Optional? | Can it miss timing? | Behavior |
| :--- | :---: | :---: | :--- |
| **"When [event]: You can..."** | Yes | **YES** | The trigger event MUST be the very last thing to happen. If anything occurred after it, it misses timing. |
| **"If [event]: You can..."** | Yes | **NO** | Activates on the next available chain. It does not care if other actions occurred afterwards. |
| **"When [event]: [Effect]"** | No (Mandatory) | **NO** | Mandatory trigger. Automatically placed on the next chain via SEGOC. |
| **"If [event]: [Effect]"** | No (Mandatory) | **NO** | Mandatory trigger. Automatically placed on the next chain via SEGOC. |

---

## 3. The 3 Classic Scenarios Where "When... you can" Misses Timing

### Scenario A: Occurred at Chain Link 2 or Higher
* Example: CL1 is *Raigeki Break*. CL2 is *Compulsory Evacuation Device* targeting *Peten the Dark Clown*.
* Chain resolves in reverse:
  * CL2 resolves: *Peten* is returned to hand (its trigger occurs).
  * CL1 resolves: *Raigeki Break* destroys its target.
* Result: The destruction from CL1 was the last thing to happen. *Peten the Dark Clown* (`"When this card is sent to the GY: You can..."`) **misses timing**.

### Scenario B: Used as Material / Cost for a Subsequent Action
* Example: A monster that says `"When this card is sent to the GY: You can..."` is used as Tribute for a Tribute Summon, or as Material for a Link/Synchro Summon.
* The monster is sent to the GY, but the summon of the new monster occurs *afterwards*.
* Result: The Summon was the last thing to happen. The monster sent to the GY **misses timing**.
* Contrast: *Yang Zing* monsters say `"When this card is destroyed: You can Special Summon..."`. If destroyed by an effect that does not perform an action afterwards, it activates. If tributed or sent as material, it misses timing.

### Scenario C: Conjunctions with Sequential Actions ("then")
* Example: An effect reads: *"Destroy 1 monster your opponent controls, then draw 1 card."*
* The destruction occurs first, then drawing occurs.
* Result: A monster destroyed with `"When destroyed: You can..."` **misses timing** because drawing 1 card was the final event.

---

## 4. Architectural Provenance & Monorepo Links
* **ADR Design Record:** [ADR-003: Deterministic PSCT Adjudication & Rulings Engine](../../../docs/decisions/ADR-003-judge-skill.md)
* **Monorepo Architecture:** [ADR-004: Monorepo Architecture, Git Bloat Protection & Obsidian Branding](../../../docs/decisions/ADR-004-root-monorepo-structure.md)
* **Core Skill Definition:** [`ygo-judge` SKILL.md](../SKILL.md)
