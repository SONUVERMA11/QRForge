/**
 * QRForge — Cryptography Utilities
 * 
 * Password hashing, IP hashing, and token generation.
 */

import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { createHash, randomBytes } from 'crypto';
import { config } from '../config/env.js';

const SALT_ROUNDS = 12;

/**
 * Hash a password using bcrypt.
 * @param {string} password - Plaintext password
 * @returns {Promise<string>} Hashed password
 */
export async function hashPassword(password) {
  return bcrypt.hash(password, SALT_ROUNDS);
}

/**
 * Verify a password against a bcrypt hash.
 * @param {string} password - Plaintext password
 * @param {string} hash - Stored hash
 * @returns {Promise<boolean>}
 */
export async function verifyPassword(password, hash) {
  return bcrypt.compare(password, hash);
}

/**
 * Hash an IP address for privacy-safe storage.
 * Uses SHA-256 — irreversible but consistent for deduplication.
 * @param {string} ip - Raw IP address
 * @returns {string} SHA-256 hex hash
 */
export function hashIP(ip) {
  if (!ip) return 'unknown';
  return createHash('sha256').update(ip + config.JWT_SECRET).digest('hex');
}

/**
 * Generate a JWT token for a user.
 * @param {Object} payload - Token payload
 * @returns {string} Signed JWT
 */
export function generateToken(payload) {
  return jwt.sign(payload, config.JWT_SECRET, {
    expiresIn: config.JWT_EXPIRES_IN,
  });
}

/**
 * Verify and decode a JWT token.
 * @param {string} token - JWT string
 * @returns {Object|null} Decoded payload or null if invalid
 */
export function verifyToken(token) {
  try {
    return jwt.verify(token, config.JWT_SECRET);
  } catch {
    return null;
  }
}

/**
 * Generate a random API key.
 * @returns {{ key: string, hash: string, prefix: string }}
 */
export function generateApiKey() {
  const key = `qf_${randomBytes(32).toString('hex')}`;
  const hash = createHash('sha256').update(key).digest('hex');
  const prefix = key.substring(0, 11); // "qf_" + 8 chars
  return { key, hash, prefix };
}

export default {
  hashPassword,
  verifyPassword,
  hashIP,
  generateToken,
  verifyToken,
  generateApiKey,
};
