/**
 * QRForge — Database Connection
 * 
 * SQLite connection with WAL mode for optimal read performance.
 * Designed with a clean interface for future PostgreSQL migration.
 */

import Database from 'better-sqlite3';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { mkdirSync, existsSync } from 'fs';
import { config } from '../config/env.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

let db = null;

/**
 * Initialize and return the database connection.
 * Creates the data directory and applies schema if needed.
 */
export function getDb() {
  if (db) return db;

  // Ensure data directory exists
  const dbDir = dirname(config.DB_PATH);
  if (!existsSync(dbDir)) {
    mkdirSync(dbDir, { recursive: true });
  }

  db = new Database(config.DB_PATH);

  // Performance optimizations for SQLite
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  db.pragma('busy_timeout = 5000');
  db.pragma('synchronous = NORMAL');
  db.pragma('cache_size = -20000'); // 20MB cache

  return db;
}

/**
 * Initialize the database schema from schema.sql
 */
export function initializeDatabase() {
  const database = getDb();
  const schemaPath = join(__dirname, 'schema.sql');
  const schema = readFileSync(schemaPath, 'utf-8');

  // Split by semicolons and execute each statement
  // Filter out PRAGMA statements that might conflict
  const statements = schema
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0 && !s.startsWith('PRAGMA'));

  const transaction = database.transaction(() => {
    for (const stmt of statements) {
      try {
        database.exec(stmt + ';');
      } catch (err) {
        // Skip if table/index already exists
        if (!err.message.includes('already exists')) {
          console.error(`Schema error: ${err.message}`);
          console.error(`Statement: ${stmt.substring(0, 100)}...`);
        }
      }
    }
  });

  transaction();
  console.log('✅ Database schema initialized');
  return database;
}

/**
 * Close the database connection gracefully.
 */
export function closeDb() {
  if (db) {
    db.close();
    db = null;
    console.log('🔒 Database connection closed');
  }
}

export default { getDb, initializeDatabase, closeDb };
