/**
 * QRForge — Analytics Service (PostgreSQL)
 * 
 * Aggregation queries for the analytics dashboard.
 * All date functions use PostgreSQL syntax (NOW(), INTERVAL, TO_CHAR).
 */

import { getDb } from '../db/connection.js';

/**
 * Get scan analytics for a specific QR code.
 */
export async function getQRAnalytics(qrId, options = {}) {
  const db = getDb();
  const { period = '30d', groupBy = 'day' } = options;

  const dateFilter = getDateFilter(period);

  const totalScans = await db.get(`
    SELECT COUNT(*) as count FROM scan_events
    WHERE qr_id = ? ${dateFilter}
  `, qrId);

  const uniqueScans = await db.get(`
    SELECT COUNT(*) as count FROM scan_events
    WHERE qr_id = ? AND is_unique = 1 ${dateFilter}
  `, qrId);

  const timeGrouping = getTimeGrouping(groupBy);
  const scansOverTime = await db.all(`
    SELECT ${timeGrouping} as period, COUNT(*) as count,
           SUM(CASE WHEN is_unique = 1 THEN 1 ELSE 0 END) as unique_count
    FROM scan_events
    WHERE qr_id = ? ${dateFilter}
    GROUP BY period
    ORDER BY period ASC
  `, qrId);

  const deviceBreakdown = await db.all(`
    SELECT device_type, COUNT(*) as count
    FROM scan_events
    WHERE qr_id = ? ${dateFilter}
    GROUP BY device_type
    ORDER BY count DESC
  `, qrId);

  const topCountries = await db.all(`
    SELECT country, COUNT(*) as count
    FROM scan_events
    WHERE qr_id = ? ${dateFilter}
    GROUP BY country
    ORDER BY count DESC
    LIMIT 20
  `, qrId);

  const topCities = await db.all(`
    SELECT city, country, COUNT(*) as count
    FROM scan_events
    WHERE qr_id = ? AND city != '' ${dateFilter}
    GROUP BY city, country
    ORDER BY count DESC
    LIMIT 20
  `, qrId);

  const browserBreakdown = await db.all(`
    SELECT browser, COUNT(*) as count
    FROM scan_events
    WHERE qr_id = ? ${dateFilter}
    GROUP BY browser
    ORDER BY count DESC
    LIMIT 10
  `, qrId);

  const osBreakdown = await db.all(`
    SELECT os, COUNT(*) as count
    FROM scan_events
    WHERE qr_id = ? ${dateFilter}
    GROUP BY os
    ORDER BY count DESC
    LIMIT 10
  `, qrId);

  const recentScans = await db.all(`
    SELECT id, scanned_at, country, city, device_type, os, browser, is_unique
    FROM scan_events
    WHERE qr_id = ?
    ORDER BY scanned_at DESC
    LIMIT 50
  `, qrId);

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
 */
export async function getOrgAnalytics(orgId, period = '30d') {
  const db = getDb();
  const orgDateFilter = getOrgDateFilter(period);

  const totalQRs = await db.get(`
    SELECT COUNT(*) as count FROM qr_codes WHERE org_id = ?
  `, orgId);

  const activeQRs = await db.get(`
    SELECT COUNT(*) as count FROM qr_codes WHERE org_id = ? AND is_active = 1
  `, orgId);

  const totalScans = await db.get(`
    SELECT COUNT(*) as count FROM scan_events se
    JOIN qr_codes q ON q.id = se.qr_id
    WHERE q.org_id = ? ${orgDateFilter}
  `, orgId);

  const uniqueScans = await db.get(`
    SELECT COUNT(*) as count FROM scan_events se
    JOIN qr_codes q ON q.id = se.qr_id
    WHERE q.org_id = ? AND se.is_unique = 1 ${orgDateFilter}
  `, orgId);

  const topQRCodes = await db.all(`
    SELECT q.id, q.label, q.short_code, q.total_scans as scan_count
    FROM qr_codes q
    WHERE q.org_id = ?
    ORDER BY q.total_scans DESC
    LIMIT 10
  `, orgId);

  const scansPerDay = await db.all(`
    SELECT TO_CHAR(se.scanned_at, 'YYYY-MM-DD') as period, COUNT(*) as count
    FROM scan_events se
    JOIN qr_codes q ON q.id = se.qr_id
    WHERE q.org_id = ? AND se.scanned_at > NOW() - INTERVAL '30 days'
    GROUP BY period
    ORDER BY period ASC
  `, orgId);

  const deviceBreakdown = await db.all(`
    SELECT se.device_type, COUNT(*) as count
    FROM scan_events se
    JOIN qr_codes q ON q.id = se.qr_id
    WHERE q.org_id = ? ${orgDateFilter}
    GROUP BY se.device_type
    ORDER BY count DESC
  `, orgId);

  const countryBreakdown = await db.all(`
    SELECT se.country, COUNT(*) as count
    FROM scan_events se
    JOIN qr_codes q ON q.id = se.qr_id
    WHERE q.org_id = ? ${orgDateFilter}
    GROUP BY se.country
    ORDER BY count DESC
    LIMIT 10
  `, orgId);

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

// ─── PostgreSQL date filters ──────────────────────────

function getDateFilter(period) {
  switch (period) {
    case '24h': return "AND scanned_at > NOW() - INTERVAL '24 hours'";
    case '7d':  return "AND scanned_at > NOW() - INTERVAL '7 days'";
    case '30d': return "AND scanned_at > NOW() - INTERVAL '30 days'";
    case '90d': return "AND scanned_at > NOW() - INTERVAL '90 days'";
    case '1y':  return "AND scanned_at > NOW() - INTERVAL '1 year'";
    case 'all': return '';
    default:    return "AND scanned_at > NOW() - INTERVAL '30 days'";
  }
}

function getOrgDateFilter(period) {
  switch (period) {
    case '24h': return "AND se.scanned_at > NOW() - INTERVAL '24 hours'";
    case '7d':  return "AND se.scanned_at > NOW() - INTERVAL '7 days'";
    case '30d': return "AND se.scanned_at > NOW() - INTERVAL '30 days'";
    case '90d': return "AND se.scanned_at > NOW() - INTERVAL '90 days'";
    case '1y':  return "AND se.scanned_at > NOW() - INTERVAL '1 year'";
    case 'all': return '';
    default:    return "AND se.scanned_at > NOW() - INTERVAL '30 days'";
  }
}

function getTimeGrouping(groupBy) {
  switch (groupBy) {
    case 'hour':  return "TO_CHAR(scanned_at, 'YYYY-MM-DD HH24:00')";
    case 'day':   return "TO_CHAR(scanned_at, 'YYYY-MM-DD')";
    case 'week':  return "TO_CHAR(scanned_at, 'IYYY-\"W\"IW')";
    case 'month': return "TO_CHAR(scanned_at, 'YYYY-MM')";
    default:      return "TO_CHAR(scanned_at, 'YYYY-MM-DD')";
  }
}

export default { getQRAnalytics, getOrgAnalytics };
