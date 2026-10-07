# Genesys Format Architectural & Deck Construction Guide

**Yu-Gi-Oh! GENESYS** is an official Konami alternative format (debuting 2025/2026 across TCG and OCG) designed to reduce modern power creep, encourage interactive board states, and replace the traditional Forbidden & Limited banlist with a granular **Point Budget System**.

This reference defines how the `ygo-deck-architect` validates, audits, and constructs decks for the **Genesys Format**.

---

## 1. Core Format & Field Regulations

### A. Mechanical Bans (Strict Disqualification)
* **Zero Link Monsters:** Link Monsters are strictly **forbidden** in Main, Extra, and Side decks.
* **Zero Pendulum Monsters:** Pendulum Monsters (Normal, Effect, Fusion, Synchro, Xyz) are strictly **forbidden**.
* **Allowed Mechanics:** Fusion, Synchro, Xyz, Ritual, Tribute, and Normal/Special Summons are fully permitted.

### B. Classic Field Layout (Pre-MR4)
* **5 Main Monster Zones** (No Extra Monster Zones). Extra Deck monsters are summoned directly into any open Main Monster Zone.
* **5 Spell & Trap Zones** (No dedicated Pendulum Zones).

### C. Deck Size Constraints
* **Main Deck:** 40 to 60 cards.
* **Extra Deck:** 0 to 15 cards.
* **Side Deck:** 0 to 15 cards.
* **Card Copy Limit:** Up to 3 copies per card by name (subject to point budget).

---

## 2. The 100-Point Budget System

In Genesys, there is **no traditional banlist** (no forbidden or limited designations). Instead, cards carry a point cost:

1. **The Combined Budget Rule:**
   $$\sum (\text{Card Point Cost} \times \text{Copies Run}) \le 100 \text{ Points}$$
   The point cap (default: **100 points**) applies to the **entire 70-to-90 card list combined**:
   $$\text{Total Points} = \text{Points}_{\text{Main}} + \text{Points}_{\text{Extra}} + \text{Points}_{\text{Side}} \le 100$$
   *(Note: Custom tournament formats may set custom caps such as 0-Point "Pauper/Staple-Free", 50-Point, or 200-Point).*

2. **Point Tiers & Cost Distribution:**
   * **0 Points (The Foundation):** The vast majority (~95%) of Yu-Gi-Oh! cards cost 0 points. Core archetype cards, rogue strategies, and standard engine pieces cost 0 points.
   * **1–20 Points (Solid Staples & Consistency):** Popular hand traps, common board breakers, and generic searchers/draw spells (e.g. *Ash Blossom & Joyous Spring*, *Allure of Darkness*, *Infinite Impermanence*).
   * **30–60 Points (High-Impact Engine Linchpins):** Explosive starters, historic power cards, or archetype-defining power spells (e.g., *Branded Fusion*, *Pot of Greed*, historic power pieces).
   * **100 Points (Silver Bullet Floodgates & Win-Cons):** Oppressive continuous floodgates or turn-skips (e.g., *Skill Drain*, *Abyss Dweller*, *Anti-Spell Fragrance*, *Archlord Kristya*). Running a single 100-point card consumes your entire deck's point budget.

3. **TCG vs. OCG Points Lists:**
   * TCG Genesys and OCG Genesys maintain separate official point allocation tables. Ensure point lookups match the requested sub-format.

---

## 3. Strategic Deck Construction Heuristics in Genesys

### A. The 0-Point Core Axiom
In Advanced format, decks often pack 15–18 generic staples because they cost zero deck-building budget outside of card slots. In Genesys:
* Every pointed staple directly reduces your budget for power engine extenders or sideboard cards.
* **Architectural Strategy:** Maximize high-synergy **0-point engine engines and search loops**. Rely on in-engine removal and archetype-native interaction before spending points on generic staples.

### B. Point Allocation Archetypes:
1. **The Balanced Interaction Profile (Recommended for Mid-Range / Control):**
   * ~40–50 points on Hand Traps / Board Breakers (e.g., 2x 15-pt hand traps + 1x 20-pt breaker).
   * ~30–40 points on Key Engine Extenders or Power Spells.
   * ~10–20 points reserved in the **Side Deck** for dedicated matchup hate.
2. **The "Boss Floodgate" Profile:**
   * 100 points invested into a single game-ending floodgate (e.g., *Skill Drain* or *Abyss Dweller*).
   * Remaining 39+ Main, 15 Extra, and 15 Side cards MUST ALL be 0-point cards.
3. **The Unpointed Rogue Swarm (0-Point Specialization):**
   * 0 points spent across Main, Extra, and Side.
   * Leverages complete archetype independence, overwhelming opponent pointed decks with engine density and consistency while ignoring budget limits.

### C. Sideboard Point Traps
A critical mistake made by unguided players is spending all 100 points on the Main and Extra decks, leaving 0 points for the Side Deck.
* In Genesys, sideboarding an expensive staple (*Evenly Matched*, *Droll & Lock Bird*) is illegal if the total deck points exceed 100.
* **The Rule:** Always budget at least **15–25 points** for high-impact Side Deck silver bullets.

---

## 4. Genesys Deck Audit Scorecard Component

When auditing or building a Genesys decklist, insert this specialized audit block into the standard scorecard:

```text
[GENESYS FORMAT COMPLIANCE & POINT AUDIT]
• Link / Pendulum Monsters Detected: 0 [★ LEGAL - NO FORBIDDEN MECHANICS]
• Target Point Cap:                  100 Points
• Main Deck Points:                  [XX] Points
• Extra Deck Points:                 [YY] Points
• Side Deck Points:                  [ZZ] Points
--------------------------------------------------------------------------------
• TOTAL POINT EXPENDITURE:           [XX + YY + ZZ] / 100 Points [★ BUDGET COMPLIANT / OVER BUDGET]
• REMAINING POINT ALLOWANCE:         [100 - Total] Points

[POINTED CARDS ITEMIZED BILL]
| Card Name | Section | Quantity | Pts/Copy | Total Pts | % of Budget |
| :--- | :---: | :---: | :---: | :---: | :---: |
| Ash Blossom & Joyous Spring | Main | 2 | 20 | 40 | 40.0% |
| Infinite Impermanence | Main | 2 | 15 | 30 | 30.0% |
| Abyss Dweller | Extra | 0 | 100 | 0 | 0.0% |
| Droll & Lock Bird | Side | 2 | 10 | 20 | 20.0% |
```

---

## 5. MCP Server Integration for Deterministic Point Audits

The `ygoprodeck-mcp` server (located at `mcp-servers/ygoprodeck`) exposes dedicated tools to programmatically audit Genesys decklists:

1. **`get_genesys_points`**:
   * Accepts an array of card names or 8-digit numeric passcodes:
     ```json
     { "cards": ["Ash Blossom & Joyous Spring", "Abyss Dweller", "Accesscode Talker"] }
     ```
   * Returns:
     * `total_points`: Combined points spent.
     * `point_cap`: 100 points.
     * `is_budget_compliant`: boolean ($\le 100$).
     * `is_mechanically_legal`: boolean (false if any Link or Pendulum cards are found).
     * `forbidden_mechanics_count`: Number of Link/Pendulum monsters detected.
     * `pointed_cards`: Itemized list with exact point costs and legal statuses.
2. **`check_banlist(format: "genesys")`**:
   * Returns legality per card: `"Unlimited (0 Points)"`, `"Pointed (XX Points)"`, or `"Forbidden (Link and Pendulum Monsters are strictly illegal in Genesys)"`.
3. **`get_card_details`**:
   * Always includes the exact `genesys_points` integer directly in the card's profile.

---

## 6. Architectural Provenance & Monorepo Links
* **ADR Design Record:** [ADR-002: Competitive Deck Architecture & Hypergeometric Probability Engine](../../../docs/decisions/ADR-002-deck-architect-skill.md)
* **Monorepo Architecture:** [ADR-004: Monorepo Architecture, Git Bloat Protection & Obsidian Branding](../../../docs/decisions/ADR-004-root-monorepo-structure.md)
* **Deterministic MCP Data Layer:** [mcp-servers/ygoprodeck](../../../mcp-servers/ygoprodeck)
* **Core Skill Definition:** [`ygo-deck-architect` SKILL.md](../SKILL.md)

