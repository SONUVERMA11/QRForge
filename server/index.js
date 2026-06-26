/**
 * QRForge — Server Entry Point
 * 
 * Architecture: The redirect endpoint (/r/:shortCode) has its OWN rate limit
 * (100 req/min/IP) separate from the API rate limit (60 req/min/IP).
 * This ensures high-throughput scanning while protecting the admin API.
 */
import Fastify from 'fastify';
import cors from '@fastify/cors';
import cookie from '@fastify/cookie';
import rateLimit from '@fastify/rate-limit';
import { config, validateConfig } from './config/env.js';
import { initializeDatabase, closeDb } from './db/connection.js';
import authRoutes from './routes/auth.js';
import qrRoutes from './routes/qr.js';
import redirectRoute from './routes/redirect.js';
import analyticsRoutes from './routes/analytics.js';

validateConfig();
initializeDatabase();

const fastify = Fastify({
  logger: {
    level: config.IS_PRODUCTION ? 'warn' : 'info',
    transport: config.IS_PRODUCTION ? undefined : {
      target: 'pino-pretty',
      options: { translateTime: 'HH:MM:ss', ignore: 'pid,hostname' },
    },
  },
  trustProxy: true,
});

// ─── Plugins ──────────────────────────────────────────
const clientUrl = config.CLIENT_URL.endsWith('/') ? config.CLIENT_URL.slice(0, -1) : config.CLIENT_URL;
await fastify.register(cors, {
  origin: [clientUrl, 'http://localhost:3000', 'http://localhost:5173'],
  credentials: true,
});
await fastify.register(cookie);

// Global rate limit for API routes (60 req/min)
await fastify.register(rateLimit, {
  max: 60,
  timeWindow: '1 minute',
  keyGenerator: (request) => {
    return request.headers['x-forwarded-for']?.split(',')[0]?.trim() || request.ip;
  },
  // Skip rate limit for redirect routes — they have their own
  allowList: (request) => {
    return request.url.startsWith('/r/');
  },
});

// Health check
fastify.get('/api/health', async () => ({
  status: 'ok',
  service: 'QRForge API',
  version: '1.0.0',
  uptime: process.uptime(),
  timestamp: new Date().toISOString(),
}));

// ─── Routes ───────────────────────────────────────────
await fastify.register(authRoutes);
await fastify.register(qrRoutes);
await fastify.register(analyticsRoutes);

// Redirect route: separate rate limit (200 req/min per IP)
// This is the HOT PATH — needs higher throughput
await fastify.register(async function redirectPlugin(app) {
  await app.register(rateLimit, {
    max: 200,
    timeWindow: '1 minute',
    keyGenerator: (request) => {
      return request.headers['x-forwarded-for']?.split(',')[0]?.trim() || request.ip;
    },
  });
  await app.register(redirectRoute);
});

// ─── Graceful Shutdown ────────────────────────────────
const shutdown = async (signal) => {
  console.log(`\n${signal} received. Shutting down gracefully...`);
  closeDb();
  await fastify.close();
  process.exit(0);
};
process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

// ─── Start ────────────────────────────────────────────
try {
  await fastify.listen({ port: config.PORT, host: config.HOST });
  console.log(`\n🚀 QRForge API running at http://localhost:${config.PORT}`);
  console.log(`📊 Dashboard: ${config.CLIENT_URL}`);
  console.log(`🔗 Redirect:  ${config.BASE_URL}/r/{shortCode}\n`);
} catch (err) {
  fastify.log.error(err);
  process.exit(1);
}
