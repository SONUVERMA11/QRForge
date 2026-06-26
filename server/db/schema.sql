-- QRForge Database Schema
-- SQLite-compatible, designed for easy PostgreSQL migration

-- Enable WAL mode for better concurrent read performance
PRAGMA journal_mode=WAL;
PRAGMA foreign_keys=ON;

------------------------------------------------------------
-- Organizations
------------------------------------------------------------
CREATE TABLE IF NOT EXISTS organizations (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  plan TEXT NOT NULL DEFAULT 'free' CHECK(plan IN ('free', 'starter', 'pro', 'enterprise')),
  qr_limit INTEGER NOT NULL DEFAULT 5,
  scan_limit_monthly INTEGER NOT NULL DEFAULT 500,
  custom_domain TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

------------------------------------------------------------
-- Users
------------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  name TEXT NOT NULL DEFAULT '',
  role TEXT NOT NULL DEFAULT 'owner' CHECK(role IN ('owner', 'admin', 'editor', 'viewer')),
  avatar_url TEXT,
  two_factor_enabled INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_org ON users(org_id);

------------------------------------------------------------
-- Folders (hierarchical organization)
------------------------------------------------------------
CREATE TABLE IF NOT EXISTS folders (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  parent_id TEXT REFERENCES folders(id) ON DELETE CASCADE,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_folders_org ON folders(org_id);

------------------------------------------------------------
-- QR Codes
------------------------------------------------------------
CREATE TABLE IF NOT EXISTS qr_codes (
  id TEXT PRIMARY KEY,
  short_code TEXT NOT NULL UNIQUE,
  owner_id TEXT NOT NULL REFERENCES users(id),
  org_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  label TEXT NOT NULL DEFAULT 'Untitled QR',
  is_active INTEGER NOT NULL DEFAULT 1,
  scan_limit INTEGER,
  total_scans INTEGER NOT NULL DEFAULT 0,
  expires_at TEXT,
  tags TEXT DEFAULT '[]',  -- JSON array stored as text
  folder_id TEXT REFERENCES folders(id) ON DELETE SET NULL,
  fallback_url TEXT,
  password_hash TEXT,  -- For password-protected QR codes
  style_config TEXT DEFAULT '{}',  -- JSON for QR design settings
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_qr_short_code ON qr_codes(short_code);
CREATE INDEX IF NOT EXISTS idx_qr_owner ON qr_codes(owner_id);
CREATE INDEX IF NOT EXISTS idx_qr_org ON qr_codes(org_id);
CREATE INDEX IF NOT EXISTS idx_qr_folder ON qr_codes(folder_id);
CREATE INDEX IF NOT EXISTS idx_qr_active ON qr_codes(is_active);
CREATE INDEX IF NOT EXISTS idx_qr_created ON qr_codes(created_at);

------------------------------------------------------------
-- Redirects (destination URL history)
------------------------------------------------------------
CREATE TABLE IF NOT EXISTS redirects (
  id TEXT PRIMARY KEY,
  qr_id TEXT NOT NULL REFERENCES qr_codes(id) ON DELETE CASCADE,
  destination_url TEXT NOT NULL,
  is_current INTEGER NOT NULL DEFAULT 0,
  activated_at TEXT NOT NULL DEFAULT (datetime('now')),
  deactivated_at TEXT,
  created_by TEXT NOT NULL REFERENCES users(id),
  notes TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_redirects_qr ON redirects(qr_id);
CREATE INDEX IF NOT EXISTS idx_redirects_current ON redirects(qr_id, is_current);

------------------------------------------------------------
-- Smart Redirect Rules
------------------------------------------------------------
CREATE TABLE IF NOT EXISTS rules (
  id TEXT PRIMARY KEY,
  qr_id TEXT NOT NULL REFERENCES qr_codes(id) ON DELETE CASCADE,
  priority INTEGER NOT NULL DEFAULT 100,
  condition_type TEXT NOT NULL CHECK(condition_type IN (
    'time_window', 'geo_country', 'geo_region', 'device_type',
    'scan_count', 'scheduled', 'ab_test', 'always'
  )),
  condition_value TEXT NOT NULL DEFAULT '{}',  -- JSON payload
  destination_url TEXT NOT NULL,
  label TEXT NOT NULL DEFAULT '',
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_rules_qr ON rules(qr_id);
CREATE INDEX IF NOT EXISTS idx_rules_priority ON rules(qr_id, priority);

------------------------------------------------------------
-- Scan Events (analytics)
------------------------------------------------------------
CREATE TABLE IF NOT EXISTS scan_events (
  id TEXT PRIMARY KEY,
  qr_id TEXT NOT NULL REFERENCES qr_codes(id) ON DELETE CASCADE,
  redirect_id TEXT REFERENCES redirects(id),
  destination_url TEXT,
  scanned_at TEXT NOT NULL DEFAULT (datetime('now')),
  ip_hash TEXT,
  country TEXT DEFAULT 'Unknown',
  region TEXT DEFAULT '',
  city TEXT DEFAULT '',
  device_type TEXT DEFAULT 'unknown' CHECK(device_type IN ('mobile', 'tablet', 'desktop', 'unknown')),
  os TEXT DEFAULT '',
  browser TEXT DEFAULT '',
  referrer TEXT,
  is_unique INTEGER NOT NULL DEFAULT 1,
  user_agent TEXT,
  latitude REAL,
  longitude REAL
);

CREATE INDEX IF NOT EXISTS idx_scans_qr ON scan_events(qr_id);
CREATE INDEX IF NOT EXISTS idx_scans_time ON scan_events(scanned_at);
CREATE INDEX IF NOT EXISTS idx_scans_qr_time ON scan_events(qr_id, scanned_at);
CREATE INDEX IF NOT EXISTS idx_scans_country ON scan_events(country);
CREATE INDEX IF NOT EXISTS idx_scans_device ON scan_events(device_type);
CREATE INDEX IF NOT EXISTS idx_scans_ip ON scan_events(ip_hash, qr_id);

------------------------------------------------------------
-- Campaigns
------------------------------------------------------------
CREATE TABLE IF NOT EXISTS campaigns (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT DEFAULT '',
  start_date TEXT,
  end_date TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_campaigns_org ON campaigns(org_id);

------------------------------------------------------------
-- Campaign-QR linking (many-to-many)
------------------------------------------------------------
CREATE TABLE IF NOT EXISTS campaign_qr_codes (
  campaign_id TEXT NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  qr_id TEXT NOT NULL REFERENCES qr_codes(id) ON DELETE CASCADE,
  PRIMARY KEY (campaign_id, qr_id)
);

------------------------------------------------------------
-- Webhooks
------------------------------------------------------------
CREATE TABLE IF NOT EXISTS webhooks (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  events TEXT NOT NULL DEFAULT '["scan"]',  -- JSON array of event types
  secret TEXT,  -- HMAC signing secret
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_webhooks_org ON webhooks(org_id);

------------------------------------------------------------
-- API Keys
------------------------------------------------------------
CREATE TABLE IF NOT EXISTS api_keys (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  key_hash TEXT NOT NULL,
  key_prefix TEXT NOT NULL,  -- First 8 chars for display
  scope TEXT NOT NULL DEFAULT 'read' CHECK(scope IN ('read', 'read_write', 'admin')),
  last_used_at TEXT,
  expires_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_apikeys_org ON api_keys(org_id);
CREATE INDEX IF NOT EXISTS idx_apikeys_hash ON api_keys(key_hash);

------------------------------------------------------------
-- Audit Log
------------------------------------------------------------
CREATE TABLE IF NOT EXISTS audit_logs (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  action TEXT NOT NULL,
  resource_type TEXT NOT NULL,
  resource_id TEXT,
  details TEXT DEFAULT '{}',
  ip_address TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_audit_org ON audit_logs(org_id);
CREATE INDEX IF NOT EXISTS idx_audit_time ON audit_logs(created_at);
