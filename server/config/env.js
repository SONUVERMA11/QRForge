/**
 * QRForge — Environment Configuration
 */

import dotenv from 'dotenv';
dotenv.config();

export const config = {
  PORT: parseInt(process.env.PORT || '3001', 10),
  HOST: process.env.HOST || '0.0.0.0',
  NODE_ENV: process.env.NODE_ENV || 'development',

  JWT_SECRET: process.env.JWT_SECRET || 'qrforge-dev-secret-key-change-in-production',
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '7d',

  DATABASE_URL: process.env.DATABASE_URL || '',

  CLIENT_URL: process.env.CLIENT_URL || 'http://localhost:3000',
  BASE_URL: process.env.BASE_URL || 'http://localhost:3001',

  RATE_LIMIT_REDIRECT: parseInt(process.env.RATE_LIMIT_REDIRECT || '100', 10),
  RATE_LIMIT_API: parseInt(process.env.RATE_LIMIT_API || '30', 10),

  get IS_PRODUCTION() {
    return this.NODE_ENV === 'production';
  }
};

export function validateConfig() {
  const errors = [];
  if (!config.DATABASE_URL) errors.push('DATABASE_URL is required');
  if (config.IS_PRODUCTION && config.JWT_SECRET.includes('dev-secret')) {
    errors.push('JWT_SECRET must be changed from default in production');
  }
  if (errors.length > 0) {
    console.error('❌ Configuration errors:');
    errors.forEach(e => console.error(`  • ${e}`));
    process.exit(1);
  }
  console.log(`⚙️  Config loaded (${config.NODE_ENV})`);
}

export default config;
