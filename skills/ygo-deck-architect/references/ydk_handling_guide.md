# YDK Decklist Processing & Generation Guide

The `.ydk` (Yu-Gi-Oh! Deck) format is the universal standard used across all major simulators (EDOPro, YGO Omega, Project Ignis, DuelingBook, and Master Duel converters). This guide defines how the `ygo-deck-architect` ingests, parses, audits, and exports `.ydk` decklists.

---

## 1. The Standard `.ydk` Format Specification

A valid `.ydk` file is a plain-text document divided into three distinct section headers followed by 8-digit official card passcodes (one per line):

```text
#created by ygoprodeck-mcp
#main
44001993
12266229
46986414
98684220
14558128
14558128
14558128
#extra
59400890
37818794
!side
15693423
15693423
94145021
```

### Key Syntax Rules:
* `#created by ...`: Optional metadata comment line.
* `#main`: Marks the beginning of the Main Deck (40 to 60 cards).
* `#extra`: Marks the beginning of the Extra Deck (0 to 15 Fusion, Synchro, Xyz, Link monsters).
* `!side`: Marks the beginning of the Side Deck (0 to 15 cards). Notice the exclamation mark (`!`) prefix.
* Card IDs are numeric Konami passcodes printed on the bottom-left corner of official TCG/OCG cards.

---

## 2. Ingestion & Passcode Resolution Workflow

When a user submits a `.ydk` file, raw `.ydk` text, or retrieves a deck from `get_tournament_decklists`:

1. **Extract Passcodes & Quantities:**
   * Split lines by section (`#main`, `#extra`, `!side`).
   * Count occurrences of each passcode to determine quantity ($1\times, 2\times, 3\times$).
   * Validate deck size bounds:
     * Main Deck: $40 \le N \le 60$
     * Extra Deck: $\le 15$
     * Side Deck: $\le 15$
     * Maximum 3 copies of any card across all sections.

2. **Card Name & PSCT Resolution via MCP:**
   * Use `get_card_details(name_or_id: passcode)` via `ygoprodeck-mcp` (located at `mcp-servers/ygoprodeck`) to retrieve exact card names, archetypes, types, attributes, and PSCT text.
   * Verify legality across target formats using `check_banlist`.

---

## 3. Handling Multi-Engine "Pile Decks" in `.ydk` Files

Competitive Yu-Gi-Oh! frequently features 50-to-60 card "pile decks" that combine multiple distinct engine packages (e.g., *Azamina Mitsurugi Dark Magician*, *Fiendsmith Snake-Eye Kashtira*, *Tearlaments Horus Bystial Lightsworn*).

### Pile Deck Deconstruction Algorithm:
1. **Archetype Clustering:**
   * Tally Main Deck cards by their `archetype` field.
   * Any archetype with **$\ge 3$ Main Deck cards** represents an **Integrated Engine Package** (e.g., 4 Horus cards, 6 Bystial cards, 8 Snake-Eye cards).
   * **Rule:** Engine cluster cards must NOT be classified as generic tech. Classify them as Starters, Extenders, or Engine drivers.
2. **True Tech Isolation:**
   * Cards with `archetype IS NULL` (e.g., *Ash Blossom*, *Nibiru*, *Infinite Impermanence*, *Super Polymerization*, *Triple Tactics Talent*) are categorized as **Generic Non-Engine / Tech**.
   * Single or double splashes ($<3$ cards of an archetype not sharing synergies) are classified as **Splashed Tech**.
   * All cards under `!side` are categorized as **Sideboard Matchup Techs**.

---

## 4. End-to-End Audit & Optimization Pipeline

```
[Raw .ydk String / File]
          │
          ▼
1. Passcode & Section Extractor (Deduplicate & Count Quantities)
          │
          ▼
2. MCP Card Resolution (get_card_details -> Name, Type, PSCT, Archetype via ygoprodeck-mcp)
          │
          ▼
3. Taxonomy Tagging ([STARTER-NS], [STARTER-SS], [EXTENDER], [TECH-HT], [TECH-DEFENSIVE], [TECH-BREAKER], [HARD-BRICK], [ENGINE-BRICK])
   + Pile Deck Engine Clustering (protects secondary engines from tech misclassification)
          │
          ▼
4. Combinatoric Probability Computation:
   • Starter Consistency (n=5, target >90%)
   • Turn 0 Hand Trap Access (n=5)
   • Turn 1 Defensive Tech Access (n=5)
   • Turn 2 Board Breaker Access (n=6)
   • Hard Brick / Garnet Risk (n=5)
          │
          ▼
5. Output Deck Audit Scorecard + Visual ASCII Bar Chart
          │
          ▼
6. Optimization & Verbatim .ydk Export:
   • Propose specific adds / cuts to hit >90% consistency or adjust for meta counters.
   • Output clean, ready-to-save .ydk block.
```

---

## 5. Dynamic Sideboard Transition Patterns (Going First vs. Going Second)

Competitive play requires analyzing sideboarding not just as adding silver bullets, but as **purging dead cards**:

### The "Going-First Setup Shedding" Pattern:
* **The Problem:** Many decks require hard bricks going first (e.g. unsummonable Level 6/7 boss attachments like *R.B. Lambda Blade* / *Lambda Cannon*, or search-only Counter Traps like *R.B. Next Phase*). While mandatory to establish end-board interruptions on Turn 1, drawing these cards going second is fatal because they provide zero board-breaking utility.
* **The Solution (The 3-Card Swap Pattern):**
  - **Side OUT (Going Second):** Remove the dedicated Turn 1 setup pieces (`Lambda Blade` + `Lambda Cannon` + `Next Phase`).
  - **Side IN (Going Second):** Bring in 3 high-impact Turn 2 Board Breakers (*Forbidden Droplet*, *Lightning Storm*, *Triple Tactics Talent*, or *Nibiru*).
  - **Mathematical Impact:** Eliminates 3 dead draws from the deck while surging the probability of opening $\ge 1$ high-impact Turn 2 breaker ($n=6$) into the 70–85% range without sacrificing core starter density!

---

## 6. Standard `.ydk` Export Block Layout

Whenever the Architect suggests optimizations or creates a new deck build, always append a copy-pasteable `.ydk` code block:

````text
```ydk
#created by ygo-deck-architect
#main
<Main Deck Passcodes, one per line>
#extra
<Extra Deck Passcodes, one per line>
!side
<Side Deck Passcodes, one per line>
```
````

This allows the user to immediately save the snippet as `<deckname>.ydk` and load it directly into their simulator of choice.

---

## 7. Architectural Provenance & Monorepo Links
* **ADR Design Record:** [ADR-002: Competitive Deck Architecture & Hypergeometric Probability Engine](../../../docs/decisions/ADR-002-deck-architect-skill.md)
* **Monorepo Architecture:** [ADR-004: Monorepo Architecture, Git Bloat Protection & Obsidian Branding](../../../docs/decisions/ADR-004-root-monorepo-structure.md)
* **Deterministic MCP Data Layer:** [mcp-servers/ygoprodeck](../../../mcp-servers/ygoprodeck)
* **Core Skill Definition:** [`ygo-deck-architect` SKILL.md](../SKILL.md)
