# ADR-003: Deterministic PSCT Adjudication & Rulings Engine

* **Status:** Accepted  
* **Date:** 2026-10-06  
* **Context:** AI Agent Tournament Rulings & Match Dispute Arbitration  
* **Author / Team:** Obsidian Team  
* **Affected Assets:** `skills/ygo-judge`  

---

## 1. Context & Problem Statement

Large Language Models frequently hallucinate card rulings when asked conversational questions (e.g. confusing whether an effect activates or is continuous, misinterpreting conjunction timing, or overlooking region-specific discrepancies between TCG, OCG, and Master Duel). 

Furthermore, tournament judges arbitrating online matches (such as Dueling Book) are forced to read through hundreds of lines of UI clickstreams (`"Viewed deck"`, `"Signaled OK"`) to isolate a single disputed game action.

---

## 2. Decision & SCAMPER Transformations

The Obsidian Team codified the authoritative rulings architecture into `skills/ygo-judge`:

| Dimension | Engineering Transformation |
| :--- | :--- |
| **S - Substitute** | Substitute subjective intuition with a **4-Step Algorithmic Verification Trace**: (1) Location Verification $\rightarrow$ (2) Timing/Trigger Check $\rightarrow$ (3) Cost/Target Validation $\rightarrow$ (4) Resolution Stack. |
| **C - Combine** | Combine PSCT syntactic parsing with a dedicated **TCG vs. OCG Regional Discrepancy Engine** to alert players to cross-regional differences. |
| **A - Adapt** | Adapt April 2020 Master Rule Revisions (trigger location movements, Extra Deck bounces, and trigger declaration priorities). |
| **M - Modify / Magnify** | Magnify chain visualization with a structured **ASCII Chain Stack Diagram** (`CL1 -> CL2 ... Resolve: CL2 -> CL1`). |
| **P - Put to Another Use** | Repurpose the judge engine as an automated **Dueling Book Match Log Parser** and tournament policy dispute arbitrator. |
| **E - Eliminate** | Eliminate parametric memory guesses: Mandate pulling verbatim PSCT from the local MCP database (`get_card_details`) before issuing rulings. |
| **R - Reverse / Rearrange** | Rearrange resolution: Enforce backward resolution analysis from highest Chain Link to CL1, checking conjunctions (`then`, `and if you do`, `also`) at every step. |

---

## 3. PSCT Syntactic Adjudication Rules

1. **The 3-Part Syntax:**
   $$\text{[Activation Condition]} : \text{[Cost / Targeting / Action at Activation]} ; \text{[Effect at Resolution]}$$
2. **Conjunction Timing Truth Table:**
   * **`"then"`:** Sequential (A happens, then B). Event A causes `"When... you can"` triggers to miss timing.
   * **`"and if you do"`:** Simultaneous for timing purposes; B depends on A.
   * **`"also"`:** Simultaneous; neither depends on the other.
   * **`"and"`:** Simultaneous; both must succeed.
3. **Trigger Classification:**
   * `"When... you can"`: Misses timing if the trigger event was not the exact last action.
   * `"If... you can"`: Never misses timing; activates in the next legal chain.

---

## 4. Consequences & Downstream Artifacts

* **Reliability:** Guarantees deterministic, tournament-grade arbitration.
* **Production Implementation:** Built and operational in `skills/ygo-judge/`.
