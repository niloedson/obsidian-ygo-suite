# Hypergeometric Probability Reference Matrices

Formula for probability of opening at least $k$ target cards in an $n$-card hand drawn from an $N$-card deck containing $K$ copies:

$$P(X \ge k) = \sum_{x=k}^{\min(n, K)} \frac{\binom{K}{x} \binom{N-K}{n-x}}{\binom{N}{n}}$$

---

## 1. 40-Card Deck ($N = 40$)

### Turn 1 Hand: $n = 5$ Cards

| Target Cards in Deck ($K$) | Probability $\ge 1$ | Probability Exactly 0 (Brick) | Probability $\ge 2$ | Strategic Role |
| :---: | :---: | :---: | :---: | :--- |
| **1** | **12.5%** | 87.5% | 0.0% | Hard Brick / Garnet |
| **2** | **23.7%** | 76.3% | 1.3% | Semi-Limited / 2-of tech |
| **3** | **33.8%** | 66.2% | 3.6% | Single 3-of starter |
| **6** | **57.7%** | 42.3% | 15.6% | 2 different starters |
| **9** | **74.5%** | 25.5% | 33.6% | Moderate engine |
| **12** | **85.1%** | 14.9% | 48.0% | Standard baseline |
| **14** | **90.0%** | **10.0%** | **58.2%** | **★ >90% TARGET ACHIEVED** |
| **15** | **91.9%** | 8.1% | 63.3% | Heavy Hand Trap Core ($n=5$) |
| **16** | **93.6%** | 6.4% | 68.2% | Ultra-Consistent Engine |

---

## 2. 42-Card Deck ($N = 42$, $n = 5$)

| Target Cards ($K$) | Probability $\ge 1$ | Probability Exactly 0 | Probability $\ge 2$ | Notes |
| :---: | :---: | :---: | :---: | :--- |
| **1** | **11.9%** | 88.1% | 0.0% | Slightly diluted Garnet |
| **12** | **82.8%** | 17.2% | 44.5% | Sub-optimal |
| **14** | **88.4%** | 11.6% | 54.7% | Close to 90% |
| **15** | **90.5%** | **9.5%** | **59.6%** | **★ >90% TARGET ACHIEVED** |

---

## 3. 45-Card Deck ($N = 45$, $n = 5$)

| Target Cards ($K$) | Probability $\ge 1$ | Probability Exactly 0 | Probability $\ge 2$ | Notes |
| :---: | :---: | :---: | :---: | :--- |
| **1** | **11.1%** | 88.9% | 0.0% | Garnet draw reduced |
| **14** | **85.4%** | 14.6% | 50.1% | Falls below 90% |
| **16** | **90.3%** | **9.7%** | **59.5%** | **★ >90% TARGET ACHIEVED** |

---

## 4. 60-Card Deck ($N = 60$, $n = 5$)

| Target Cards ($K$) | Probability $\ge 1$ | Probability Exactly 0 | Probability $\ge 2$ | Notes |
| :---: | :---: | :---: | :---: | :--- |
| **1** | **8.3%** | 91.7% | 0.0% | **Garnet risk cut from 12.5% to 8.3%** |
| **15** | **76.9%** | 23.1% | 37.1% | Unplayable consistency |
| **18** | **84.3%** | 15.7% | 48.5% | Still under 85% |
| **21** | **89.5%** | 10.5% | 57.3% | Sub-90% threshold |
| **22** | **90.8%** | **9.2%** | **61.3%** | **★ >90% TARGET ACHIEVED (Requires 22 starters)** |
| **24** | **93.1%** | 6.9% | 68.6% | Optimal 60-card starter count |

---

## 5. Turn 2 Board Breakers ($n = 6$ Cards in 40-Card Deck)

| Board Breakers in Deck ($K$) | Probability $\ge 1$ (Turn 2, 6-card hand) | Probability Exactly 0 |
| :---: | :---: | :---: |
| **2** | **28.1%** | 71.9% |
| **3** | **39.4%** | 60.6% |
| **6** | **65.0%** | 35.0% |
| **9** | **80.8%** | 19.2% |
| **12** | **90.2%** | **9.8%** |

---

## 6. Normal Summon Contention Matrix ($N = 40, n = 5$)

Because players are limited to **one Normal Summon per turn**, opening multiple Normal Summon starters creates dead card contention in hand. The target is to maximize $P(NS = 1)$ while strictly capping $P(NS \ge 2) \le 20\%$.

| Normal Summons ($K_{NS}$) | Zero NS $P(NS = 0)$ (Starvation) | Exactly 1 NS $P(NS = 1)$ (Optimal Sweet Spot) | $\ge 2$ NS $P(NS \ge 2)$ (Contention / Clashes) | Architectural Assessment |
| :---: | :---: | :---: | :---: | :--- |
| **3 Cards** | 66.2% | 30.1% | 3.6% | Under-allocated; severe NS starvation |
| **4 Cards** | 57.3% | 35.8% | 6.9% | Minimum threshold; viable with SS starters |
| **5 Cards** | 49.3% | 39.8% | 10.9% | Strong balance; 1-in-10 contention |
| **6 Cards** | **42.3%** | **42.3%** | **15.4%** | **★ PEAK SWEET SPOT: Maximizes $P(NS=1)$ while $P(NS \ge 2) \le 16\%$** |
| **7 Cards** | 36.1% | 43.3% | **20.6%** | **⚠️ Contention Breach: >20% hands hold clashing normal summons** |
| **8 Cards** | 30.6% | 43.7% | 25.7% | High contention; 1 in 4 hands has dead cards |
| **9 Cards** | 25.8% | 42.4% | 31.8% | Severe contention; almost 1 in 3 hands clashes |
| **12 Cards** | 14.9% | 35.1% | 50.0% | Catastrophic contention; 50% of opening hands clash |

## 7. Brick Dilution & Hypergeometric Rebalancing Matrices

When an engine contains mandatory hard bricks (`[HARD-BRICK]` / Garnets) that cannot be cut (e.g. unsummonable tribute monsters, search-only traps, engine drivers), expanding the deck size dilutes the brick draw risk. To maintain tournament consistency, the deck must be rebalanced using the table below.

### Garnet Draw Risk by Deck Size ($n = 5$)
| Deck Size ($N$) | 1 Hard Brick ($P \ge 1$) | 2 Hard Bricks ($P \ge 1$) | 3 Hard Bricks ($P \ge 1$) | Net Draw Risk Status |
| :---: | :---: | :---: | :---: | :--- |
| **40 Cards** | **12.5%** | **23.7%** | **33.8%** | Baseline (1 brick is manageable; 2+ bricks severely impairs net hands) |
| **42 Cards** | 11.9% | 22.6% | 32.2% | -1.1% brick risk reduction |
| **45 Cards** | 11.1% | 21.2% | 30.4% | -2.5% brick risk reduction; accessible with minimal engine expansion |
| **50 Cards** | 10.0% | 19.2% | 27.6% | -4.5% brick risk reduction; drops 2 bricks below 20% |
| **60 Cards** | **8.3%** | **16.1%** | **23.3%** | **-7.6% brick risk reduction; maximum dilution for heavy multi-engine piles** |

### Complete Rebalancing Blueprint by Expanded Deck Size
| Target Deck Size ($N'$) | Required Starters ($K'$) for $>90\%$ | Added Starters Needed* | Optimal Normal Summons ($K'_{NS}$) | Contention Cap $P(NS \ge 2)$ | Rebalanced Hand Traps ($P \ge 85\%$) |
| :---: | :---: | :---: | :---: | :---: | :---: |
| **40 Cards** | 14 Starters | Base | 4–6 NS (Peak: 6) | 15.4% | 12 Hand Traps (85.1%) |
| **42 Cards** | 15 Starters | +1 `[STARTER-SS]` | 5–7 NS (Peak: 7) | 18.8% | 13 Hand Traps (85.9%) |
| **45 Cards** | 16 Starters | +2 `[STARTER-SS]` | 5–7 NS (Peak: 7) | 16.6% | 14 Hand Traps (85.8%) |
| **50 Cards** | 18 Starters | +4 `[STARTER-SS]` | 6–8 NS (Peak: 8) | 17.6% | 16 Hand Traps (85.1%) |
| **60 Cards** | 22 Starters | +8 `[STARTER-SS]` | 7–10 NS (Peak: 10) | 19.0% | 19 Hand Traps (85.1%) |

*\*CRITICAL ARCHITECTURAL MANDATE:* All added starters must strictly be `[STARTER-SS]` (Spells, free bodies, non-normal summon extenders). Adding extra `[STARTER-NS]` increases normal summon clashes and defeats the mathematical benefit of deck dilution.

---

## 8. Architectural Provenance & Monorepo Links
* **Deterministic Combinatorics Script:** [`../scripts/calculate_odds.py`](../scripts/calculate_odds.py) (execute via `python skills/ygo-deck-architect/scripts/calculate_odds.py`)
* **ADR Design Record:** [ADR-002: Competitive Deck Architecture & Hypergeometric Probability Engine](../../../docs/decisions/ADR-002-deck-architect-skill.md)
* **Monorepo Architecture:** [ADR-004: Monorepo Architecture, Git Bloat Protection & Obsidian Branding](../../../docs/decisions/ADR-004-root-monorepo-structure.md)
* **Core Skill Definition:** [`ygo-deck-architect` SKILL.md](../SKILL.md)
