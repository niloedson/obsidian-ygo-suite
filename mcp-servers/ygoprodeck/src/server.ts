#!/usr/bin/env node
import { McpServer, ResourceTemplate } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { getDbConnection, getDbPath } from "./db/connection.js";
import {
  queryBanlist,
  queryCardDetails,
  queryCards,
  queryDatabaseInfo,
  queryEvaluateTechCounters,
  queryGenesysPoints,
  queryRecentTournaments,
  queryTopArchetypes,
  queryTopTechCards,
  queryTournamentDecklists,
  queryTournamentDetails
} from "./db/queries.js";
import {
  CheckBanlistSchema,
  EvaluateTechCountersSchema,
  GetCardDetailsSchema,
  GetGenesysPointsSchema,
  GetTopArchetypesSchema,
  GetTopTechCardsSchema,
  GetTournamentBreakdownSchema,
  GetTournamentDecklistsSchema,
  ListRecentTournamentsSchema,
  SearchCardsSchema
} from "./types.js";

// ==========================================
// Fail-Fast Verification (Zero-Network Boot)
// ==========================================
let db: ReturnType<typeof getDbConnection>;
try {
  // Opens strictly in READ-ONLY mode
  db = getDbConnection(true);
} catch (err: any) {
  console.error(`\n[FATAL ERROR] ygoprodeck-mcp startup failed:`);
  console.error(err.message);
  console.error(`\nPlease run:`);
  console.error(`  npm run sync`);
  console.error(`  npm run sync:tournaments`);
  console.error(`to populate your local SQLite database before starting the MCP server.\n`);
  process.exit(1);
}

// ==========================================
// MCP Server Initialization
// ==========================================
const server = new McpServer({
  name: "ygoprodeck-mcp",
  version: "1.2.0"
});

// ------------------------------------------
// Tool: search_cards
// ------------------------------------------
server.tool(
  "search_cards",
  "Search Yu-Gi-Oh! cards with filters (name, archetype, type, attribute, level, atk, def) and/or FTS5 full-text card text search. Returns token-compact summaries.",
  SearchCardsSchema.shape,
  async (args) => {
    try {
      const results = queryCards(db, args);
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                count: results.length,
                limit_applied: args.limit || 10,
                cards: results
              },
              null,
              2
            )
          }
        ]
      };
    } catch (err: any) {
      return {
        isError: true,
        content: [{ type: "text", text: `Error searching cards: ${err.message}` }]
      };
    }
  }
);

// ------------------------------------------
// Tool: get_card_details
// ------------------------------------------
server.tool(
  "get_card_details",
  "Retrieve authoritative, unabridged card details including exact Problem-Solving Card Text (PSCT), full stats, and legality status across all formats (TCG, OCG, Goat, Edison, Master Duel).",
  GetCardDetailsSchema.shape,
  async (args) => {
    try {
      const card = queryCardDetails(db, args.name_or_id);
      if (!card) {
        return {
          isError: true,
          content: [
            {
              type: "text",
              text: `Card not found in database: "${args.name_or_id}". Try searching with search_cards.`
            }
          ]
        };
      }
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(card, null, 2)
          }
        ]
      };
    } catch (err: any) {
      return {
        isError: true,
        content: [{ type: "text", text: `Error retrieving card details: ${err.message}` }]
      };
    }
  }
);

// ------------------------------------------
// Tool: check_banlist
// ------------------------------------------
server.tool(
  "check_banlist",
  "Batch verify legality of cards for a specified format (tcg, ocg, masterduel, goat, edison). Returns Forbidden, Limited, Semi-Limited, or Unlimited.",
  CheckBanlistSchema.shape,
  async (args) => {
    try {
      const reports = queryBanlist(db, args.format, args.cards);
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                format: args.format,
                total_checked: reports.length,
                results: reports
              },
              null,
              2
            )
          }
        ]
      };
    } catch (err: any) {
      return {
        isError: true,
        content: [{ type: "text", text: `Error checking banlist: ${err.message}` }]
      };
    }
  }
);

// ------------------------------------------
// Tool: get_top_archetypes (Tournament Meta)
// ------------------------------------------
server.tool(
  "get_top_archetypes",
  "Retrieve top tournament-topping archetypes and their competitive meta share percentages (TCG, OCG, Master Duel) based on recent tournament top cuts.",
  GetTopArchetypesSchema.shape,
  async (args) => {
    try {
      const meta = queryTopArchetypes(db, args);
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(meta, null, 2)
          }
        ]
      };
    } catch (err: any) {
      return {
        isError: true,
        content: [{ type: "text", text: `Error retrieving top archetypes: ${err.message}` }]
      };
    }
  }
);

// ------------------------------------------
// Tool: list_recent_tournaments (Tournament Directory)
// ------------------------------------------
server.tool(
  "list_recent_tournaments",
  "List recently concluded Premier and Regional tournament events (YCS, WCQ Regionals, Nationals) with dates, locations, winners, and player counts.",
  ListRecentTournamentsSchema.shape,
  async (args) => {
    try {
      const events = queryRecentTournaments(db, args);
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                format: args.format || "TCG",
                count: events.length,
                tournaments: events
              },
              null,
              2
            )
          }
        ]
      };
    } catch (err: any) {
      return {
        isError: true,
        content: [{ type: "text", text: `Error listing tournaments: ${err.message}` }]
      };
    }
  }
);

// ------------------------------------------
// Tool: get_tournament_breakdown
// ------------------------------------------
server.tool(
  "get_tournament_breakdown",
  "Get details and URL for a specific tournament event by its slug (e.g. 'ycs-guayaquil-5164') or ID.",
  GetTournamentBreakdownSchema.shape,
  async (args) => {
    try {
      const eventDetails = queryTournamentDetails(db, args.slug_or_id);
      if (!eventDetails) {
        return {
          isError: true,
          content: [
            {
              type: "text",
              text: `Tournament not found in database: "${args.slug_or_id}". Try list_recent_tournaments.`
            }
          ]
        };
      }
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(eventDetails, null, 2)
          }
        ]
      };
    } catch (err: any) {
      return {
        isError: true,
        content: [{ type: "text", text: `Error retrieving tournament details: ${err.message}` }]
      };
    }
  }
);

// ------------------------------------------
// Tool: get_top_tech_cards
// ------------------------------------------
server.tool(
  "get_top_tech_cards",
  "Calculate empirical tech card adoption frequencies across competitive tournament top-cut decks (Main Deck staples, Hand Traps, and Side Deck counters). Distinguishes true tech from secondary engines in pile decks. Supports filtering by date (e.g. 'since last Friday').",
  GetTopTechCardsSchema.shape,
  async (args) => {
    try {
      const results = queryTopTechCards(db, args);
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(results, null, 2)
          }
        ]
      };
    } catch (err: any) {
      return {
        isError: true,
        content: [{ type: "text", text: `Error retrieving top tech cards: ${err.message}` }]
      };
    }
  }
);

// ------------------------------------------
// Tool: get_tournament_decklists
// ------------------------------------------
server.tool(
  "get_tournament_decklists",
  "Retrieve complete top-cut tournament deck profiles (Main, Extra, Side) with card names, types, stats, placement, and copy-pasteable .ydk simulator strings for future reference and playtesting.",
  GetTournamentDecklistsSchema.shape,
  async (args) => {
    try {
      const decklists = queryTournamentDecklists(db, args);
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                count: decklists.length,
                decklists
              },
              null,
              2
            )
          }
        ]
      };
    } catch (err: any) {
      return {
        isError: true,
        content: [{ type: "text", text: `Error retrieving tournament decklists: ${err.message}` }]
      };
    }
  }
);

// ------------------------------------------
// Tool: evaluate_tech_counters
// ------------------------------------------
server.tool(
  "evaluate_tech_counters",
  "Evaluate which tech cards and Side Deck hate cards are empirically and strategically best against top meta tournament decks (GY disruption, search denial, summon limits, board breakers).",
  EvaluateTechCountersSchema.shape,
  async (args) => {
    try {
      const recommendations = queryEvaluateTechCounters(db, args);
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                format: args.format || "TCG",
                recommendations
              },
              null,
              2
            )
          }
        ]
      };
    } catch (err: any) {
      return {
        isError: true,
        content: [{ type: "text", text: `Error evaluating tech counters: ${err.message}` }]
      };
    }
  }
);

// ------------------------------------------
// Tool: get_genesys_points
// ------------------------------------------
server.tool(
  "get_genesys_points",
  "Evaluate Genesys format point costs and mechanical legality (zero Link/zero Pendulum) for an array of cards, returning total points spent against the 100-point cap, remaining budget, and an itemized breakdown of pointed cards.",
  GetGenesysPointsSchema.shape,
  async (args) => {
    try {
      const report = queryGenesysPoints(db, args.cards);
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(report, null, 2)
          }
        ]
      };
    } catch (err: any) {
      return {
        isError: true,
        content: [{ type: "text", text: `Error evaluating Genesys points: ${err.message}` }]
      };
    }
  }
);

// ------------------------------------------
// Tool: get_database_info
// ------------------------------------------
server.tool(
  "get_database_info",
  "Retrieve metadata about the local card and tournament database, total indexed cards, and last synchronization timestamp.",
  {},
  async () => {
    try {
      const info = queryDatabaseInfo(db);
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                database_path: getDbPath(),
                ...info
              },
              null,
              2
            )
          }
        ]
      };
    } catch (err: any) {
      return {
        isError: true,
        content: [{ type: "text", text: `Error retrieving database info: ${err.message}` }]
      };
    }
  }
);

// ------------------------------------------
// Resources
// ------------------------------------------
server.resource(
  "database-info",
  "ygo://database/info",
  async (uri) => {
    const info = queryDatabaseInfo(db);
    return {
      contents: [
        {
          uri: uri.href,
          mimeType: "application/json",
          text: JSON.stringify(info, null, 2)
        }
      ]
    };
  }
);

server.resource(
  "card-by-id",
  new ResourceTemplate("ygo://cards/{id}", { list: undefined }),
  async (uri, { id }) => {
    const cardId = Array.isArray(id) ? id[0] : id;
    const card = queryCardDetails(db, cardId);
    return {
      contents: [
        {
          uri: uri.href,
          mimeType: "application/json",
          text: JSON.stringify(card ?? { error: "Card not found" }, null, 2)
        }
      ]
    };
  }
);

server.resource(
  "meta-top-archetypes",
  new ResourceTemplate("ygo://meta/{format}", { list: undefined }),
  async (uri, { format }) => {
    const fmt = Array.isArray(format) ? format[0] : format;
    const meta = queryTopArchetypes(db, { format: fmt, timeframe: "current", limit: 20 });
    return {
      contents: [
        {
          uri: uri.href,
          mimeType: "application/json",
          text: JSON.stringify(meta, null, 2)
        }
      ]
    };
  }
);

// ==========================================
// Start stdio Transport
// ==========================================
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((err) => {
  console.error("Fatal error starting ygo-mcp stdio server:", err);
  process.exit(1);
});
