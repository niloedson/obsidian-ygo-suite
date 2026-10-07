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
| **12** | **85.1%** | 14.9% | 52.3% | Standard baseline |
| **14** | **90.4%** | **9.6%** | **63.4%** | **★ >90% TARGET ACHIEVED** |
| **15** | **91.9%** | 8.1% | 68.3% | Heavy Hand Trap Core ($n=5$) |
| **16** | **93.9%** | 6.1% | 74.0% | Ultra-Consistent Engine |

---

## 2. 42-Card Deck ($N = 42$, $n = 5$)

| Target Cards ($K$) | Probability $\ge 1$ | Probability Exactly 0 | Probability $\ge 2$ | Notes |
| :---: | :---: | :---: | :---: | :--- |
| **1** | **11.9%** | 88.1% | 0.0% | Slightly diluted Garnet |
| **12** | **82.8%** | 17.2% | 48.0% | Sub-optimal |
| **14** | **88.4%** | 11.6% | 58.7% | Close to 90% |
| **15** | **90.6%** | **9.4%** | **63.8%** | **★ >90% TARGET ACHIEVED** |

---

## 3. 45-Card Deck ($N = 45$, $n = 5$)

| Target Cards ($K$) | Probability $\ge 1$ | Probability Exactly 0 | Probability $\ge 2$ | Notes |
| :---: | :---: | :---: | :---: | :--- |
| **1** | **11.1%** | 88.9% | 0.0% | Garnet draw reduced |
| **14** | **85.4%** | 14.6% | 52.7% | Falls below 90% |
| **16** | **90.5%** | **9.5%** | **63.6%** | **★ >90% TARGET ACHIEVED** |

---

## 4. 60-Card Deck ($N = 60$, $n = 5$)

| Target Cards ($K$) | Probability $\ge 1$ | Probability Exactly 0 | Probability $\ge 2$ | Notes |
| :---: | :---: | :---: | :---: | :--- |
| **1** | **8.3%** | 91.7% | 0.0% | **Garnet risk cut from 12.5% to 8.3%** |
| **15** | **76.9%** | 23.1% | 37.1% | Unplayable consistency |
| **18** | **84.3%** | 15.7% | 48.5% | Still under 85% |
| **21** | **90.1%** | **9.9%** | **59.3%** | **★ >90% TARGET ACHIEVED (Requires 21 starters)** |
| **24** | **94.0%** | 6.0% | 68.8% | Optimal 60-card starter count |

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

## 6. Architectural Provenance & Monorepo Links
* **ADR Design Record:** [ADR-002: Competitive Deck Architecture & Hypergeometric Probability Engine](../../../docs/decisions/ADR-002-deck-architect-skill.md)
* **Monorepo Architecture:** [ADR-004: Monorepo Architecture, Git Bloat Protection & Obsidian Branding](../../../docs/decisions/ADR-004-root-monorepo-structure.md)
* **Core Skill Definition:** [`ygo-deck-architect` SKILL.md](../SKILL.md)
