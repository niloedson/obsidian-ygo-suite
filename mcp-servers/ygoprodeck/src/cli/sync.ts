import fs from "node:fs";
import path from "node:path";
import { getDbConnection, getDataDir, initDbSchema } from "../db/connection.js";
import {
  checkRateLimitLock,
  getCrawlerHeaders,
  handleRateLimitResponse
} from "./common.js";

const BULK_API_URL = "https://db.ygoprodeck.com/api/v7/cardinfo.php";

interface YgoProDeckCard {
  id: number;
  name: string;
  type: string;
  frameType: string;
  desc: string;
  atk?: number;
  def?: number;
  level?: number;
  race?: string;
  attribute?: string;
  archetype?: string;
  scale?: number;
  linkval?: number;
  linkmarkers?: string[];
  ygoprodeck_url?: string;
  banlist_info?: {
    ban_tcg?: string;
    ban_ocg?: string;
    ban_goat?: string;
  };
}

interface YgoProDeckResponse {
  data: YgoProDeckCard[];
}

export async function runSync(): Promise<void> {
  const dataDir = getDataDir();
  console.log(`[ygo-sync] Starting local database synchronization...`);
  console.log(`[ygo-sync] Data directory: ${dataDir}`);

  // 1. Check Circuit Breaker
  checkRateLimitLock(dataDir);

  // 2. Open read-write database connection & ensure schema exists
  const db = getDbConnection(false);
  initDbSchema(db);

  // 3. Retrieve stored ETag for conditional GET
  const etagRow = db.prepare("SELECT value FROM sync_metadata WHERE key = 'etag'").get() as { value: string } | undefined;
  const currentEtag = etagRow ? etagRow.value : null;

  const headers = getCrawlerHeaders(currentEtag);

  console.log(`[ygo-sync] Fetching bulk card payload from YGOPRODeck...`);
  if (currentEtag) {
    console.log(`[ygo-sync] Sending conditional request with ETag: ${currentEtag}`);
  }

  let response: Response;
  try {
    response = await fetch(BULK_API_URL, { headers });
  } catch (err: any) {
    console.error(`[ygo-sync] Network error while contacting YGOPRODeck: ${err.message}`);
    process.exit(1);
  }

  // Handle rate-limiting status codes (429 or 403)
  if (response.status === 429 || response.status === 403) {
    handleRateLimitResponse(response, dataDir, "bulk card sync");
    process.exit(1);
  }

  // Handle 304 Not Modified
  if (response.status === 304) {
    console.log(`[ygo-sync] Upstream data has not changed (HTTP 304 Not Modified).`);
    db.prepare("INSERT OR REPLACE INTO sync_metadata (key, value, updated_at) VALUES ('last_synced_at', datetime('now'), datetime('now'))").run();
    console.log(`[ygo-sync] Local database is already up to date.`);
    return;
  }

  if (!response.ok) {
    console.error(`[ygo-sync] Failed to fetch data: HTTP ${response.status} ${response.statusText}`);
    process.exit(1);
  }

  const newEtag = response.headers.get("etag");
  console.log(`[ygo-sync] Payload received. Parsing JSON (~20MB)...`);

  const payload = (await response.json()) as YgoProDeckResponse;
  const cards = payload.data;

  if (!Array.isArray(cards) || cards.length === 0) {
    console.error(`[ygo-sync] Received unexpected payload format: missing cards array.`);
    process.exit(1);
  }

  console.log(`[ygo-sync] Ingesting ${cards.length} cards into SQLite...`);
  const startTime = Date.now();

  // 4. Batch Insertion inside single immediate transaction
  const insertCardStmt = db.prepare(`
    INSERT OR REPLACE INTO cards (
      id, name, type, frame_type, desc, atk, def, level,
      race, attribute, archetype, scale, linkval, linkmarkers, ygoprodeck_url
    ) VALUES (
      ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
    )
  `);

  const insertBanStmt = db.prepare(`
    INSERT OR REPLACE INTO card_banlists (card_id, format, status)
    VALUES (?, ?, ?)
  `);

  const deleteBansStmt = db.prepare("DELETE FROM card_banlists WHERE card_id = ?");

  db.exec("BEGIN IMMEDIATE;");
  try {
    for (const card of cards) {
      insertCardStmt.run(
        card.id,
        card.name,
        card.type,
        card.frameType || card.type.toLowerCase(),
        card.desc,
        card.atk ?? null,
        card.def ?? null,
        card.level ?? null,
        card.race ?? null,
        card.attribute ?? null,
        card.archetype ?? null,
        card.scale ?? null,
        card.linkval ?? null,
        card.linkmarkers ? card.linkmarkers.join(", ") : null,
        card.ygoprodeck_url ?? null
      );

      deleteBansStmt.run(card.id);

      if (card.banlist_info) {
        if (card.banlist_info.ban_tcg) {
          insertBanStmt.run(card.id, "tcg", card.banlist_info.ban_tcg);
        }
        if (card.banlist_info.ban_ocg) {
          insertBanStmt.run(card.id, "ocg", card.banlist_info.ban_ocg);
        }
        if (card.banlist_info.ban_goat) {
          insertBanStmt.run(card.id, "goat", card.banlist_info.ban_goat);
        }
      }
    }

    db.prepare("INSERT OR REPLACE INTO sync_metadata (key, value, updated_at) VALUES ('last_synced_at', datetime('now'), datetime('now'))").run();
    db.prepare("INSERT OR REPLACE INTO sync_metadata (key, value, updated_at) VALUES ('total_cards', ?, datetime('now'))").run(cards.length.toString());
    if (newEtag) {
      db.prepare("INSERT OR REPLACE INTO sync_metadata (key, value, updated_at) VALUES ('etag', ?, datetime('now'))").run(newEtag);
    }
    db.exec("COMMIT;");
  } catch (err) {
    db.exec("ROLLBACK;");
    throw err;
  }

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);
  console.log(`[ygo-sync] Successfully ingested ${cards.length} cards in ${elapsed}s!`);
  console.log(`[ygo-sync] Database is fully ready at: ${path.join(dataDir, "cards.db")}`);
}

// Execute if run directly from CLI
if (process.argv[1] && (process.argv[1].endsWith("sync.ts") || process.argv[1].endsWith("sync.js"))) {
  runSync().catch((err) => {
    console.error(`[ygo-sync] Fatal error:`, err);
    process.exit(1);
  });
}
