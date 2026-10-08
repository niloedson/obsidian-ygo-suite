# Archetype Profile: [Archetype Name]

**Tier / Classification:** [Tier 1 / Tier 2 / Rogue / Experimental]  
**Primary Attributes & Types:** [e.g. FIRE Pyro / DARK Dragon / EARTH Machine]  
**Core Summoning Mechanics:** [e.g. Link Summon, Xyz Rank 4, Fusion, Synchro]  
**Target Deck Size:** [40 Cards (Max Consistency) / 45 Cards / 60-Card Pile]  

---

## 1. Canonical Engine Core & Ratios

### Main Deck Engine
* **Mandatory 3-Ofs (Linchpins & Primary Ignition):**
  - `[Card A]` ($3\times$) — Primary searcher; searches engine card on Normal or Special Summon.
  - `[Card B]` ($3\times$) — Primary enabler / field spell / ignition spell.
* **1-to-2-Ofs (Search Targets, Extenders & Payoffs):**
  - `[Card C]` ($1\text{–}2\times$) — High-impact searchable extender.
  - `[Card D]` ($1\times$) — Archetypal trap or end-board search target.

### Extra Deck Engine
* `[Boss 1]` ($1\text{–}2\times$) — Primary combo stepping stone.
* `[Boss 2]` ($1\times$) — Terminal end-board boss monster.

---

## 2. Functional Taxonomy Classifications

* **`[STARTER-NS]` (Normal Summon Starters, Cap at 4–6):**
  - `[Card Name]` — Normal Summon effect initiating primary combo line.
* **`[STARTER-SS]` (Special Summon Starters / Free Bodies):**
  - `[Card Name]` — Can initiate engine without consuming the Normal Summon.
* **`[STARTER-1.5]` (2-Card Discard / Synergy Starters):**
  - `[Card Name]` — Requires 1 discard or companion piece to achieve full combo.
* **`[EXTENDER]`:**
  - `[Card Name]` — Summons itself from hand or GY after an interruption.
* **`[HARD-BRICK]` (Garnets):**
  - `[Card Name]` — Dead in hand; must remain in Deck for combo searches.
* **`[ENGINE-BRICK]`:**
  - `[Card Name]` — High-level boss or situational trap that is suboptimal to open.

---

## 3. End-Board Routing & Sequencing

### A. Turn 1 Uninterrupted Routing
* **Step 1:** [Initiating action] $\rightarrow$ Summon `[Intermediate Monster]`.
* **Step 2:** Search `[Engine Spell/Trap]` $\rightarrow$ Link/Xyz climb into `[Boss 1]`.
* **Step 3:** Activate `[Boss 1]` effect $\rightarrow$ Final climb into `[Boss 2]`.
* **Standard End-Board:** `[Boss 2]` on field + `[Archetypal Trap]` set + `[Graveyard follow-up]`.

### B. Fallback Routing (Handling Interruption)
* **If Primary Search is Negated:** Pivot into `[Fallback Monster]` to secure at least 1 interruption.
* **Emergency Generic Bridge:** [e.g. 2-Effect monster bridge into generic Link engine].

### C. Going-First Setup Shedding (Sideboard Strategy)
When going second, cut these 3–4 setup-oriented cards in favor of non-engine board breakers:
1. Cut `[Setup Trap]` ($1\times$) $\rightarrow$ In: `[Evenly Matched / Dark Ruler No More]`
2. Cut `[Redundant Extender]` ($1\times$) $\rightarrow$ In: `[Nibiru / Kaiju]`
3. Cut `[Secondary Searcher]` ($1\times$) $\rightarrow$ In: `[Cosmic Cyclone / Lightning Storm]`

---

## 4. Proven Secondary Engine Synergies (Pile Clustering)

* **Engine A:** [Description of synergy, e.g. shared Type/Attribute or free Level bodies].
* **Engine B:** [Description of synergy].
* **Strict Anti-Synergies & Hard Locks:**
  - [List any Type locks, Attribute locks, or Extra Deck summon locks].

---

## 5. Chokepoints & Counter-Play Matrix

| Opponent Interruption | Target Card / Chokepoint | Impact Severity | Recommended Counter-Line / Insulation |
| :--- | :--- | :---: | :--- |
| **Ash Blossom & Joyous Spring** | `[Card Name]` | High / Med / Low | [Insulation or bait strategy] |
| **Droll & Lock Bird** | `[1st Search Event]` | High / Med / Low | [Play around Droll] |
| **Nibiru, the Primal Being** | 5th Summon Window | High / Med / Low | [Summon negate prior to 5th summon or fallback] |
| **Infinite Impermanence** | `[Field Monster]` | High / Med / Low | [Dodge with quick-play tribute or extender] |

---

## 6. Hypergeometric Benchmarks

* **Minimum Starters for $>90\%$ Consistency ($n = 5$):**
  - 40-Card Deck: **$\ge 14$ Starters** ($P = 90.0\%$).
  - 45-Card Deck: **$\ge 16$ Starters** ($P = 90.3\%$).
  - 60-Card Deck: **$\ge 22$ Starters** ($P = 90.8\%$).
* **Garnet Draw Risk Cap:** $\le 12.5\%$ (maximum 1 hard brick in 40 cards).
* **Hand Trap Defense Target ($n = 5$):** $\ge 12$ Hand Traps ($P(\ge 1) \ge 85.1\%$, $P(\ge 2) \ge 48.0\%$).

---

## 7. Architectural Provenance & Monorepo Links
* **ADR Design Record:** [ADR-002: Competitive Deck Architecture & Hypergeometric Probability Engine](../../../../docs/decisions/ADR-002-deck-architect-skill.md)
* **Monorepo Architecture:** [ADR-004: Monorepo Architecture, Git Bloat Protection & Obsidian Branding](../../../../docs/decisions/ADR-004-root-monorepo-structure.md)
* **Parent Skill:** [`ygo-deck-architect` SKILL.md](../../SKILL.md)
