# ADR-000: Upstream API Constraints & Fair-Use Safety Guarantees

* **Status:** Accepted  
* **Date:** 2026-10-06  
* **Context:** Integration with YGOPRODeck REST API  
* **Author / Team:** Obsidian Team  
* **Affected Assets:** `mcp-servers/ygoprodeck`  

---

## 1. Context & Problem Statement

The ecosystem requires authoritative, comprehensive, and up-to-date data for all legal Yu-Gi-Oh! cards, banlist statuses, and tournament top-cut deck profiles. YGOPRODeck provides a comprehensive public API (`https://ygoprodeck.com/api-guide/`), but imposes strict fair-use and rate-limiting constraints:

```text
From Yu-Gi-Oh! API Guide by YGOPRODeck:
"Please download and store all data pulled from this API locally to keep the amount of API calls used to a minimum. Failure to do so may result in either your IP address being blacklisted or the API being rolled back.

Rate Limiting on the API is enabled. The rate limit is 20 requests per 1 second. If you exceed this, you are blocked from accessing the API for 1 hour. We will monitor this rate limit for now and adjust accordingly.

Our API responses are cached on our side. The cache timings will be given below. These are subject to change."
```

If an AI agent were to query the remote API dynamically during user conversations or reasoning loops, a brief burst of requests or an infinite agent loop would trigger a 1-hour IP blacklist, halting all operations.

---

## 2. Decision

1. **Air-Gapped Operational Runtime:** The MCP server (`mcp-servers/ygoprodeck/src/server.ts`) shall have **zero outbound network access**. It executes exclusively against a local SQLite database (`cards.db`).
2. **Physical Boundary Separation:** All HTTP network logic is strictly isolated to separate CLI workers (`sync.ts` and `syncTournaments.ts`).
3. **Throttled Ingestion:** The sync CLI applies a token-bucket rate limiter hard-capped to **$\le 1$ request every 5 seconds** (vastly below the 20 req/s threshold).
4. **Automatic Circuit Breaker:** Any HTTP `429 Too Many Requests` or `403 Forbidden` response instantly halts the sync worker and writes a 70-minute lockdown file (`.rate_limit_lock`) to guarantee immunity from prolonged bans.

---

## 3. Consequences & Traceability

* **Positive:** Complete immunity from IP blacklisting; queries execute in $<5\text{ms}$ over local SQLite; works in fully air-gapped or offline development environments.
* **Operational Impact:** Developers must run `npm run sync:all` to populate or update the local card database rather than expecting dynamic on-demand internet fetches.
* **Downstream Artifact:** Implemented in `mcp-servers/ygoprodeck/src/cli/sync.ts` and `mcp-servers/ygoprodeck/src/cli/syncTournaments.ts`.
