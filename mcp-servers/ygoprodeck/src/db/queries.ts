import type { DatabaseSync } from "node:sqlite";
import type {
  CardFullDetails,
  CardSearchSummary,
  DbCard,
  EvaluateTechCountersInput,
  GenesysCardReport,
  GenesysDeckReport,
  GetTopTechCardsInput,
  GetTournamentDecklistsInput,
  SearchCardsInput,
  TechCardFrequency,
  TechCounterRecommendation,
  TournamentDeckCardDetail,
  TournamentDeckDetail
} from "../types.js";

/**
 * Sanitizes a query string for SQLite FTS5 syntax safety.
 * Wraps terms in double-quotes to avoid unintended FTS operators (AND, OR, NOT, *, etc.)
 */
function sanitizeFtsQuery(query: string): string {
  const cleaned = query.replace(/[^\w\s-]/g, " ").trim();
  if (!cleaned) return "";
  return cleaned
    .split(/\s+/)
    .map((term) => `"${term}"`)
    .join(" ");
}

/**
 * Creates a token-lean snippet from a card's PSCT text.
 */
function makeSnippet(desc: string, maxLen = 120): string {
  const singleLine = desc.replace(/\r?\n|\r/g, " ").trim();
  if (singleLine.length <= maxLen) return singleLine;
  return `${singleLine.slice(0, maxLen).trim()}...`;
}

/**
 * Searches cards using full-text search (FTS5) and/or structured parameter filters.
 */
export function queryCards(db: DatabaseSync, input: SearchCardsInput): CardSearchSummary[] {
  const conditions: string[] = [];
  const params: any[] = [];

  const useFts = Boolean(input.query && input.query.trim().length > 0);
  let baseQuery = "";

  if (useFts) {
    const sanitizedFts = sanitizeFtsQuery(input.query!);
    if (sanitizedFts) {
      baseQuery = `
        SELECT c.* 
        FROM cards_fts f
        JOIN cards c ON f.rowid = c.id
      `;
      conditions.push("cards_fts MATCH ?");
      params.push(sanitizedFts);
    } else {
      baseQuery = "SELECT c.* FROM cards c";
    }
  } else {
    baseQuery = "SELECT c.* FROM cards c";
  }

  // Structured Filters
  if (input.name) {
    conditions.push("c.name LIKE ?");
    params.push(`%${input.name.trim()}%`);
  }
  if (input.type) {
    conditions.push("c.type LIKE ?");
    params.push(`%${input.type.trim()}%`);
  }
  if (input.attribute) {
    conditions.push("c.attribute = ? COLLATE NOCASE");
    params.push(input.attribute.trim());
  }
  if (input.race) {
    conditions.push("c.race LIKE ?");
    params.push(`%${input.race.trim()}%`);
  }
  if (input.archetype) {
    conditions.push("c.archetype LIKE ?");
    params.push(`%${input.archetype.trim()}%`);
  }
  if (input.level !== undefined) {
    conditions.push("c.level = ?");
    params.push(input.level);
  }
  if (input.level_min !== undefined) {
    conditions.push("c.level >= ?");
    params.push(input.level_min);
  }
  if (input.level_max !== undefined) {
    conditions.push("c.level <= ?");
    params.push(input.level_max);
  }
  if (input.atk_min !== undefined) {
    conditions.push("c.atk >= ?");
    params.push(input.atk_min);
  }
  if (input.atk_max !== undefined) {
    conditions.push("c.atk <= ?");
    params.push(input.atk_max);
  }
  if (input.def_min !== undefined) {
    conditions.push("c.def >= ?");
    params.push(input.def_min);
  }
  if (input.def_max !== undefined) {
    conditions.push("c.def <= ?");
    params.push(input.def_max);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
  const limitClause = "LIMIT ?";
  params.push(Math.min(input.limit || 10, 25)); // Cap to 25 max for token efficiency

  const sql = `${baseQuery} ${whereClause} ORDER BY c.name ASC ${limitClause};`;
  const rows = db.prepare(sql).all(...params) as unknown as DbCard[];

  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    type: row.type,
    attribute: row.attribute ?? undefined,
    race: row.race ?? undefined,
    level: row.level ?? undefined,
    atk: row.atk ?? undefined,
    def: row.def ?? undefined,
    linkval: row.linkval ?? undefined,
    scale: row.scale ?? undefined,
    archetype: row.archetype ?? undefined,
    genesys_points: row.genesys_points ?? 0,
    snippet: makeSnippet(row.desc)
  }));
}

/**
 * Retrieves exact, full card details including unabridged PSCT and banlist statuses.
 */
export function queryCardDetails(db: DatabaseSync, nameOrId: string): CardFullDetails | null {
  const isNumeric = /^\d+$/.test(nameOrId.trim());
  let card: DbCard | undefined;

  if (isNumeric) {
    card = db.prepare("SELECT * FROM cards WHERE id = ?").get(parseInt(nameOrId.trim(), 10)) as unknown as DbCard | undefined;
  } else {
    card = db.prepare("SELECT * FROM cards WHERE name = ? COLLATE NOCASE").get(nameOrId.trim()) as unknown as DbCard | undefined;
    if (!card) {
      card = db.prepare("SELECT * FROM cards WHERE name LIKE ? ORDER BY LENGTH(name) ASC LIMIT 1").get(`%${nameOrId.trim()}%`) as unknown as DbCard | undefined;
    }
  }

  if (!card) return null;

  // Retrieve banlist status for all formats
  const banRows = db
    .prepare("SELECT format, status FROM card_banlists WHERE card_id = ?")
    .all(card.id) as unknown as Array<{ format: string; status: string }>;

  const banlistStatus: Record<string, string> = {};
  for (const row of banRows) {
    banlistStatus[row.format] = row.status;
  }

  return {
    ...card,
    genesys_points: card.genesys_points ?? 0,
    banlist_status: banlistStatus
  };
}

/**
 * Batch checks the legality of a list of card names or IDs for a specific format.
 */
export function queryBanlist(
  db: DatabaseSync,
  format: string,
  cardQueries: string[]
): Array<{ card: string; id?: number; name?: string; status: string }> {
  const stmtById = db.prepare("SELECT id, name, type, genesys_points FROM cards WHERE id = ?");
  const stmtByName = db.prepare("SELECT id, name, type, genesys_points FROM cards WHERE name = ? COLLATE NOCASE");
  const stmtBan = db.prepare("SELECT status FROM card_banlists WHERE card_id = ? AND format = ?");

  const results: Array<{ card: string; id?: number; name?: string; status: string }> = [];
  const isGenesys = format.toLowerCase() === "genesys";

  for (const query of cardQueries) {
    const trimmed = query.trim();
    const isNum = /^\d+$/.test(trimmed);
    const card = (isNum
      ? stmtById.get(parseInt(trimmed, 10))
      : stmtByName.get(trimmed)) as unknown as { id: number; name: string; type: string; genesys_points: number } | undefined;

    if (!card) {
      results.push({
        card: trimmed,
        status: "Unknown (Card not found in database)"
      });
      continue;
    }

    if (isGenesys) {
      const isLinkOrPend = card.type.includes("Link") || card.type.includes("Pendulum");
      if (isLinkOrPend) {
        results.push({
          card: trimmed,
          id: card.id,
          name: card.name,
          status: "Forbidden (Link and Pendulum Monsters are strictly illegal in Genesys)"
        });
      } else {
        const pts = card.genesys_points || 0;
        results.push({
          card: trimmed,
          id: card.id,
          name: card.name,
          status: pts > 0 ? `Pointed (${pts} Points)` : "Unlimited (0 Points)"
        });
      }
      continue;
    }

    const banRow = stmtBan.get(card.id, format.toLowerCase()) as unknown as { status: string } | undefined;
    results.push({
      card: trimmed,
      id: card.id,
      name: card.name,
      status: banRow ? banRow.status : "Unlimited"
    });
  }

  return results;
}

/**
 * Evaluates Genesys format points, budget compliance, and mechanical legality for a deck.
 */
export function queryGenesysPoints(
  db: DatabaseSync,
  cardQueries: string[]
): GenesysDeckReport {
  const stmtById = db.prepare("SELECT id, name, type, genesys_points FROM cards WHERE id = ?");
  const stmtByName = db.prepare("SELECT id, name, type, genesys_points FROM cards WHERE name = ? COLLATE NOCASE");

  const reports: GenesysCardReport[] = [];
  let totalPoints = 0;
  let forbiddenCount = 0;

  for (const q of cardQueries) {
    const trimmed = q.trim();
    if (!trimmed) continue;
    const isNum = /^\d+$/.test(trimmed);
    const card = (isNum
      ? stmtById.get(parseInt(trimmed, 10))
      : stmtByName.get(trimmed)) as unknown as { id: number; name: string; type: string; genesys_points: number } | undefined;

    if (!card) {
      reports.push({
        name: trimmed,
        points: 0,
        is_legal: true,
        status: "Unknown (Unpointed / 0 Points assumed)"
      });
      continue;
    }

    const isLinkOrPendulum = card.type.includes("Link") || card.type.includes("Pendulum");
    if (isLinkOrPendulum) {
      forbiddenCount++;
      reports.push({
        card_id: card.id,
        name: card.name,
        type: card.type,
        points: 0,
        is_legal: false,
        status: "FORBIDDEN (Link and Pendulum Monsters are strictly illegal in Genesys)"
      });
    } else {
      const pts = card.genesys_points || 0;
      totalPoints += pts;
      reports.push({
        card_id: card.id,
        name: card.name,
        type: card.type,
        points: pts,
        is_legal: true,
        status: pts > 0 ? `Pointed (${pts} Points)` : "Legal (0 Points)"
      });
    }
  }

  const pointedOnly = reports.filter((r) => r.points > 0 || !r.is_legal);

  return {
    total_cards: reports.length,
    total_points: totalPoints,
    point_cap: 100,
    is_budget_compliant: totalPoints <= 100,
    is_mechanically_legal: forbiddenCount === 0,
    remaining_allowance: Math.max(0, 100 - totalPoints),
    forbidden_mechanics_count: forbiddenCount,
    pointed_cards: pointedOnly,
    all_cards: reports
  };
}

/**
 * Retrieves database statistics and metadata.
 */
export function queryDatabaseInfo(db: DatabaseSync): {
  totalCards: number;
  lastSyncedAt: string | null;
  formatsTracked: string[];
} {
  const countRow = db.prepare("SELECT COUNT(*) as total FROM cards").get() as unknown as { total: number };
  const metaRow = db
    .prepare("SELECT value FROM sync_metadata WHERE key = 'last_synced_at'")
    .get() as unknown as { value: string } | undefined;
  const formatsRows = db
    .prepare("SELECT DISTINCT format FROM card_banlists")
    .all() as unknown as Array<{ format: string }>;

  return {
    totalCards: countRow ? countRow.total : 0,
    lastSyncedAt: metaRow ? metaRow.value : null,
    formatsTracked: formatsRows.map((f) => f.format)
  };
}

/**
 * Retrieves top tournament archetypes for a given format and timeframe.
 */
export function queryTopArchetypes(
  db: DatabaseSync,
  input: { format?: string; timeframe?: string; limit?: number }
): {
  format: string;
  timeframe: string;
  total_samples: number;
  date_start: string | null;
  date_end: string | null;
  top_archetypes: Array<{
    rank: number;
    archetype: string;
    share_percent: number;
    quantity: number;
  }>;
} {
  const format = input.format ?? "TCG";
  const timeframe = input.timeframe ?? "current";
  const limit = Math.min(input.limit ?? 15, 50);

  const rows = db
    .prepare(`
      SELECT archetype, quantity, share_percent, total_samples, date_start, date_end
      FROM meta_archetypes
      WHERE format = ? COLLATE NOCASE AND timeframe = ?
      ORDER BY share_percent DESC, quantity DESC
      LIMIT ?
    `)
    .all(format, timeframe, limit) as unknown as Array<{
      archetype: string;
      quantity: number;
      share_percent: number;
      total_samples: number;
      date_start: string | null;
      date_end: string | null;
    }>;

  const totalSamples = rows.length > 0 ? rows[0].total_samples : 0;
  const dateStart = rows.length > 0 ? rows[0].date_start : null;
  const dateEnd = rows.length > 0 ? rows[0].date_end : null;

  return {
    format,
    timeframe,
    total_samples: totalSamples,
    date_start: dateStart,
    date_end: dateEnd,
    top_archetypes: rows.map((r, i) => ({
      rank: i + 1,
      archetype: r.archetype,
      share_percent: r.share_percent,
      quantity: r.quantity
    }))
  };
}

/**
 * Retrieves recent tournaments with optional format and country filters.
 */
export function queryRecentTournaments(
  db: DatabaseSync,
  input: { format?: string; country?: string; limit?: number }
): Array<{
  id: number;
  name: string;
  country: string | null;
  event_date: string;
  winner: string | null;
  format: string;
  slug: string;
  player_count: number | null;
}> {
  const conditions: string[] = [];
  const params: any[] = [];

  if (input.format) {
    conditions.push("format = ? COLLATE NOCASE");
    params.push(input.format);
  }
  if (input.country) {
    conditions.push("country LIKE ?");
    params.push(`%${input.country.trim()}%`);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
  const limit = Math.min(input.limit ?? 15, 50);
  params.push(limit);

  const sql = `
    SELECT id, name, country, event_date, winner, format, slug, player_count
    FROM tournament_events
    ${whereClause}
    ORDER BY event_date DESC, id DESC
    LIMIT ?
  `;

  return db.prepare(sql).all(...params) as unknown as Array<{
    id: number;
    name: string;
    country: string | null;
    event_date: string;
    winner: string | null;
    format: string;
    slug: string;
    player_count: number | null;
  }>;
}

/**
 * Retrieves details for a specific tournament event by slug or numeric ID.
 */
export function queryTournamentDetails(
  db: DatabaseSync,
  slugOrId: string
): {
  id: number;
  name: string;
  country: string | null;
  event_date: string;
  winner: string | null;
  format: string;
  slug: string;
  player_count: number | null;
  ygoprodeck_url: string;
} | null {
  const isNumeric = /^\d+$/.test(slugOrId.trim());
  let row: any;

  if (isNumeric) {
    row = db
      .prepare("SELECT * FROM tournament_events WHERE id = ?")
      .get(parseInt(slugOrId.trim(), 10));
  } else {
    row = db
      .prepare("SELECT * FROM tournament_events WHERE slug = ? COLLATE NOCASE")
      .get(slugOrId.trim());
    if (!row) {
      row = db
        .prepare("SELECT * FROM tournament_events WHERE name LIKE ? ORDER BY event_date DESC LIMIT 1")
        .get(`%${slugOrId.trim()}%`);
    }
  }

  if (!row) return null;

  return {
    id: row.id,
    name: row.name,
    country: row.country,
    event_date: row.event_date,
    winner: row.winner,
    format: row.format,
    slug: row.slug,
    player_count: row.player_count,
    ygoprodeck_url: `https://ygoprodeck.com/tournament/${row.slug}`
  };
}

/**
 * Queries tech/non-engine cards aggregated across tournament top-cut decks.
 * Correctly distinguishes between true tech cards and secondary engines in pile decks.
 */
export function queryTopTechCards(
  db: DatabaseSync,
  input: GetTopTechCardsInput
): {
  format: string;
  archetype_filtered?: string;
  section: string;
  since_date?: string;
  total_decks_analyzed: number;
  tech_cards: TechCardFrequency[];
} {
  const format = input.format || "TCG";
  const sectionFilter = input.section || "all";
  const limit = Math.min(input.limit || 20, 50);

  // 1. Fetch matching decks
  const deckConditions: string[] = ["d.format = ? COLLATE NOCASE"];
  const deckParams: any[] = [format];

  if (input.since_date) {
    deckConditions.push("d.event_date >= ?");
    deckParams.push(input.since_date.trim());
  }

  if (input.archetype) {
    const archTerm = `%${input.archetype.trim()}%`;
    deckConditions.push("(d.archetype LIKE ? OR d.arch_2 LIKE ? OR d.arch_3 LIKE ? OR d.deck_name LIKE ?)");
    deckParams.push(archTerm, archTerm, archTerm, archTerm);
  }

  const decksSql = `
    SELECT d.id, d.archetype, d.arch_2, d.arch_3, d.deck_name, d.event_date
    FROM tournament_decks d
    WHERE ${deckConditions.join(" AND ")}
  `;

  const decks = db.prepare(decksSql).all(...deckParams) as unknown as Array<{
    id: number;
    archetype: string;
    arch_2: string | null;
    arch_3: string | null;
    deck_name: string | null;
    event_date: string;
  }>;

  if (decks.length === 0) {
    return {
      format,
      archetype_filtered: input.archetype,
      section: sectionFilter,
      since_date: input.since_date,
      total_decks_analyzed: 0,
      tech_cards: []
    };
  }

  const deckIds = decks.map((d) => d.id);
  const deckMap = new Map(decks.map((d) => [d.id, d]));

  // 2. Fetch all cards in these decks
  const placeholders = deckIds.map(() => "?").join(",");
  const cardsSql = `
    SELECT 
      tdc.deck_id,
      tdc.card_id,
      tdc.section,
      tdc.quantity,
      c.name,
      c.type,
      c.attribute,
      c.race,
      c.archetype AS card_archetype
    FROM tournament_deck_cards tdc
    JOIN cards c ON c.id = tdc.card_id
    WHERE tdc.deck_id IN (${placeholders})
  `;

  const rows = db.prepare(cardsSql).all(...deckIds) as unknown as Array<{
    deck_id: number;
    card_id: number;
    section: "main" | "extra" | "side";
    quantity: number;
    name: string;
    type: string;
    attribute: string | null;
    race: string | null;
    card_archetype: string | null;
  }>;

  // 3. Pile Deck Analysis: Count archetype occurrences per deck in the Main Deck
  // If a deck runs >= 3 cards of a given archetype, that archetype forms an engine cluster in that deck!
  const deckMainArchCounts = new Map<number, Map<string, number>>();
  for (const row of rows) {
    if (row.section === "main" && row.card_archetype) {
      if (!deckMainArchCounts.has(row.deck_id)) {
        deckMainArchCounts.set(row.deck_id, new Map());
      }
      const archCounts = deckMainArchCounts.get(row.deck_id)!;
      archCounts.set(
        row.card_archetype.toLowerCase(),
        (archCounts.get(row.card_archetype.toLowerCase()) ?? 0) + row.quantity
      );
    }
  }

  // 4. Classify and aggregate tech cards
  interface CardAgg {
    card_id: number;
    name: string;
    type: string;
    attribute?: string;
    race?: string;
    card_archetype?: string;
    is_generic: boolean;
    decks: Set<number>;
    main_copies: number;
    side_copies: number;
    total_copies: number;
  }

  const cardAggs = new Map<number, CardAgg>();

  for (const row of rows) {
    if (sectionFilter !== "all" && row.section !== sectionFilter) {
      continue;
    }

    const deck = deckMap.get(row.deck_id);
    if (!deck) continue;

    const cardArch = row.card_archetype?.toLowerCase();
    let isEngine = false;

    // Check if card matches primary, secondary, or tertiary deck archetype
    if (cardArch) {
      const dArch1 = deck.archetype?.toLowerCase();
      const dArch2 = deck.arch_2?.toLowerCase();
      const dArch3 = deck.arch_3?.toLowerCase();
      const dName = deck.deck_name?.toLowerCase();

      if (dArch1 && (dArch1.includes(cardArch) || cardArch.includes(dArch1))) {
        isEngine = true;
      } else if (dArch2 && (dArch2.includes(cardArch) || cardArch.includes(dArch2))) {
        isEngine = true;
      } else if (dArch3 && (dArch3.includes(cardArch) || cardArch.includes(dArch3))) {
        isEngine = true;
      } else if (dName && dName.includes(cardArch)) {
        isEngine = true;
      } else if (row.section === "main") {
        // Pile Deck cluster check: >= 3 cards of this archetype in the main deck
        const mainCount = deckMainArchCounts.get(row.deck_id)?.get(cardArch) ?? 0;
        if (mainCount >= 3) {
          isEngine = true;
        }
      }
    }

    // Side deck cards: even if from an archetype, they function as tech/counter cards unless they match the primary deck archetype
    if (row.section === "side") {
      const dArch1 = deck.archetype?.toLowerCase();
      if (cardArch && dArch1 && (dArch1.includes(cardArch) || cardArch.includes(dArch1))) {
        isEngine = true;
      } else {
        isEngine = false; // Side deck hate / tech cards
      }
    }

    if (isEngine) {
      continue; // Skip engine cards from tech aggregation
    }

    if (!cardAggs.has(row.card_id)) {
      cardAggs.set(row.card_id, {
        card_id: row.card_id,
        name: row.name,
        type: row.type,
        attribute: row.attribute ?? undefined,
        race: row.race ?? undefined,
        card_archetype: row.card_archetype ?? undefined,
        is_generic: !row.card_archetype,
        decks: new Set(),
        main_copies: 0,
        side_copies: 0,
        total_copies: 0
      });
    }

    const agg = cardAggs.get(row.card_id)!;
    agg.decks.add(row.deck_id);
    if (row.section === "main") {
      agg.main_copies += row.quantity;
    } else if (row.section === "side") {
      agg.side_copies += row.quantity;
    }
    agg.total_copies += row.quantity;
  }

  const totalDecks = decks.length;
  const result: TechCardFrequency[] = Array.from(cardAggs.values())
    .map((agg) => {
      const decksPlaying = agg.decks.size;
      const adoptionPercent = Number(((decksPlaying / totalDecks) * 100).toFixed(1));
      const mainAvg = Number((agg.main_copies / (decksPlaying || 1)).toFixed(2));
      const sideAvg = Number((agg.side_copies / (decksPlaying || 1)).toFixed(2));
      const totalAvg = Number((agg.total_copies / (decksPlaying || 1)).toFixed(2));

      return {
        card_id: agg.card_id,
        name: agg.name,
        type: agg.type,
        attribute: agg.attribute,
        race: agg.race,
        decks_playing: decksPlaying,
        total_decks_analyzed: totalDecks,
        adoption_percent: adoptionPercent,
        main_copies_avg: mainAvg,
        side_copies_avg: sideAvg,
        total_copies_avg: totalAvg,
        is_generic: agg.is_generic,
        card_archetype: agg.card_archetype
      };
    })
    .sort((a, b) => {
      if (b.adoption_percent !== a.adoption_percent) {
        return b.adoption_percent - a.adoption_percent;
      }
      return b.total_copies_avg - a.total_copies_avg;
    })
    .slice(0, limit);

  return {
    format,
    archetype_filtered: input.archetype,
    section: sectionFilter,
    since_date: input.since_date,
    total_decks_analyzed: totalDecks,
    tech_cards: result
  };
}

/**
 * Retrieves full tournament decklists with complete card names, stats, and raw .ydk content.
 */
export function queryTournamentDecklists(
  db: DatabaseSync,
  input: GetTournamentDecklistsInput
): TournamentDeckDetail[] {
  const conditions: string[] = [];
  const params: any[] = [];

  if (input.tournament_id_or_slug) {
    const val = input.tournament_id_or_slug.trim();
    if (/^\d+$/.test(val)) {
      conditions.push("d.tournament_id = ?");
      params.push(parseInt(val, 10));
    } else {
      conditions.push("(d.slug = ? OR t.slug = ?)");
      params.push(val, val);
    }
  }

  if (input.archetype) {
    const term = `%${input.archetype.trim()}%`;
    conditions.push("(d.archetype LIKE ? OR d.arch_2 LIKE ? OR d.arch_3 LIKE ? OR d.deck_name LIKE ?)");
    params.push(term, term, term, term);
  }

  if (input.placement) {
    conditions.push("d.placement LIKE ?");
    params.push(`%${input.placement.trim()}%`);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
  const limit = Math.min(input.limit || 5, 20);
  params.push(limit);

  const decksSql = `
    SELECT 
      d.id, d.tournament_id, d.slug, d.player_name, d.placement,
      d.archetype, d.arch_2, d.arch_3, d.deck_name, d.format,
      d.event_date, d.deck_price, d.ydk_content,
      t.name as tournament_name
    FROM tournament_decks d
    LEFT JOIN tournament_events t ON t.id = d.tournament_id
    ${whereClause}
    ORDER BY d.event_date DESC, d.id DESC
    LIMIT ?
  `;

  const decks = db.prepare(decksSql).all(...params) as unknown as Array<{
    id: number;
    tournament_id: number;
    slug: string;
    player_name: string | null;
    placement: string | null;
    archetype: string;
    arch_2: string | null;
    arch_3: string | null;
    deck_name: string | null;
    format: string;
    event_date: string;
    deck_price: number | null;
    ydk_content: string | null;
    tournament_name: string | null;
  }>;

  if (decks.length === 0) return [];

  const cardsStmt = db.prepare(`
    SELECT 
      tdc.section,
      tdc.quantity,
      c.id as card_id,
      c.name,
      c.type,
      c.archetype,
      c.attribute,
      c.level,
      c.race
    FROM tournament_deck_cards tdc
    JOIN cards c ON c.id = tdc.card_id
    WHERE tdc.deck_id = ?
    ORDER BY tdc.section ASC, c.type ASC, c.name ASC
  `);

  return decks.map((d) => {
    const cardRows = cardsStmt.all(d.id) as unknown as Array<{
      section: "main" | "extra" | "side";
      quantity: number;
      card_id: number;
      name: string;
      type: string;
      archetype: string | null;
      attribute: string | null;
      level: number | null;
      race: string | null;
    }>;

    const main: TournamentDeckCardDetail[] = [];
    const extra: TournamentDeckCardDetail[] = [];
    const side: TournamentDeckCardDetail[] = [];

    for (const c of cardRows) {
      const item: TournamentDeckCardDetail = {
        card_id: c.card_id,
        name: c.name,
        type: c.type,
        quantity: c.quantity,
        archetype: c.archetype ?? undefined,
        attribute: c.attribute ?? undefined,
        level: c.level ?? undefined,
        race: c.race ?? undefined
      };
      if (c.section === "main") main.push(item);
      else if (c.section === "extra") extra.push(item);
      else if (c.section === "side") side.push(item);
    }

    return {
      id: d.id,
      tournament_id: d.tournament_id,
      tournament_name: d.tournament_name ?? undefined,
      slug: d.slug,
      player_name: d.player_name,
      placement: d.placement,
      archetype: d.archetype,
      arch_2: d.arch_2,
      arch_3: d.arch_3,
      deck_name: d.deck_name,
      format: d.format,
      event_date: d.event_date,
      deck_price: d.deck_price,
      main_deck: main,
      extra_deck: extra,
      side_deck: side,
      ydk_content: input.include_ydk !== false ? (d.ydk_content ?? undefined) : undefined
    };
  });
}

/**
 * Evaluates proven and strategic tech counters against dominant tournament decks.
 */
export function queryEvaluateTechCounters(
  db: DatabaseSync,
  input: EvaluateTechCountersInput
): TechCounterRecommendation[] {
  const format = input.format || "TCG";
  const limit = Math.min(input.limit || 5, 10);

  // 1. Identify threat archetypes
  let targetArchetypes: Array<{ archetype: string; share_percent: number }> = [];

  if (input.target_archetype) {
    targetArchetypes = [{ archetype: input.target_archetype.trim(), share_percent: 0 }];
  } else {
    // Retrieve top archetypes from meta_archetypes or tournament_decks
    const metaRows = db
      .prepare(`
        SELECT archetype, share_percent
        FROM meta_archetypes
        WHERE format = ? COLLATE NOCASE AND timeframe IN ('current', '1-month')
        ORDER BY share_percent DESC
        LIMIT ?
      `)
      .all(format, limit) as unknown as Array<{ archetype: string; share_percent: number }>;

    if (metaRows.length > 0) {
      targetArchetypes = metaRows;
    } else {
      const deckArchRows = db
        .prepare(`
          SELECT archetype, COUNT(*) as count
          FROM tournament_decks
          WHERE format = ? COLLATE NOCASE
          GROUP BY archetype
          ORDER BY count DESC
          LIMIT ?
        `)
        .all(format, limit) as unknown as Array<{ archetype: string; count: number }>;

      targetArchetypes = deckArchRows.map((r) => ({
        archetype: r.archetype,
        share_percent: 0
      }));
    }
  }

  // 2. Fetch all Side Deck tech cards from tournament_deck_cards to see empirical counters
  const sideTechResults = queryTopTechCards(db, {
    format,
    section: "side",
    since_date: input.since_date,
    limit: 25
  });

  const provenSideCounters = sideTechResults.tech_cards.map((t) => ({
    card_id: t.card_id,
    name: t.name,
    type: t.type,
    side_deck_adoption_percent: t.adoption_percent,
    avg_copies: t.side_copies_avg || t.total_copies_avg
  }));

  // 3. Analyze each threat archetype's cards to extract vulnerabilities
  const cardAnalysisStmt = db.prepare(`
    SELECT desc, attribute, race
    FROM cards
    WHERE archetype LIKE ?
    LIMIT 30
  `);

  const recommendations: TechCounterRecommendation[] = [];

  for (const threat of targetArchetypes) {
    const cardRows = cardAnalysisStmt.all(`%${threat.archetype}%`) as unknown as Array<{
      desc: string;
      attribute: string | null;
      race: string | null;
    }>;

    let gyCount = 0;
    let searchCount = 0;
    let specialCount = 0;
    let spellTrapCount = 0;
    const attributes = new Set<string>();
    const types = new Set<string>();

    for (const card of cardRows) {
      const desc = card.desc.toLowerCase();
      if (desc.includes("graveyard") || desc.includes("gy")) gyCount++;
      if (desc.includes("add") && (desc.includes("deck") || desc.includes("hand"))) searchCount++;
      if (desc.includes("special summon")) specialCount++;
      if (card.attribute) attributes.add(card.attribute);
      if (card.race) types.add(card.race);
    }

    const totalCards = cardRows.length || 1;
    const isGy = gyCount / totalCards >= 0.25;
    const isSearch = searchCount / totalCards >= 0.25;
    const isSpecial = specialCount / totalCards >= 0.35;
    const isBackrow = threat.archetype.toLowerCase().includes("runick") ||
      threat.archetype.toLowerCase().includes("labrynth") ||
      threat.archetype.toLowerCase().includes("eldlich") ||
      threat.archetype.toLowerCase().includes("traptrix");

    const recommendedSolutions: Array<{
      category: "Turn 0 Hand Trap" | "Turn 2 Board Breaker" | "Floodgate / Counter Trap";
      card_name: string;
      strategic_reasoning: string;
    }> = [];

    if (isGy) {
      recommendedSolutions.push({
        category: "Turn 0 Hand Trap",
        card_name: "Dimension Shifter / Bystial Magnamhut",
        strategic_reasoning: `Severe Graveyard dependency detected in ${threat.archetype} (${gyCount} GY triggers). Banishment or GY exclusion cripples recursive resource loops.`
      });
      recommendedSolutions.push({
        category: "Turn 2 Board Breaker",
        card_name: "Abyss Dweller / Silent Graveyard",
        strategic_reasoning: "Prevents GY trigger effects from resolving during push turns."
      });
    }

    if (isSearch) {
      recommendedSolutions.push({
        category: "Turn 0 Hand Trap",
        card_name: "Droll & Lock Bird / Ash Blossom & Joyous Spring",
        strategic_reasoning: `High search concentration detected in ${threat.archetype}. Droll & Lock Bird completely shuts down multi-step search lines after the first add.`
      });
    }

    if (isSpecial) {
      recommendedSolutions.push({
        category: "Turn 0 Hand Trap",
        card_name: "Nibiru, the Primal Being / Mulcharmy Fuwalos",
        strategic_reasoning: `Heavy Special Summon spam detected in ${threat.archetype}. Nibiru wipes monster establishment on the 5th summon, while Mulcharmy Fuwalos generates +3 to +5 hand advantage.`
      });
      recommendedSolutions.push({
        category: "Turn 2 Board Breaker",
        card_name: "Dark Ruler No More / Forbidden Droplet / Super Polymerization",
        strategic_reasoning: "Neutralizes multi-negate monster boards without triggering floating effects."
      });
    }

    if (isBackrow) {
      recommendedSolutions.push({
        category: "Turn 2 Board Breaker",
        card_name: "Evenly Matched / Harpie's Feather Duster / Cosmic Cyclone",
        strategic_reasoning: `Backrow-heavy control engine. Evenly Matched strips set spell/traps face-down, bypassing destruction protection.`
      });
    }

    // Default universal staples if archetype profile was sparse
    if (recommendedSolutions.length === 0) {
      recommendedSolutions.push({
        category: "Turn 0 Hand Trap",
        card_name: "Infinite Impermanence / Ash Blossom & Joyous Spring",
        strategic_reasoning: "Universal low-commitment negation targeting the first normal summon or choke starter."
      });
      recommendedSolutions.push({
        category: "Turn 2 Board Breaker",
        card_name: "Super Polymerization / Triple Tactics Talent",
        strategic_reasoning: "High-impact non-interactive board breaking."
      });
    }

    recommendations.push({
      threat_archetype: threat.archetype,
      meta_share_percent: threat.share_percent,
      vulnerability_profile: {
        gy_dependent: isGy,
        heavy_searching: isSearch,
        special_summon_spam: isSpecial,
        backrow_reliant: isBackrow,
        primary_attributes: Array.from(attributes),
        primary_types: Array.from(types)
      },
      proven_side_deck_counters: provenSideCounters.slice(0, 8),
      recommended_tech_solutions: recommendedSolutions
    });
  }

  return recommendations;
}

