/**
 * QRForge — Demo Data Generator
 * 
 * Generates realistic scan events to populate the analytics dashboard
 * for prototype demonstrations.
 */
import Database from 'better-sqlite3';
import { v4 as uuidv4 } from 'uuid';
import { createHash } from 'crypto';

const db = new Database('./data/qrforge.db');

// Get the existing QR code
const qr = db.prepare('SELECT id, short_code FROM qr_codes LIMIT 1').get();
const redirect = db.prepare('SELECT id FROM redirects WHERE qr_id = ? AND is_current = 1').get(qr.id);

if (!qr || !redirect) {
  console.error('No QR code found. Create one first.');
  process.exit(1);
}

console.log(`📊 Generating demo scan data for QR: ${qr.short_code} (${qr.id})`);

// Realistic data pools
const countries = [
  { code: 'US', weight: 30, cities: ['New York', 'Los Angeles', 'Chicago', 'Houston', 'Phoenix'] },
  { code: 'IN', weight: 20, cities: ['Mumbai', 'Delhi', 'Bangalore', 'Hyderabad', 'Chennai'] },
  { code: 'GB', weight: 10, cities: ['London', 'Manchester', 'Birmingham', 'Leeds', 'Glasgow'] },
  { code: 'DE', weight: 8, cities: ['Berlin', 'Munich', 'Hamburg', 'Frankfurt', 'Cologne'] },
  { code: 'FR', weight: 7, cities: ['Paris', 'Lyon', 'Marseille', 'Toulouse', 'Nice'] },
  { code: 'CA', weight: 6, cities: ['Toronto', 'Vancouver', 'Montreal', 'Calgary', 'Ottawa'] },
  { code: 'AU', weight: 5, cities: ['Sydney', 'Melbourne', 'Brisbane', 'Perth', 'Adelaide'] },
  { code: 'JP', weight: 5, cities: ['Tokyo', 'Osaka', 'Yokohama', 'Nagoya', 'Sapporo'] },
  { code: 'BR', weight: 4, cities: ['São Paulo', 'Rio de Janeiro', 'Brasília', 'Salvador'] },
  { code: 'MX', weight: 3, cities: ['Mexico City', 'Guadalajara', 'Monterrey', 'Puebla'] },
  { code: 'ES', weight: 2, cities: ['Madrid', 'Barcelona', 'Valencia', 'Seville'] },
];

const devices = [
  { type: 'mobile', weight: 65, os: ['iOS 17', 'iOS 18', 'Android 14', 'Android 15'], browsers: ['Safari 17', 'Chrome Mobile 125', 'Samsung Browser 25'] },
  { type: 'desktop', weight: 25, os: ['Windows 11', 'macOS 14', 'macOS 15', 'Linux'], browsers: ['Chrome 125', 'Firefox 127', 'Safari 17', 'Edge 125'] },
  { type: 'tablet', weight: 10, os: ['iPadOS 17', 'iPadOS 18', 'Android 14'], browsers: ['Safari 17', 'Chrome 125'] },
];

function weightedRandom(items) {
  const totalWeight = items.reduce((sum, item) => sum + item.weight, 0);
  let random = Math.random() * totalWeight;
  for (const item of items) {
    random -= item.weight;
    if (random <= 0) return item;
  }
  return items[0];
}

function randomFrom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function hashIP(ip) {
  return createHash('sha256').update(ip + 'qrforge-dev-secret-key-2025-change-in-production').digest('hex');
}

// Generate scans over the last 30 days
const now = new Date();
const scansToGenerate = 500;
const ipPool = Array.from({ length: 150 }, (_, i) => `203.0.113.${i + 1}`);

const insert = db.prepare(`
  INSERT INTO scan_events (id, qr_id, redirect_id, destination_url, scanned_at,
    ip_hash, country, region, city, device_type, os, browser,
    referrer, is_unique, user_agent, latitude, longitude)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`);

const seenIPs = new Set();
let totalInserted = 0;

const transaction = db.transaction(() => {
  for (let i = 0; i < scansToGenerate; i++) {
    // Random time within last 30 days, weighted towards recent
    const daysAgo = Math.floor(Math.pow(Math.random(), 1.5) * 30);
    const hoursOffset = Math.floor(Math.random() * 24);
    const minutesOffset = Math.floor(Math.random() * 60);
    
    const scanTime = new Date(now);
    scanTime.setDate(scanTime.getDate() - daysAgo);
    scanTime.setHours(hoursOffset, minutesOffset, Math.floor(Math.random() * 60));

    const country = weightedRandom(countries);
    const device = weightedRandom(devices);
    const ip = randomFrom(ipPool);
    const ipKey = `${hashIP(ip)}:${qr.id}:${scanTime.toISOString().split('T')[0]}`;
    const isUnique = !seenIPs.has(ipKey);
    seenIPs.add(ipKey);

    const city = randomFrom(country.cities);
    const os = randomFrom(device.os);
    const browser = randomFrom(device.browsers);

    insert.run(
      uuidv4(),
      qr.id,
      redirect.id,
      'https://github.com',
      scanTime.toISOString().replace('T', ' ').slice(0, 19),
      hashIP(ip),
      country.code,
      '',
      city,
      device.type,
      os,
      browser,
      Math.random() > 0.7 ? 'https://google.com' : null,
      isUnique ? 1 : 0,
      `Mozilla/5.0 (${os}) QRForge-Demo`,
      null,
      null
    );
    totalInserted++;
  }

  // Update total scans count
  db.prepare('UPDATE qr_codes SET total_scans = ? WHERE id = ?').run(totalInserted, qr.id);
});

transaction();

console.log(`✅ Generated ${totalInserted} scan events`);
console.log(`   Unique IPs: ${seenIPs.size}`);
console.log(`   Countries: ${countries.length}`);
console.log(`   Date range: last 30 days`);

db.close();
