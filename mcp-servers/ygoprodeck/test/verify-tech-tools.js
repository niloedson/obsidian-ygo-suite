import assert from "node:assert";
import { DatabaseSync } from "node:sqlite";
import { initDbSchema } from "../dist/db/connection.js";
import {
  queryEvaluateTechCounters,
  queryTopTechCards,
  queryTournamentDecklists
} from "../dist/db/queries.js";
import { parseDeckHtml } from "../dist/cli/syncTournaments.js";

async function runTests() {
  console.log("=== Yu-Gi-Oh! Top-Cut Decks & Tech Tools Verification ===");

  // Use an isolated in-memory database to prevent test pollution from local cards.db
  const db = new DatabaseSync(":memory:");
  db.exec("PRAGMA foreign_keys = ON;");
  initDbSchema(db);

  // ----------------------------------------------------
  // Test 1: HTML Deck Parsing & .YDK Generation
  // ----------------------------------------------------
  console.log("-> Test 1: Testing HTML parsing and .ydk generation...");
  const sampleHtml = `
    <html>
      <script>
        var maindeckjs = '["14558128","14558128","14558128","94145021","94145021"]';
        var extradeckjs = '["59400890","37818794"]';
        var sidedeckjs = '["70405001","82782870","82782870"]';
      </script>
    </html>
  `;
  const parsed = parseDeckHtml(sampleHtml);
  assert(parsed !== null, "parseDeckHtml returned null");
  assert.strictEqual(parsed.main.length, 5, "Main deck count should be 5");
  assert.strictEqual(parsed.extra.length, 2, "Extra deck count should be 2");
  assert.strictEqual(parsed.side.length, 3, "Side deck count should be 3");
  assert(parsed.ydk.includes("#main\n14558128\n14558128\n14558128"), "YDK must contain main cards");
  assert(parsed.ydk.includes("#extra\n59400890"), "YDK must contain extra cards");
  assert(parsed.ydk.includes("!side\n70405001"), "YDK must contain side cards");
  console.log("  [PASS] HTML parser extracted cards and built valid .ydk structure.");

  // ----------------------------------------------------
  // Test 2: Ingestion & Multi-Engine "Pile Deck" Handling
  // ----------------------------------------------------
  console.log("-> Test 2: Ingestion and multi-engine pile deck handling...");

  // Seed sample cards into cards table if needed
  const insertCardStmt = db.prepare(`
    INSERT OR IGNORE INTO cards (id, name, type, frame_type, desc, archetype)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  // Engine cards
  insertCardStmt.run(46986414, "Dark Magician", "Normal Monster", "normal", "The ultimate wizard.", "Dark Magician");
  insertCardStmt.run(98684220, "Light and Darkness Dragon", "Effect Monster", "effect", "Cannot be Special Summoned.", "Light and Darkness Dragon");
  insertCardStmt.run(19899073, "Azamina Mu Rcielago", "Fusion Monster", "fusion", "Fusion monster.", "Azamina");
  insertCardStmt.run(99990001, "Mitsurugi Blade", "Effect Monster", "effect", "Mitsurugi warrior.", "Mitsurugi");

  // Generic tech staples
  insertCardStmt.run(14558128, "Ash Blossom & Joyous Spring", "Effect Monster", "effect", "Negate search from Deck.", null);
  insertCardStmt.run(27204311, "Nibiru, the Primal Being", "Effect Monster", "effect", "Tribute all face-up monsters on 5th summon.", null);
  insertCardStmt.run(10045474, "Infinite Impermanence", "Trap Card", "trap", "Negate 1 face-up monster on field.", null);

  // Side deck tech counters
  insertCardStmt.run(15693423, "Evenly Matched", "Trap Card", "trap", "Banish opponent cards face-down.", null);
  insertCardStmt.run(94145021, "Droll & Lock Bird", "Effect Monster", "effect", "Neither player can add cards from Deck to hand.", null);

  // Threat archetype cards for counter testing
  insertCardStmt.run(74095194, "Snake-Eye Ash", "Effect Monster", "effect", "If this card is Normal or Special Summoned: You can add 1 Level 1 FIRE monster from your Deck to your hand. You can send 2 face-up cards you control to the GY; Special Summon 1 Snake-Eye monster from your hand or Deck.", "Snake-Eye");

  // Seed tournament event
  db.prepare(`
    INSERT OR REPLACE INTO tournament_events (id, name, country, event_date, winner, format, slug, player_count)
    VALUES (99991, 'Championship Test Weekend', 'United States', '2026-10-04', 'Duelist Alpha', 'TCG', 'championship-test-99991', 128)
  `).run();

  // Seed Deck 1: A multi-engine pile deck ("Azamina Mitsurugi Dark Magician")
  // Primary arch: "Light and Darkness Ritual", Secondary: "Azamina", Tertiary: "Dark Magician", deck_name has "Mitsurugi"
  const ydk1 = "#created by test\n#main\n46986414\n46986414\n98684220\n99990001\n99990001\n99990001\n14558128\n14558128\n14558128\n27204311\n!side\n15693423\n15693423\n15693423\n94145021\n";
  db.prepare(`
    INSERT OR REPLACE INTO tournament_decks (
      id, tournament_id, slug, player_name, placement, archetype, arch_2, arch_3, deck_name, format, event_date, deck_price, ydk_content
    ) VALUES (
      99001, 99991, 'test-pile-deck-99001', 'Duelist Alpha', 'Winner',
      'Light and Darkness Ritual', 'Azamina', 'Dark Magician',
      'Azamina Mitsurugi Dark Magician Light and Darkness',
      'TCG', '2026-10-04', 650.00, ?
    )
  `).run(ydk1);

  // Deck 1 cards
  const insertDeckCard = db.prepare(`
    INSERT OR REPLACE INTO tournament_deck_cards (deck_id, card_id, section, quantity)
    VALUES (?, ?, ?, ?)
  `);
  // Engine cards in main
  insertDeckCard.run(99001, 46986414, "main", 2); // Dark Magician (Engine via arch_3)
  insertDeckCard.run(99001, 98684220, "main", 1); // Light and Darkness (Engine via arch_1)
  insertDeckCard.run(99001, 99990001, "main", 3); // Mitsurugi Blade (Engine via deck_name and >= 3 cluster)
  // Tech cards in main
  insertDeckCard.run(99001, 14558128, "main", 3); // Ash Blossom (Tech)
  insertDeckCard.run(99001, 27204311, "main", 1); // Nibiru (Tech)
  // Side deck counters
  insertDeckCard.run(99001, 15693423, "side", 3); // Evenly Matched (Side Tech)
  insertDeckCard.run(99001, 94145021, "side", 1); // Droll & Lock Bird (Side Tech)

  // Seed Deck 2: Runner-up deck with Ash and Imperm
  db.prepare(`
    INSERT OR REPLACE INTO tournament_decks (
      id, tournament_id, slug, player_name, placement, archetype, arch_2, arch_3, deck_name, format, event_date, deck_price, ydk_content
    ) VALUES (
      99002, 99991, 'test-deck-2-99002', 'Duelist Beta', 'Runner-Up',
      'Snake-Eye', null, null, 'Snake-Eye Pure',
      'TCG', '2026-10-04', 500.00, '#main\n14558128\n10045474\n!side\n15693423\n'
    )
  `).run();
  insertDeckCard.run(99002, 14558128, "main", 3); // Ash Blossom
  insertDeckCard.run(99002, 10045474, "main", 3); // Infinite Impermanence
  insertDeckCard.run(99002, 15693423, "side", 2); // Evenly Matched

  console.log("  [PASS] Seeded test tournament events, pile decks, and deck cards.");

  // ----------------------------------------------------
  // Test 3: queryTopTechCards Verification
  // ----------------------------------------------------
  console.log("-> Test 3: Verifying queryTopTechCards calculation and pile-deck filtering...");
  const techResults = queryTopTechCards(db, {
    format: "TCG",
    section: "all",
    since_date: "2026-10-01",
    limit: 10
  });

  assert.strictEqual(techResults.total_decks_analyzed, 2, "Total decks analyzed should be 2");
  const techNames = techResults.tech_cards.map((t) => t.name);

  // Check that secondary engines are NOT counted as tech
  assert(!techNames.includes("Dark Magician"), "Dark Magician is engine in pile deck and must NOT be counted as tech");
  assert(!techNames.includes("Mitsurugi Blade"), "Mitsurugi Blade is engine cluster in pile deck and must NOT be counted as tech");
  assert(!techNames.includes("Light and Darkness Dragon"), "Light and Darkness Dragon is engine and must NOT be counted as tech");

  // Check that real techs ARE counted
  assert(techNames.includes("Ash Blossom & Joyous Spring"), "Ash Blossom must be counted as tech");
  assert(techNames.includes("Evenly Matched"), "Evenly Matched must be counted as tech");

  // Check adoption percentages
  const ash = techResults.tech_cards.find((t) => t.name === "Ash Blossom & Joyous Spring");
  assert(ash !== undefined, "Ash Blossom should exist in results");
  assert.strictEqual(ash.adoption_percent, 100.0, "Ash played in 2/2 decks = 100%");
  assert.strictEqual(ash.main_copies_avg, 3.0, "Ash average main copies should be 3.0");

  const evenly = techResults.tech_cards.find((t) => t.name === "Evenly Matched");
  assert(evenly !== undefined, "Evenly Matched should exist in results");
  assert.strictEqual(evenly.adoption_percent, 100.0, "Evenly played in 2/2 decks = 100%");
  assert.strictEqual(evenly.side_copies_avg, 2.5, "Evenly average side copies should be (3 + 2)/2 = 2.5");

  console.log("  [PASS] Tech card percentages, average copies, and pile-deck engine filtering verified.");

  // ----------------------------------------------------
  // Test 4: queryTournamentDecklists Verification
  // ----------------------------------------------------
  console.log("-> Test 4: Verifying queryTournamentDecklists and .ydk export...");
  const decklists = queryTournamentDecklists(db, {
    tournament_id_or_slug: "99991",
    include_ydk: true,
    limit: 5
  });

  assert.strictEqual(decklists.length, 2, "Should return 2 decklists for tournament 99991");
  const winnerDeck = decklists.find((d) => d.placement === "Winner");
  assert(winnerDeck !== undefined, "Winner deck should be present");
  assert.strictEqual(winnerDeck.player_name, "Duelist Alpha");
  assert.strictEqual(winnerDeck.archetype, "Light and Darkness Ritual");
  assert.strictEqual(winnerDeck.arch_2, "Azamina");
  assert.strictEqual(winnerDeck.arch_3, "Dark Magician");
  assert(winnerDeck.main_deck.length > 0, "Main deck cards should be populated");
  assert(winnerDeck.side_deck.length > 0, "Side deck cards should be populated");
  assert(winnerDeck.ydk_content !== undefined && winnerDeck.ydk_content.includes("#main"), "YDK export must be present");
  console.log("  [PASS] Tournament decklists and verbatim .ydk retrieved accurately.");

  // ----------------------------------------------------
  // Test 5: queryEvaluateTechCounters Verification
  // ----------------------------------------------------
  console.log("-> Test 5: Verifying evaluate_tech_counters recommendations...");
  const counterResults = queryEvaluateTechCounters(db, {
    format: "TCG",
    target_archetype: "Snake-Eye",
    limit: 3
  });

  assert(counterResults.length > 0, "Should return counter analysis for Snake-Eye");
  const snakeEyeRec = counterResults[0];
  assert.strictEqual(snakeEyeRec.threat_archetype, "Snake-Eye");
  assert(snakeEyeRec.recommended_tech_solutions.length > 0, "Should have recommended tech solutions");
  assert(snakeEyeRec.proven_side_deck_counters.length > 0, "Should have proven side deck counters from top cuts");
  console.log("  [PASS] Strategic tech counters evaluated with reasoning and empirical side-deck data.");

  // Cleanup test records
  db.prepare("DELETE FROM tournament_deck_cards WHERE deck_id IN (99001, 99002)").run();
  db.prepare("DELETE FROM tournament_decks WHERE id IN (99001, 99002)").run();
  db.prepare("DELETE FROM tournament_events WHERE id = 99991").run();

  console.log("\n>>> ALL TESTS PASSED SUCCESSFULLY! <<<");
}

runTests().catch((err) => {
  console.error("Test failure:", err);
  process.exit(1);
});
