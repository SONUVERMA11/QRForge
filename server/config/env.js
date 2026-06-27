/**
 * QRForge — Environment Configuration
 * 
 * Centralized config with validation. All env vars are validated
 * at startup — fail fast if anything is misconfigured.
 */

import dotenv from 'dotenv';
import { resolve } from 'path';

dotenv.config();

export const config = {
  // Server
  PORT: parseInt(process.env.PORT || '3001', 10),
  HOST: process.env.HOST || '0.0.0.0',
  NODE_ENV: process.env.NODE_ENV || 'development',

  // JWT
  JWT_SECRET: process.env.JWT_SECRET || 'qrforge-dev-secret-key-change-in-production',
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '7d',

  // Database
  DB_PATH: resolve(process.env.DB_PATH || './data/qrforge.db'),

  // URLs
  CLIENT_URL: process.env.CLIENT_URL || 'http://localhost:3000',
  BASE_URL: process.env.BASE_URL || 'http://localhost:3001',

  // Rate limiting
  RATE_LIMIT_REDIRECT: parseInt(process.env.RATE_LIMIT_REDIRECT || '100', 10),
  RATE_LIMIT_API: parseInt(process.env.RATE_LIMIT_API || '30', 10),

  // Computed
  get IS_PRODUCTION() {
    return this.NODE_ENV === 'production';
  }
};

/**
 * Validate critical configuration at startup
 */
export function validateConfig() {
  const errors = [];

  if (config.IS_PRODUCTION && config.JWT_SECRET.includes('dev-secret')) {
    errors.push('JWT_SECRET must be changed from default in production');
  }

  if (config.PORT < 1 || config.PORT > 65535) {
    errors.push(`Invalid PORT: ${config.PORT}`);
  }

  if (errors.length > 0) {
    console.error('❌ Configuration errors:');
    errors.forEach(e => console.error(`  • ${e}`));
    process.exit(1);
  }

  console.log(`⚙️  Config loaded (${config.NODE_ENV})`);
}

export default config;
