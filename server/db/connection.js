/**
 * QRForge — Database Connection (PostgreSQL)
 * 
 * Async wrapper around node-postgres with a ?-placeholder compatibility
 * layer so existing SQL queries work with minimal changes.
 */

import pg from 'pg';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

let pool = null;

/** Convert SQLite-style ? placeholders to PostgreSQL $1, $2, ... */
function pg$(sql) {
  let i = 0;
  return sql.replace(/\?/g, () => `$${++i}`);
}

/**
 * The shared db object. Every method is async and uses ? placeholders.
 *
 *   await db.get('SELECT * FROM users WHERE id = ?', userId)
 *   await db.all('SELECT * FROM users')
 *   await db.run('INSERT INTO users (id) VALUES (?)', id)
 *   await db.transaction(async (tx) => { await tx.run(...); })
 */
export const db = {
  async get(sql, ...params) {
    const { rows } = await pool.query(pg$(sql), params);
    return rows[0] || null;
  },
  async all(sql, ...params) {
    const { rows } = await pool.query(pg$(sql), params);
    return rows;
  },
  async run(sql, ...params) {
    return pool.query(pg$(sql), params);
  },
  async transaction(fn) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const tx = {
        async get(sql, ...params) {
          const { rows } = await client.query(pg$(sql), params);
          return rows[0] || null;
        },
        async all(sql, ...params) {
          const { rows } = await client.query(pg$(sql), params);
          return rows;
        },
        async run(sql, ...params) {
          return client.query(pg$(sql), params);
        },
      };
      await fn(tx);
      await client.query('COMMIT');
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
  },
};

/** For backwards-compat: getDb() returns the same db singleton */
export function getDb() {
  return db;
}

/**
 * Initialize the PostgreSQL connection pool and run schema.
 */
export async function initializeDatabase() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error('DATABASE_URL environment variable is required');
  }

  pool = new pg.Pool({
    connectionString,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
    max: 10,
    idleTimeoutMillis: 30000,
  });

  // Test connection
  await pool.query('SELECT 1');

  // Run schema
  const schemaPath = join(__dirname, 'schema.sql');
  const schema = readFileSync(schemaPath, 'utf-8');

  // Split and execute each statement (skip empty ones)
  const statements = schema
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0);

  for (const stmt of statements) {
    try {
      await pool.query(stmt + ';');
    } catch (err) {
      if (!err.message.includes('already exists')) {
        console.error(`Schema error: ${err.message}`);
      }
    }
  }

  console.log('✅ Database schema initialized (PostgreSQL)');
}

/**
 * Close the pool gracefully.
 */
export async function closeDb() {
  if (pool) {
    await pool.end();
    pool = null;
    console.log('🔒 Database connection closed');
  }
}

export default { db, getDb, initializeDatabase, closeDb };
