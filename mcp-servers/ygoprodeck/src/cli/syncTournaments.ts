import fs from "node:fs";
import path from "node:path";
import { getDbConnection, getDataDir, initDbSchema } from "../db/connection.js";
import {
  checkRateLimitLock,
  getCrawlerHeaders,
  handleRateLimitResponse,
  sleep
} from "./common.js";

const TOP_ARCHETYPES_URL = "https://ygoprodeck.com/api/tournament/getTopArchetypes.php";
const TOURNAMENTS_URL = "https://ygoprodeck.com/api/tournament/getTournaments.php";
const TOURNAMENT_DETAILS_URL = "https://ygoprodeck.com/api/tournament/getTournament.php";
const DECK_PAGE_BASE = "https://ygoprodeck.com/deck/";

// Allow self-signed / enterprise certificates if configured or in dev
if (!process.env.NODE_TLS_REJECT_UNAUTHORIZED) {
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
}

export function parseDeckHtml(html: string): {
  main: number[];
  extra: number[];
  side: number[];
  ydk: string;
} | null {
  const mainMatch = html.match(/var maindeckjs\s*=\s*'([^']+)'/);
  const extraMatch = html.match(/var extradeckjs\s*=\s*'([^']+)'/);
  const sideMatch = html.match(/var sidedeckjs\s*=\s*'([^']+)'/);

  if (!mainMatch) return null;

  let main: number[] = [];
  let extra: number[] = [];
  let side: number[] = [];

  try {
    main = (JSON.parse(mainMatch[1]) as string[])
      .map((id) => parseInt(id, 10))
      .filter((n) => !isNaN(n) && n > 0);
  } catch {
    main = [];
  }

  if (extraMatch) {
    try {
      extra = (JSON.parse(extraMatch[1]) as string[])
        .map((id) => parseInt(id, 10))
        .filter((n) => !isNaN(n) && n > 0);
    } catch {
      extra = [];
    }
  }

  if (sideMatch) {
    try {
      side = (JSON.parse(sideMatch[1]) as string[])
        .map((id) => parseInt(id, 10))
        .filter((n) => !isNaN(n) && n > 0);
    } catch {
      side = [];
    }
  }

  const ydkLines = [
    "#created by ygoprodeck-mcp",
    "#main",
    ...main.map(String),
    "#extra",
    ...extra.map(String),
    "!side",
    ...side.map(String)
  ];

  return {
    main,
    extra,
    side,
    ydk: ydkLines.join("\n")
  };
}

export async function syncTournamentDecks(
  db: ReturnType<typeof getDbConnection>,
  options: { maxTournaments?: number; delayMs?: number } = {}
): Promise<number> {
  const dataDir = getDataDir();
  const maxTournaments = options.maxTournaments ?? 20;
  const delayMs = options.delayMs ?? 600;

  console.log(`[ygo-tournament-sync] Fetching top-cut decklists (up to ${maxTournaments} tournaments)...`);

  const recentTournaments = db
    .prepare(`
      SELECT id, name, format, event_date, slug
      FROM tournament_events
      ORDER BY event_date DESC, id DESC
      LIMIT ?
    `)
    .all(maxTournaments) as unknown as Array<{
      id: number;
      name: string;
      format: string;
      event_date: string;
      slug: string;
    }>;

  if (recentTournaments.length === 0) {
    console.log(`[ygo-tournament-sync] No tournaments found to sync decklists.`);
    return 0;
  }

  const checkDeckStmt = db.prepare("SELECT 1 FROM tournament_decks WHERE id = ?");
  const insertDeckStmt = db.prepare(`
    INSERT OR REPLACE INTO tournament_decks (
      id, tournament_id, slug, player_name, placement, archetype,
      arch_2, arch_3, deck_name, format, event_date, deck_price, ydk_content, created_at
    ) VALUES (
      ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now')
    )
  `);
  const checkCardStmt = db.prepare("SELECT 1 FROM cards WHERE id = ?");
  const insertCardStmt = db.prepare(`
    INSERT OR REPLACE INTO tournament_deck_cards (
      deck_id, card_id, section, quantity
    ) VALUES (
      ?, ?, ?, ?
    )
  `);

  const headers: Record<string, string> = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "X-Requested-With": "XMLHttpRequest",
    "Referer": "https://ygoprodeck.com/tournaments/"
  };

  let totalDecksSynced = 0;

  for (const tourney of recentTournaments) {
    console.log(`[ygo-tournament-sync] Checking deck listings for "${tourney.name}" (${tourney.event_date})...`);

    let res: Response;
    try {
      res = await fetch(`${TOURNAMENT_DETAILS_URL}?id=${tourney.id}`, { headers });
    } catch (err: any) {
      console.warn(`[ygo-tournament-sync] Failed to fetch tournament ${tourney.id}: ${err.message}`);
      continue;
    }

    if (res.status === 429 || res.status === 403) {
      handleRateLimitResponse(res, dataDir, "tournament detail sync");
      process.exit(1);
    }

    if (!res.ok) {
      console.warn(`[ygo-tournament-sync] Tournament ${tourney.id} returned HTTP ${res.status}`);
      continue;
    }

    const tData = (await res.json()) as {
      listings?: Array<{
        listing_id: number;
        deck_name: string | null;
        pretty_url: string | null;
        user: string | null;
        country: string | null;
        placement: string | null;
        arch_1: string | null;
        arch_2: string | null;
        arch_3: string | null;
        deck_price: string | null;
      }>;
    };

    if (!tData.listings || !Array.isArray(tData.listings)) {
      continue;
    }

    const deckListings = tData.listings.filter((l) => l.pretty_url);
    console.log(`[ygo-tournament-sync] Found ${deckListings.length} decklists for "${tourney.name}".`);

    for (const listing of deckListings) {
      // Check if already synced
      const existing = checkDeckStmt.get(listing.listing_id);
      if (existing) {
        continue;
      }

      await sleep(delayMs);

      const deckUrl = `${DECK_PAGE_BASE}${listing.pretty_url}`;
      let deckRes: Response;
      try {
        deckRes = await fetch(deckUrl, {
          headers: {
            "User-Agent": headers["User-Agent"],
            Referer: `https://ygoprodeck.com/tournament/${tourney.slug}`
          }
        });
      } catch (err: any) {
        console.warn(`[ygo-tournament-sync] Failed to fetch deck ${listing.pretty_url}: ${err.message}`);
        continue;
      }

      if (deckRes.status === 429 || deckRes.status === 403) {
        handleRateLimitResponse(deckRes, dataDir, "deck sync");
        process.exit(1);
      }

      if (!deckRes.ok) {
        continue;
      }

      const deckHtml = await deckRes.text();
      const parsed = parseDeckHtml(deckHtml);
      if (!parsed) {
        continue;
      }

      // Group quantities
      const mainCounts = new Map<number, number>();
      for (const id of parsed.main) {
        mainCounts.set(id, (mainCounts.get(id) ?? 0) + 1);
      }

      const extraCounts = new Map<number, number>();
      for (const id of parsed.extra) {
        extraCounts.set(id, (extraCounts.get(id) ?? 0) + 1);
      }

      const sideCounts = new Map<number, number>();
      for (const id of parsed.side) {
        sideCounts.set(id, (sideCounts.get(id) ?? 0) + 1);
      }

      db.exec("BEGIN IMMEDIATE;");
      try {
        const archetype = listing.arch_1 || "Unknown";
        const price = listing.deck_price ? parseFloat(listing.deck_price) : null;

        insertDeckStmt.run(
          listing.listing_id,
          tourney.id,
          listing.pretty_url,
          listing.user ?? null,
          listing.placement ?? null,
          archetype,
          listing.arch_2 ?? null,
          listing.arch_3 ?? null,
          listing.deck_name ?? null,
          tourney.format,
          tourney.event_date,
          isNaN(price as number) ? null : price,
          parsed.ydk
        );

        for (const [cardId, qty] of mainCounts.entries()) {
          if (checkCardStmt.get(cardId)) {
            insertCardStmt.run(listing.listing_id, cardId, "main", qty);
          }
        }

        for (const [cardId, qty] of extraCounts.entries()) {
          if (checkCardStmt.get(cardId)) {
            insertCardStmt.run(listing.listing_id, cardId, "extra", qty);
          }
        }

        for (const [cardId, qty] of sideCounts.entries()) {
          if (checkCardStmt.get(cardId)) {
            insertCardStmt.run(listing.listing_id, cardId, "side", qty);
          }
        }

        db.exec("COMMIT;");
        totalDecksSynced++;
      } catch (err: any) {
        db.exec("ROLLBACK;");
        console.error(`[ygo-tournament-sync] Failed to save deck ${listing.listing_id}: ${err.message}`);
      }
    }

    await sleep(delayMs);
  }

  console.log(`[ygo-tournament-sync] Ingested ${totalDecksSynced} new top-cut decklists.`);
  return totalDecksSynced;
}

export async function runTournamentSync(): Promise<void> {
  const dataDir = getDataDir();
  console.log(`[ygo-tournament-sync] Starting tournament & meta synchronization...`);

  // 1. Check Circuit Breaker
  checkRateLimitLock(dataDir);

  // 2. Open read-write database connection
  const db = getDbConnection(false);
  initDbSchema(db);

  const headers: Record<string, string> = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "X-Requested-With": "XMLHttpRequest",
    "Referer": "https://ygoprodeck.com/tournaments/"
  };

  // 3. Sync Top Archetypes across key formats and timeframes
  const targetSyncs = [
    { format: "TCG", timeframe: "current", tier: "2-3" },
    { format: "TCG", timeframe: "1-month", tier: "2-3" },
    { format: "TCG", timeframe: "3-month", tier: "2-3" },
    { format: "OCG", timeframe: "current", tier: "2-3" },
    { format: "Master Duel", timeframe: "current", tier: "2-3" }
  ];

  const insertMetaStmt = db.prepare(`
    INSERT OR REPLACE INTO meta_archetypes (
      format, timeframe, tier_filter, archetype, quantity, share_percent,
      archetype_img, total_samples, date_start, date_end, updated_at
    ) VALUES (
      ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now')
    )
  `);

  console.log(`[ygo-tournament-sync] Fetching top meta archetypes...`);

  for (const sync of targetSyncs) {
    console.log(`[ygo-tournament-sync] Querying Top Archetypes: ${sync.format} (${sync.timeframe})...`);
    
    const body = new URLSearchParams({
      format: sync.format,
      placement: "",
      tier: sync.tier,
      dateStart: sync.timeframe
    });

    let res: Response;
    try {
      res = await fetch(TOP_ARCHETYPES_URL, {
        method: "POST",
        headers: {
          ...headers,
          "Content-Type": "application/x-www-form-urlencoded"
        },
        body: body.toString()
      });
    } catch (err: any) {
      console.error(`[ygo-tournament-sync] Error fetching ${sync.format} archetypes: ${err.message}`);
      continue;
    }

    if (res.status === 429 || res.status === 403) {
      handleRateLimitResponse(res, dataDir, "top archetypes sync");
      process.exit(1);
    }

    if (!res.ok) {
      console.warn(`[ygo-tournament-sync] Upstream returned HTTP ${res.status} for ${sync.format}`);
      continue;
    }

    const json = (await res.json()) as {
      archetypes?: Array<{
        arch_1: string;
        quantity: number;
        arch_1_img?: number;
      }>;
      total?: number;
      dateCutoffStart?: string;
      dateCutoffEnd?: string;
    };

    if (json && Array.isArray(json.archetypes) && json.total) {
      const total = json.total;
      db.exec("BEGIN IMMEDIATE;");
      try {
        for (const arch of json.archetypes!) {
          const share = Number(((arch.quantity / total) * 100).toFixed(2));
          insertMetaStmt.run(
            sync.format,
            sync.timeframe,
            sync.tier,
            arch.arch_1,
            arch.quantity,
            share,
            arch.arch_1_img ?? null,
            total,
            json.dateCutoffStart ?? null,
            json.dateCutoffEnd ?? null
          );
        }
        db.exec("COMMIT;");
      } catch (err) {
        db.exec("ROLLBACK;");
        throw err;
      }
      console.log(`[ygo-tournament-sync] Saved ${json.archetypes.length} archetypes for ${sync.format} (${sync.timeframe}).`);
    }

    // Polite delay
    await sleep(800);
  }

  // 4. Sync Recent Tournament Events
  console.log(`[ygo-tournament-sync] Fetching recent tournament events...`);
  const formats = ["TCG", "OCG"];

  const insertTournamentStmt = db.prepare(`
    INSERT OR REPLACE INTO tournament_events (
      id, name, country, event_date, winner, format, slug, player_count,
      is_approximate_player_count, updated_at
    ) VALUES (
      ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now')
    )
  `);

  for (const fmt of formats) {
    console.log(`[ygo-tournament-sync] Querying recent tournaments for ${fmt}...`);

    let res: Response;
    try {
      res = await fetch(`${TOURNAMENTS_URL}?format=${encodeURIComponent(fmt)}`, {
        method: "GET",
        headers
      });
    } catch (err: any) {
      console.error(`[ygo-tournament-sync] Error fetching tournaments for ${fmt}: ${err.message}`);
      continue;
    }

    if (res.status === 429 || res.status === 403) {
      handleRateLimitResponse(res, dataDir, "tournaments sync");
      process.exit(1);
    }

    if (!res.ok) {
      console.warn(`[ygo-tournament-sync] Upstream returned HTTP ${res.status} for tournaments ${fmt}`);
      continue;
    }

    const json = (await res.json()) as {
      data?: Array<{
        id: number;
        name: string;
        country: string | null;
        event_date: string;
        winner: string | null;
        format: string;
        slug: string;
        player_count: number | null;
        is_approximate_player_count: number;
      }>;
    };

    if (json && Array.isArray(json.data)) {
      db.exec("BEGIN IMMEDIATE;");
      try {
        for (const t of json.data!) {
          insertTournamentStmt.run(
            t.id,
            t.name,
            t.country ?? null,
            t.event_date,
            t.winner ?? null,
            t.format,
            t.slug,
            t.player_count ?? null,
            t.is_approximate_player_count ?? 0
          );
        }
        db.exec("COMMIT;");
      } catch (err) {
        db.exec("ROLLBACK;");
        throw err;
      }
      console.log(`[ygo-tournament-sync] Saved ${json.data.length} tournament events for ${fmt}.`);
    }

    await sleep(800);
  }

  // 5. Sync Top-Cut Decklists for Recent 1-Month Tournaments
  console.log(`[ygo-tournament-sync] Synchronizing top-cut decklists...`);
  await syncTournamentDecks(db, { maxTournaments: 20 });

  console.log(`[ygo-tournament-sync] Tournament, meta, and top-cut decklist synchronization complete!`);
}

// Execute if run directly
if (process.argv[1] && (process.argv[1].endsWith("syncTournaments.ts") || process.argv[1].endsWith("syncTournaments.js"))) {
  runTournamentSync().catch((err) => {
    console.error(`[ygo-tournament-sync] Fatal error:`, err);
    process.exit(1);
  });
}
