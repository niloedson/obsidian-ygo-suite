#!/usr/bin/env python3
"""
Hypergeometric Probability & Combinatorics Engine for Yu-Gi-Oh! Deck Building.

Part of the Obsidian Yu-Gi-Oh! AI Suite (skills/ygo-deck-architect).
Provides exact integer-combinatoric probability calculations for:
  - Univariate Hypergeometric (Starters, Hand Traps, Board Breakers, Garnets)
  - Multivariate Hypergeometric (Joint conditions: e.g. Starter >= 1 AND Hand Trap >= 1 AND Garnet == 0)
  - Asymmetric Hand Axiom (Turn 0 n=5 vs Turn 2 n=6)
  - ASCII Bar Chart Generation for Deck Audit Scorecards
  - Machine-readable JSON output for AI Agent tools

Zero external dependencies: uses Python standard library (math.comb, itertools, json, argparse).
"""

import argparse
import itertools
import json
import math
import sys
from typing import Any, Callable, Dict, List, Optional, Tuple


def hypergeom_pmf(k: int, N: int, K: int, n: int) -> float:
    """
    Exact probability mass function for hypergeometric distribution:
    Probability of drawing exactly k target cards in a hand of size n,
    from a deck of N cards containing K total targets.
    """
    if k < 0 or k > K or k > n or (n - k) > (N - K):
        return 0.0
    numerator = math.comb(K, k) * math.comb(N - K, n - k)
    denominator = math.comb(N, n)
    return numerator / denominator if denominator > 0 else 0.0


def hypergeom_cdf_ge(k: int, N: int, K: int, n: int) -> float:
    """
    Probability of drawing AT LEAST k target cards: P(X >= k).
    """
    if k <= 0:
        return 1.0
    if k > min(n, K):
        return 0.0
    # Sum P(X = x) for x from k to min(n, K)
    total_p = sum(hypergeom_pmf(x, N, K, n) for x in range(k, min(n, K) + 1))
    return min(1.0, max(0.0, total_p))


def multivariate_hypergeom(
    deck_size: int,
    hand_size: int,
    pools: Dict[str, int],
    eval_fn: Callable[[Dict[str, int]], bool],
) -> float:
    """
    Calculates exact joint probability for arbitrary multivariate conditions.
    pools: mapping of variable_name -> pool_size in deck (e.g. {'starters': 14, 'traps': 9, 'garnets': 1})
    eval_fn: predicate accepting a drawn hand dict {'starters': s, 'traps': t, 'garnets': g} -> bool
    """
    names = list(pools.keys())
    counts = [pools[name] for name in names]
    total_assigned = sum(counts)
    
    if total_assigned > deck_size:
        raise ValueError(f"Total target cards ({total_assigned}) exceeds deck size ({deck_size})")

    remainder_pool = deck_size - total_assigned
    denominator = math.comb(deck_size, hand_size)
    if denominator == 0:
        return 0.0

    successful_combinations = 0

    # Generate all non-negative integer partitions summing to <= hand_size
    # bounded by each pool's capacity
    ranges = [range(min(hand_size, c) + 1) for c in counts]

    for combo in itertools.product(*ranges):
        drawn_sum = sum(combo)
        if drawn_sum > hand_size:
            continue
        rem_drawn = hand_size - drawn_sum
        if rem_drawn > remainder_pool:
            continue

        drawn_dict = dict(zip(names, combo))
        drawn_dict["_other"] = rem_drawn

        if eval_fn(drawn_dict):
            # Calculate number of combinations yielding this exact hand
            ways = 1
            for k_drawn, k_pool in zip(combo, counts):
                ways *= math.comb(k_pool, k_drawn)
            ways *= math.comb(remainder_pool, rem_drawn)
            successful_combinations += ways

    return successful_combinations / denominator


def render_ascii_bar(percentage: float, width: int = 24) -> str:
    """
    Renders a high-resolution Unicode horizontal bar representation of a percentage.
    e.g. [██████████████████████▌  ] 90.4%
    """
    fraction = max(0.0, min(100.0, percentage)) / 100.0
    full_blocks = int(fraction * width)
    remainder = (fraction * width) - full_blocks

    # 8th-character block steps: ' ', '▏', '▎', '▍', '▌', '▋', '▊', '▉', '█'
    partials = ["", "▏", "▎", "▍", "▌", "▋", "▊", "▉"]
    part_idx = int(remainder * 8)
    part_char = partials[min(part_idx, 7)] if full_blocks < width else ""

    bar = ("█" * full_blocks) + part_char
    padding = " " * (width - len(bar))
    return f"[{bar}{padding}] {percentage:5.1f}%"


def parse_condition_string(cond_str: str) -> Callable[[Dict[str, int]], bool]:
    """
    Safely compiles a user condition string (e.g. "starters >= 1 and garnets == 0")
    into a callable predicate.
    """
    # Whitelist tokens for safety
    cleaned = cond_str.strip()
    if not cleaned:
        return lambda d: True

    # Validate syntax against dangerous builtins
    safe_chars = set("abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789_><=! ()andornt")
    if not set(cleaned).issubset(safe_chars):
        raise ValueError(f"Unsafe characters detected in condition: {cleaned}")

    def predicate(drawn: Dict[str, int]) -> bool:
        # Evaluate within safe local context mapping variable names to ints
        return bool(eval(cleaned, {"__builtins__": {}}, drawn))

    return predicate


def run_deck_audit(
    deck_size: int,
    starters: int,
    extenders: int = 0,
    hand_traps: int = 0,
    board_breakers: int = 0,
    defensive_tech: int = 0,
    garnets: int = 0,
    custom_pools: Optional[Dict[str, int]] = None,
    custom_condition: Optional[str] = None,
) -> Dict[str, Any]:
    """
    Runs a complete competitive Yu-Gi-Oh! hypergeometric deck audit.
    """
    pools = {
        "starters": starters,
        "extenders": extenders,
        "hand_traps": hand_traps,
        "board_breakers": board_breakers,
        "defensive_tech": defensive_tech,
        "garnets": garnets,
    }
    if custom_pools:
        for k, v in custom_pools.items():
            pools[k] = v

    # Remove zero-count pools
    active_pools = {k: v for k, v in pools.items() if v > 0}

    # 1. Standard Univariate Metrics
    p_starter_t1 = hypergeom_cdf_ge(1, deck_size, starters, 5) * 100.0
    p_starter_ge2_t1 = hypergeom_cdf_ge(2, deck_size, starters, 5) * 100.0
    p_brick_t1 = hypergeom_pmf(0, deck_size, starters, 5) * 100.0

    # Turn 0 Hand Traps (Asymmetric Axiom: n = 5)
    p_ht_ge1_t0 = hypergeom_cdf_ge(1, deck_size, hand_traps, 5) * 100.0 if hand_traps > 0 else 0.0
    p_ht_ge2_t0 = hypergeom_cdf_ge(2, deck_size, hand_traps, 5) * 100.0 if hand_traps > 0 else 0.0

    # Turn 1 Defensive Tech (Called / Crossout: n = 5)
    p_defensive_ge1_t1 = hypergeom_cdf_ge(1, deck_size, defensive_tech, 5) * 100.0 if defensive_tech > 0 else 0.0

    # Turn 2 Board Breakers (Asymmetric Axiom: n = 6)
    p_breaker_ge1_t2 = hypergeom_cdf_ge(1, deck_size, board_breakers, 6) * 100.0 if board_breakers > 0 else 0.0

    # Garnet Risk (n = 5)
    p_garnet_ge1_t1 = hypergeom_cdf_ge(1, deck_size, garnets, 5) * 100.0 if garnets > 0 else 0.0

    # 2. Multivariate Key Metrics
    # Net Playable Hand: Starters >= 1 AND Garnets == 0
    p_net_playable = 0.0
    if starters > 0:
        joint_pools = {"starters": starters}
        cond = "starters >= 1"
        if garnets > 0:
            joint_pools["garnets"] = garnets
            cond += " and garnets == 0"
        p_net_playable = multivariate_hypergeom(
            deck_size, 5, joint_pools, parse_condition_string(cond)
        ) * 100.0

    # Turn 0 Interactive Opening: Starters >= 1 AND Hand Traps >= 1
    p_starter_plus_ht = 0.0
    if starters > 0 and hand_traps > 0:
        p_starter_plus_ht = multivariate_hypergeom(
            deck_size, 5,
            {"starters": starters, "hand_traps": hand_traps},
            lambda d: d.get("starters", 0) >= 1 and d.get("hand_traps", 0) >= 1,
        ) * 100.0

    # Starter + Extender Opening (Turn 1): Starters >= 1 AND Extenders >= 1
    p_starter_plus_extender = 0.0
    if starters > 0 and extenders > 0:
        p_starter_plus_extender = multivariate_hypergeom(
            deck_size, 5,
            {"starters": starters, "extenders": extenders},
            lambda d: d.get("starters", 0) >= 1 and d.get("extenders", 0) >= 1,
        ) * 100.0

    # Custom Condition Probability (if requested)
    custom_result = None
    if custom_condition:
        pred = parse_condition_string(custom_condition)
        custom_p = multivariate_hypergeom(deck_size, 5, active_pools, pred) * 100.0
        custom_result = {
            "condition": custom_condition,
            "hand_size": 5,
            "probability": round(custom_p, 2),
            "bar": render_ascii_bar(custom_p),
        }

    return {
        "deck_size": deck_size,
        "parameters": active_pools,
        "standards": {
            "target_90_pct_achieved": p_starter_t1 >= 90.0,
            "recommended_starters_for_90": get_recommended_starters(deck_size),
        },
        "probabilities": {
            "starter_t1_ge1": round(p_starter_t1, 2),
            "starter_t1_ge2": round(p_starter_ge2_t1, 2),
            "brick_t1_0_starters": round(p_brick_t1, 2),
            "hand_trap_t0_ge1": round(p_ht_ge1_t0, 2),
            "hand_trap_t0_ge2": round(p_ht_ge2_t0, 2),
            "defensive_tech_t1_ge1": round(p_defensive_ge1_t1, 2),
            "breaker_t2_ge1": round(p_breaker_ge1_t2, 2),
            "garnet_t1_ge1": round(p_garnet_ge1_t1, 2),
            "net_playable_starter_no_garnet": round(p_net_playable, 2),
            "starter_plus_hand_trap_t0": round(p_starter_plus_ht, 2),
            "starter_plus_extender_t1": round(p_starter_plus_extender, 2),
        },
        "ascii_graphs": {
            "starter_ge1": render_ascii_bar(p_starter_t1),
            "hand_trap_ge1": render_ascii_bar(p_ht_ge1_t0),
            "hand_trap_ge2": render_ascii_bar(p_ht_ge2_t0),
            "defensive_ge1": render_ascii_bar(p_defensive_ge1_t1),
            "breaker_ge1": render_ascii_bar(p_breaker_ge1_t2),
            "garnet_ge1": render_ascii_bar(p_garnet_ge1_t1),
            "net_playable": render_ascii_bar(p_net_playable),
            "starter_plus_ht": render_ascii_bar(p_starter_plus_ht),
        },
        "custom_query": custom_result,
    }


def get_recommended_starters(deck_size: int) -> int:
    """
    Finds the minimum number of starters K needed to guarantee P(X >= 1) >= 90.0%
    in a 5-card opening hand.
    """
    for k in range(1, deck_size + 1):
        if hypergeom_cdf_ge(1, deck_size, k, 5) >= 0.90:
            return k
    return deck_size


def format_text_report(audit: Dict[str, Any]) -> str:
    """
    Formats the audit results into the standard Obsidian Deck Audit Scorecard markdown section.
    """
    p = audit["probabilities"]
    g = audit["ascii_graphs"]
    std = audit["standards"]

    status_90 = "★ >90% TARGET ACHIEVED" if std["target_90_pct_achieved"] else f"FAILED (Requires ≥{std['recommended_starters_for_90']} starters)"

    lines = [
        "================================================================================",
        f"HYPERGEOMETRIC AUDIT REPORT (Deck Size: {audit['deck_size']} Cards)",
        "================================================================================",
        f"• Opening ≥1 Starter (Turn 1, 5 cards):       {p['starter_t1_ge1']:5.1f}%  [{status_90}]",
        f"• Opening ≥2 Starters (Turn 1, 5 cards):       {p['starter_t1_ge2']:5.1f}%",
        f"• Complete Starter Brick (0 Starters):        {p['brick_t1_0_starters']:5.1f}%",
        "",
        "[ASYMMETRIC GOING-SECOND & INTERACTION METRICS]",
        f"• Turn 0 Hand Trap Access (n = 5):",
        f"  - Chance of ≥1 Hand Trap:                   {p['hand_trap_t0_ge1']:5.1f}%",
        f"  - Chance of ≥2 Hand Traps:                   {p['hand_trap_t0_ge2']:5.1f}%",
        f"• Turn 1 Defensive Tech Access (n = 5):         {p['defensive_tech_t1_ge1']:5.1f}%",
        f"• Turn 2 Board Breaker Access (n = 6):          {p['breaker_t2_ge1']:5.1f}%",
        f"• Garnet Draw Risk (Turn 1, n = 5):             {p['garnet_t1_ge1']:5.1f}%",
        "",
        "[MULTIVARIATE JOINT METRICS]",
        f"• Net Playable Hand (Starter ≥1 & Garnet == 0): {p['net_playable_starter_no_garnet']:5.1f}%",
        f"• Starter + Hand Trap (Turn 0 Ready):          {p['starter_plus_hand_trap_t0']:5.1f}%",
        f"• Starter + Extender (Push Through Negate):    {p['starter_plus_extender_t1']:5.1f}%",
        "",
        "[VISUAL PROBABILITY GRAPH]",
        f"Opening 1+ Starters (T1):  {g['starter_ge1']}",
        f"Turn 0 Hand Trap ≥1 (T0):  {g['hand_trap_ge1']}",
        f"Turn 0 Hand Trap ≥2 (T0):  {g['hand_trap_ge2']}",
    ]

    if p["defensive_tech_t1_ge1"] > 0:
        lines.append(f"Turn 1 Defensive Tech (T1):{g['defensive_ge1']}")

    lines.extend([
        f"Turn 2 Breaker ≥1 (T2):    {g['breaker_ge1']}",
        f"Opening 1+ Garnet (T1):    {g['garnet_ge1']}",
        f"Net Playable Hand (T1):    {g['net_playable']}",
        f"Starter + Hand Trap (T0):  {g['starter_plus_ht']}",
    ])

    if audit.get("custom_query"):
        cq = audit["custom_query"]
        lines.extend([
            "",
            f"[CUSTOM CONDITION: '{cq['condition']}']",
            f"Joint Probability:         {cq['bar']}"
        ])

    return "\n".join(lines)


def run_self_tests() -> None:
    """
    Validates arithmetic precision against published benchmark hypergeometric matrices.
    """
    print("=== Running Hypergeometric Math Engine Self-Tests ===")

    # Test 1: 40-Card Deck, 14 Starters, 5-Card Hand -> 90.00%
    p1 = round(hypergeom_cdf_ge(1, 40, 14, 5) * 100.0, 1)
    assert p1 == 90.0, f"Test 1 failed: Expected 90.0%, got {p1}%"
    print("  [PASS] 40 Cards / 14 Starters = 90.0% (Threshold benchmark)")

    # Test 2: 40-Card Deck, 1 Garnet -> 12.5%
    p2 = round(hypergeom_cdf_ge(1, 40, 1, 5) * 100.0, 1)
    assert p2 == 12.5, f"Test 2 failed: Expected 12.5%, got {p2}%"
    print("  [PASS] 40 Cards / 1 Garnet = 12.5% (Garnet risk benchmark)")

    # Test 3: 60-Card Deck, 22 Starters -> 90.8% (21 is 89.5%)
    p3 = round(hypergeom_cdf_ge(1, 60, 22, 5) * 100.0, 1)
    assert p3 == 90.8, f"Test 3 failed: Expected 90.8%, got {p3}%"
    print("  [PASS] 60 Cards / 22 Starters = 90.8% (Pile deck benchmark, 21 starters = 89.5%)")

    # Test 4: Turn 2 Board Breakers, 6 Cards drawn, 6 Breakers in 40 Cards -> 65.0%
    p4 = round(hypergeom_cdf_ge(1, 40, 6, 6) * 100.0, 1)
    assert p4 == 65.0, f"Test 4 failed: Expected 65.0%, got {p4}%"
    print("  [PASS] Asymmetric Axiom (n=6, K=6 in 40) = 65.0%")

    # Test 5: Multivariate Joint Condition
    # 40 cards, 14 starters, 1 garnet.
    # Hand is valid IF starters >= 1 and garnets == 0
    # comb(39,5) = 575757; comb(25,5) = 53130; comb(40,5) = 658008; (575757 - 53130)/658008 = 522627/658008 = 79.4256%
    p5 = round(multivariate_hypergeom(
        40, 5,
        {"starters": 14, "garnets": 1},
        lambda d: d.get("starters", 0) >= 1 and d.get("garnets", 0) == 0
    ) * 100.0, 2)
    assert p5 == 79.43, f"Test 5 failed: Expected 79.43%, got {p5}%"
    print("  [PASS] Multivariate Joint (Starter ≥1 & Garnet == 0) = 79.43%")

    # Test 6: Recommended starters function
    rec_40 = get_recommended_starters(40)
    rec_45 = get_recommended_starters(45)
    rec_60 = get_recommended_starters(60)
    assert rec_40 == 14, f"Expected 14 for 40 cards, got {rec_40}"
    assert rec_45 == 16, f"Expected 16 for 45 cards, got {rec_45}"
    assert rec_60 == 22, f"Expected 22 for 60 cards, got {rec_60}"
    print(f"  [PASS] Recommended starters logic: 40->{rec_40}, 45->{rec_45}, 60->{rec_60}")

    print(">>> ALL MATHEMATICAL SELF-TESTS PASSED ACCURATELY! <<<")


def parse_ydk(source: str) -> Dict[str, List[int]]:
    """
    Parses a .ydk file path or raw string into main, extra, and side deck card lists.
    """
    text = source
    if "\n" not in source and (source.endswith(".ydk") or not source.isdigit()):
        try:
            with open(source, "r", encoding="utf-8") as f:
                text = f.read()
        except OSError:
            pass

    sections: Dict[str, List[int]] = {"main": [], "extra": [], "side": []}
    current_sec = None

    for line in text.splitlines():
        line = line.strip()
        if not line or line.startswith("#created"):
            continue
        if line == "#main":
            current_sec = "main"
        elif line == "#extra":
            current_sec = "extra"
        elif line == "!side":
            current_sec = "side"
        elif current_sec and line.isdigit():
            sections[current_sec].append(int(line))

    return sections


def count_ids_in_list(id_str: str, deck_cards: List[int]) -> int:
    """Counts occurrences of comma-separated IDs within deck_cards."""
    target_ids = set()
    for item in id_str.split(","):
        item = item.strip()
        if item.isdigit():
            target_ids.add(int(item))
    return sum(1 for cid in deck_cards if cid in target_ids)


def parse_categories_arg(cat_str: str) -> Dict[str, int]:
    """Parses 'starters=14,extenders=6,traps=9' into a dict."""
    res = {}
    for item in cat_str.split(","):
        item = item.strip()
        if not item:
            continue
        if "=" not in item:
            raise ValueError(f"Category must be in name=count format: '{item}'")
        name, val = item.split("=", 1)
        res[name.strip()] = int(val.strip())
    return res


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Competitive Yu-Gi-Oh! Hypergeometric Deck Consistency Engine (Obsidian Suite)"
    )
    parser.add_argument("--deck", "-N", type=int, default=40, help="Main deck card count (40-60)")
    parser.add_argument("--ydk", type=str, default=None, help="Path to .ydk file or raw YDK text string")
    parser.add_argument("--starters", "-s", type=int, default=14, help="Primary 1-card / 1.5-card starters count")
    parser.add_argument("--starters-list", type=str, default=None, help="Comma-separated card passcodes for starters")
    parser.add_argument("--extenders", "-e", type=int, default=0, help="Extenders / secondary starters count")
    parser.add_argument("--extenders-list", type=str, default=None, help="Comma-separated card passcodes for extenders")
    parser.add_argument("--hand-traps", "-t", type=int, default=0, help="Turn 0 hand traps count (evaluated at n=5)")
    parser.add_argument("--hand-traps-list", type=str, default=None, help="Comma-separated card passcodes for hand traps")
    parser.add_argument("--breakers", "-b", type=int, default=0, help="Turn 2 board breakers count (evaluated at n=6)")
    parser.add_argument("--breakers-list", type=str, default=None, help="Comma-separated card passcodes for breakers")
    parser.add_argument("--defensive", "-d", type=int, default=0, help="Turn 1 defensive tech count (evaluated at n=5)")
    parser.add_argument("--defensive-list", type=str, default=None, help="Comma-separated card passcodes for defensive tech")
    parser.add_argument("--garnets", "-g", type=int, default=0, help="Hard brick / Garnet count")
    parser.add_argument("--garnets-list", type=str, default=None, help="Comma-separated card passcodes for garnets")
    parser.add_argument("--categories", "-c", type=str, default=None, help="Arbitrary categories (e.g. 'engineA=8,engineB=6,traps=9')")
    parser.add_argument("--condition", type=str, default=None, help="Arbitrary boolean condition (e.g. 'starters>=1 and garnets==0')")
    parser.add_argument("--json", action="store_true", help="Output machine-readable JSON")
    parser.add_argument("--test", action="store_true", help="Run automated internal precision tests")

    args = parser.parse_args()

    if args.test:
        run_self_tests()
        sys.exit(0)

    deck_size = args.deck
    starters = args.starters
    extenders = args.extenders
    hand_traps = args.hand_traps
    breakers = args.breakers
    defensive_tech = args.defensive
    garnets = args.garnets

    if args.ydk:
        ydk_data = parse_ydk(args.ydk)
        main_cards = ydk_data["main"]
        if main_cards:
            deck_size = len(main_cards)
            if args.starters_list:
                starters = count_ids_in_list(args.starters_list, main_cards)
            if args.extenders_list:
                extenders = count_ids_in_list(args.extenders_list, main_cards)
            if args.hand_traps_list:
                hand_traps = count_ids_in_list(args.hand_traps_list, main_cards)
            if args.breakers_list:
                breakers = count_ids_in_list(args.breakers_list, main_cards)
            if args.defensive_list:
                defensive_tech = count_ids_in_list(args.defensive_list, main_cards)
            if args.garnets_list:
                garnets = count_ids_in_list(args.garnets_list, main_cards)

    custom_pools = parse_categories_arg(args.categories) if args.categories else None

    audit = run_deck_audit(
        deck_size=deck_size,
        starters=starters,
        extenders=extenders,
        hand_traps=hand_traps,
        board_breakers=breakers,
        defensive_tech=defensive_tech,
        garnets=garnets,
        custom_pools=custom_pools,
        custom_condition=args.condition,
    )

    if args.json:
        print(json.dumps(audit, indent=2))
    else:
        print(format_text_report(audit))


if __name__ == "__main__":
    main()
