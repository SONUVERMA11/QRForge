/**
 * QRForge — Auth Routes (PostgreSQL)
 */

import { v4 as uuidv4 } from 'uuid';
import { getDb } from '../db/connection.js';
import { hashPassword, verifyPassword, generateToken } from '../utils/crypto.js';
import { schemas } from '../utils/validators.js';
import { authGuard } from '../middleware/auth-guard.js';

export default async function authRoutes(fastify) {

  // ─── Register ────────────────────────────────────
  fastify.post('/api/auth/register', {
    schema: schemas.register,
  }, async (request, reply) => {
    const { email, password, name, orgName } = request.body;
    const db = getDb();

    const existing = await db.get('SELECT id FROM users WHERE email = ?', email);
    if (existing) {
      return reply.status(409).send({
        error: 'Conflict',
        message: 'An account with this email already exists.',
      });
    }

    const orgId = uuidv4();
    await db.run(`
      INSERT INTO organizations (id, name, plan, qr_limit, scan_limit_monthly)
      VALUES (?, ?, 'free', 5, 500)
    `, orgId, orgName || `${name}'s Organization`);

    const userId = uuidv4();
    const passwordHash = await hashPassword(password);

    await db.run(`
      INSERT INTO users (id, org_id, email, password_hash, name, role)
      VALUES (?, ?, ?, ?, ?, 'owner')
    `, userId, orgId, email, passwordHash, name);

    const token = generateToken({ userId, orgId, role: 'owner' });

    reply.setCookie('token', token, {
      httpOnly: true,
      secure: false,
      sameSite: 'lax',
      path: '/',
      maxAge: 7 * 24 * 60 * 60,
    });

    return reply.status(201).send({
      success: true,
      user: { id: userId, email, name, role: 'owner' },
      org: { id: orgId, name: orgName || `${name}'s Organization`, plan: 'free' },
      token,
    });
  });

  // ─── Login ───────────────────────────────────────
  fastify.post('/api/auth/login', {
    schema: schemas.login,
  }, async (request, reply) => {
    const { email, password } = request.body;
    const db = getDb();

    const user = await db.get(`
      SELECT u.id, u.email, u.name, u.role, u.password_hash, u.org_id, u.avatar_url,
             o.name as org_name, o.plan
      FROM users u
      JOIN organizations o ON o.id = u.org_id
      WHERE u.email = ?
    `, email);

    if (!user) {
      return reply.status(401).send({
        error: 'Unauthorized',
        message: 'Invalid email or password.',
      });
    }

    const valid = await verifyPassword(password, user.password_hash);
    if (!valid) {
      return reply.status(401).send({
        error: 'Unauthorized',
        message: 'Invalid email or password.',
      });
    }

    const token = generateToken({ userId: user.id, orgId: user.org_id, role: user.role });

    reply.setCookie('token', token, {
      httpOnly: true,
      secure: false,
      sameSite: 'lax',
      path: '/',
      maxAge: 7 * 24 * 60 * 60,
    });

    return {
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        avatarUrl: user.avatar_url,
      },
      org: {
        id: user.org_id,
        name: user.org_name,
        plan: user.plan,
      },
      token,
    };
  });

  // ─── Logout ──────────────────────────────────────
  fastify.post('/api/auth/logout', async (request, reply) => {
    reply.clearCookie('token', { path: '/' });
    return { success: true, message: 'Logged out successfully.' };
  });

  // ─── Get Current User ────────────────────────────
  fastify.get('/api/auth/me', {
    preHandler: [authGuard],
  }, async (request) => {
    return {
      success: true,
      user: request.user,
    };
  });

  // ─── Update Profile ──────────────────────────────
  fastify.patch('/api/auth/me', {
    preHandler: [authGuard],
  }, async (request) => {
    const { name, avatarUrl } = request.body;
    const db = getDb();

    if (name) {
      await db.run("UPDATE users SET name = ?, updated_at = NOW() WHERE id = ?",
        name, request.user.id);
    }

    if (avatarUrl !== undefined) {
      await db.run("UPDATE users SET avatar_url = ?, updated_at = NOW() WHERE id = ?",
        avatarUrl, request.user.id);
    }

    return { success: true, message: 'Profile updated.' };
  });
}
