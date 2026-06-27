/**
 * QRForge — Auth Guard Middleware
 * 
 * JWT-based authentication for API routes.
 * Extracts and validates the token from cookies or Authorization header.
 */

import { verifyToken } from '../utils/crypto.js';
import { getDb } from '../db/connection.js';

/**
 * Fastify preHandler hook for authenticated routes.
 * Sets request.user with full user + org data.
 */
export async function authGuard(request, reply) {
  // Extract token from cookie or Authorization header
  let token = request.cookies?.token;

  if (!token) {
    const authHeader = request.headers.authorization;
    if (authHeader?.startsWith('Bearer ')) {
      token = authHeader.substring(7);
    }
  }

  if (!token) {
    return reply.status(401).send({
      error: 'Unauthorized',
      message: 'Authentication required. Please log in.',
    });
  }

  // Verify JWT
  const payload = verifyToken(token);
  if (!payload) {
    return reply.status(401).send({
      error: 'Unauthorized',
      message: 'Invalid or expired token. Please log in again.',
    });
  }

  // Fetch user from database (ensures user still exists & gets fresh data)
  const db = getDb();
  const user = db.prepare(`
    SELECT u.id, u.email, u.name, u.role, u.org_id, u.avatar_url,
           o.name as org_name, o.plan, o.qr_limit, o.scan_limit_monthly
    FROM users u
    JOIN organizations o ON o.id = u.org_id
    WHERE u.id = ?
  `).get(payload.userId);

  if (!user) {
    return reply.status(401).send({
      error: 'Unauthorized',
      message: 'User account not found.',
    });
  }

  // Attach to request for downstream handlers
  request.user = {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    orgId: user.org_id,
    orgName: user.org_name,
    plan: user.plan,
    qrLimit: user.qr_limit,
    scanLimitMonthly: user.scan_limit_monthly,
    avatarUrl: user.avatar_url,
  };
}

/**
 * Role-based access control. Use after authGuard.
 * @param {string[]} allowedRoles - Roles that can access this route
 */
export function requireRole(...allowedRoles) {
  return async function (request, reply) {
    if (!request.user) {
      return reply.status(401).send({ error: 'Unauthorized' });
    }

    if (!allowedRoles.includes(request.user.role)) {
      return reply.status(403).send({
        error: 'Forbidden',
        message: `This action requires one of: ${allowedRoles.join(', ')}`,
      });
    }
  };
}

export default { authGuard, requireRole };
