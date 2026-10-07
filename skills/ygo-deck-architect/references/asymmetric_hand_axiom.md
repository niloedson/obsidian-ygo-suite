# The Going-Second Asymmetric Hand Size Axiom

A core mathematical principle in modern competitive Yu-Gi-Oh! deck building is the **asymmetric evaluation of hand size when going second**.

---

## 1. The Core Misconception
Many casual probability calculators treat all going-second cards as a sample size of **$n = 6$**, because the player going second draws a card at the beginning of their Turn 2.

**Why this is fatally flawed:**
* Modern combo decks establish 3–6 interruptions, floodgates, or omni-negates on **Turn 1**.
* A player going second must interact with their opponent **during Turn 1** (known competitively as **"Turn 0"**).
* During Turn 0, the going-second player only has access to their initial **5-card opening hand**.

---

## 2. The Dead 6th Card Problem for Hand Traps
* Cards like *Ash Blossom & Joyous Spring*, *Droll & Lock Bird*, *Ghost Mourner*, or *Effect Veiler* must be activated while the opponent is setting up.
* Drawing an *Ash Blossom* as your 6th card during your Turn 2 Draw Phase is effectively drawing a dead brick against an already completed opponent end-board.
* **Exceptions:** Cards like *Infinite Impermanence* (which can be activated from an empty field on Turn 2) or *Nibiru* (if the opponent extends on your turn).
* **The Rule:** All non-engine hand trap interruption probabilities MUST be computed with **$n = 5$**.

---

## 3. Board Breakers Use the $n = 6$ Window
* Board breakers (*Super Polymerization*, *Dark Ruler No More*, *Forbidden Droplet*, *Evenly Matched*, *Raigeki*) are not played on Turn 0.
* They are designed specifically to resolve during your Turn 2 Main Phase 1 after drawing your 6th card.
* **The Rule:** Board breakers and going-second engine cards are correctly evaluated with **$n = 6$**.

---

## 4. Defensive Tech / Combo Insulation Window ($n = 5$, Turn 1)
* Cards like *Called by the Grave*, *Crossout Designator*, or *Sauravis* serve a specific defensive role: protecting the player's primary starter from Turn 0 hand traps during **Turn 1**.
* Because the Turn 1 player does not draw a 6th card, anti-handtrap insulation MUST be evaluated using **$n = 5$**.
* Running 1 copy of *Called by the Grave* in a 40-card deck gives a **$12.5\%$** opening probability to insulate your starter against an opponent's *Ash Blossom* or *Droll*.

---

## 5. Mathematical Comparison Matrix (12 Target Cards in 40-Card Deck)

| Scenario | Sample Size ($n$) | Chance of $\ge 1$ Target | Chance of $\ge 2$ Targets | Strategic Meaning |
| :--- | :---: | :---: | :---: | :--- |
| **Hand Traps (Turn 0 Window)** | **$n = 5$** | **85.1%** | **47.7%** | True Turn 0 interruption rate. |
| **Defensive Tech (Turn 1 Window)** | **$n = 5$** | **85.1%** | **47.7%** | Turn 1 combo-insulation rate. |
| **Flawed Hand Trap Calculation** | $n = 6$ | 90.4% *(Inflated)* | 60.1% *(Inflated)* | Overestimates hand trap reliability by ~5-12%. |
| **Board Breakers (Turn 2 Draw Phase)** | **$n = 6$** | **90.4%** | **60.1%** | True breaker access rate. |

---

## 6. Strategic Architectural Guidance
1. **Never count on top-decking hand traps going second.**
2. If the goal is to open $\ge 2$ points of interaction on Turn 0 with $\ge 60\%$ reliability, a 40-card deck must run **at least 14–15 hand traps** ($n=5$). Running only 12 yields only a 47.7% chance of opening 2 hand traps.
3. **Purge Turn 1 Bricks Going Second:** In-engine traps and high-level tribute monsters designed for Turn 1 setup must be sided out for $n=6$ board breakers when going second.

---

## 7. Architectural Provenance & Monorepo Links
* **ADR Design Record:** [ADR-002: Competitive Deck Architecture & Hypergeometric Probability Engine](../../../docs/decisions/ADR-002-deck-architect-skill.md)
* **Monorepo Architecture:** [ADR-004: Monorepo Architecture, Git Bloat Protection & Obsidian Branding](../../../docs/decisions/ADR-004-root-monorepo-structure.md)
* **Core Skill Definition:** [`ygo-deck-architect` SKILL.md](../SKILL.md)
