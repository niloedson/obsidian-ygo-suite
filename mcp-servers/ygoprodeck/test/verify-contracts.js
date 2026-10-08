import assert from "node:assert";
import { DatabaseSync } from "node:sqlite";
import { initDbSchema } from "../dist/db/connection.js";
import {
  queryBanlist,
  queryCardDetails,
  queryCards,
  queryGenesysPoints
} from "../dist/db/queries.js";

async function runContractTests() {
  console.log("=== Yu-Gi-Oh! MCP Tool Contract & Schema Verification ===");

  const db = new DatabaseSync(":memory:");
  db.exec("PRAGMA foreign_keys = ON;");
  initDbSchema(db);

  // Seed sample cards
  const insertCardStmt = db.prepare(`
    INSERT INTO cards (
      id, name, type, frame_type, desc, atk, def, level,
      race, attribute, archetype, scale, linkval, linkmarkers,
      ygoprodeck_url, genesys_points
    ) VALUES (
      ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
    )
  `);

  insertCardStmt.run(
    14558128,
    "Ash Blossom & Joyous Spring",
    "Effect Monster",
    "effect",
    "During either player's turn, when a card or effect is activated that includes any of these effects: You can discard this card; negate that effect.",
    0,
    1800,
    3,
    "Zombie",
    "FIRE",
    null,
    null,
    null,
    null,
    "https://ygoprodeck.com/card/ash-blossom-joyous-spring",
    5
  );

  insertCardStmt.run(
    59400890,
    "Accesscode Talker",
    "Link Monster",
    "link",
    "2+ Effect Monsters. Cannot be tributed.",
    2300,
    null,
    4,
    "Cyberse",
    "DARK",
    "Code Talker",
    null,
    4,
    "Top, Bottom, Left, Right",
    "https://ygoprodeck.com/card/accesscode-talker",
    15
  );

  // Banlist seed
  db.prepare("INSERT INTO card_banlists (card_id, format, status) VALUES (?, ?, ?)").run(
    14558128,
    "tcg",
    "Semi-Limited"
  );

  // ----------------------------------------------------
  // Contract 1: get_card_details Schema
  // ----------------------------------------------------
  console.log("-> Contract 1: Validating get_card_details contract...");
  const cardDetails = queryCardDetails(db, "14558128");
  assert(cardDetails !== null, "Card details must not be null");
  assert.strictEqual(cardDetails.id, 14558128);
  assert.strictEqual(cardDetails.name, "Ash Blossom & Joyous Spring");
  assert.strictEqual(typeof cardDetails.desc, "string");
  assert.strictEqual(cardDetails.genesys_points, 5);
  assert(typeof cardDetails.banlist_status === "object");
  assert.strictEqual(cardDetails.banlist_status.tcg, "Semi-Limited");
  console.log("  [PASS] get_card_details schema strictly matches specification.");

  // ----------------------------------------------------
  // Contract 2: search_cards Schema & Snippets
  // ----------------------------------------------------
  console.log("-> Contract 2: Validating search_cards summary contract...");
  const searchResults = queryCards(db, { name: "Ash Blossom", limit: 5 });
  assert.strictEqual(searchResults.length, 1);
  const result = searchResults[0];
  assert.strictEqual(result.id, 14558128);
  assert.strictEqual(result.name, "Ash Blossom & Joyous Spring");
  assert.strictEqual(typeof result.snippet, "string");
  assert.strictEqual(result.genesys_points, 5);
  console.log("  [PASS] search_cards summaries contain required token-compact fields.");

  // ----------------------------------------------------
  // Contract 3: check_banlist Contract
  // ----------------------------------------------------
  console.log("-> Contract 3: Validating check_banlist contract...");
  const banlistReports = queryBanlist(db, "tcg", ["14558128"]);
  assert.strictEqual(banlistReports.length, 1);
  assert.strictEqual(banlistReports[0].status, "Semi-Limited");
  assert.strictEqual(banlistReports[0].id, 14558128);
  console.log("  [PASS] check_banlist returns correct status shape.");

  // ----------------------------------------------------
  // Contract 4: get_genesys_points Contract & Mechanical Bans
  // ----------------------------------------------------
  console.log("-> Contract 4: Validating get_genesys_points contract & mechanics...");
  const genesysReport = queryGenesysPoints(db, ["14558128", "59400890"]);
  // In Genesys, mechanically banned cards (Link/Pendulum) have points=0 and is_legal=false.
  // Only legal pointed cards contribute to total_points (Ash Blossom = 5).
  assert.strictEqual(genesysReport.total_points, 5);
  assert.strictEqual(genesysReport.point_cap, 100);
  assert.strictEqual(genesysReport.remaining_allowance, 95);
  assert.strictEqual(genesysReport.is_budget_compliant, true);
  // Link monster must be flagged under mechanical bans
  assert.strictEqual(genesysReport.is_mechanically_legal, false);
  assert.strictEqual(genesysReport.forbidden_mechanics_count, 1);
  assert.strictEqual(genesysReport.pointed_cards.length, 2);
  console.log("  [PASS] get_genesys_points validates points budget and mechanical bans.");

  console.log("\n>>> ALL CONTRACT VERIFICATION TESTS PASSED! <<<");
}

runContractTests().catch((err) => {
  console.error("Contract test failure:", err);
  process.exit(1);
});
