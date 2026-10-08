import fs from "node:fs";
import path from "node:path";

export const LOCK_FILE_NAME = ".rate_limit_lock";
export const DEFAULT_LOCK_DURATION_MS = 70 * 60 * 1000; // 70 minutes

/**
 * Checks for an active rate-limit lock file.
 * Halts execution immediately if a valid lock is present.
 */
export function checkRateLimitLock(dataDir: string): void {
  const lockPath = path.join(dataDir, LOCK_FILE_NAME);
  if (fs.existsSync(lockPath)) {
    try {
      const lockData = JSON.parse(fs.readFileSync(lockPath, "utf-8"));
      const remainingMs = lockData.unlockTimestamp - Date.now();
      if (remainingMs > 0) {
        const remainingMin = Math.ceil(remainingMs / 60000);
        console.error(
          `\n[FATAL] Active Rate-Limit Lockfile detected!\n` +
          `YGOPRODeck temporary ban protection is active. Please wait ${remainingMin} more minute(s) before attempting another sync.`
        );
        process.exit(1);
      } else {
        fs.unlinkSync(lockPath);
      }
    } catch {
      fs.unlinkSync(lockPath);
    }
  }
}

/**
 * Creates a rate-limit lock file with an unlock timestamp to prevent API blacklisting.
 */
export function triggerRateLimitLock(
  dataDir: string,
  reason: string,
  durationMs = DEFAULT_LOCK_DURATION_MS
): void {
  const lockPath = path.join(dataDir, LOCK_FILE_NAME);
  const lockData = {
    lockedAt: new Date().toISOString(),
    unlockTimestamp: Date.now() + durationMs,
    reason
  };
  fs.writeFileSync(lockPath, JSON.stringify(lockData, null, 2), "utf-8");
  const lockMinutes = Math.ceil(durationMs / 60000);
  console.error(
    `\n[CIRCUIT BREAKER TRIGGERED] ${reason}\n` +
    `Lockfile written to "${lockPath}". Network access paused for ${lockMinutes} minutes to protect your IP from blacklisting.`
  );
}

/**
 * Parses the standard HTTP Retry-After header into milliseconds.
 */
export function parseRetryAfter(headerValue: string | null): number | null {
  if (!headerValue) return null;
  const seconds = parseInt(headerValue, 10);
  if (!isNaN(seconds) && seconds > 0) {
    return seconds * 1000;
  }
  const dateParsed = Date.parse(headerValue);
  if (!isNaN(dateParsed)) {
    const diff = dateParsed - Date.now();
    return diff > 0 ? diff : null;
  }
  return null;
}

/**
 * Inspects an HTTP 429/403 response, respects Retry-After headers if available,
 * and activates the circuit-breaker lockfile.
 */
export function handleRateLimitResponse(res: Response, dataDir: string, context: string): void {
  const retryAfterHeader = res.headers.get("retry-after");
  const retryMs = parseRetryAfter(retryAfterHeader);
  const duration = retryMs && retryMs > 0 ? Math.max(retryMs, 60000) : DEFAULT_LOCK_DURATION_MS;
  const reason = `Upstream HTTP ${res.status} during ${context}${
    retryAfterHeader ? ` (Retry-After: ${retryAfterHeader})` : ""
  }`;
  triggerRateLimitLock(dataDir, reason, duration);
}

/**
 * Promisified sleep delay.
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Standard HTTP headers for crawler requests.
 */
export function getCrawlerHeaders(etag?: string | null): Record<string, string> {
  const headers: Record<string, string> = {
    "User-Agent": "ygo-card-mcp-sync/1.2 (local-first card crawler; https://github.com/obsidian-ygo-suite)"
  };
  if (etag) {
    headers["If-None-Match"] = etag;
  }
  return headers;
}
