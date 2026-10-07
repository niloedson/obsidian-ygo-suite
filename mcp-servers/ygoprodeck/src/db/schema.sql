-- Database schema for ygo-mcp (SQLite)

-- 1. Cards Table
CREATE TABLE IF NOT EXISTS cards (
    id INTEGER PRIMARY KEY,                 -- 8-digit passcode
    name TEXT NOT NULL,
    type TEXT NOT NULL,                     -- e.g. Normal Monster, Effect Monster, Spell Card
    frame_type TEXT NOT NULL,               -- e.g. normal, effect, ritual, fusion, synchro, xyz, link, spell, trap
    desc TEXT NOT NULL,                     -- Exact PSCT text
    atk INTEGER,
    def INTEGER,
    level INTEGER,                          -- Level, Rank, or Link value
    race TEXT,                              -- Monster type (Dragon) or Spell/Trap type (Quick-Play)
    attribute TEXT,                         -- DARK, LIGHT, EARTH, WATER, FIRE, WIND, DIVINE
    archetype TEXT,                         -- e.g. Blue-Eyes, Branded, HERO
    scale INTEGER,                          -- Pendulum scale
    linkval INTEGER,                        -- Link rating
    linkmarkers TEXT,                       -- Comma-separated (e.g. Top, Bottom-Right)
    ygoprodeck_url TEXT,
    genesys_points INTEGER DEFAULT 0
);

-- 2. Indexes for fast filtering
CREATE INDEX IF NOT EXISTS idx_cards_name ON cards(name COLLATE NOCASE);
CREATE INDEX IF NOT EXISTS idx_cards_type ON cards(type);
CREATE INDEX IF NOT EXISTS idx_cards_archetype ON cards(archetype COLLATE NOCASE);
CREATE INDEX IF NOT EXISTS idx_cards_attribute ON cards(attribute);
CREATE INDEX IF NOT EXISTS idx_cards_race ON cards(race);
CREATE INDEX IF NOT EXISTS idx_cards_level ON cards(level);
CREATE INDEX IF NOT EXISTS idx_cards_atk ON cards(atk);
CREATE INDEX IF NOT EXISTS idx_cards_def ON cards(def);
CREATE INDEX IF NOT EXISTS idx_cards_genesys ON cards(genesys_points);

-- 3. Banlists Table
CREATE TABLE IF NOT EXISTS card_banlists (
    card_id INTEGER NOT NULL,
    format TEXT NOT NULL,                   -- tcg, ocg, goat, edison, masterduel
    status TEXT NOT NULL,                   -- Forbidden, Limited, Semi-Limited
    PRIMARY KEY (card_id, format),
    FOREIGN KEY (card_id) REFERENCES cards(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_banlists_format ON card_banlists(format, status);

-- 4. Full-Text Search (FTS5) Virtual Table
CREATE VIRTUAL TABLE IF NOT EXISTS cards_fts USING fts5(
    name,
    desc,
    archetype,
    content='cards',
    content_rowid='id',
    tokenize='unicode61 remove_diacritics 1'
);

-- FTS Triggers to keep FTS index synchronized
CREATE TRIGGER IF NOT EXISTS cards_ai AFTER INSERT ON cards BEGIN
    INSERT INTO cards_fts(rowid, name, desc, archetype) 
    VALUES (new.id, new.name, new.desc, new.archetype);
END;

CREATE TRIGGER IF NOT EXISTS cards_ad AFTER DELETE ON cards BEGIN
    INSERT INTO cards_fts(cards_fts, rowid, name, desc, archetype) 
    VALUES('delete', old.id, old.name, old.desc, old.archetype);
END;

CREATE TRIGGER IF NOT EXISTS cards_au AFTER UPDATE ON cards BEGIN
    INSERT INTO cards_fts(cards_fts, rowid, name, desc, archetype) 
    VALUES('delete', old.id, old.name, old.desc, old.archetype);
    INSERT INTO cards_fts(rowid, name, desc, archetype) 
    VALUES (new.id, new.name, new.desc, new.archetype);
END;

-- 5. Sync Metadata
CREATE TABLE IF NOT EXISTS sync_metadata (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- 6. Meta Top Archetypes Table
CREATE TABLE IF NOT EXISTS meta_archetypes (
    format TEXT NOT NULL,                   -- TCG, OCG, Master Duel, Genesys
    timeframe TEXT NOT NULL,                -- current, 1-week, 1-month, 3-month, 6-month, 12-month, all-time
    tier_filter TEXT NOT NULL,              -- 2-3 (Premier/Competitive), 1-3 (All)
    archetype TEXT NOT NULL,
    quantity INTEGER NOT NULL,
    share_percent REAL NOT NULL,            -- e.g. 25.59 (%)
    archetype_img INTEGER,
    total_samples INTEGER NOT NULL,
    date_start TEXT,
    date_end TEXT,
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    PRIMARY KEY (format, timeframe, tier_filter, archetype)
);
CREATE INDEX IF NOT EXISTS idx_meta_archetypes_query ON meta_archetypes(format, timeframe, share_percent DESC);

-- 7. Tournament Events Table
CREATE TABLE IF NOT EXISTS tournament_events (
    id INTEGER PRIMARY KEY,
    name TEXT NOT NULL,
    country TEXT,
    event_date TEXT NOT NULL,
    winner TEXT,
    format TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    player_count INTEGER,
    is_approximate_player_count INTEGER DEFAULT 0,
    top_archetypes_summary TEXT,            -- Optional JSON breakdown
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_tournaments_date ON tournament_events(event_date DESC);
CREATE INDEX IF NOT EXISTS idx_tournaments_format ON tournament_events(format);
CREATE INDEX IF NOT EXISTS idx_tournaments_slug ON tournament_events(slug);

-- 8. Tournament Decks Table (Top-cut decklists)
CREATE TABLE IF NOT EXISTS tournament_decks (
    id INTEGER PRIMARY KEY,                 -- listing_id from YGOPRODeck
    tournament_id INTEGER NOT NULL,
    slug TEXT NOT NULL,                     -- pretty_url or slug
    player_name TEXT,
    placement TEXT,                         -- e.g. "Winner", "Runner-Up", "Top 4", "Top 8", "Top 16", "Top 32"
    archetype TEXT NOT NULL,                -- primary archetype
    arch_2 TEXT,                            -- secondary archetype
    arch_3 TEXT,                            -- tertiary archetype
    deck_name TEXT,
    format TEXT NOT NULL,
    event_date TEXT NOT NULL,
    deck_price REAL,
    ydk_content TEXT,                       -- raw .ydk content (#main, #extra, !side)
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (tournament_id) REFERENCES tournament_events(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_tournament_decks_event ON tournament_decks(tournament_id);
CREATE INDEX IF NOT EXISTS idx_tournament_decks_arch ON tournament_decks(archetype COLLATE NOCASE);
CREATE INDEX IF NOT EXISTS idx_tournament_decks_date ON tournament_decks(event_date DESC);
CREATE INDEX IF NOT EXISTS idx_tournament_decks_format ON tournament_decks(format);

-- 9. Tournament Deck Cards Table
CREATE TABLE IF NOT EXISTS tournament_deck_cards (
    deck_id INTEGER NOT NULL,
    card_id INTEGER NOT NULL,
    section TEXT NOT NULL,                  -- 'main', 'extra', 'side'
    quantity INTEGER NOT NULL,
    PRIMARY KEY (deck_id, card_id, section),
    FOREIGN KEY (deck_id) REFERENCES tournament_decks(id) ON DELETE CASCADE,
    FOREIGN KEY (card_id) REFERENCES cards(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_deck_cards_card_sec ON tournament_deck_cards(card_id, section);
CREATE INDEX IF NOT EXISTS idx_deck_cards_deck ON tournament_deck_cards(deck_id);

