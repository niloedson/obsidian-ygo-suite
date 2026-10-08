# KDE Official Tournament Decklist Specification & Processing Guide

The **Konami Digital Entertainment (KDE) Official Decklist** (`references/KDE_DeckList.pdf`) is the mandatory standard required for physical deck registration at Sanctioned Tier-2+ Premier Events (Yu-Gi-Oh! Championship Series / YCS, World Championship Qualifiers / WCQ, National Championships, Regional Qualifiers, and OTS Championships).

This guide defines how the `ygo-deck-architect` skill manages the complete lifecycle of KDE Decklists: **automated generation/filling from `.ydk` decklists**, **parsing and ingestion from filled PDFs**, **strict arithmetic discrepancy auditing**, and **seamless pipeline conversion to simulator `.ydk` files and hypergeometric probability scorecards**.

---

## 1. KDE AcroForm Architecture & Field Taxonomy

The official Konami PDF template contains **183 interactive AcroForm text fields** (`/Tx`). Every field is mapped with exact key naming:

```text
+--------------------------------------------------------------------------------------------------+
|                            KDE DECKLIST ACROFORM TAXONOMY (183 FIELDS)                           |
+--------------------------------------------------------------------------------------------------+
|                                                                                                  |
|  [HEADER / PLAYER & TOURNAMENT METADATA] (9 Fields)                                             |
|  • First  Middle Names       (Note: double space in official KDE form)                           |
|  • Last Names                • Last Name Initial                                                |
|  • CARD GAME ID              (Konami 10-digit ID / Cossy)                                        |
|  • Country of Residency      • Event Name                                                       |
|  • Event Date - Month (MM)   • Event Date - Day (DD)        • Event Date - Year (YYYY)           |
|                                                                                                  |
|  [MAIN DECK - 3 DISTINCT CATEGORIES] (112 Fields)                                                |
|  ┌─────────────────────────┬──────────────────────────┬──────────────────────────┐               |
|  │ MONSTER CARDS (37 Flds) │ SPELL CARDS (37 Fields)  │ TRAP CARDS (37 Fields)   │               |
|  ├─────────────────────────┼──────────────────────────┼──────────────────────────┤               |
|  │ Monster 1 .. 18         │ Spell 1 .. 18            │ Trap 1 .. 18             │               |
|  │ Monster Card 1..18 Count│ Spell Card 1..18 Count   │ Trap Card 1..18 Count    │               |
|  │ Total Monster Cards     │ Total Spell Cards        │ Total Trap Cards         │               |
|  └─────────────────────────┴──────────────────────────┴──────────────────────────┘               |
|  • Main Deck Total (1 Field: sum of Monsters + Spells + Traps; must be 40 to 60)                |
|                                                                                                  |
|  [EXTRA & SIDE DECKS] (62 Fields)                                                                |
|  ┌────────────────────────────────────────┬─────────────────────────────────────────┐            |
|  │ SIDE DECK (31 Fields)                  │ EXTRA DECK (31 Fields)                  │            |
|  ├────────────────────────────────────────┼─────────────────────────────────────────┤            |
|  │ Side Deck 1 .. 15                      │ Extra Deck 1 .. 15                      │            |
|  │ Side Deck 1 .. 15 Count                │ Extra Deck 1 .. 15 Count                │            |
|  │ Total Side Deck (max 15)               │ Total Extra Deck (max 15)               │            |
|  └────────────────────────────────────────┴─────────────────────────────────────────┘            |
|                                                                                                  |
+--------------------------------------------------------------------------------------------------+
```

---

## 2. Card Categorization & Registration Constraints

When converting from simulator `.ydk` files or raw card lists to the KDE PDF sheet, cards must be partitioned strictly according to Konami Tournament Rules:

1. **Main Deck Monster Cards (`Monster 1..18`):**
   * Normal Monsters, Effect Monsters, Tuner Monsters, Flip Monsters, Ritual Monsters.
   * **Pendulum Monsters:** Start the duel in the Main Deck; they must be listed under **MONSTER CARDS**, never under Spells or Extra Deck.
2. **Main Deck Spell Cards (`Spell 1..18`):**
   * Normal Spells, Quick-Play Spells, Continuous Spells, Field Spells, Equip Spells, Ritual Spells.
3. **Main Deck Trap Cards (`Trap 1..18`):**
   * Normal Traps, Continuous Traps, Counter Traps.
4. **Extra Deck (`Extra Deck 1..15`):**
   * Fusion Monsters, Synchro Monsters, Xyz Monsters, Link Monsters. Maximum **15 cards**.
5. **Side Deck (`Side Deck 1..15`):**
   * Up to **15 cards** of any type (Monsters, Spells, Traps, Extra Deck cards).
6. **Slot Capacity Rules:**
   * Monsters: maximum **18 distinct card names**.
   * Spells: maximum **18 distinct card names**.
   * Traps: maximum **18 distinct card names**.
   * Extra Deck: maximum **15 distinct card names**.
   * Side Deck: maximum **15 distinct card names**.
   * *Note:* Decks targeting Tier-1 competitive play with 40–45 cards and 3-ofs routinely use 12–15 monster lines and 5–8 spell lines, fitting easily within the official KDE form.

---

## 3. Discrepancy Auditing & Tournament Policy Protection

Under **KDE Tournament Policy Section IX (Tournament Violations - Deck Error)**:
* A mismatch between the written totals on the sheet and the actual sum of card lines results in an official **Deck Error**.
* Submitting an illegal card count (<40 Main, >60 Main, >15 Extra/Side) carries a mandatory penalty of **Game Loss** (or **Disqualification** if discovered during an active game with unlisted cards).
* Playing more than 3 copies of a card across Main, Side, and Extra decks combined is strictly illegal.

The engine (`kde_decklist.py`) automatically executes a **Double-Entry Arithmetic Audit**:
$$\Delta_{\text{Section}} = \sum_{i} \text{Count}_i - \text{Total}_{\text{Recorded}}$$
If $\Delta \ne 0$, the discrepancy is flagged with exact delta values (e.g. `Main Deck Total mismatch: sheet recorded '40', but listed cards sum to '41' (+1)`), allowing competitors to correct errors before registration closes.

---

## 4. Bi-Directional Engineering Workflows

### Workflow A: Generating Filled KDE Decklists from `.ydk`

```
[.ydk Deck File]
       │
       ▼
1. Passcode Extractor (#main, #extra, !side)
       │
       ▼
2. Local Database Resolution (cards.db -> Name, Card Type, Alternate Art Offsets)
       │
       ▼
3. Rule-Based Classification (Monsters vs Spells vs Traps vs Extra vs Side)
       │
       ▼
4. Alphabetical Sorting (A-Z within each category for tournament judge legibility)
       │
       ▼
5. Form Population & Appearance Generation (pypdf -> /NeedAppearances: True)
       │
       ▼
[Print-Ready Filled KDE_DeckList.pdf]
```

### Workflow B: Ingesting Filled KDE Decklists into Probability Engine

```
[Filled KDE_DeckList.pdf]
       │
       ▼
1. AcroForm Field Extractor (183 Fields -> Player Metadata + Card Rows)
       │
       ▼
2. Arithmetic Audit (Validate Calculated Sums vs Recorded Sheet Totals)
       │
       ▼
3. Tournament Legality Check (40-60 Main, <=15 Extra/Side, <=3 Copies)
       │
       ▼
4. Passcode Resolution (cards.db -> Official 8-Digit Passcodes)
       │
       ├──> Export Simulator .ydk File
       │
       ▼
5. Feed into calculate_odds.py (Hypergeometric Consistency & Probability Scorecard)
```

---

## 5. CLI Command Reference (`kde_decklist.py`)

The skill bundles `skills/ygo-deck-architect/scripts/kde_decklist.py` with zero dependencies beyond standard library and `pypdf`:

### A. Fill Official KDE Decklist PDF
```bash
python skills/ygo-deck-architect/scripts/kde_decklist.py fill \
  --ydk "decks/RB (Revol Bots).ydk" \
  --output "reports/KDE_DeckList_RevolBots.pdf" \
  --name "Yugi Muto" \
  --id "1234567890" \
  --country "Japan" \
  --event "YCS Indianapolis 2026" \
  --date "2026-10-07"
```

### B. Read & Audit an Existing Filled Decklist PDF
```bash
python skills/ygo-deck-architect/scripts/kde_decklist.py read "reports/KDE_DeckList_RevolBots.pdf"
```

### C. Read and Convert Directly to Simulator `.ydk`
```bash
python skills/ygo-deck-architect/scripts/kde_decklist.py read "reports/KDE_DeckList_RevolBots.pdf" \
  --ydk-out "decks/RevolBots_Recovered.ydk"
```

### D. Execute Test Suite
```bash
python skills/ygo-deck-architect/scripts/kde_decklist.py --test
# Or via npm script:
npm run test:kde
```

---

## 6. Architecture Alignment & Provenance

* **Template Reference:** [`KDE_DeckList.pdf`](KDE_DeckList.pdf)
* **Simulator Integration:** [`ydk_handling_guide.md`](ydk_handling_guide.md)
* **Combinatoric Engine:** [`calculate_odds.py`](../scripts/calculate_odds.py)
* **Architecture Decision Records:**
  * [ADR-005: Konami Official Tournament Decklist (KDE) Engine](../../../docs/decisions/ADR-005-kde-decklist-support.md)
  * [ADR-002: Competitive Deck Architecture & Hypergeometric Probability Engine](../../../docs/decisions/ADR-002-deck-architect-skill.md)
  * [ADR-001: Air-Gapped, Local-First MCP Server Architecture](../../../docs/decisions/ADR-001-hardened-mcp-server.md)
