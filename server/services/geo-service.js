/**
 * QRForge — Geo Service
 */
import geoip from 'geoip-lite';
import { UAParser } from 'ua-parser-js';

export function lookupGeo(ip) {
  if (!ip || ip === '127.0.0.1' || ip === '::1' || ip === '::ffff:127.0.0.1') {
    return { country: 'Local', region: '', city: '', latitude: null, longitude: null };
  }
  const cleanIp = ip.replace(/^::ffff:/, '');
  try {
    const geo = geoip.lookup(cleanIp);
    if (!geo) return { country: 'Unknown', region: '', city: '', latitude: null, longitude: null };
    return {
      country: geo.country || 'Unknown',
      region: geo.region || '',
      city: geo.city || '',
      latitude: geo.ll ? geo.ll[0] : null,
      longitude: geo.ll ? geo.ll[1] : null,
    };
  } catch {
    return { country: 'Unknown', region: '', city: '', latitude: null, longitude: null };
  }
}

export function parseDevice(userAgent) {
  const parser = new UAParser(userAgent);
  const result = parser.getResult();
  let deviceType = 'unknown';
  const device = result.device?.type;
  if (device === 'mobile') deviceType = 'mobile';
  else if (device === 'tablet') deviceType = 'tablet';
  else if (result.browser?.name) deviceType = 'desktop';
  return {
    deviceType,
    os: result.os?.name ? `${result.os.name} ${result.os.version || ''}`.trim() : 'Unknown',
    browser: result.browser?.name ? `${result.browser.name} ${result.browser.version || ''}`.trim() : 'Unknown',
  };
}

export default { lookupGeo, parseDevice };
