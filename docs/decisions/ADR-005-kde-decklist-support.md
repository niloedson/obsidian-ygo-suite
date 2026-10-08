# ADR-005: Konami Official Tournament Decklist (KDE) Engine

* **Status:** Accepted  
* **Date:** 2026-10-07  
* **Context:** Official Tournament Registration, Deck Verification & Error Prevention  
* **Author / Team:** Obsidian Team  
* **Affected Assets:** `skills/ygo-deck-architect`, `skills/ygo-deck-architect/references/KDE_DeckList.pdf`, `skills/ygo-deck-architect/scripts/kde_decklist.py`  

---

## 1. Context & Problem Statement

Sanctioned Tier-2+ Premier Yu-Gi-Oh! tournaments (YCS, WCQ, National Championships, Regional Qualifiers) require physical submission or verification of the official Konami Digital Entertainment (KDE) Decklist. 

Competitors and tournament organizers face recurring failure modes:
1. **Arithmetic Discrepancies:** Mismatches between individual card counts (e.g. $1\times, 2\times, 3\times$) and written section totals (`Total Monster Cards`, `Main Deck Total`), triggering official **Deck Error** penalties under KDE Tournament Policy Section IX.
2. **Format Impedance Mismatch:** Modern deck design occurs in digital simulators (`.ydk` files), which do not categorize Main Deck cards into Monsters, Spells, and Traps, forcing manual, error-prone transcription.
3. **Lack of Automated Ingestion:** When reviewing or auditing an existing physical or PDF decklist, players and judges lack an automated parser to verify legality, detect errors, and simulate opening hand probabilities.

---

## 2. Decision & Architecture Transformations

The Obsidian Team designed a deterministic, bi-directional PDF engine within `skills/ygo-deck-architect`:

| Dimension | Engineering Transformation |
| :--- | :--- |
| **S - Substitute** | Substitute manual form filling with automated 183-field AcroForm population from `.ydk` and JSON. |
| **C - Combine** | Combine PDF parsing with the local SQLite `cards.db` to automatically classify cards into Monsters, Spells, and Traps. |
| **A - Adapt** | Adapt alternate artwork passcodes (e.g. Nibiru, Ash Blossom) via offset heuristics (`[-4, +2]`) to canonical card entities. |
| **M - Modify / Magnify** | **Double-Entry Arithmetic Auditing:** Magnify discrepancy detection by comparing sum of itemized lines directly against sheet totals ($\Delta = \sum \text{Count}_i - \text{Total}_{\text{Recorded}}$). |
| **P - Put to Another Use** | Repurpose filled PDFs by extracting card rosters, generating simulator `.ydk` files, and feeding them directly into `calculate_odds.py`. |
| **E - Eliminate** | Eliminate Tournament Policy Section IX Deck Errors (Game Loss / DQ risks) before Round 1. |
| **R - Reverse / Rearrange** | Bi-directional pipeline: `.ydk` $\rightarrow$ Filled KDE PDF $\longleftrightarrow$ Ingested PDF $\rightarrow$ `.ydk` $\rightarrow$ Hypergeometric Scorecard. |

---

## 3. Technical Implementation Details

### A. Exact 183-Field AcroForm Taxonomy
The official template `references/KDE_DeckList.pdf` is an interactive AcroForm text document containing:
* **9 Header Metadata Fields:** Player names (`First  Middle Names`, `Last Names`, `Last Name Initial`), `CARD GAME ID`, `Country of Residency`, `Event Name`, and 3 date fields (`Event Date - Month`, `Event Date - Day`, `Event Date - Year`).
* **112 Main Deck Fields:** 18 Monster slots, 18 Spell slots, 18 Trap slots with corresponding count fields, plus individual section totals and `Main Deck Total`.
* **62 Extra & Side Deck Fields:** 15 Extra Deck slots and 15 Side Deck slots with corresponding count fields and total fields.

### B. Deterministic Python Tooling
Implemented at `skills/ygo-deck-architect/scripts/kde_decklist.py` with zero dependencies beyond the standard library and `pypdf`. Includes:
* `fill_kde_decklist`: Validates slot bounds ($\le 18$ monsters/spells/traps, $\le 15$ extra/side), sorts cards alphabetically (A-Z) for tournament judge convenience, populates fields, and enables `/NeedAppearances`.
* `read_kde_decklist`: Extracts text, computes true counts, audits against recorded totals, and flags discrepancies.
* `kde_to_ydk`: Reconstructs simulator-ready `.ydk` using the local SQLite database.
* `--test`: Built-in regression verification suite.

---

## 4. Consequences & Downstream Artifacts

* **Production Integration:** Available directly to the AI agent in `skills/ygo-deck-architect`.
* **Traceable Scripting:** Added `npm run test:kde` to root workspace.
* **Pre-Tournament Verification:** Competitors can run automated audits of their registered decklists before tournament check-in.
