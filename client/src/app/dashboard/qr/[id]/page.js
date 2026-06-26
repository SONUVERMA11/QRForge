'use client';
import { useState, useEffect, useCallback, use } from 'react';
import api from '@/lib/api';
import Link from 'next/link';
import { ArrowLeft, ExternalLink, Copy, Check, Download, Edit3, Trash2, Link2, QrCode, Scan, Globe, Smartphone, Clock } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell } from 'recharts';
import styles from './qr-detail.module.css';

const COLORS = ['#007AFF', '#5856D6', '#FF9500', '#34C759', '#FF2D55', '#5AC8FA'];

export default function QRDetailPage({ params }) {
  const { id } = use(params);
  const [qr, setQr] = useState(null);
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState('30d');
  const [copied, setCopied] = useState(false);
  const [editingUrl, setEditingUrl] = useState(false);
  const [newUrl, setNewUrl] = useState('');
  const [saving, setSaving] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const [qrRes, analyticsRes] = await Promise.all([
        api.getQR(id),
        api.getQRAnalytics(id, { period }),
      ]);
      setQr(qrRes.data);
      setAnalytics(analyticsRes.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [id, period]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const copyUrl = () => {
    if (qr?.qrUrl) {
      navigator.clipboard.writeText(qr.qrUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const updateRedirect = async () => {
    if (!newUrl.startsWith('http')) return;
    setSaving(true);
    try {
      await api.setRedirect(id, { destinationUrl: newUrl });
      setEditingUrl(false);
      setNewUrl('');
      fetchData();
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const periods = [
    { value: '24h', label: '24H' },
    { value: '7d', label: '7D' },
    { value: '30d', label: '30D' },
    { value: '90d', label: '90D' },
    { value: 'all', label: 'All' },
  ];

  if (loading) {
    return (
      <div>
        <div className="skeleton" style={{ height: 40, width: 200, marginBottom: 24 }} />
        <div className="grid-stats">
          {[1,2,3,4].map(i => <div key={i} className="card"><div className="skeleton" style={{ height: 60 }} /></div>)}
        </div>
      </div>
    );
  }

  if (!qr) return <div className="card"><div className="empty-state"><h3>QR code not found</h3></div></div>;

  return (
    <div className="animate-fade-in">
      <Link href="/dashboard/qr" className="btn btn-ghost btn-sm" style={{ marginBottom: 'var(--space-4)' }}>
        <ArrowLeft size={16} /> Back to QR Codes
      </Link>

      {/* Header */}
      <div className={styles.detailHeader}>
        <div className={styles.headerLeft}>
          <div className={styles.qrImageSmall}>
            <img src={qr.qrImage} alt="QR" />
          </div>
          <div>
            <h1 className={styles.title}>{qr.label}</h1>
            <div className={styles.shortCode}>
              <QrCode size={14} /> {qr.short_code}
              <button onClick={copyUrl} className="btn btn-ghost btn-sm" style={{ padding: '2px 8px' }}>
                {copied ? <Check size={14} /> : <Copy size={14} />}
              </button>
            </div>
          </div>
        </div>
        <div className={styles.headerActions}>
          <button onClick={() => { const l = document.createElement('a'); l.download = `qr-${qr.short_code}.png`; l.href = qr.qrImage; l.click(); }} className="btn btn-secondary btn-sm">
            <Download size={16} /> Download
          </button>
        </div>
      </div>

      {/* Current Destination */}
      <div className={`card ${styles.destCard}`}>
        <div className={styles.destRow}>
          <div>
            <span className={styles.destLabel}>Current Destination</span>
            {!editingUrl && (
              <a href={qr.current_url} target="_blank" rel="noopener" className={styles.destUrl}>
                {qr.current_url} <ExternalLink size={14} />
              </a>
            )}
          </div>
          {!editingUrl && (
            <button onClick={() => { setEditingUrl(true); setNewUrl(qr.current_url || ''); }} className="btn btn-secondary btn-sm">
              <Edit3 size={14} /> Change URL
            </button>
          )}
        </div>
        {editingUrl && (
          <div className={styles.editUrlRow}>
            <input type="url" className="input" placeholder="https://new-url.com" value={newUrl} onChange={e => setNewUrl(e.target.value)} autoFocus />
            <button onClick={updateRedirect} className="btn btn-primary btn-sm" disabled={saving}>
              {saving ? 'Saving...' : 'Save'}
            </button>
            <button onClick={() => setEditingUrl(false)} className="btn btn-ghost btn-sm">Cancel</button>
          </div>
        )}
      </div>

      {/* Period Selector */}
      <div className={styles.periodRow}>
        <h2 className={styles.sectionTitle}>Analytics</h2>
        <div className="tabs">
          {periods.map(p => (
            <button key={p.value} onClick={() => setPeriod(p.value)} className={`tab ${period === p.value ? 'active' : ''}`}>
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* Stats */}
      <div className="grid-stats" style={{ marginBottom: 'var(--space-5)' }}>
        <div className="card stat-card">
          <div className={styles.miniIcon}><Scan size={18} /></div>
          <span className="stat-value">{analytics?.totalScans || 0}</span>
          <span className="stat-label">Total Scans</span>
        </div>
        <div className="card stat-card">
          <div className={styles.miniIcon} style={{ background: 'rgba(88,86,214,0.1)', color: 'var(--purple)' }}><Scan size={18} /></div>
          <span className="stat-value">{analytics?.uniqueScans || 0}</span>
          <span className="stat-label">Unique Scans</span>
        </div>
        <div className="card stat-card">
          <div className={styles.miniIcon} style={{ background: 'rgba(255,149,0,0.1)', color: 'var(--orange)' }}><Globe size={18} /></div>
          <span className="stat-value">{analytics?.topCountries?.length || 0}</span>
          <span className="stat-label">Countries</span>
        </div>
        <div className="card stat-card">
          <div className={styles.miniIcon} style={{ background: 'rgba(52,199,89,0.1)', color: 'var(--green)' }}><Smartphone size={18} /></div>
          <span className="stat-value">{analytics?.deviceBreakdown?.find(d => d.device_type === 'mobile')?.count || 0}</span>
          <span className="stat-label">Mobile Scans</span>
        </div>
      </div>

      {/* Charts */}
      <div className={styles.chartsGrid}>
        <div className={`card ${styles.chartCard}`}>
          <h3>Scans Over Time</h3>
          {analytics?.scansOverTime?.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={analytics.scansOverTime}>
                <defs>
                  <linearGradient id="g1" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#007AFF" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="#007AFF" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="period" tickFormatter={v => v?.slice(5)} stroke="var(--text-quaternary)" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke="var(--text-quaternary)" fontSize={11} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: 12, fontSize: 13 }} />
                <Area type="monotone" dataKey="count" stroke="#007AFF" fill="url(#g1)" strokeWidth={2} dot={false} name="Total" />
                <Area type="monotone" dataKey="unique_count" stroke="#5856D6" fill="none" strokeWidth={2} strokeDasharray="5 5" dot={false} name="Unique" />
              </AreaChart>
            </ResponsiveContainer>
          ) : <div className="empty-state" style={{ padding: '40px 0' }}><p className="empty-state-desc">No scan data yet</p></div>}
        </div>

        <div className={`card ${styles.chartCard}`}>
          <h3>Devices</h3>
          {analytics?.deviceBreakdown?.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={180}>
                <PieChart>
                  <Pie data={analytics.deviceBreakdown} dataKey="count" nameKey="device_type" cx="50%" cy="50%" innerRadius={45} outerRadius={75} paddingAngle={3} strokeWidth={0}>
                    {analytics.deviceBreakdown.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip contentStyle={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: 12 }} />
                </PieChart>
              </ResponsiveContainer>
              <div className={styles.legend}>
                {analytics.deviceBreakdown.map((d, i) => (
                  <div key={i} className={styles.legendRow}>
                    <span className={styles.legendDot} style={{ background: COLORS[i] }} />
                    <span style={{ flex: 1, textTransform: 'capitalize' }}>{d.device_type}</span>
                    <span style={{ fontWeight: 600 }}>{d.count}</span>
                  </div>
                ))}
              </div>
            </>
          ) : <div className="empty-state" style={{ padding: '40px 0' }}><p className="empty-state-desc">No data</p></div>}
        </div>

        <div className={`card ${styles.chartCard}`}>
          <h3>Top Countries</h3>
          {analytics?.topCountries?.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={analytics.topCountries.slice(0, 8)} layout="vertical">
                <XAxis type="number" stroke="var(--text-quaternary)" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis type="category" dataKey="country" stroke="var(--text-quaternary)" fontSize={12} tickLine={false} axisLine={false} width={50} />
                <Tooltip contentStyle={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: 12 }} />
                <Bar dataKey="count" fill="#007AFF" radius={[0, 6, 6, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : <div className="empty-state" style={{ padding: '40px 0' }}><p className="empty-state-desc">No data</p></div>}
        </div>

        {/* Recent Scans */}
        <div className={`card ${styles.chartCard}`}>
          <h3>Recent Scans</h3>
          {analytics?.recentScans?.length > 0 ? (
            <div className={styles.scanList}>
              {analytics.recentScans.slice(0, 10).map((scan, i) => (
                <div key={i} className={styles.scanItem}>
                  <div className={styles.scanDevice}>{scan.device_type === 'mobile' ? '📱' : scan.device_type === 'tablet' ? '📱' : '💻'}</div>
                  <div className={styles.scanInfo}>
                    <span>{scan.country} · {scan.browser}</span>
                    <small>{new Date(scan.scanned_at).toLocaleString()}</small>
                  </div>
                  {scan.is_unique ? <span className="badge badge-green">New</span> : <span className="badge badge-blue">Return</span>}
                </div>
              ))}
            </div>
          ) : <div className="empty-state" style={{ padding: '40px 0' }}><p className="empty-state-desc">No scans yet</p></div>}
        </div>
      </div>

      {/* Redirect History */}
      {qr.redirectHistory?.length > 0 && (
        <div className={`card ${styles.historyCard}`}>
          <h3 style={{ marginBottom: 'var(--space-4)' }}>Redirect History</h3>
          {qr.redirectHistory.map((r, i) => (
            <div key={i} className={styles.historyItem}>
              <div className={`${styles.historyDot} ${r.is_current ? styles.historyDotActive : ''}`} />
              <div className={styles.historyContent}>
                <a href={r.destination_url} target="_blank" rel="noopener" className={styles.historyUrl}>{r.destination_url}</a>
                <small>{new Date(r.activated_at).toLocaleDateString()} {r.notes && `· ${r.notes}`}</small>
              </div>
              {r.is_current && <span className="badge badge-green">Active</span>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
