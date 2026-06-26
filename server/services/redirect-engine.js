/**
 * QRForge — Redirect Engine (PostgreSQL)
 * 
 * The brain of QRForge. Cache-first lookup → DB fallback → rule evaluation.
 * This is the HOT PATH — every millisecond matters.
 */

import { getDb } from '../db/connection.js';
import { cache } from './cache-service.js';

/**
 * Resolve redirect destination. Now async for PostgreSQL.
 */
export async function resolveRedirect(shortCode, context = {}) {
  // Step 1: Check cache
  const cached = cache.get(`redirect:${shortCode}`);
  if (cached) {
    return evaluateRules(cached, context);
  }

  // Step 2: Cache miss → database lookup
  const db = getDb();

  const qr = await db.get(`
    SELECT q.id, q.short_code, q.is_active, q.scan_limit, q.total_scans,
           q.expires_at, q.fallback_url, q.password_hash, q.org_id,
           r.id as redirect_id, r.destination_url
    FROM qr_codes q
    LEFT JOIN redirects r ON r.qr_id = q.id AND r.is_current = 1
    WHERE q.short_code = ?
  `, shortCode);

  if (!qr) return null;

  if (!qr.is_active) {
    return { status: 'inactive', fallbackUrl: qr.fallback_url };
  }

  if (qr.expires_at && new Date(qr.expires_at) < new Date()) {
    return { status: 'expired', fallbackUrl: qr.fallback_url };
  }

  if (qr.scan_limit && qr.total_scans >= qr.scan_limit) {
    return { status: 'limit_reached', fallbackUrl: qr.fallback_url };
  }

  if (qr.password_hash) {
    return { status: 'password_required', qrId: qr.id, redirectId: qr.redirect_id };
  }

  // Fetch rules
  const rules = await db.all(`
    SELECT * FROM rules
    WHERE qr_id = ? AND is_active = 1
    ORDER BY priority ASC
  `, qr.id);

  // Cache
  const cacheData = {
    qrId: qr.id,
    shortCode: qr.short_code,
    orgId: qr.org_id,
    redirectId: qr.redirect_id,
    defaultUrl: qr.destination_url,
    fallbackUrl: qr.fallback_url,
    rules,
  };

  cache.set(`redirect:${shortCode}`, cacheData, 300);

  return evaluateRules(cacheData, context);
}

function evaluateRules(data, context) {
  const { rules, defaultUrl, qrId, redirectId, fallbackUrl } = data;

  for (const rule of rules) {
    const match = evaluateCondition(rule, context);
    if (match) {
      return {
        status: 'redirect',
        destinationUrl: rule.destination_url,
        qrId,
        redirectId,
        ruleId: rule.id,
        ruleLabel: rule.label,
      };
    }
  }

  if (defaultUrl) {
    return {
      status: 'redirect',
      destinationUrl: defaultUrl,
      qrId,
      redirectId,
    };
  }

  return {
    status: 'no_destination',
    fallbackUrl,
    qrId,
  };
}

function evaluateCondition(rule, context) {
  let condValue;
  try {
    condValue = typeof rule.condition_value === 'string'
      ? JSON.parse(rule.condition_value)
      : rule.condition_value;
  } catch {
    return false;
  }

  switch (rule.condition_type) {
    case 'always':
      return true;
    case 'time_window': {
      const now = new Date();
      const hour = now.getHours();
      const start = condValue.startHour ?? 0;
      const end = condValue.endHour ?? 24;
      if (start < end) return hour >= start && hour < end;
      return hour >= start || hour < end;
    }
    case 'geo_country':
      return (condValue.countries || []).includes(context.country);
    case 'geo_region':
      return (condValue.regions || []).includes(context.region);
    case 'device_type':
      return (condValue.devices || []).includes(context.deviceType);
    case 'scan_count':
      return (context.totalScans || 0) < (condValue.maxScans || Infinity);
    case 'scheduled': {
      const now = new Date();
      const start = condValue.startDate ? new Date(condValue.startDate) : new Date(0);
      const end = condValue.endDate ? new Date(condValue.endDate) : new Date('2099-12-31');
      return now >= start && now <= end;
    }
    case 'ab_test':
      return Math.random() * 100 < (condValue.weight ?? 50);
    default:
      return false;
  }
}

/**
 * Record a scan event asynchronously (non-blocking).
 */
export function recordScan(scanData) {
  setImmediate(async () => {
    try {
      const db = getDb();

      const recentScan = await db.get(`
        SELECT id FROM scan_events
        WHERE ip_hash = ? AND qr_id = ?
        AND scanned_at > NOW() - INTERVAL '24 hours'
        LIMIT 1
      `, scanData.ipHash, scanData.qrId);

      const isUnique = !recentScan;

      await db.run(`
        INSERT INTO scan_events (id, qr_id, redirect_id, destination_url, scanned_at,
          ip_hash, country, region, city, device_type, os, browser,
          referrer, is_unique, user_agent, latitude, longitude)
        VALUES (?, ?, ?, ?, NOW(), ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
        scanData.id,
        scanData.qrId,
        scanData.redirectId || null,
        scanData.destinationUrl || null,
        scanData.ipHash,
        scanData.country || 'Unknown',
        scanData.region || '',
        scanData.city || '',
        scanData.deviceType || 'unknown',
        scanData.os || '',
        scanData.browser || '',
        scanData.referrer || null,
        isUnique ? 1 : 0,
        scanData.userAgent || null,
        scanData.latitude || null,
        scanData.longitude || null
      );

      await db.run(`
        UPDATE qr_codes SET total_scans = total_scans + 1 WHERE id = ?
      `, scanData.qrId);

    } catch (err) {
      console.error('Failed to record scan:', err.message);
    }
  });
}

export default { resolveRedirect, recordScan };
