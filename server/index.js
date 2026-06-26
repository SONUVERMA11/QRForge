/**
 * QRForge — Server Entry Point (PostgreSQL)
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
await initializeDatabase();

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
  allowList: (request) => {
    return request.url.startsWith('/r/');
  },
});

// ─── Routes ───────────────────────────────────────────
await fastify.register(authRoutes);
await fastify.register(qrRoutes);
await fastify.register(redirectRoute);
await fastify.register(analyticsRoutes);

// ─── Redirect-specific rate limit ─────────────────────
fastify.after(() => {
  fastify.route({
    method: 'GET',
    url: '/r/:shortCode',
    config: {
      rateLimit: {
        max: 200,
        timeWindow: '1 minute',
      },
    },
    handler: async () => {},
  });
});

// ─── Health Check ─────────────────────────────────────
fastify.get('/api/health', async () => ({
  status: 'ok',
  service: 'QRForge API',
  version: '1.0.0',
  uptime: process.uptime(),
  timestamp: new Date().toISOString(),
}));

// ─── Graceful Shutdown ────────────────────────────────
const shutdown = async (signal) => {
  console.log(`\n${signal} received. Shutting down gracefully...`);
  await closeDb();
  process.exit(0);
};
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

// ─── Start Server ─────────────────────────────────────
try {
  await fastify.listen({ port: config.PORT, host: config.HOST });
  console.log(`\n🚀 QRForge API running at http://localhost:${config.PORT}`);
  console.log(`📊 Dashboard: ${config.CLIENT_URL}`);
  console.log(`🔗 Redirect:  ${config.BASE_URL}/r/{shortCode}\n`);
} catch (err) {
  fastify.log.error(err);
  process.exit(1);
}
