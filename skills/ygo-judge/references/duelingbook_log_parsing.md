# Dueling Book Match Log Parsing & Dispute Arbitration Guide

This guide establishes the official adjudication protocol for analyzing raw match logs exported from **Dueling Book** (`duel_log_example.txt`).

---

## 1. Dueling Book Log Syntax & Action Primitives

A Dueling Book log records every timestamped player action, zone transfer, phase shift, and chat interaction.

### A. Turn & Phase Indicators
* `----------------(Turn X)----------------`: Demarcates turn progression.
* `Entered Standby Phase`, `Entered Main Phase 1`, `Entered Battle Phase`, `Entered Main Phase 2`, `Entered End Phase`: Formal phase shifts.

### B. Board Zone Coordinates
* **`M-1` through `M-5`**: Main Monster Zones (columns 1 to 5 from the player's perspective).
* **`Right EMZ` / `Left EMZ`**: Extra Monster Zones.
* **`S-1` through `S-5`**: Spell & Trap Zones (columns 1 to 5).
* **`Field Spell Zone`**: Field Spell placement.
* **`hand (X/Y)`**: Player hand representation (e.g. Card index X out of Y total in hand).
* **`GY`**, **`Banish`**, **`Extra Deck`**, **`Deck`**: Public and private zones.

### C. Action Primitives & Mechanics
* **`Declared effect of [Card] in [Zone]`**: Initiation of an activated effect (Chain Link creation).
* **`Pointed at [Card] in [Zone]`**: Target selection made at the point of activation (PSCT text before the semicolon `;`).
* **`Signaled OK`**: Passing priority or consenting to the resolution of the current chain link / action.
* **`Sent [Card] from [Zone] to GY`**: Paying an activation cost, tributing, or sending via resolution.
* **`Overlayed [A] in [Zone] onto [B] in [Zone]`**: Declaring an Xyz Summon with materials.
* **`Detached Xyz Material [A] from [B] in [Zone]`**: Paying cost or resolving effect via material detach.
* **`"[Chat text]"`**: In-game player chat (used for priority inquiries like `"sp"`, `"ok?"`, `"negate?"`, or dispute callouts).

---

## 2. Common Illegal Log Patterns & Case Studies

### Case Study A: Invalid Activation Condition ("Placed" vs. "Added")
*(Extracted from `duel_log_example.txt`, lines 240–260)*
```text
[12:17] Placed Artmage Impasto -Recapture- from Deck to S-2
[12:18] Stopped viewing Deck
[12:18] Shuffled deck
[12:25] Declared effect of Droll & Lock Bird in hand (1/5)
[12:28] Sent Droll & Lock Bird from hand (1/5) to GY
[12:30] "???"
[12:34] "eu nao add nada"
[12:36] Returned Droll & Lock Bird from GY to hand
```
* **Analysis:** *Droll & Lock Bird* requires a card to be **added from the Main Deck to the hand**. Placing a card directly onto the field from the Deck (`Placed ... from Deck to S-2`) is a game action distinct from adding to hand.
* **Ruling:** The activation of *Droll & Lock Bird* was **illegal**. The game state must be rewound: *Droll & Lock Bird* returns to the player's hand, and no lingering restriction is applied.

### Case Study B: Standby Phase Priority Interception
```text
[0:22] "m1?"
[0:25] "sp"
[0:27] Entered Standby Phase
[0:27] Declared effect of Mulcharmy Purulia in hand (4/5)
```
* **Analysis:** Turn player intended to enter Main Phase 1 (`"m1?"`), but non-turn player held priority in the Standby Phase (`"sp"`). Turn player correctly entered Standby Phase before non-turn player dropped *Mulcharmy Purulia*.
* **Ruling:** Legal priority negotiation. The non-turn player has the legal right to activate fast effects in the Standby Phase before Main Phase 1 begins.

### Case Study C: Illegal Targeting
```text
[M:SS] Declared effect of [Card A] in M-1
[M:SS] Pointed at [Opponent Monster] in M-3
```
* **Verification:** Check whether the pointed target possesses targeting immunity (e.g. *"Cannot be targeted by opponent's card effects"*). If pointed at an untargetable card, the activation is illegal; rewind target selection or activation.

---

## 3. Duel Log Adjudication Workflow

When asked to audit a Dueling Book log or resolve a player dispute:

1. **Locate Timestamp & Context:**
   * Isolate the exact timestamp (`[M:SS]`) and Turn/Phase where the dispute arose.
2. **Extract Chain & Zone Movements:**
   * Reconstruct the exact chain links, card origins, targets (`Pointed at`), and consent signals (`Signaled OK`).
3. **Verify PSCT Legality via MCP:**
   * Call `get_card_details` via `ygoprodeck-mcp` (located at `mcp-servers/ygoprodeck`) on the disputed card to verify exact conditions (`:`), costs/targets (`;`), and resolution text.
4. **Determine Game State Integrity & Penalty:**
   * **Legal Action:** Affirm the play, citing PSCT.
   * **Illegal Action (Irreversible):** If cards were subsequently shuffled or hidden information revealed, evaluate irreparable game state policy.
   * **Illegal Action (Reversible):** Prescribe the exact rewind steps (return card to hand, reinstate LP, un-set card).

---

## 4. Architectural Provenance & Monorepo Links
* **ADR Design Record:** [ADR-003: Deterministic PSCT Adjudication & Rulings Engine](../../../docs/decisions/ADR-003-judge-skill.md)
* **Monorepo Architecture:** [ADR-004: Monorepo Architecture, Git Bloat Protection & Obsidian Branding](../../../docs/decisions/ADR-004-root-monorepo-structure.md)
* **Deterministic MCP Data Layer:** [mcp-servers/ygoprodeck](../../../mcp-servers/ygoprodeck)
* **Core Skill Definition:** [`ygo-judge` SKILL.md](../SKILL.md)
