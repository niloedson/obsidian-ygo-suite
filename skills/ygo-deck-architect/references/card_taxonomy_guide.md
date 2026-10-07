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

### `[HARD-BRICK]`: The "Garnet"
* **Definition:** A card with zero or negligible standalone utility in the hand that MUST remain in the deck for an engine to function. Drawing it completely disables an engine line.
* **Examples:** *Gem-Knight Garnet*, *Double Iris Magician* (in Pendulum engines requiring deck summons), Driver monsters.
* **Management:** If a deck runs 2+ hard bricks, evaluate expanding deck size to 45 or 60 cards to dilute the draw probability ($12.5\% \rightarrow 8.3\%$).

### `[SOFT-BRICK]`: Sub-Optimal Draw
* **Definition:** A card that is sub-optimal to open (such as a high-level boss monster or situational trap you prefer to search), but does NOT kill your combo if drawn. Can be discarded, tributed, or activated later.

---

## 3. Non-Engine / Tech Cards

### `[TECH-HANDTRAP]`: Turn 0 Interruption
* **Definition:** Lowers opponent end-board ceiling during their Turn 1 from hand.
* **Examples:** *Ash Blossom & Joyous Spring*, *Infinite Impermanence*, *Nibiru, the Primal Being*, *Droll & Lock Bird*.
* **Evaluation Window:** **$n = 5$ Cards**.

### `[TECH-BREAKER]`: Turn 2 Board Neutralizer
* **Definition:** High-impact cards designed to break fully established opponent boards on your turn.
* **Examples:** *Super Polymerization*, *Dark Ruler No More*, *Forbidden Droplet*, *Evenly Matched*, *Triple Tactics Talent*.
* **Evaluation Window:** **$n = 6$ Cards**.

---

## 4. Architectural Provenance & Monorepo Links
* **ADR Design Record:** [ADR-002: Competitive Deck Architecture & Hypergeometric Probability Engine](../../../docs/decisions/ADR-002-deck-architect-skill.md)
* **Monorepo Architecture:** [ADR-004: Monorepo Architecture, Git Bloat Protection & Obsidian Branding](../../../docs/decisions/ADR-004-root-monorepo-structure.md)
* **Core Skill Definition:** [`ygo-deck-architect` SKILL.md](../SKILL.md)
