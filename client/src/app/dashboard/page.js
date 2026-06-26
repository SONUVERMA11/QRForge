'use client';
import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/lib/auth-context';
import api from '@/lib/api';
import Link from 'next/link';
import { QrCode, Scan, Users, TrendingUp, Plus, ArrowUpRight, ExternalLink } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import styles from './overview.module.css';

const COLORS = ['#007AFF', '#5856D6', '#FF9500', '#34C759', '#FF2D55', '#5AC8FA'];

export default function DashboardPage() {
  const { user } = useAuth();
  const [analytics, setAnalytics] = useState(null);
  const [qrCodes, setQrCodes] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      const [analyticsRes, qrRes] = await Promise.all([
        api.getAnalytics({ period: '30d' }),
        api.listQR({ limit: 5, sort: 'total_scans', order: 'desc' }),
      ]);
      setAnalytics(analyticsRes.data);
      setQrCodes(qrRes.data || []);
    } catch (err) {
      console.error('Failed to load dashboard:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const stats = [
    { icon: <QrCode size={22} />, label: 'Total QR Codes', value: analytics?.totalQRCodes || 0, color: '#007AFF', bg: 'rgba(0,122,255,0.1)' },
    { icon: <Scan size={22} />, label: 'Total Scans', value: analytics?.totalScans || 0, color: '#34C759', bg: 'rgba(52,199,89,0.1)' },
    { icon: <Users size={22} />, label: 'Unique Scans', value: analytics?.uniqueScans || 0, color: '#5856D6', bg: 'rgba(88,86,214,0.1)' },
    { icon: <TrendingUp size={22} />, label: 'Active QR Codes', value: analytics?.activeQRCodes || 0, color: '#FF9500', bg: 'rgba(255,149,0,0.1)' },
  ];

  if (loading) {
    return (
      <div>
        <div className={styles.header}><h1 className={styles.title}>Dashboard</h1></div>
        <div className="grid-stats">
          {[1,2,3,4].map(i => <div key={i} className="card"><div className="skeleton" style={{ height: 80 }} /></div>)}
        </div>
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Welcome back, {user?.name?.split(' ')[0]} 👋</h1>
          <p className={styles.subtitle}>Here&apos;s what&apos;s happening with your QR codes</p>
        </div>
        <Link href="/dashboard/qr/new" className="btn btn-primary">
          <Plus size={18} /> Create QR
        </Link>
      </div>

      {/* Stats Grid */}
      <div className="grid-stats" style={{ marginBottom: 'var(--space-6)' }}>
        {stats.map((stat, i) => (
          <div key={i} className={`card ${styles.statCard}`} style={{ animationDelay: `${i * 50}ms` }}>
            <div className={styles.statIcon} style={{ background: stat.bg, color: stat.color }}>
              {stat.icon}
            </div>
            <div className="stat-card">
              <span className="stat-value">{stat.value.toLocaleString()}</span>
              <span className="stat-label">{stat.label}</span>
            </div>
          </div>
        ))}
      </div>

      <div className={styles.chartsRow}>
        {/* Scans Over Time */}
        <div className={`card ${styles.chartCard}`}>
          <h3 className={styles.chartTitle}>Scans — Last 30 Days</h3>
          {analytics?.scansPerDay?.length > 0 ? (
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart data={analytics.scansPerDay}>
                <defs>
                  <linearGradient id="scanGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#007AFF" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="#007AFF" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="period" tickFormatter={v => v?.slice(5)} stroke="var(--text-quaternary)" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="var(--text-quaternary)" fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: 12, fontSize: 13 }} />
                <Area type="monotone" dataKey="count" stroke="#007AFF" fill="url(#scanGradient)" strokeWidth={2} dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="empty-state" style={{ padding: '40px 0' }}>
              <p className="empty-state-desc">No scan data yet. Create a QR code and start scanning!</p>
            </div>
          )}
        </div>

        {/* Device Breakdown */}
        <div className={`card ${styles.chartCard} ${styles.chartSmall}`}>
          <h3 className={styles.chartTitle}>Devices</h3>
          {analytics?.deviceBreakdown?.length > 0 ? (
            <div className={styles.pieContainer}>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie data={analytics.deviceBreakdown} dataKey="count" nameKey="device_type" cx="50%" cy="50%" innerRadius={55} outerRadius={85} paddingAngle={3} strokeWidth={0}>
                    {analytics.deviceBreakdown.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip contentStyle={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: 12, fontSize: 13 }} />
                </PieChart>
              </ResponsiveContainer>
              <div className={styles.pieLegend}>
                {analytics.deviceBreakdown.map((d, i) => (
                  <div key={i} className={styles.legendItem}>
                    <span className={styles.legendDot} style={{ background: COLORS[i % COLORS.length] }} />
                    <span className={styles.legendLabel}>{d.device_type}</span>
                    <span className={styles.legendValue}>{d.count}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="empty-state" style={{ padding: '40px 0' }}>
              <p className="empty-state-desc">No device data yet</p>
            </div>
          )}
        </div>
      </div>

      {/* Top QR Codes */}
      <div className={`card ${styles.tableCard}`}>
        <div className={styles.tableHeader}>
          <h3 className={styles.chartTitle}>Top Performing QR Codes</h3>
          <Link href="/dashboard/qr" className="btn btn-ghost btn-sm">View All <ArrowUpRight size={14} /></Link>
        </div>
        {qrCodes.length > 0 ? (
          <div className={styles.table}>
            {qrCodes.map((qr, i) => (
              <Link key={qr.id} href={`/dashboard/qr/${qr.id}`} className={styles.tableRow}>
                <div className={styles.tableRank}>{i + 1}</div>
                <div className={styles.tableInfo}>
                  <span className={styles.tableLabel}>{qr.label}</span>
                  <span className={styles.tableCode}>{qr.short_code}</span>
                </div>
                <div className={styles.tableMeta}>
                  <span className={styles.tableScans}>{qr.total_scans} scans</span>
                  {qr.current_url && (
                    <span className={styles.tableUrl}>{new URL(qr.current_url).hostname}</span>
                  )}
                </div>
                <ExternalLink size={16} className={styles.tableArrow} />
              </Link>
            ))}
          </div>
        ) : (
          <div className="empty-state">
            <div className="empty-state-icon"><QrCode size={32} /></div>
            <h3 className="empty-state-title">No QR codes yet</h3>
            <p className="empty-state-desc">Create your first QR code to see it here.</p>
            <Link href="/dashboard/qr/new" className="btn btn-primary"><Plus size={18} /> Create QR Code</Link>
          </div>
        )}
      </div>
    </div>
  );
}
