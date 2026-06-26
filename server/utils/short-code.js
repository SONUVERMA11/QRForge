/**
 * QRForge — Short Code Generator
 * 
 * Generates URL-safe, human-readable short codes for QR codes.
 * Uses nanoid with a custom alphabet that excludes confusing characters
 * (0/O, 1/l/I) for better real-world readability.
 */

import { customAlphabet } from 'nanoid';

// Custom alphabet: no 0/O, 1/l/I confusion
// 57 characters → 6 chars = 57^6 = 34.3 billion combinations
const ALPHABET = '23456789abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ';
const DEFAULT_LENGTH = 7;

const generate = customAlphabet(ALPHABET, DEFAULT_LENGTH);

/**
 * Generate a unique short code.
 * @param {number} length - Code length (default: 7)
 * @returns {string} URL-safe short code
 */
export function generateShortCode(length = DEFAULT_LENGTH) {
  return customAlphabet(ALPHABET, length)();
}

/**
 * Validate that a string is a valid short code format.
 * @param {string} code - Code to validate
 * @returns {boolean}
 */
export function isValidShortCode(code) {
  if (!code || typeof code !== 'string') return false;
  if (code.length < 4 || code.length > 20) return false;
  return /^[23456789a-hjkmnp-zA-HJKMNP-Z]+$/.test(code);
}

export default { generateShortCode, isValidShortCode };
