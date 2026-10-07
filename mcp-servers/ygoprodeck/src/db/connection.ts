import { DatabaseSync } from "node:sqlite";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export function getDataDir(): string {
  const rootDir = path.resolve(__dirname, "../../");
  const dataDir = path.join(rootDir, "data");
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
  return dataDir;
}

export function getDbPath(): string {
  const customPath = process.env.YGO_DB_PATH;
  if (customPath) return customPath;
  return path.join(getDataDir(), "cards.db");
}

/**
 * Opens a SQLite database connection with hardened PRAGMAs using native node:sqlite.
 * @param readonly Set to true for MCP server (safety), false for sync worker.
 */
export function getDbConnection(readonly = false): DatabaseSync {
  const dbPath = getDbPath();

  if (readonly && !fs.existsSync(dbPath)) {
    throw new Error(
      `Yu-Gi-Oh! card database not found at "${dbPath}". ` +
      `Please run "npm run sync:all" first to populate the local database.`
    );
  }

  const db = new DatabaseSync(dbPath, {
    readOnly: readonly
  });

  // Performance and concurrency pragmas
  if (!readonly) {
    db.exec("PRAGMA journal_mode = WAL;");
    db.exec("PRAGMA synchronous = NORMAL;");
  }
  db.exec("PRAGMA busy_timeout = 5000;");
  db.exec("PRAGMA foreign_keys = ON;");

  return db;
}

/**
 * Initializes database tables and FTS5 indices from schema.sql.
 * Used exclusively by the sync worker.
 */
export function initDbSchema(db: DatabaseSync): void {
  let schemaPath = path.join(__dirname, "schema.sql");
  if (!fs.existsSync(schemaPath)) {
    // If running from dist/db, locate in src/db/schema.sql
    schemaPath = path.resolve(__dirname, "../../src/db/schema.sql");
  }
  const schemaSql = fs.readFileSync(schemaPath, "utf-8");
  db.exec(schemaSql);
}
