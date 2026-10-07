# ADR-002: Competitive Deck Architecture & Hypergeometric Probability Engine

* **Status:** Accepted  
* **Date:** 2026-10-06  
* **Context:** AI Agent Deck Construction & Meta Analysis  
* **Author / Team:** Obsidian Team  
* **Affected Assets:** `skills/ygo-deck-architect`  

---

## 1. Context & Problem Statement

Generic AI deck suggestions frequently suffer from three fundamental flaws:
1. **Subjective Advice:** Relying on casual rules-of-thumb rather than mathematical combinatorics.
2. **Normal Summon Clumping:** Recommending too many 1-card starters that fight for the single Normal Summon per turn.
3. **Flawed Going-Second Probability Modeling:** Treating all going-second cards as a uniform 6-card sample, ignoring the reality that Turn 0 Hand Traps must be drawn in the initial 5 cards to interrupt the opponent before end-boards are established.

---

## 2. Decision & SCAMPER Transformations

The Obsidian Team codified competitive deck theory into an autonomous agent skill (`skills/ygo-deck-architect`) using SCAMPER:

| Dimension | Engineering Transformation |
| :--- | :--- |
| **S - Substitute** | Substitute mental estimation with a deterministic **Hypergeometric Combinatoric Matrix** ($P(X \ge 1) > 90\%$). |
| **C - Combine** | Combine starter consistency math with **Garnet Risk Modeling**: Net playable probability accounts for fatal hard-brick draws. |
| **A - Adapt** | Adapt deck size dynamically: Mathematically justifying 40 vs 45 vs 60-card decks based on ratio dilution and Garnet avoidance. |
| **M - Modify / Magnify** | **Magnify Consistency Standard to $>90\%$:** Target $\ge 14$ starters in 40 cards. Embed visual ASCII and Mermaid probability curves in output scorecards. |
| **P - Put to Another Use** | Repurpose deck audit data to generate direct **Simulator `.ydk` file exports** and sideboard gameplans. |
| **E - Eliminate** | Eliminate "Hope Engines": Strip unsearchable 2-card combos with opening odds $<40\%$ unless backed by heavy draw power. |
| **R - Reverse / Rearrange** | Rearrange the construction sequence: **Non-Engine Quotas $\rightarrow$ Engine Starters $\rightarrow$ Extenders $\rightarrow$ Brick Minimization**. |

---

## 3. Mathematical Foundations Codified

### A. The $>90\%$ Opening Consistency Threshold
$$P(X \ge 1) = 1 - \frac{\binom{N - K}{5}}{\binom{N}{5}} > 90\%$$
* **40 Cards:** Requires $\ge 14$ primary starters ($90.4\%$).
* **60 Cards:** Requires $\ge 21$ primary starters ($90.1\%$).

### B. The Asymmetric Hand Size Axiom
* **Turn 0 Hand Traps ($n = 5$):** Evaluated strictly against the 5-card opening hand. Hand traps drawn as the 6th card on Turn 2 are dead against established negations.
* **Turn 2 Board Breakers ($n = 6$):** Evaluated against 6 cards because the pilot draws for turn before activating breakers (*Dark Ruler*, *Super Poly*).

### C. Multi-Engine Pile Deck Clustering
In 50-to-60 card pile decks, archetypes with $\ge 3$ cards in the Main Deck are clustered as **Engine Packages**, preventing secondary splash engines (*Bystials*, *Horus*, *Azamina*) from polluting generic tech card statistics.

---

## 4. Consequences & Downstream Artifacts

* **Predictable Output:** Audits follow the standardized **Deck Consistency Scorecard** format with visual distribution graphs.
* **Production Implementation:** Built and operational in `skills/ygo-deck-architect/`.
