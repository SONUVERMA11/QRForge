/**
 * QRForge — Redirect Engine
 * 
 * The brain of QRForge. This service:
 * 1. Looks up the QR code by short code (cache → DB)
 * 2. Evaluates smart redirect rules against the request context
 * 3. Determines the final destination URL
 * 4. Returns the redirect target
 * 
 * This is the HOT PATH — every millisecond matters.
 */

import { getDb } from '../db/connection.js';
import { cache } from './cache-service.js';

/**
 * Resolve the redirect destination for a given short code.
 * 
 * @param {string} shortCode - The QR short code
 * @param {Object} context - Request context for rule evaluation
 * @param {string} context.country - Geo country code
 * @param {string} context.region - Geo region
 * @param {string} context.deviceType - mobile/tablet/desktop
 * @param {string} context.ip - Client IP
 * @returns {Object|null} Redirect result or null if not found
 */
export function resolveRedirect(shortCode, context = {}) {
  // Step 1: Check cache
  const cached = cache.get(`redirect:${shortCode}`);
  if (cached) {
    // Still need to evaluate rules with current context
    return evaluateRules(cached, context);
  }

  // Step 2: Cache miss → database lookup
  const db = getDb();

  const qr = db.prepare(`
    SELECT q.id, q.short_code, q.is_active, q.scan_limit, q.total_scans,
           q.expires_at, q.fallback_url, q.password_hash, q.org_id,
           r.id as redirect_id, r.destination_url
    FROM qr_codes q
    LEFT JOIN redirects r ON r.qr_id = q.id AND r.is_current = 1
    WHERE q.short_code = ?
  `).get(shortCode);

  if (!qr) return null;

  // Step 3: Check if QR is valid
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

  // Step 4: Fetch rules for this QR
  const rules = db.prepare(`
    SELECT * FROM rules
    WHERE qr_id = ? AND is_active = 1
    ORDER BY priority ASC
  `).all(qr.id);

  // Step 5: Cache the QR data + rules
  const cacheData = {
    qrId: qr.id,
    shortCode: qr.short_code,
    orgId: qr.org_id,
    redirectId: qr.redirect_id,
    defaultUrl: qr.destination_url,
    fallbackUrl: qr.fallback_url,
    rules,
  };

  cache.set(`redirect:${shortCode}`, cacheData, 300); // 5 min TTL

  // Step 6: Evaluate rules
  return evaluateRules(cacheData, context);
}

/**
 * Evaluate redirect rules against the current request context.
 * Rules are evaluated in priority order — first match wins.
 * 
 * @param {Object} data - Cached QR + rules data
 * @param {Object} context - Request context
 * @returns {Object} Redirect result
 */
function evaluateRules(data, context) {
  const { rules, defaultUrl, qrId, redirectId, fallbackUrl } = data;

  // Evaluate each rule in priority order
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

  // No rule matched — use default redirect
  if (defaultUrl) {
    return {
      status: 'redirect',
      destinationUrl: defaultUrl,
      qrId,
      redirectId,
    };
  }

  // No destination at all
  return {
    status: 'no_destination',
    fallbackUrl,
    qrId,
  };
}

/**
 * Evaluate a single rule condition against the request context.
 * 
 * @param {Object} rule - Rule to evaluate
 * @param {Object} context - Request context
 * @returns {boolean} Whether the rule matches
 */
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
      // { startHour: 17, endHour: 20, timezone: "America/New_York" }
      const now = new Date();
      const hour = now.getHours();
      const start = condValue.startHour ?? 0;
      const end = condValue.endHour ?? 24;
      
      if (start < end) {
        return hour >= start && hour < end;
      } else {
        // Wraps midnight (e.g., 22 to 6)
        return hour >= start || hour < end;
      }
    }

    case 'geo_country': {
      // { countries: ["US", "CA", "MX"] }
      const countries = condValue.countries || [];
      return countries.includes(context.country);
    }

    case 'geo_region': {
      // { regions: ["CA", "NY"] }
      const regions = condValue.regions || [];
      return regions.includes(context.region);
    }

    case 'device_type': {
      // { devices: ["mobile", "tablet"] }
      const devices = condValue.devices || [];
      return devices.includes(context.deviceType);
    }

    case 'scan_count': {
      // { maxScans: 100 }
      const maxScans = condValue.maxScans || Infinity;
      return (context.totalScans || 0) < maxScans;
    }

    case 'scheduled': {
      // { startDate: "2025-06-01", endDate: "2025-06-30" }
      const now = new Date();
      const start = condValue.startDate ? new Date(condValue.startDate) : new Date(0);
      const end = condValue.endDate ? new Date(condValue.endDate) : new Date('2099-12-31');
      return now >= start && now <= end;
    }

    case 'ab_test': {
      // { weight: 50 } → 50% chance
      const weight = condValue.weight ?? 50;
      return Math.random() * 100 < weight;
    }

    default:
      return false;
  }
}

/**
 * Record a scan event asynchronously (non-blocking).
 * This runs AFTER the redirect response is sent.
 * 
 * @param {Object} scanData - Scan event data
 */
export function recordScan(scanData) {
  // Use setImmediate to not block the response
  setImmediate(() => {
    try {
      const db = getDb();

      // Check uniqueness (same IP hash + QR in last 24 hours)
      const recentScan = db.prepare(`
        SELECT id FROM scan_events
        WHERE ip_hash = ? AND qr_id = ?
        AND scanned_at > datetime('now', '-24 hours')
        LIMIT 1
      `).get(scanData.ipHash, scanData.qrId);

      const isUnique = !recentScan;

      // Insert scan event
      db.prepare(`
        INSERT INTO scan_events (id, qr_id, redirect_id, destination_url, scanned_at,
          ip_hash, country, region, city, device_type, os, browser,
          referrer, is_unique, user_agent, latitude, longitude)
        VALUES (?, ?, ?, ?, datetime('now'), ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
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

      // Increment total scan count
      db.prepare(`
        UPDATE qr_codes SET total_scans = total_scans + 1 WHERE id = ?
      `).run(scanData.qrId);

    } catch (err) {
      console.error('Failed to record scan:', err.message);
    }
  });
}

export default { resolveRedirect, recordScan };
