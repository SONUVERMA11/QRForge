/**
 * QRForge — QR Code CRUD Routes (PostgreSQL)
 */
import { v4 as uuidv4 } from 'uuid';
import { getDb } from '../db/connection.js';
import { authGuard } from '../middleware/auth-guard.js';
import { schemas } from '../utils/validators.js';
import { generateShortCode } from '../utils/short-code.js';
import { generateQRDataUrl, generateQRSvg, generateQRBuffer } from '../services/qr-generator.js';
import { hashPassword } from '../utils/crypto.js';
import { cache } from '../services/cache-service.js';
import { config } from '../config/env.js';

export default async function qrRoutes(fastify) {

  // ─── List QR Codes ─────────────────────────────
  fastify.get('/api/qr', { preHandler: [authGuard] }, async (request) => {
    const db = getDb();
    const { search, tag, folder, page = 1, limit = 20, sort = 'created_at', order = 'desc' } = request.query;
    const offset = (page - 1) * limit;

    let where = 'WHERE q.org_id = ?';
    const params = [request.user.orgId];

    if (search) { where += ' AND (q.label LIKE ? OR q.short_code LIKE ?)'; params.push(`%${search}%`, `%${search}%`); }
    if (tag) { where += ' AND q.tags LIKE ?'; params.push(`%"${tag}"%`); }
    if (folder) { where += ' AND q.folder_id = ?'; params.push(folder); }

    const allowedSorts = ['created_at', 'label', 'total_scans'];
    const sortCol = allowedSorts.includes(sort) ? sort : 'created_at';
    const sortOrder = order === 'asc' ? 'ASC' : 'DESC';

    const total = await db.get(`SELECT COUNT(*) as count FROM qr_codes q ${where}`, ...params);
    const qrCodes = await db.all(`
      SELECT q.*, r.destination_url as current_url
      FROM qr_codes q LEFT JOIN redirects r ON r.qr_id = q.id AND r.is_current = 1
      ${where} ORDER BY q.${sortCol} ${sortOrder} LIMIT ? OFFSET ?
    `, ...params, limit, offset);

    return {
      success: true,
      data: qrCodes.map(qr => ({ ...qr, tags: JSON.parse(qr.tags || '[]'), style_config: JSON.parse(qr.style_config || '{}') })),
      pagination: { page: Number(page), limit: Number(limit), total: total.count, pages: Math.ceil(total.count / limit) },
    };
  });

  // ─── Create QR Code ────────────────────────────
  fastify.post('/api/qr', { preHandler: [authGuard], schema: schemas.createQR }, async (request, reply) => {
    const db = getDb();
    const user = request.user;

    const qrCount = await db.get('SELECT COUNT(*) as count FROM qr_codes WHERE org_id = ?', user.orgId);
    if (qrCount.count >= user.qrLimit) {
      return reply.status(403).send({ error: 'QR limit reached', message: `Your plan allows ${user.qrLimit} QR codes.` });
    }

    const { label, destinationUrl, tags, folderId, customCode, scanLimit, expiresAt, fallbackUrl, password, styleConfig } = request.body;
    let shortCode = customCode || generateShortCode();

    const existing = await db.get('SELECT id FROM qr_codes WHERE short_code = ?', shortCode);
    if (existing) {
      if (customCode) return reply.status(409).send({ error: 'Short code already taken' });
      shortCode = generateShortCode();
    }

    const qrId = uuidv4();
    const redirectId = uuidv4();
    let passwordHash = null;
    if (password) passwordHash = await hashPassword(password);

    await db.transaction(async (tx) => {
      await tx.run(`
        INSERT INTO qr_codes (id, short_code, owner_id, org_id, label, tags, folder_id, scan_limit, expires_at, fallback_url, password_hash, style_config)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, qrId, shortCode, user.id, user.orgId, label || 'Untitled QR', JSON.stringify(tags || []),
        folderId || null, scanLimit || null, expiresAt || null, fallbackUrl || null, passwordHash, JSON.stringify(styleConfig || {}));

      await tx.run(`
        INSERT INTO redirects (id, qr_id, destination_url, is_current, created_by)
        VALUES (?, ?, ?, 1, ?)
      `, redirectId, qrId, destinationUrl, user.id);
    });

    const qrUrl = `${config.BASE_URL}/r/${shortCode}`;
    const qrImage = await generateQRDataUrl(qrUrl, styleConfig);

    return reply.status(201).send({
      success: true,
      data: {
        id: qrId, shortCode, label: label || 'Untitled QR', destinationUrl,
        qrUrl, qrImage, tags: tags || [], isActive: true,
        createdAt: new Date().toISOString(),
      },
    });
  });

  // ─── Get QR Code Detail ────────────────────────
  fastify.get('/api/qr/:id', { preHandler: [authGuard] }, async (request, reply) => {
    const db = getDb();
    const qr = await db.get(`
      SELECT q.*, r.destination_url as current_url, r.id as redirect_id
      FROM qr_codes q LEFT JOIN redirects r ON r.qr_id = q.id AND r.is_current = 1
      WHERE q.id = ? AND q.org_id = ?
    `, request.params.id, request.user.orgId);

    if (!qr) return reply.status(404).send({ error: 'QR code not found' });

    const qrUrl = `${config.BASE_URL}/r/${qr.short_code}`;
    const qrImage = await generateQRDataUrl(qrUrl, JSON.parse(qr.style_config || '{}'));

    const redirectHistory = await db.all(`
      SELECT * FROM redirects WHERE qr_id = ? ORDER BY activated_at DESC
    `, qr.id);

    const rules = await db.all(`
      SELECT * FROM rules WHERE qr_id = ? ORDER BY priority ASC
    `, qr.id);

    return {
      success: true,
      data: {
        ...qr, tags: JSON.parse(qr.tags || '[]'), style_config: JSON.parse(qr.style_config || '{}'),
        qrUrl, qrImage, redirectHistory, rules,
      },
    };
  });

  // ─── Update QR Code ────────────────────────────
  fastify.patch('/api/qr/:id', { preHandler: [authGuard], schema: schemas.updateQR }, async (request, reply) => {
    const db = getDb();
    const qr = await db.get('SELECT * FROM qr_codes WHERE id = ? AND org_id = ?', request.params.id, request.user.orgId);
    if (!qr) return reply.status(404).send({ error: 'QR code not found' });

    const updates = request.body;
    const sets = [];
    const params = [];

    if (updates.label !== undefined) { sets.push('label = ?'); params.push(updates.label); }
    if (updates.tags !== undefined) { sets.push('tags = ?'); params.push(JSON.stringify(updates.tags)); }
    if (updates.folderId !== undefined) { sets.push('folder_id = ?'); params.push(updates.folderId); }
    if (updates.isActive !== undefined) { sets.push('is_active = ?'); params.push(updates.isActive ? 1 : 0); }
    if (updates.scanLimit !== undefined) { sets.push('scan_limit = ?'); params.push(updates.scanLimit); }
    if (updates.expiresAt !== undefined) { sets.push('expires_at = ?'); params.push(updates.expiresAt); }
    if (updates.fallbackUrl !== undefined) { sets.push('fallback_url = ?'); params.push(updates.fallbackUrl); }

    if (sets.length > 0) {
      sets.push("updated_at = NOW()");
      await db.run(`UPDATE qr_codes SET ${sets.join(', ')} WHERE id = ?`, ...params, qr.id);
      cache.invalidateRedirect(qr.short_code);
    }

    return { success: true, message: 'QR code updated.' };
  });

  // ─── Delete QR Code ────────────────────────────
  fastify.delete('/api/qr/:id', { preHandler: [authGuard] }, async (request, reply) => {
    const db = getDb();
    const qr = await db.get('SELECT * FROM qr_codes WHERE id = ? AND org_id = ?', request.params.id, request.user.orgId);
    if (!qr) return reply.status(404).send({ error: 'QR code not found' });

    await db.run('DELETE FROM qr_codes WHERE id = ?', qr.id);
    cache.invalidateRedirect(qr.short_code);
    return { success: true, message: 'QR code deleted.' };
  });

  // ─── Set New Redirect ──────────────────────────
  fastify.post('/api/qr/:id/redirect', { preHandler: [authGuard], schema: schemas.setRedirect }, async (request, reply) => {
    const db = getDb();
    const qr = await db.get('SELECT * FROM qr_codes WHERE id = ? AND org_id = ?', request.params.id, request.user.orgId);
    if (!qr) return reply.status(404).send({ error: 'QR code not found' });

    const { destinationUrl, notes } = request.body;
    const redirectId = uuidv4();

    await db.transaction(async (tx) => {
      await tx.run("UPDATE redirects SET is_current = 0, deactivated_at = NOW() WHERE qr_id = ? AND is_current = 1", qr.id);
      await tx.run('INSERT INTO redirects (id, qr_id, destination_url, is_current, created_by, notes) VALUES (?, ?, ?, 1, ?, ?)',
        redirectId, qr.id, destinationUrl, request.user.id, notes || null);
    });

    cache.invalidateRedirect(qr.short_code);
    return reply.status(201).send({ success: true, data: { id: redirectId, destinationUrl, notes } });
  });

  // ─── Get QR Image ─────────────────────────────
  fastify.get('/api/qr/:id/image', { preHandler: [authGuard] }, async (request, reply) => {
    const db = getDb();
    const qr = await db.get('SELECT short_code, style_config FROM qr_codes WHERE id = ? AND org_id = ?', request.params.id, request.user.orgId);
    if (!qr) return reply.status(404).send({ error: 'QR code not found' });

    const fmt = request.query.fmt || 'png';
    const qrUrl = `${config.BASE_URL}/r/${qr.short_code}`;
    const style = JSON.parse(qr.style_config || '{}');

    if (fmt === 'svg') {
      const svg = await generateQRSvg(qrUrl, style);
      return reply.type('image/svg+xml').send(svg);
    }
    const buffer = await generateQRBuffer(qrUrl, style);
    return reply.type('image/png').send(buffer);
  });

  // ─── Analytics for QR ──────────────────────────
  fastify.get('/api/qr/:id/analytics', { preHandler: [authGuard] }, async (request, reply) => {
    const db = getDb();
    const qr = await db.get('SELECT id FROM qr_codes WHERE id = ? AND org_id = ?', request.params.id, request.user.orgId);
    if (!qr) return reply.status(404).send({ error: 'QR code not found' });

    const { getQRAnalytics } = await import('../services/analytics-service.js');
    const { period = '30d', groupBy = 'day' } = request.query;
    const analytics = await getQRAnalytics(qr.id, { period, groupBy });
    return { success: true, data: analytics };
  });
}
