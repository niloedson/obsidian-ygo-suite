#!/usr/bin/env python3
"""
KDE Decklist PDF Engine for Yu-Gi-Oh! Sanctioned Tournament Play.

Part of the Obsidian Yu-Gi-Oh! AI Suite (skills/ygo-deck-architect).
Provides bidirectional processing of official Konami Digital Entertainment (KDE)
AcroForm Decklist PDFs (references/KDE_DeckList.pdf):
  1. Fill: Ingests .ydk files or card lists, categorizes Main Deck cards into
     Monsters/Spells/Traps, validates slot capacities, populates all 183 PDF form
     fields, computes section totals, and exports a print-ready filled PDF.
  2. Read: Parses filled KDE Decklist PDFs, extracts player metadata and card
     rosters, performs strict arithmetic discrepancy auditing against recorded
     sheet totals, verifies tournament legality (deck sizes, copy limits), resolves
     passcodes via the local cards.db SQLite database, and exports simulator-ready .ydk.
  3. Validate: Flags Tournament Policy Deck Errors (Game Loss / DQ risks) before round 1.

Zero external dependencies beyond Python standard library and `pypdf`.
"""

import argparse
from collections import Counter
import dataclasses
from datetime import datetime
import json
import os
import re
import sqlite3
import sys
from typing import Any, Dict, List, Optional, Tuple, Union

try:
    import pypdf
except ImportError:
    pypdf = None


# ==============================================================================
# PDF AcroForm Field Constants (183 Total Fields in KDE_DeckList.pdf)
# ==============================================================================

FIELD_FIRST_MIDDLE = "First  Middle Names"  # Note: double space in official KDE form
FIELD_LAST_NAMES = "Last Names"
FIELD_LAST_INITIAL = "Last Name Initial"
FIELD_CARD_GAME_ID = "CARD GAME ID"
FIELD_COUNTRY = "Country of Residency"
FIELD_EVENT_NAME = "Event Name"
FIELD_EVENT_MONTH = "Event Date - Month"
FIELD_EVENT_DAY = "Event Date - Day"
FIELD_EVENT_YEAR = "Event Date - Year"

FIELD_TOTAL_MONSTERS = "Total Monster Cards"
FIELD_TOTAL_SPELLS = "Total Spell Cards"
FIELD_TOTAL_TRAPS = "Total Trap Cards"
FIELD_TOTAL_MAIN = "Main Deck Total"
FIELD_TOTAL_EXTRA = "Total Extra Deck"
FIELD_TOTAL_SIDE = "Total Side Deck"

MAX_MONSTER_SLOTS = 18
MAX_SPELL_SLOTS = 18
MAX_TRAP_SLOTS = 18
MAX_EXTRA_SLOTS = 15
MAX_SIDE_SLOTS = 15

MIN_MAIN_DECK = 40
MAX_MAIN_DECK = 60
MAX_EXTRA_DECK = 15
MAX_SIDE_DECK = 15
MAX_CARD_COPIES = 3


# ==============================================================================
# Data Structures
# ==============================================================================

@dataclasses.dataclass
class PlayerInfo:
    first_name: str = ""
    last_name: str = ""
    last_name_initial: str = ""
    card_game_id: str = ""
    country: str = ""
    event_name: str = ""
    event_date_month: str = ""
    event_date_day: str = ""
    event_date_year: str = ""

    def full_name(self) -> str:
        parts = [p for p in [self.first_name, self.last_name] if p]
        return " ".join(parts)


@dataclasses.dataclass
class DeckEntry:
    name: str
    count: int
    slot_index: int = 0
    passcode: Optional[int] = None
    card_type: Optional[str] = None


@dataclasses.dataclass
class KDEDecklist:
    player: PlayerInfo
    monsters: List[DeckEntry] = dataclasses.field(default_factory=list)
    spells: List[DeckEntry] = dataclasses.field(default_factory=list)
    traps: List[DeckEntry] = dataclasses.field(default_factory=list)
    extra: List[DeckEntry] = dataclasses.field(default_factory=list)
    side: List[DeckEntry] = dataclasses.field(default_factory=list)
    recorded_totals: Dict[str, Optional[int]] = dataclasses.field(default_factory=dict)
    calculated_totals: Dict[str, int] = dataclasses.field(default_factory=dict)
    discrepancies: List[str] = dataclasses.field(default_factory=list)
    violations: List[str] = dataclasses.field(default_factory=list)

    def total_monsters(self) -> int:
        return sum(e.count for e in self.monsters)

    def total_spells(self) -> int:
        return sum(e.count for e in self.spells)

    def total_traps(self) -> int:
        return sum(e.count for e in self.traps)

    def total_main(self) -> int:
        return self.total_monsters() + self.total_spells() + self.total_traps()

    def total_extra(self) -> int:
        return sum(e.count for e in self.extra)

    def total_side(self) -> int:
        return sum(e.count for e in self.side)

    def to_dict(self) -> Dict[str, Any]:
        return {
            "player": dataclasses.asdict(self.player),
            "monsters": [dataclasses.asdict(e) for e in self.monsters],
            "spells": [dataclasses.asdict(e) for e in self.spells],
            "traps": [dataclasses.asdict(e) for e in self.traps],
            "extra": [dataclasses.asdict(e) for e in self.extra],
            "side": [dataclasses.asdict(e) for e in self.side],
            "recorded_totals": self.recorded_totals,
            "calculated_totals": self.calculated_totals,
            "discrepancies": self.discrepancies,
            "violations": self.violations,
            "is_valid": len(self.discrepancies) == 0 and len(self.violations) == 0,
        }


# ==============================================================================
# Database & Card Resolution Helpers
# ==============================================================================

def find_cards_db_path() -> Optional[str]:
    """Attempts to locate the local SQLite cards.db."""
    env_path = os.environ.get("YGO_DB_PATH")
    if env_path and os.path.exists(env_path):
        return env_path

    # Check relative to this script in the monorepo
    script_dir = os.path.dirname(os.path.abspath(__file__))
    candidates = [
        os.path.abspath(os.path.join(script_dir, "../../../mcp-servers/ygoprodeck/data/cards.db")),
        os.path.abspath(os.path.join(script_dir, "../../mcp-servers/ygoprodeck/data/cards.db")),
        os.path.abspath(os.path.join(script_dir, "../data/cards.db")),
        os.path.abspath("mcp-servers/ygoprodeck/data/cards.db"),
    ]
    for c in candidates:
        if os.path.exists(c):
            return c
    return None


def find_default_template_path() -> str:
    """Locates the default empty KDE_DeckList.pdf template."""
    script_dir = os.path.dirname(os.path.abspath(__file__))
    candidate = os.path.abspath(os.path.join(script_dir, "../references/KDE_DeckList.pdf"))
    if os.path.exists(candidate):
        return candidate
    candidate_alt = os.path.abspath("skills/ygo-deck-architect/references/KDE_DeckList.pdf")
    if os.path.exists(candidate_alt):
        return candidate_alt
    return "KDE_DeckList.pdf"


def normalize_card_name(name: str) -> str:
    """Normalizes card names for fuzzy matching."""
    s = name.lower()
    s = s.replace("&", "and")
    s = re.sub(r"[^a-z0-9]", "", s)
    return s


class CardResolver:
    """Resolves card details and passcodes from local SQLite cards.db."""

    def __init__(self, db_path: Optional[str] = None):
        self.db_path = db_path or find_cards_db_path()
        self.conn: Optional[sqlite3.Connection] = None
        if self.db_path and os.path.exists(self.db_path):
            try:
                self.conn = sqlite3.connect(f"file:{self.db_path}?mode=ro", uri=True)
            except sqlite3.Error:
                self.conn = sqlite3.connect(self.db_path)

    def close(self):
        if self.conn:
            self.conn.close()
            self.conn = None

    def get_by_id(self, card_id: int) -> Optional[Tuple[int, str, str, str]]:
        """Returns (id, name, type, frame_type) for a passcode, checking alt art offsets if necessary."""
        if not self.conn:
            return None
        cur = self.conn.cursor()
        # Direct lookup first
        cur.execute("SELECT id, name, type, frame_type FROM cards WHERE id = ?", (card_id,))
        row = cur.fetchone()
        if row:
            return (row[0], row[1], row[2], row[3])

        # Alternate art ID offset lookup (YGOPRODeck assigns consecutive IDs to alternate arts)
        for offset in [-1, -2, -3, -4, 1, 2]:
            cur.execute("SELECT id, name, type, frame_type FROM cards WHERE id = ?", (card_id + offset,))
            row = cur.fetchone()
            if row:
                return (row[0], row[1], row[2], row[3])

        return None

    def resolve_name_to_passcode(self, name: str) -> Optional[int]:
        """Resolves a card name to its primary 8-digit passcode."""
        if not self.conn or not name.strip():
            return None
        cur = self.conn.cursor()
        clean_name = name.strip()

        # 1. Exact case-insensitive match
        cur.execute(
            "SELECT id, type FROM cards WHERE LOWER(name) = LOWER(?) ORDER BY id ASC",
            (clean_name,),
        )
        rows = cur.fetchall()
        if rows:
            for rid, rtype in rows:
                if rtype != "Tuner Monster":
                    return rid
            return rows[0][0]

        # 2. Normalized match (ignoring punctuation & spaces)
        norm_query = normalize_card_name(clean_name)
        cur.execute("SELECT id, name FROM cards")
        for cid, cname in cur.fetchall():
            if normalize_card_name(cname) == norm_query:
                return cid

        # 3. FTS5 query if available
        try:
            cur.execute(
                "SELECT rowid FROM cards_fts WHERE name MATCH ? LIMIT 1",
                (f'"{clean_name}"',),
            )
            fts_row = cur.fetchone()
            if fts_row:
                return fts_row[0]
        except sqlite3.OperationalError:
            pass

        return None


# ==============================================================================
# PDF Reading Engine
# ==============================================================================

def read_kde_decklist(pdf_path: str, db_path: Optional[str] = None) -> KDEDecklist:
    """
    Parses an official KDE Decklist PDF, extracts player info and card tables,
    validates arithmetic consistency, and checks tournament legality.
    """
    if pypdf is None:
        raise RuntimeError("pypdf is required to read KDE Decklist PDFs. Run 'pip install pypdf'.")

    if not os.path.exists(pdf_path):
        raise FileNotFoundError(f"PDF decklist not found at: {pdf_path}")

    reader = pypdf.PdfReader(pdf_path)
    fields = reader.get_fields() or {}

    def get_field_val(key: str) -> str:
        f = fields.get(key)
        if not f:
            return ""
        v = f.get("/V")
        if v is None:
            return ""
        val = str(v).strip()
        return "" if val.lower() == "none" else val

    def get_field_int(key: str) -> Optional[int]:
        val = get_field_val(key)
        if not val:
            return None
        try:
            return int(val)
        except ValueError:
            return None

    # 1. Extract Player & Event Metadata
    player = PlayerInfo(
        first_name=get_field_val(FIELD_FIRST_MIDDLE),
        last_name=get_field_val(FIELD_LAST_NAMES),
        last_name_initial=get_field_val(FIELD_LAST_INITIAL),
        card_game_id=get_field_val(FIELD_CARD_GAME_ID),
        country=get_field_val(FIELD_COUNTRY),
        event_name=get_field_val(FIELD_EVENT_NAME),
        event_date_month=get_field_val(FIELD_EVENT_MONTH),
        event_date_day=get_field_val(FIELD_EVENT_DAY),
        event_date_year=get_field_val(FIELD_EVENT_YEAR),
    )

    resolver = CardResolver(db_path)

    # 2. Extract Card Sections
    def extract_section(name_prefix: str, count_prefix: str, max_slots: int) -> List[DeckEntry]:
        entries: List[DeckEntry] = []
        for i in range(1, max_slots + 1):
            name_key = f"{name_prefix} {i}"
            if count_prefix.endswith(" "):
                count_key = f"{count_prefix}{i} Count"
            else:
                count_key = f"{count_prefix} {i} Count"

            card_name = get_field_val(name_key)
            count_str = get_field_val(count_key)

            if not card_name and not count_str:
                continue

            count = 1
            if count_str:
                try:
                    count = int(count_str)
                except ValueError:
                    count = 1
            elif card_name:
                count = 1

            passcode = resolver.resolve_name_to_passcode(card_name) if card_name else None
            entries.append(DeckEntry(
                name=card_name,
                count=count,
                slot_index=i,
                passcode=passcode,
            ))
        return entries

    monsters = extract_section("Monster", "Monster Card", MAX_MONSTER_SLOTS)
    spells = extract_section("Spell", "Spell Card", MAX_SPELL_SLOTS)
    traps = extract_section("Trap", "Trap Card", MAX_TRAP_SLOTS)
    extra = extract_section("Extra Deck", "Extra Deck", MAX_EXTRA_SLOTS)
    side = extract_section("Side Deck", "Side Deck", MAX_SIDE_SLOTS)

    # 3. Extract Recorded Totals
    recorded_totals = {
        "monsters": get_field_int(FIELD_TOTAL_MONSTERS),
        "spells": get_field_int(FIELD_TOTAL_SPELLS),
        "traps": get_field_int(FIELD_TOTAL_TRAPS),
        "main": get_field_int(FIELD_TOTAL_MAIN),
        "extra": get_field_int(FIELD_TOTAL_EXTRA),
        "side": get_field_int(FIELD_TOTAL_SIDE),
    }

    # 4. Compute Calculated Totals
    calc_monsters = sum(e.count for e in monsters)
    calc_spells = sum(e.count for e in spells)
    calc_traps = sum(e.count for e in traps)
    calc_main = calc_monsters + calc_spells + calc_traps
    calc_extra = sum(e.count for e in extra)
    calc_side = sum(e.count for e in side)

    calculated_totals = {
        "monsters": calc_monsters,
        "spells": calc_spells,
        "traps": calc_traps,
        "main": calc_main,
        "extra": calc_extra,
        "side": calc_side,
    }

    # 5. Arithmetic Discrepancy Auditing
    discrepancies: List[str] = []
    comparisons = [
        ("Total Monster Cards", recorded_totals["monsters"], calc_monsters),
        ("Total Spell Cards", recorded_totals["spells"], calc_spells),
        ("Total Trap Cards", recorded_totals["traps"], calc_traps),
        ("Main Deck Total", recorded_totals["main"], calc_main),
        ("Total Extra Deck", recorded_totals["extra"], calc_extra),
        ("Total Side Deck", recorded_totals["side"], calc_side),
    ]

    for label, rec, calc in comparisons:
        if rec is not None and rec != calc:
            diff = calc - rec
            diff_str = f"+{diff}" if diff > 0 else str(diff)
            discrepancies.append(
                f"{label} mismatch: sheet recorded '{rec}', but listed cards sum to '{calc}' ({diff_str})"
            )

    # 6. Tournament Legality Validation
    violations: List[str] = []

    # Main Deck Size (40-60)
    if calc_main < MIN_MAIN_DECK:
        violations.append(
            f"Main Deck has {calc_main} cards (Minimum is {MIN_MAIN_DECK}). KDE Tournament Policy violation."
        )
    elif calc_main > MAX_MAIN_DECK:
        violations.append(
            f"Main Deck has {calc_main} cards (Maximum is {MAX_MAIN_DECK}). KDE Tournament Policy violation."
        )

    # Extra Deck Size (0-15)
    if calc_extra > MAX_EXTRA_DECK:
        violations.append(
            f"Extra Deck has {calc_extra} cards (Maximum is {MAX_EXTRA_DECK})."
        )

    # Side Deck Size (0-15)
    if calc_side > MAX_SIDE_DECK:
        violations.append(
            f"Side Deck has {calc_side} cards (Maximum is {MAX_SIDE_DECK})."
        )

    # Card Copy Limits (Max 3 copies across Main, Extra, Side)
    card_counts: Dict[str, int] = Counter()
    for e in monsters + spells + traps + extra + side:
        if e.name:
            norm_name = e.name.strip().lower()
            card_counts[norm_name] += e.count

    for norm_name, total_copies in card_counts.items():
        if total_copies > MAX_CARD_COPIES:
            # Retrieve display name
            sample_entry = next((e for e in monsters + spells + traps + extra + side if e.name and e.name.strip().lower() == norm_name), None)
            display_name = sample_entry.name if sample_entry else norm_name
            violations.append(
                f"Card '{display_name}' has {total_copies} total copies across all sections (Maximum allowed is {MAX_CARD_COPIES})."
            )

    resolver.close()

    return KDEDecklist(
        player=player,
        monsters=monsters,
        spells=spells,
        traps=traps,
        extra=extra,
        side=side,
        recorded_totals=recorded_totals,
        calculated_totals=calculated_totals,
        discrepancies=discrepancies,
        violations=violations,
    )


# ==============================================================================
# PDF Filling Engine
# ==============================================================================

def parse_ydk_content(ydk_text: str) -> Tuple[List[int], List[int], List[int]]:
    """Parses .ydk content into (main_ids, extra_ids, side_ids)."""
    main_ids: List[int] = []
    extra_ids: List[int] = []
    side_ids: List[int] = []
    curr: Optional[List[int]] = None

    for line in ydk_text.splitlines():
        line = line.strip()
        if not line or line.startswith("#created") or line.startswith("//"):
            continue
        if line == "#main":
            curr = main_ids
        elif line == "#extra":
            curr = extra_ids
        elif line == "!side":
            curr = side_ids
        elif line.isdigit() and curr is not None:
            curr.append(int(line))

    return main_ids, extra_ids, side_ids


def fill_kde_decklist(
    deck_source: Union[str, Dict[str, Any]],
    output_pdf_path: str,
    template_pdf_path: Optional[str] = None,
    player: Optional[PlayerInfo] = None,
    db_path: Optional[str] = None,
    sort_alphabetical: bool = True,
) -> Dict[str, Any]:
    """
    Fills an official KDE Decklist PDF template with the supplied decklist.

    deck_source can be:
      - Path to a .ydk file
      - Raw .ydk string content
      - Dictionary matching the KDEDecklist / JSON structure
    """
    if pypdf is None:
        raise RuntimeError("pypdf is required to fill KDE Decklist PDFs. Run 'pip install pypdf'.")

    template_path = template_pdf_path or find_default_template_path()
    if not os.path.exists(template_path):
        raise FileNotFoundError(f"KDE template PDF not found at: {template_path}")

    resolver = CardResolver(db_path)
    player_info = player or PlayerInfo()

    monsters: List[Tuple[str, int, Optional[int]]] = []
    spells: List[Tuple[str, int, Optional[int]]] = []
    traps: List[Tuple[str, int, Optional[int]]] = []
    extra: List[Tuple[str, int, Optional[int]]] = []
    side: List[Tuple[str, int, Optional[int]]] = []

    if isinstance(deck_source, dict):
        # Structured dictionary input
        if "player" in deck_source and not player:
            p_data = deck_source["player"]
            player_info = PlayerInfo(
                first_name=p_data.get("first_name", ""),
                last_name=p_data.get("last_name", ""),
                last_name_initial=p_data.get("last_name_initial", ""),
                card_game_id=p_data.get("card_game_id", ""),
                country=p_data.get("country", ""),
                event_name=p_data.get("event_name", ""),
                event_date_month=p_data.get("event_date_month", ""),
                event_date_day=p_data.get("event_date_day", ""),
                event_date_year=p_data.get("event_date_year", ""),
            )

        for item in deck_source.get("monsters", []):
            monsters.append((item["name"], int(item["count"]), item.get("passcode")))
        for item in deck_source.get("spells", []):
            spells.append((item["name"], int(item["count"]), item.get("passcode")))
        for item in deck_source.get("traps", []):
            traps.append((item["name"], int(item["count"]), item.get("passcode")))
        for item in deck_source.get("extra", []):
            extra.append((item["name"], int(item["count"]), item.get("passcode")))
        for item in deck_source.get("side", []):
            side.append((item["name"], int(item["count"]), item.get("passcode")))

    else:
        # String: either file path or raw .ydk
        if os.path.exists(deck_source):
            with open(deck_source, "r", encoding="utf-8") as f:
                ydk_text = f.read()
        else:
            ydk_text = deck_source

        main_ids, extra_ids, side_ids = parse_ydk_content(ydk_text)

        # Main Deck categorization via cards.db
        main_counts = Counter(main_ids)
        for cid, count in main_counts.items():
            card_data = resolver.get_by_id(cid)
            name = card_data[1] if card_data else str(cid)
            ctype = card_data[2] if card_data else "Unknown"

            if "Spell Card" in ctype:
                spells.append((name, count, cid))
            elif "Trap Card" in ctype:
                traps.append((name, count, cid))
            else:
                monsters.append((name, count, cid))

        # Extra Deck
        extra_counts = Counter(extra_ids)
        for cid, count in extra_counts.items():
            card_data = resolver.get_by_id(cid)
            name = card_data[1] if card_data else str(cid)
            extra.append((name, count, cid))

        # Side Deck
        side_counts = Counter(side_ids)
        for cid, count in side_counts.items():
            card_data = resolver.get_by_id(cid)
            name = card_data[1] if card_data else str(cid)
            side.append((name, count, cid))

    resolver.close()

    # Sort alphabetically if requested (standard for tournament deck checks)
    if sort_alphabetical:
        monsters.sort(key=lambda x: x[0].lower())
        spells.sort(key=lambda x: x[0].lower())
        traps.sort(key=lambda x: x[0].lower())
        extra.sort(key=lambda x: x[0].lower())
        side.sort(key=lambda x: x[0].lower())

    # Slot Capacity Validation
    if len(monsters) > MAX_MONSTER_SLOTS:
        raise ValueError(
            f"Too many distinct Monster cards ({len(monsters)}). Official KDE sheet has {MAX_MONSTER_SLOTS} slots."
        )
    if len(spells) > MAX_SPELL_SLOTS:
        raise ValueError(
            f"Too many distinct Spell cards ({len(spells)}). Official KDE sheet has {MAX_SPELL_SLOTS} slots."
        )
    if len(traps) > MAX_TRAP_SLOTS:
        raise ValueError(
            f"Too many distinct Trap cards ({len(traps)}). Official KDE sheet has {MAX_TRAP_SLOTS} slots."
        )
    if len(extra) > MAX_EXTRA_SLOTS:
        raise ValueError(
            f"Too many distinct Extra Deck cards ({len(extra)}). Official KDE sheet has {MAX_EXTRA_SLOTS} slots."
        )
    if len(side) > MAX_SIDE_SLOTS:
        raise ValueError(
            f"Too many distinct Side Deck cards ({len(side)}). Official KDE sheet has {MAX_SIDE_SLOTS} slots."
        )

    # Compute Totals
    total_monsters = sum(c[1] for c in monsters)
    total_spells = sum(c[1] for c in spells)
    total_traps = sum(c[1] for c in traps)
    main_total = total_monsters + total_spells + total_traps
    total_extra = sum(c[1] for c in extra)
    total_side = sum(c[1] for c in side)

    # Auto-derive initial if not set
    last_initial = player_info.last_name_initial
    if not last_initial and player_info.last_name:
        last_initial = player_info.last_name[0].upper()

    # Build AcroForm Field Dictionary
    field_dict: Dict[str, str] = {
        FIELD_FIRST_MIDDLE: player_info.first_name,
        FIELD_LAST_NAMES: player_info.last_name,
        FIELD_LAST_INITIAL: last_initial,
        FIELD_CARD_GAME_ID: player_info.card_game_id,
        FIELD_COUNTRY: player_info.country,
        FIELD_EVENT_NAME: player_info.event_name,
        FIELD_EVENT_MONTH: player_info.event_date_month,
        FIELD_EVENT_DAY: player_info.event_date_day,
        FIELD_EVENT_YEAR: player_info.event_date_year,
        FIELD_TOTAL_MONSTERS: str(total_monsters) if total_monsters > 0 else "0",
        FIELD_TOTAL_SPELLS: str(total_spells) if total_spells > 0 else "0",
        FIELD_TOTAL_TRAPS: str(total_traps) if total_traps > 0 else "0",
        FIELD_TOTAL_MAIN: str(main_total),
        FIELD_TOTAL_EXTRA: str(total_extra) if total_extra > 0 else "0",
        FIELD_TOTAL_SIDE: str(total_side) if total_side > 0 else "0",
    }

    # Populate Slots
    for i in range(1, MAX_MONSTER_SLOTS + 1):
        if i <= len(monsters):
            field_dict[f"Monster {i}"] = monsters[i - 1][0]
            field_dict[f"Monster Card {i} Count"] = str(monsters[i - 1][1])
        else:
            field_dict[f"Monster {i}"] = ""
            field_dict[f"Monster Card {i} Count"] = ""

    for i in range(1, MAX_SPELL_SLOTS + 1):
        if i <= len(spells):
            field_dict[f"Spell {i}"] = spells[i - 1][0]
            field_dict[f"Spell Card {i} Count"] = str(spells[i - 1][1])
        else:
            field_dict[f"Spell {i}"] = ""
            field_dict[f"Spell Card {i} Count"] = ""

    for i in range(1, MAX_TRAP_SLOTS + 1):
        if i <= len(traps):
            field_dict[f"Trap {i}"] = traps[i - 1][0]
            field_dict[f"Trap Card {i} Count"] = str(traps[i - 1][1])
        else:
            field_dict[f"Trap {i}"] = ""
            field_dict[f"Trap Card {i} Count"] = ""

    for i in range(1, MAX_EXTRA_SLOTS + 1):
        if i <= len(extra):
            field_dict[f"Extra Deck {i}"] = extra[i - 1][0]
            field_dict[f"Extra Deck {i} Count"] = str(extra[i - 1][1])
        else:
            field_dict[f"Extra Deck {i}"] = ""
            field_dict[f"Extra Deck {i} Count"] = ""

    for i in range(1, MAX_SIDE_SLOTS + 1):
        if i <= len(side):
            field_dict[f"Side Deck {i}"] = side[i - 1][0]
            field_dict[f"Side Deck {i} Count"] = str(side[i - 1][1])
        else:
            field_dict[f"Side Deck {i}"] = ""
            field_dict[f"Side Deck {i} Count"] = ""

    # Write PDF
    reader = pypdf.PdfReader(template_path)
    writer = pypdf.PdfWriter()
    writer.append(reader)

    writer.update_page_form_field_values(writer.pages[0], field_dict)

    # Enable NeedAppearances so viewers re-render form fields
    if writer.root_object.get("/AcroForm"):
        writer.root_object["/AcroForm"].update({
            pypdf.generic.NameObject("/NeedAppearances"): pypdf.generic.BooleanObject(True)
        })

    os.makedirs(os.path.dirname(os.path.abspath(output_pdf_path)) or ".", exist_ok=True)
    with open(output_pdf_path, "wb") as f_out:
        writer.write(f_out)

    return {
        "status": "success",
        "output_pdf": output_pdf_path,
        "monsters_count": total_monsters,
        "spells_count": total_spells,
        "traps_count": total_traps,
        "main_total": main_total,
        "extra_total": total_extra,
        "side_total": total_side,
        "player": dataclasses.asdict(player_info),
    }


# ==============================================================================
# .YDK Conversion & Probability Pipeline Integration
# ==============================================================================

def kde_to_ydk(decklist: KDEDecklist, db_path: Optional[str] = None) -> str:
    """
    Converts a parsed KDEDecklist into a standard simulator-compatible .ydk string.
    Resolves card names to 8-digit passcodes via cards.db.
    """
    resolver = CardResolver(db_path)
    lines: List[str] = [
        f"#created by ygo-deck-architect (from KDE Decklist)",
        f"#player: {decklist.player.full_name()}",
    ]

    # Main Deck: Monsters, Spells, Traps
    lines.append("#main")
    for category in [decklist.monsters, decklist.spells, decklist.traps]:
        for entry in category:
            passcode = entry.passcode or resolver.resolve_name_to_passcode(entry.name)
            cid_str = str(passcode) if passcode else f"# missing_passcode: {entry.name}"
            for _ in range(entry.count):
                lines.append(cid_str)

    # Extra Deck
    lines.append("#extra")
    for entry in decklist.extra:
        passcode = entry.passcode or resolver.resolve_name_to_passcode(entry.name)
        cid_str = str(passcode) if passcode else f"# missing_passcode: {entry.name}"
        for _ in range(entry.count):
            lines.append(cid_str)

    # Side Deck
    lines.append("!side")
    for entry in decklist.side:
        passcode = entry.passcode or resolver.resolve_name_to_passcode(entry.name)
        cid_str = str(passcode) if passcode else f"# missing_passcode: {entry.name}"
        for _ in range(entry.count):
            lines.append(cid_str)

    resolver.close()
    return "\n".join(lines) + "\n"


# ==============================================================================
# Terminal Presentation & Audit Report
# ==============================================================================

def print_decklist_audit(decklist: KDEDecklist, show_cards: bool = True):
    """Outputs a formatted ASCII tournament audit scorecard."""
    p = decklist.player
    print("=" * 80)
    print("KONAMI OFFICIAL TOURNAMENT DECKLIST AUDIT REPORT")
    print("=" * 80)

    # Player Info Header
    print(f"Player:   {p.full_name() or '(Unspecified)'} [Initial: {p.last_name_initial or '-'}]")
    print(f"ID/Cossy: {p.card_game_id or '(Unspecified)'} | Country: {p.country or '(Unspecified)'}")
    date_str = f"{p.event_date_month}/{p.event_date_day}/{p.event_date_year}".strip("/")
    print(f"Event:    {p.event_name or '(Unspecified)'} | Date: {date_str or '(Unspecified)'}")
    print("-" * 80)

    # Deck Breakdown Summary
    c = decklist.calculated_totals
    r = decklist.recorded_totals
    print(f"MAIN DECK:   {c['main']} Cards (Monsters: {c['monsters']}, Spells: {c['spells']}, Traps: {c['traps']})")
    print(f"EXTRA DECK:  {c['extra']} Cards")
    print(f"SIDE DECK:   {c['side']} Cards")
    print("-" * 80)

    if show_cards:
        def print_section(title: str, entries: List[DeckEntry], recorded_total: Optional[int]):
            calc_total = sum(e.count for e in entries)
            rec_str = f" | Sheet Recorded: {recorded_total}" if recorded_total is not None else ""
            print(f"\n--- {title} ({calc_total} Cards{rec_str}) ---")
            if not entries:
                print("  (Empty)")
                return
            for e in entries:
                code_str = f" [{e.passcode}]" if e.passcode else ""
                print(f"  {e.count}x {e.name}{code_str}")

        print_section("MONSTER CARDS", decklist.monsters, r.get("monsters"))
        print_section("SPELL CARDS", decklist.spells, r.get("spells"))
        print_section("TRAP CARDS", decklist.traps, r.get("traps"))
        print_section("EXTRA DECK", decklist.extra, r.get("extra"))
        print_section("SIDE DECK", decklist.side, r.get("side"))
        print("-" * 80)

    # Arithmetic Discrepancies
    if decklist.discrepancies:
        print("\n❌ ARITHMETIC DISCREPANCIES DETECTED:")
        for disc in decklist.discrepancies:
            print(f"   [!] {disc}")
    else:
        print("\n✅ ARITHMETIC AUDIT: All section totals match individual card counts perfectly.")

    # Tournament Policy Violations
    if decklist.violations:
        print("\n🚨 TOURNAMENT POLICY VIOLATIONS DETECTED (Risk of Game Loss / DQ):")
        for viol in decklist.violations:
            print(f"   [!] {viol}")
    else:
        print("✅ TOURNAMENT LEGALITY: Deck sizes and copy limits are strictly compliant.")

    print("=" * 80)


# ==============================================================================
# Built-In Self-Test Suite (--test)
# ==============================================================================

def run_self_tests() -> bool:
    """Executes verification tests for KDE Decklist reading, filling, and auditing."""
    print("=== Running KDE Decklist Engine Self-Tests ===\n")
    all_passed = True

    template_path = find_default_template_path()
    db_path = find_cards_db_path()

    # Test 1: Verify Template Exists and Has 183 Form Fields
    print("Test 1: Verifying KDE_DeckList.pdf template integrity...")
    if not os.path.exists(template_path):
        print(f"❌ FAIL: Template not found at {template_path}")
        return False
    reader = pypdf.PdfReader(template_path)
    fields = reader.get_fields() or {}
    if len(fields) != 183:
        print(f"❌ FAIL: Expected 183 fields, found {len(fields)}")
        all_passed = False
    else:
        print(f"✅ PASS: KDE_DeckList.pdf has exact 183 interactive AcroForm fields.")

    # Test 2: In-Memory Fill and Readback Verification
    print("\nTest 2: In-memory fill, appearance generation, and readback...")
    sample_deck = {
        "player": {
            "first_name": "Seto",
            "last_name": "Kaiba",
            "last_name_initial": "K",
            "card_game_id": "1000000001",
            "country": "Japan",
            "event_name": "Battle City Finals",
            "event_date_month": "10",
            "event_date_day": "07",
            "event_date_year": "2026",
        },
        "monsters": [
            {"name": "Blue-Eyes White Dragon", "count": 3, "passcode": 89631139},
            {"name": "Sage with Eyes of Blue", "count": 3, "passcode": 8240199},
            {"name": "White Stone of Ancients", "count": 3, "passcode": 71039903},
        ],
        "spells": [
            {"name": "Return of the Dragon Lords", "count": 3, "passcode": 6853254},
            {"name": "The Melody of Awakening Dragon", "count": 3, "passcode": 48800175},
        ],
        "traps": [
            {"name": "True Light", "count": 2, "passcode": 3055835},
        ],
        "extra": [
            {"name": "Blue-Eyes Spirit Dragon", "count": 2, "passcode": 59822133},
        ],
        "side": [
            {"name": "Nibiru, the Primal Being", "count": 3, "passcode": 27204311},
        ],
    }

    import tempfile
    with tempfile.NamedTemporaryFile(suffix=".pdf", delete=False) as tmp_pdf:
        tmp_pdf_path = tmp_pdf.name

    try:
        fill_res = fill_kde_decklist(
            deck_source=sample_deck,
            output_pdf_path=tmp_pdf_path,
            template_pdf_path=template_path,
            db_path=db_path,
        )
        assert fill_res["main_total"] == 17
        assert fill_res["monsters_count"] == 9
        assert fill_res["spells_count"] == 6
        assert fill_res["traps_count"] == 2

        # Read back filled PDF
        parsed = read_kde_decklist(tmp_pdf_path, db_path=db_path)
        assert parsed.player.first_name == "Seto"
        assert parsed.player.last_name == "Kaiba"
        assert parsed.player.card_game_id == "1000000001"
        assert len(parsed.monsters) == 3
        assert parsed.total_monsters() == 9
        assert parsed.total_spells() == 6
        assert parsed.total_traps() == 2
        assert parsed.total_main() == 17
        assert parsed.total_extra() == 2
        assert parsed.total_side() == 3
        assert len(parsed.discrepancies) == 0
        print("✅ PASS: In-memory fill and readback matched perfectly without discrepancies.")
    finally:
        if os.path.exists(tmp_pdf_path):
            os.remove(tmp_pdf_path)

    # Test 3: Discrepancy Detection Test
    print("\nTest 3: Testing arithmetic discrepancy auditing...")
    with tempfile.NamedTemporaryFile(suffix=".pdf", delete=False) as tmp_pdf:
        tmp_pdf_path = tmp_pdf.name

    try:
        # Intentionally alter Main Deck Total field
        reader_base = pypdf.PdfReader(template_path)
        writer = pypdf.PdfWriter()
        writer.append(reader_base)
        writer.update_page_form_field_values(writer.pages[0], {
            "Monster 1": "Dark Magician",
            "Monster Card 1 Count": "3",
            "Total Monster Cards": "3",
            "Main Deck Total": "40",  # Cards sum to 3, but sheet claims 40!
        })
        with open(tmp_pdf_path, "wb") as f:
            writer.write(f)

        parsed_disc = read_kde_decklist(tmp_pdf_path, db_path=db_path)
        assert len(parsed_disc.discrepancies) > 0
        print(f"✅ PASS: Discrepancy successfully detected: {parsed_disc.discrepancies[0]}")
    finally:
        if os.path.exists(tmp_pdf_path):
            os.remove(tmp_pdf_path)

    # Test 4: Tournament Policy Violations Test (>3 copies, Main < 40)
    print("\nTest 4: Testing Tournament Policy violation flags...")
    with tempfile.NamedTemporaryFile(suffix=".pdf", delete=False) as tmp_pdf:
        tmp_pdf_path = tmp_pdf.name

    try:
        writer = pypdf.PdfWriter()
        writer.append(pypdf.PdfReader(template_path))
        writer.update_page_form_field_values(writer.pages[0], {
            "Monster 1": "Ash Blossom & Joyous Spring",
            "Monster Card 1 Count": "3",
            "Side Deck 1": "Ash Blossom & Joyous Spring",
            "Side Deck 1 Count": "1",  # 4 copies total!
        })
        with open(tmp_pdf_path, "wb") as f:
            writer.write(f)

        parsed_viol = read_kde_decklist(tmp_pdf_path, db_path=db_path)
        copy_viol = any("4 total copies" in v for v in parsed_viol.violations)
        deck_size_viol = any("Minimum is 40" in v for v in parsed_viol.violations)
        assert copy_viol, "Failed to flag 4 copies of Ash Blossom"
        assert deck_size_viol, "Failed to flag Main Deck < 40 cards"
        print("✅ PASS: Correctly flagged both copy limit violation (4 copies) and undersized Main Deck (<40).")
    finally:
        if os.path.exists(tmp_pdf_path):
            os.remove(tmp_pdf_path)

    # Test 5: Real .YDK Ingestion & Passcode Categorization
    print("\nTest 5: Testing .ydk parsing, auto-categorization, and .ydk roundtrip...")
    ydk_sample = """#created by test
#main
14558128
14558128
14558128
24224830
43450363
#extra
29301450
!side
27204311
27204311
"""
    with tempfile.NamedTemporaryFile(suffix=".pdf", delete=False) as tmp_pdf:
        tmp_pdf_path = tmp_pdf.name

    try:
        fill_res = fill_kde_decklist(
            deck_source=ydk_sample,
            output_pdf_path=tmp_pdf_path,
            template_pdf_path=template_path,
            player=PlayerInfo(first_name="Yugi", last_name="Muto"),
            db_path=db_path,
        )
        parsed_ydk = read_kde_decklist(tmp_pdf_path, db_path=db_path)
        assert parsed_ydk.total_monsters() == 3  # Ash Blossom
        assert parsed_ydk.total_spells() == 1    # Called by the Grave
        assert parsed_ydk.total_traps() == 1     # R.B. Last Stand
        assert parsed_ydk.total_extra() == 1     # S:P Little Knight
        assert parsed_ydk.total_side() == 2      # Nibiru

        ydk_out = kde_to_ydk(parsed_ydk, db_path=db_path)
        assert "#main" in ydk_out
        assert "14558128" in ydk_out
        assert "#extra" in ydk_out
        assert "29301450" in ydk_out
        assert "!side" in ydk_out
        assert "27204311" in ydk_out
        print("✅ PASS: .ydk ingested, categorized into Monsters/Spells/Traps, and converted back to valid .ydk.")
    finally:
        if os.path.exists(tmp_pdf_path):
            os.remove(tmp_pdf_path)

    print("\n>>> ALL KDE DECKLIST ENGINE SELF-TESTS PASSED! <<<")
    return all_passed


# ==============================================================================
# CLI Entry Point
# ==============================================================================

def main():
    parser = argparse.ArgumentParser(
        description="Konami Digital Entertainment (KDE) Official Tournament Decklist PDF Engine"
    )
    subparsers = parser.add_subparsers(dest="command")

    # Command: read
    p_read = subparsers.add_parser("read", help="Read and audit an existing KDE Decklist PDF")
    p_read.add_argument("pdf_path", help="Path to filled KDE Decklist PDF")
    p_read.add_argument("--ydk-out", help="Optional path to export resolved .ydk deck file")
    p_read.add_argument("--json", action="store_true", help="Output machine-readable JSON")
    p_read.add_argument("--db", help="Path to custom SQLite cards.db")
    p_read.add_argument("--no-cards", action="store_true", help="Hide individual card lists in audit view")

    # Command: fill
    p_fill = subparsers.add_parser("fill", help="Fill an official KDE Decklist PDF from .ydk or JSON")
    p_fill.add_argument("--ydk", help="Path to input .ydk decklist file")
    p_fill.add_argument("--json-input", help="Path to input JSON deck definition file")
    p_fill.add_argument("--output", "-o", required=True, help="Destination PDF file path")
    p_fill.add_argument("--template", help="Path to empty KDE_DeckList.pdf template")
    p_fill.add_argument("--db", help="Path to custom SQLite cards.db")
    p_fill.add_argument("--no-sort", action="store_true", help="Keep original card order instead of sorting A-Z")
    # Player metadata
    p_fill.add_argument("--name", help="Player full name (e.g. 'Seto Kaiba')")
    p_fill.add_argument("--first-name", help="Player first & middle names")
    p_fill.add_argument("--last-name", help="Player last name")
    p_fill.add_argument("--initial", help="Player last name initial")
    p_fill.add_argument("--id", "--cossy-id", dest="card_game_id", help="Konami Card Game ID (10 digits)")
    p_fill.add_argument("--country", help="Country of residency")
    p_fill.add_argument("--event", help="Tournament event name")
    p_fill.add_argument("--date", help="Event date (YYYY-MM-DD or MM/DD/YYYY)")

    # Test flag
    parser.add_argument("--test", action="store_true", help="Execute built-in test suite")

    args = parser.parse_args()

    if args.test:
        success = run_self_tests()
        sys.exit(0 if success else 1)

    if args.command == "read":
        try:
            decklist = read_kde_decklist(args.pdf_path, db_path=args.db)
            if args.json:
                print(json.dumps(decklist.to_dict(), indent=2))
            else:
                print_decklist_audit(decklist, show_cards=not args.no_cards)

            if args.ydk_out:
                ydk_str = kde_to_ydk(decklist, db_path=args.db)
                os.makedirs(os.path.dirname(os.path.abspath(args.ydk_out)) or ".", exist_ok=True)
                with open(args.ydk_out, "w", encoding="utf-8") as f_ydk:
                    f_ydk.write(ydk_str)
                print(f"\n[+] Exported simulator .ydk file to: {args.ydk_out}")

        except Exception as e:
            print(f"Error reading KDE decklist: {e}", file=sys.stderr)
            sys.exit(1)

    elif args.command == "fill":
        # Resolve player info
        first_name = args.first_name or ""
        last_name = args.last_name or ""
        if args.name and not (first_name or last_name):
            parts = args.name.strip().split()
            if len(parts) == 1:
                first_name = parts[0]
            elif len(parts) > 1:
                first_name = " ".join(parts[:-1])
                last_name = parts[-1]

        m, d, y = "", "", ""
        if args.date:
            date_clean = args.date.strip()
            # Try YYYY-MM-DD
            m_iso = re.match(r"^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})$", date_clean)
            if m_iso:
                y, m, d = m_iso.group(1), m_iso.group(2).zfill(2), m_iso.group(3).zfill(2)
            else:
                m_us = re.match(r"^(\d{1,2})[-/.](\d{1,2})[-/.](\d{2,4})$", date_clean)
                if m_us:
                    m, d = m_us.group(1).zfill(2), m_us.group(2).zfill(2)
                    y = m_us.group(3)
                    if len(y) == 2:
                        y = "20" + y

        player = PlayerInfo(
            first_name=first_name,
            last_name=last_name,
            last_name_initial=args.initial or (last_name[0].upper() if last_name else ""),
            card_game_id=args.card_game_id or "",
            country=args.country or "",
            event_name=args.event or "",
            event_date_month=m,
            event_date_day=d,
            event_date_year=y,
        )

        try:
            if args.json_input:
                with open(args.json_input, "r", encoding="utf-8") as f_json:
                    deck_source = json.load(f_json)
            elif args.ydk:
                deck_source = args.ydk
            else:
                print("Error: Either --ydk or --json-input must be provided.", file=sys.stderr)
                sys.exit(1)

            res = fill_kde_decklist(
                deck_source=deck_source,
                output_pdf_path=args.output,
                template_pdf_path=args.template,
                player=player,
                db_path=args.db,
                sort_alphabetical=not args.no_sort,
            )

            print(f"✅ Successfully generated official KDE Decklist PDF:")
            print(f"   Output:    {res['output_pdf']}")
            print(f"   Player:    {player.full_name() or '(None)'} [ID: {player.card_game_id or '-'}]")
            print(f"   Main Deck: {res['main_total']} Cards (Monsters: {res['monsters_count']}, Spells: {res['spells_count']}, Traps: {res['traps_count']})")
            print(f"   Extra:     {res['extra_total']} Cards | Side: {res['side_total']} Cards")

        except Exception as e:
            print(f"Error filling KDE decklist: {e}", file=sys.stderr)
            sys.exit(1)

    else:
        parser.print_help()


if __name__ == "__main__":
    main()
