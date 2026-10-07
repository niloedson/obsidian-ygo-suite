# Card Taxonomy & Classification Guide

In modern Yu-Gi-Oh!, every card in a deck must serve an exact mathematical and strategic role.

---

## 1. Engine Cards

### `[STARTER-NS]`: Normal Summon 1-Card Starter
* **Definition:** A card that, upon Normal Summon, initiates a full engine combo line by itself.
* **Examples:** *Snake-Eye Ash*, *Branded Aluber*, *Rescue-ACE Air Lifter*, *Tour Guide From the Underworld*.
* **Rule:** Limit `[STARTER-NS]` to **4–6 cards per deck**. Opening multiple NS starters creates severe hand contention, as only one can be normal summoned per turn.

### `[STARTER-SS]`: Special Summon / Spell 1-Card Starter
* **Definition:** A 1-card starter that does not consume the turn's Normal Summon.
* **Examples:** *Bonfire*, *Emergency Teleport*, *Quick Launch*, *A Hero Lives*.
* **Rule:** The most valuable cards in the game. Maximize these whenever possible.

### `[STARTER-1.5]`: Discard/Tribute-Reliant Starter
* **Definition:** Initiates full combo, but requires 1 generic card as a discard or tribute cost.
* **Examples:** *Diabellstar the Black Witch*, *The Bystial Lubellion*, *Cyber Emergency*.
* **Rule:** Synergizes with extenders and GY-triggering cards, but is vulnerable to hand-size reduction.

### `[EXTENDER]`: Combo Extender / Re-Starter
* **Definition:** A card that special summons itself, triggers from the GY, or continues playlines if the initial normal summon or starter is negated.
* **Examples:** *Parallel eXceed*, *Kashtira Fenrir*, *Wanted: Seeker of Sinful Spoils*.

---

## 2. Bricks & Engine Drivers

### `[HARD-BRICK]`: Zero-Utility / High-Level / Unplayable Dead Draws
* **Definition:** A card with zero standalone utility in the opening hand that cannot be played or summoned independently.
  1. **Tribute Monsters with No Inherent SS:** High-level monsters (Level 5+) lacking inherent special summon effects from hand that require Extra Deck bosses or spells to recruit directly from Deck/GY (e.g., *R.B. Lambda Blade* [Lv 7], *R.B. Lambda Cannon* [Lv 6], *Gem-Knight Garnet*). Drawing them leaves a completely unplayable card in hand.
  2. **In-Engine Traps:** Traps that do not initiate plays and are designed to be set directly from Deck or GY by Extra Deck bosses (e.g., *R.B. Next Phase*, *R.B. Last Stand*). Opening them in your 5-card Turn 1 hand provides zero combo material.
* **Management:** Siding out hard bricks going second is standard practice, replacing them with high-impact breakers or hand traps.

### `[ENGINE-BRICK]` / `[CONDITIONAL-BRICK]`: Context-Dependent Splash Bricks
* **Definition:** A card that functions as an extender in its native archetype, but becomes a conditional brick when splashed as a minimal package because its utility depends strictly on specific hand combinations and Normal Summon conflicts.
* **Key Example (*Sky Striker Ace - Roze* in R.B. Striker):**
  - *Pillar of the Future - Cyanos* recruits Roze ONLY from the **Deck or GY** (not from hand!).
  - Cyanos is a "Sky Striker" card, but NOT a "Sky Striker Ace" monster, so normal summoning Cyanos cannot trigger Roze in hand.
  - **Dead When Paired with Cyanos:** If opened alongside Cyanos, Roze is dead in hand—she consumes the Normal Summon that Cyanos requires, cannot be special summoned by Cyanos from hand, and leaves Cyanos stranded as a single 500 ATK body.
  - **Fully Live When Paired with R.B. Extenders:** If opened alongside an R.B. Extender (*Ga10 Driller*, *Ga10 Cutter*, *Ga10 Pile Bunker*, *VALCan Rocket*), Roze is NOT dead. The pilot Special Summons the R.B. Extender first (while controlling no monsters), Normal Summons Roze, and links Roze into any Link-1 Sky Striker Ace (*Kagari*, *Hayate*, or *Shizuku*). Because all Link-1 Sky Striker Aces are **Machine** monsters, this immediately provides the 2nd Machine body on field alongside the R.B. Extender to Link Summon `R.B. VALCan Booster` $\rightarrow$ full combo! (Alternatively, R.B. Extender + Roze = 2 Effect Monsters $\rightarrow$ `Sky Striker Ace - Camellia` $\rightarrow$ full combo).
  - **Live When Paired with Striker Spells:** Roze also triggers her hand special summon if paired with *Hornet Drones* or *Engage*, since making a Link-1 Ace fulfills her summon trigger.
* **Rule:** When evaluating splash engines, classify cards as conditional bricks if their utility depends strictly on hand sequencing and non-clashing Normal Summons.

### `[SOFT-BRICK]`: Sub-Optimal Draw
* **Definition:** A card that is sub-optimal to open (such as a high-level boss monster with situational summoning or a secondary search spell when you already have the field), but does NOT kill your combo if drawn. Can be discarded as cost, tributed, or activated later in the turn.

---

## 3. Non-Engine / Tech Cards

### `[TECH-HANDTRAP]`: Turn 0 Interruption
* **Definition:** Lowers opponent end-board ceiling during their Turn 1 from hand.
* **Examples:** *Ash Blossom & Joyous Spring*, *Infinite Impermanence*, *Nibiru, the Primal Being*, *Droll & Lock Bird*, *Mulcharmy Fuwalos*, *Mulcharmy Purulia*.
* **Evaluation Window:** **$n = 5$ Cards**.

### `[TECH-DEFENSIVE]`: Turn 1 Anti-Interruption / Combo Insulation
* **Definition:** Quick-Play spells or protection staples used proactively on Turn 1 to insulate your primary combo line against opponent hand traps, or protect an established board against Turn 2 disruptions.
* **Examples:** *Called by the Grave*, *Crossout Designator*, *Sauravis, the Ancient and Ascended*, *Prohibition*.
* **Evaluation Window:** **$n = 5$ Cards** (must be in the opening Turn 1 hand to protect the starter from Ash Blossom, Droll, or Fuwalos).

### `[TECH-BREAKER]`: Turn 2 Board Neutralizer
* **Definition:** High-impact cards designed to break fully established opponent boards on your turn.
* **Examples:** *Super Polymerization*, *Dark Ruler No More*, *Forbidden Droplet*, *Evenly Matched*, *Lightning Storm*, *Triple Tactics Talent*.
* **Evaluation Window:** **$n = 6$ Cards**.

---

## 4. Architectural Provenance & Monorepo Links
* **ADR Design Record:** [ADR-002: Competitive Deck Architecture & Hypergeometric Probability Engine](../../../docs/decisions/ADR-002-deck-architect-skill.md)
* **Monorepo Architecture:** [ADR-004: Monorepo Architecture, Git Bloat Protection & Obsidian Branding](../../../docs/decisions/ADR-004-root-monorepo-structure.md)
* **Core Skill Definition:** [`ygo-deck-architect` SKILL.md](../SKILL.md)
