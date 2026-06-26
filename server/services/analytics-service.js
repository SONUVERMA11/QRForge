/**
 * QRForge — Analytics Service
 * 
 * Aggregation queries for the analytics dashboard.
 * All queries use indexed columns for optimal performance.
 */

import { getDb } from '../db/connection.js';

/**
 * Get scan analytics for a specific QR code.
 * @param {string} qrId - QR code ID
 * @param {Object} options - Query options
 * @param {string} options.period - Time period: '24h', '7d', '30d', '90d', '1y', 'all'
 * @param {string} options.groupBy - Group by: 'hour', 'day', 'week', 'month'
 * @returns {Object} Analytics data
 */
export function getQRAnalytics(qrId, options = {}) {
  const db = getDb();
  const { period = '30d', groupBy = 'day' } = options;

  const dateFilter = getDateFilter(period);

  // Total scans
  const totalScans = db.prepare(`
    SELECT COUNT(*) as count FROM scan_events
    WHERE qr_id = ? ${dateFilter}
  `).get(qrId);

  // Unique scans
  const uniqueScans = db.prepare(`
    SELECT COUNT(*) as count FROM scan_events
    WHERE qr_id = ? AND is_unique = 1 ${dateFilter}
  `).get(qrId);

  // Scans over time
  const timeGrouping = getTimeGrouping(groupBy);
  const scansOverTime = db.prepare(`
    SELECT ${timeGrouping} as period, COUNT(*) as count,
           SUM(CASE WHEN is_unique = 1 THEN 1 ELSE 0 END) as unique_count
    FROM scan_events
    WHERE qr_id = ? ${dateFilter}
    GROUP BY period
    ORDER BY period ASC
  `).all(qrId);

  // Device breakdown
  const deviceBreakdown = db.prepare(`
    SELECT device_type, COUNT(*) as count
    FROM scan_events
    WHERE qr_id = ? ${dateFilter}
    GROUP BY device_type
    ORDER BY count DESC
  `).all(qrId);

  // Top countries
  const topCountries = db.prepare(`
    SELECT country, COUNT(*) as count
    FROM scan_events
    WHERE qr_id = ? ${dateFilter}
    GROUP BY country
    ORDER BY count DESC
    LIMIT 20
  `).all(qrId);

  // Top cities
  const topCities = db.prepare(`
    SELECT city, country, COUNT(*) as count
    FROM scan_events
    WHERE qr_id = ? AND city != '' ${dateFilter}
    GROUP BY city, country
    ORDER BY count DESC
    LIMIT 20
  `).all(qrId);

  // Browser breakdown
  const browserBreakdown = db.prepare(`
    SELECT browser, COUNT(*) as count
    FROM scan_events
    WHERE qr_id = ? ${dateFilter}
    GROUP BY browser
    ORDER BY count DESC
    LIMIT 10
  `).all(qrId);

  // OS breakdown
  const osBreakdown = db.prepare(`
    SELECT os, COUNT(*) as count
    FROM scan_events
    WHERE qr_id = ? ${dateFilter}
    GROUP BY os
    ORDER BY count DESC
    LIMIT 10
  `).all(qrId);

  // Recent scans
  const recentScans = db.prepare(`
    SELECT id, scanned_at, country, city, device_type, os, browser, is_unique
    FROM scan_events
    WHERE qr_id = ?
    ORDER BY scanned_at DESC
    LIMIT 50
  `).all(qrId);

  return {
    totalScans: totalScans.count,
    uniqueScans: uniqueScans.count,
    scansOverTime,
    deviceBreakdown,
    topCountries,
    topCities,
    browserBreakdown,
    osBreakdown,
    recentScans,
    period,
  };
}

/**
 * Get organization-wide analytics summary.
 * @param {string} orgId - Organization ID
 * @param {string} period - Time period
 * @returns {Object} Org analytics
 */
export function getOrgAnalytics(orgId, period = '30d') {
  const db = getDb();
  const orgDateFilter = getOrgDateFilter(period);

  // Total QR codes
  const totalQRs = db.prepare(`
    SELECT COUNT(*) as count FROM qr_codes WHERE org_id = ?
  `).get(orgId);

  // Active QR codes
  const activeQRs = db.prepare(`
    SELECT COUNT(*) as count FROM qr_codes WHERE org_id = ? AND is_active = 1
  `).get(orgId);

  // Total scans this period
  const totalScans = db.prepare(`
    SELECT COUNT(*) as count FROM scan_events se
    JOIN qr_codes q ON q.id = se.qr_id
    WHERE q.org_id = ? ${orgDateFilter}
  `).get(orgId);

  // Unique scans this period
  const uniqueScans = db.prepare(`
    SELECT COUNT(*) as count FROM scan_events se
    JOIN qr_codes q ON q.id = se.qr_id
    WHERE q.org_id = ? AND se.is_unique = 1 ${orgDateFilter}
  `).get(orgId);

  // Top performing QR codes
  const topQRCodes = db.prepare(`
    SELECT q.id, q.label, q.short_code, q.total_scans as scan_count
    FROM qr_codes q
    WHERE q.org_id = ?
    ORDER BY q.total_scans DESC
    LIMIT 10
  `).all(orgId);

  // Scans per day (last 30 days)
  const scansPerDay = db.prepare(`
    SELECT date(se.scanned_at) as period, COUNT(*) as count
    FROM scan_events se
    JOIN qr_codes q ON q.id = se.qr_id
    WHERE q.org_id = ? AND se.scanned_at > datetime('now', '-30 days')
    GROUP BY period
    ORDER BY period ASC
  `).all(orgId);

  // Device breakdown
  const deviceBreakdown = db.prepare(`
    SELECT se.device_type, COUNT(*) as count
    FROM scan_events se
    JOIN qr_codes q ON q.id = se.qr_id
    WHERE q.org_id = ? ${orgDateFilter}
    GROUP BY se.device_type
    ORDER BY count DESC
  `).all(orgId);

  // Country breakdown
  const countryBreakdown = db.prepare(`
    SELECT se.country, COUNT(*) as count
    FROM scan_events se
    JOIN qr_codes q ON q.id = se.qr_id
    WHERE q.org_id = ? ${orgDateFilter}
    GROUP BY se.country
    ORDER BY count DESC
    LIMIT 10
  `).all(orgId);

  return {
    totalQRCodes: totalQRs.count,
    activeQRCodes: activeQRs.count,
    totalScans: totalScans.count,
    uniqueScans: uniqueScans.count,
    topQRCodes,
    scansPerDay,
    deviceBreakdown,
    countryBreakdown,
    period,
  };
}

/**
 * Get SQL date filter clause based on period string.
 * @param {string} period
 * @returns {string} SQL WHERE clause fragment
 */
function getDateFilter(period) {
  switch (period) {
    case '24h': return "AND scanned_at > datetime('now', '-24 hours')";
    case '7d': return "AND scanned_at > datetime('now', '-7 days')";
    case '30d': return "AND scanned_at > datetime('now', '-30 days')";
    case '90d': return "AND scanned_at > datetime('now', '-90 days')";
    case '1y': return "AND scanned_at > datetime('now', '-1 year')";
    case 'all': return '';
    default: return "AND scanned_at > datetime('now', '-30 days')";
  }
}

/**
 * Org-level date filter using se. alias for JOIN queries.
 */
function getOrgDateFilter(period) {
  switch (period) {
    case '24h': return "AND se.scanned_at > datetime('now', '-24 hours')";
    case '7d': return "AND se.scanned_at > datetime('now', '-7 days')";
    case '30d': return "AND se.scanned_at > datetime('now', '-30 days')";
    case '90d': return "AND se.scanned_at > datetime('now', '-90 days')";
    case '1y': return "AND se.scanned_at > datetime('now', '-1 year')";
    case 'all': return '';
    default: return "AND se.scanned_at > datetime('now', '-30 days')";
  }
}

/**
 * Get SQL time grouping expression.
 * @param {string} groupBy
 * @returns {string} SQL expression
 */
function getTimeGrouping(groupBy) {
  switch (groupBy) {
    case 'hour': return "strftime('%Y-%m-%d %H:00', scanned_at)";
    case 'day': return "date(scanned_at)";
    case 'week': return "strftime('%Y-W%W', scanned_at)";
    case 'month': return "strftime('%Y-%m', scanned_at)";
    default: return "date(scanned_at)";
  }
}

export default { getQRAnalytics, getOrgAnalytics };
