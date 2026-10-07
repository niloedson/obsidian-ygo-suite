# TCG vs. OCG Rulings Discrepancies Catalog

Yu-Gi-Oh! operates under two primary regional jurisdictions:
* **OCG (Official Card Game):** Japan, Korea, and Asian territories. Governed directly by Konami Card Database FAQs and the *Master Rules*. Master Duel primarily follows OCG mechanics.
* **TCG (Trading Card Game):** North America, Europe, Latin America, Oceania. Governed by Konami TCG tournament policy, where tournament Head Judges hold final authority on disputed interactions.

---

## 1. Cards Moved from Trigger Location Before Activation (2020 Revision)

### The Rule:
If a monster's trigger condition is met in a specific location (e.g., the field, GY, or banishment), but before the effect can activate on the chain it moves to a different location, does it activate?

* **OCG & Master Duel:** **NO.** If a monster is moved from the location where its trigger was met before it can activate (e.g. shuffled face-down into the Main Deck, returned to the face-down Extra Deck, or banished face-down), **it cannot activate**.
* **TCG:** TCG officially updated its rulebook in April 2020 to align with OCG regarding monsters returning to the Main Deck or Extra Deck. However, cards like *Interrupted Kaiju Slumber* or specific banish interactions historically experienced divergent judge interpretations. Always clarify: in modern OCG/MD, leaving the trigger location prevents activation.

---

## 2. Multiple Trigger Effects in the Hand

### The Scenario:
A player has multiple cards in their hand whose trigger conditions were met by the same event (e.g., two copies of a monster that triggers when another monster is destroyed).

* **OCG / Master Duel:** A player can only activate **ONE optional trigger effect from the hand per chain**. The second monster must wait for the next chain, and only if its condition is still valid.
* **TCG:** Players are allowed to activate **multiple optional trigger effects from the hand on the same chain**, ordered according to SEGOC rules.

---

## 3. SEGOC Priority & Private Knowledge (Hand Triggers)

When multiple trigger effects activate simultaneously:
1. Turn Player Mandatory
2. Opponent Mandatory
3. Turn Player Optional
4. Opponent Optional

### The Difference:
* **OCG:** Hand triggers (private knowledge) follow standard SEGOC optional slots.
* **TCG:** Some TCG Head Judges rule that trigger effects that reveal themselves from the hand (private knowledge) must be activated *after* all public knowledge optional triggers (field/GY) are activated, even for the same player.

---

## 4. Continuous Spell / Trap Activation Negation

* **Scenario:** A Continuous Spell (*Fire Formation - Tenki*, *Branded Lost*) is activated. Opponent activates an effect that negates the **activation** (*Solemn Judgment*, *Baronne de Fleur*).
  * **Both Formats:** The card is sent to the GY as a game mechanic without being treated as "destroyed on the field".
* **Scenario:** Opponent negates the **effect** (*Ghost Belle*, *Ash Blossom* against an effect).
  * **Both Formats:** The card remains face-up on the field.

---

## 5. Ruling Authority: Centralized DB vs. Head Judge Discretion

* **OCG:** The Konami Official Card Database provides exhaustive, individual card Q&A entries. These Q&As are legally binding in all sanctioned tournaments.
* **TCG:** Konami TCG does not maintain a public card-by-card Q&A database. TCG policy states:
  > *"The Head Judge is the final authority on all rulings during a tournament."*
* **Skill Directive:** When a user asks about an ambiguous interaction, state the definitive OCG/Master Duel ruling first, followed by:
  > *"In a sanctioned TCG tournament, always verify with your Head Judge prior to round 1, as TCG policy lacks a published card database FAQ."*

---

## 6. Architectural Provenance & Monorepo Links
* **ADR Design Record:** [ADR-003: Deterministic PSCT Adjudication & Rulings Engine](../../../docs/decisions/ADR-003-judge-skill.md)
* **Monorepo Architecture:** [ADR-004: Monorepo Architecture, Git Bloat Protection & Obsidian Branding](../../../docs/decisions/ADR-004-root-monorepo-structure.md)
* **Deterministic MCP Data Layer:** [mcp-servers/ygoprodeck](../../../mcp-servers/ygoprodeck)
* **Core Skill Definition:** [`ygo-judge` SKILL.md](../SKILL.md)
