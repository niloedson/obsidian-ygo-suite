# `ygoprodeck-mcp`: Local-First YGOPRODeck Knowledge & Tournament Meta Server

A Model Context Protocol (MCP) server providing AI agents with fast, authoritative access to **YGOPRODeck** card mechanics, exact Problem-Solving Card Text (PSCT), format banlists, and live **competitive tournament meta analytics** (top archetypes, representation shares, and recent event results).

## Architectural Guarantees
1. **Zero Outbound HTTP from MCP Server:** The server process (`server.ts`) contains zero network code. It queries a local SQLite database in read-only mode with sub-millisecond response times (<5ms).
2. **Circuit Breaker Protected Sync:** Both sync scripts (`sync.ts` and `syncTournaments.ts`) enforce rate limits and a 70-minute lockout file (`.rate_limit_lock`) if an HTTP 429/403 is received, protecting your IP address from blacklisting.
3. **FTS5 Full-Text Search:** Token-based search over card effect text and archetypes.
4. **Token-Lean Output:** Search responses are compact to protect LLM context windows.

---

## Setup & Synchronization

### 1. Install Dependencies
```bash
cd mcp-servers/ygoprodeck
npm install
```

### 2. Populate Local Database
You can sync cards, tournament meta, or both:

```bash
# 1. Sync cards and banlists (~20MB bulk payload from YGOPRODeck)
npm run sync

# 2. Sync top archetypes & recent tournament events from YGOPRODeck
npm run sync:tournaments

# Or sync everything in one command:
npm run sync:all
```

### 3. Build TypeScript
```bash
npm run build
```

---

## MCP Tools Exposed

### Card & Rules Engine
| Tool Name | Parameters | Description |
| :--- | :--- | :--- |
| `search_cards` | `query`, `name`, `type`, `attribute`, `race`, `archetype`, `level`, `atk_min`, `atk_max`, `limit` (max 25) | Search cards with filters and/or FTS5 full-text effect search. Returns token-compact summaries including `genesys_points`. |
| `get_card_details` | `name_or_id` | Returns complete, verbatim PSCT text, full stats, legality status across TCG, OCG, Master Duel, Goat, Edison, and exact `genesys_points`. |
| `check_banlist` | `format` (`tcg`, `ocg`, `masterduel`, `goat`, `edison`, `genesys`), `cards` (array of names/IDs) | Batch legality verification returning Forbidden, Limited, Semi-Limited, Unlimited, or Genesys point status. |
| `get_genesys_points` | `cards` (array of names/IDs) | Evaluates Genesys format point costs and mechanical legality (zero Link/zero Pendulum), returning total points spent against the 100-point cap, remaining budget, and itemized breakdown. |
| `get_database_info` | None | Returns total indexed cards, database path, and last sync timestamp. |

### Tournament & Meta Engine
| Tool Name | Parameters | Description |
| :--- | :--- | :--- |
| `get_top_archetypes` | `format` (`TCG`, `OCG`, `Master Duel`), `timeframe` (`current`, `1-month`, `3-month`), `limit` | Returns top tournament-topping archetypes, their top-cut quantity, and meta share percentages. |
| `list_recent_tournaments` | `format` (`TCG`, `OCG`), `country` (optional), `limit` | Lists recent Premier & Regional events (YCS, WCQ Regionals) with dates, winners, and player counts. |
| `get_tournament_breakdown` | `slug_or_id` | Returns tournament metadata and direct link to the tournament breakdown on YGOPRODeck. |
| `get_top_tech_cards` | `format`, `archetype` (opt), `section` (`main`, `side`, `all`), `since_date` (opt, `YYYY-MM-DD`), `limit` | Calculates tech card adoption rates (%) and average copy counts across top-cut decks. Intelligently filters out secondary engines in pile decks. |
| `get_tournament_decklists` | `tournament_id_or_slug`, `archetype` (opt), `placement` (opt), `include_ydk` (default true), `limit` | Retrieves complete top-cut deck profiles (Main, Extra, Side) with card details and verbatim `.ydk` simulator export strings. |
| `evaluate_tech_counters` | `format`, `target_archetype` (opt), `since_date` (opt), `limit` | Analyzes dominant meta deck choke points (GY reliance, search dependence, special summon spam) and returns empirical side-deck counters and strategic recommendations. |

---

## Client Configuration

### Claude Desktop (`claude_desktop_config.json`)
```json
{
  "mcpServers": {
    "ygoprodeck": {
      "command": "node",
      "args": [
        "--experimental-sqlite",
        "C:/Users/nedsonbr/Desktop/personal/ideas/obsidian-ygo-suite/mcp-servers/ygoprodeck/dist/server.js"
      ]
    }
  }
}
```

### Cursor (`.cursor/mcp.json`)
```json
{
  "mcpServers": {
    "ygoprodeck": {
      "command": "node",
      "args": [
        "--experimental-sqlite",
        "C:/Users/nedsonbr/Desktop/personal/ideas/obsidian-ygo-suite/mcp-servers/ygoprodeck/dist/server.js"
      ]
    }
  }
}
```
