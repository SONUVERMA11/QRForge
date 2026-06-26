/**
 * QRForge — Redirect Route (HOT PATH)
 * GET /r/:short_code → p99 < 10ms target
 * 
 * Fastify 5 redirect API: reply.code(302).redirect(url)
 */
import { v4 as uuidv4 } from 'uuid';
import { UAParser } from 'ua-parser-js';
import { resolveRedirect, recordScan } from '../services/redirect-engine.js';
import { lookupGeo } from '../services/geo-service.js';
import { hashIP } from '../utils/crypto.js';
import { isValidShortCode } from '../utils/short-code.js';

export default async function redirectRoute(fastify) {
  fastify.get('/r/:shortCode', async (request, reply) => {
    const { shortCode } = request.params;
    if (!isValidShortCode(shortCode)) {
      return reply.status(404).send({ error: 'Not found' });
    }

    const clientIp = request.headers['x-forwarded-for']?.split(',')[0]?.trim() || request.ip;
    const geo = lookupGeo(clientIp);
    const userAgent = request.headers['user-agent'] || '';
    
    let deviceInfo = { deviceType: 'unknown', os: 'Unknown', browser: 'Unknown' };
    try {
      const parser = new UAParser(userAgent);
      const r = parser.getResult();
      const d = r.device?.type;
      deviceInfo = {
        deviceType: d === 'mobile' ? 'mobile' : d === 'tablet' ? 'tablet' : r.browser?.name ? 'desktop' : 'unknown',
        os: r.os?.name ? `${r.os.name} ${r.os.version || ''}`.trim() : 'Unknown',
        browser: r.browser?.name ? `${r.browser.name} ${r.browser.version || ''}`.trim() : 'Unknown',
      };
    } catch {}

    const result = resolveRedirect(shortCode, {
      country: geo.country, region: geo.region, deviceType: deviceInfo.deviceType, ip: clientIp,
    });

    if (!result) return reply.status(404).send({ error: 'QR code not found' });

    // Fastify 5: redirect(url) — set code separately
    if (result.status === 'inactive' || result.status === 'expired' || result.status === 'limit_reached') {
      return result.fallbackUrl
        ? reply.code(302).redirect(result.fallbackUrl)
        : reply.status(410).send({ error: result.status });
    }
    if (result.status === 'password_required') {
      return reply.code(302).redirect(`/verify/${shortCode}`);
    }
    if (result.status === 'no_destination') {
      return result.fallbackUrl
        ? reply.code(302).redirect(result.fallbackUrl)
        : reply.status(404).send({ error: 'No destination' });
    }
    if (result.status === 'redirect') {
      // Record scan AFTER sending response (non-blocking)
      recordScan({
        id: uuidv4(), qrId: result.qrId, redirectId: result.redirectId,
        destinationUrl: result.destinationUrl, ipHash: hashIP(clientIp),
        country: geo.country, region: geo.region, city: geo.city,
        deviceType: deviceInfo.deviceType, os: deviceInfo.os, browser: deviceInfo.browser,
        referrer: request.headers.referer || null, userAgent,
        latitude: geo.latitude, longitude: geo.longitude,
      });
      // Prevent mobile browsers from caching the redirect so it's always dynamic
      reply.header('Cache-Control', 'no-cache, no-store, must-revalidate, max-age=0');
      reply.header('Pragma', 'no-cache');
      reply.header('Expires', '0');
      
      return reply.code(302).redirect(result.destinationUrl);
    }
    return reply.status(500).send({ error: 'Internal error' });
  });
}
