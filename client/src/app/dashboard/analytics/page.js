'use client';
import { useState, useEffect, useCallback } from 'react';
import api from '@/lib/api';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar } from 'recharts';
import { BarChart3 } from 'lucide-react';

const COLORS = ['#007AFF', '#5856D6', '#FF9500', '#34C759', '#FF2D55', '#5AC8FA'];

export default function AnalyticsPage() {
  const [data, setData] = useState(null);
  const [period, setPeriod] = useState('30d');
  const [loading, setLoading] = useState(true);

  const fetchAnalytics = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.getAnalytics({ period });
      setData(res.data);
    } catch (err) { console.error(err); } finally { setLoading(false); }
  }, [period]);

  useEffect(() => { fetchAnalytics(); }, [fetchAnalytics]);

  const periods = [{ v: '24h', l: '24H' }, { v: '7d', l: '7D' }, { v: '30d', l: '30D' }, { v: '90d', l: '90D' }, { v: 'all', l: 'All' }];

  if (loading) return <div><h1 style={{ fontSize: 'var(--text-2xl)', fontWeight: 800, marginBottom: 24 }}>Analytics</h1><div className="skeleton" style={{ height: 400 }} /></div>;

  return (
    <div className="animate-fade-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-6)' }}>
        <h1 style={{ fontSize: 'var(--text-2xl)', fontWeight: 800, letterSpacing: -0.5 }}>Analytics</h1>
        <div className="tabs">
          {periods.map(p => <button key={p.v} onClick={() => setPeriod(p.v)} className={`tab ${period === p.v ? 'active' : ''}`}>{p.l}</button>)}
        </div>
      </div>

      <div className="grid-stats" style={{ marginBottom: 'var(--space-5)' }}>
        {[
          { l: 'Total Scans', v: data?.totalScans || 0, c: '#007AFF' },
          { l: 'Unique Scans', v: data?.uniqueScans || 0, c: '#5856D6' },
          { l: 'QR Codes', v: data?.totalQRCodes || 0, c: '#34C759' },
          { l: 'Active', v: data?.activeQRCodes || 0, c: '#FF9500' },
        ].map((s, i) => (
          <div key={i} className="card stat-card">
            <span className="stat-label">{s.l}</span>
            <span className="stat-value" style={{ color: s.c }}>{s.v.toLocaleString()}</span>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: 'var(--space-5)', marginBottom: 'var(--space-5)' }}>
        <div className="card">
          <h3 style={{ fontWeight: 700, marginBottom: 'var(--space-4)' }}>Scans Over Time</h3>
          {data?.scansPerDay?.length ? (
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={data.scansPerDay}>
                <defs><linearGradient id="ag" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#007AFF" stopOpacity={0.3} /><stop offset="100%" stopColor="#007AFF" stopOpacity={0} /></linearGradient></defs>
                <XAxis dataKey="period" tickFormatter={v => v?.slice(5)} stroke="var(--text-quaternary)" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke="var(--text-quaternary)" fontSize={11} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: 12 }} />
                <Area type="monotone" dataKey="count" stroke="#007AFF" fill="url(#ag)" strokeWidth={2} dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          ) : <div className="empty-state"><p className="empty-state-desc">No scan data yet</p></div>}
        </div>

        <div className="card">
          <h3 style={{ fontWeight: 700, marginBottom: 'var(--space-4)' }}>Devices</h3>
          {data?.deviceBreakdown?.length ? (
            <>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart><Pie data={data.deviceBreakdown} dataKey="count" nameKey="device_type" cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={3} strokeWidth={0}>
                  {data.deviceBreakdown.map((_, i) => <Cell key={i} fill={COLORS[i]} />)}
                </Pie><Tooltip /></PieChart>
              </ResponsiveContainer>
              {data.deviceBreakdown.map((d, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, marginTop: 8 }}>
                  <span style={{ width: 10, height: 10, borderRadius: '50%', background: COLORS[i] }} />
                  <span style={{ flex: 1, textTransform: 'capitalize', color: 'var(--text-secondary)' }}>{d.device_type}</span>
                  <span style={{ fontWeight: 600 }}>{d.count}</span>
                </div>
              ))}
            </>
          ) : <div className="empty-state"><p className="empty-state-desc">No data</p></div>}
        </div>
      </div>

      <div className="card">
        <h3 style={{ fontWeight: 700, marginBottom: 'var(--space-4)' }}>Top Countries</h3>
        {data?.countryBreakdown?.length ? (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={data.countryBreakdown} layout="vertical">
              <XAxis type="number" stroke="var(--text-quaternary)" fontSize={11} tickLine={false} axisLine={false} />
              <YAxis type="category" dataKey="country" stroke="var(--text-quaternary)" fontSize={12} width={60} tickLine={false} axisLine={false} />
              <Tooltip contentStyle={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: 12 }} />
              <Bar dataKey="count" fill="#007AFF" radius={[0, 6, 6, 0]} />
            </BarChart>
          </ResponsiveContainer>
        ) : <div className="empty-state"><p className="empty-state-desc">No country data yet</p></div>}
      </div>
    </div>
  );
}
