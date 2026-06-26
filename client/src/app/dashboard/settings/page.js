'use client';
import { useAuth } from '@/lib/auth-context';
import { Shield, User, Building2, CreditCard } from 'lucide-react';

export default function SettingsPage() {
  const { user } = useAuth();

  const planLimits = {
    free: { qr: 5, scans: '500/mo', analytics: '30 days' },
    starter: { qr: 50, scans: '10K/mo', analytics: '90 days' },
    pro: { qr: 500, scans: '100K/mo', analytics: '1 year' },
    enterprise: { qr: '∞', scans: '∞', analytics: '∞' },
  };

  const plan = planLimits[user?.plan] || planLimits.free;

  return (
    <div className="animate-fade-in">
      <h1 style={{ fontSize: 'var(--text-2xl)', fontWeight: 800, marginBottom: 'var(--space-6)', letterSpacing: -0.5 }}>Settings</h1>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>
        {/* Profile */}
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 'var(--space-4)' }}>
            <User size={20} style={{ color: 'var(--blue)' }} /> <h3 style={{ fontWeight: 700 }}>Profile</h3>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)' }}>
            <div className="input-group">
              <label className="input-label">Name</label>
              <input className="input" value={user?.name || ''} readOnly />
            </div>
            <div className="input-group">
              <label className="input-label">Email</label>
              <input className="input" value={user?.email || ''} readOnly />
            </div>
            <div className="input-group">
              <label className="input-label">Role</label>
              <input className="input" value={user?.role || ''} readOnly style={{ textTransform: 'capitalize' }} />
            </div>
          </div>
        </div>

        {/* Plan */}
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 'var(--space-4)' }}>
            <CreditCard size={20} style={{ color: 'var(--purple)' }} /> <h3 style={{ fontWeight: 700 }}>Current Plan</h3>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)', marginBottom: 'var(--space-4)' }}>
            <span className="badge badge-blue" style={{ fontSize: 14, padding: '6px 16px', textTransform: 'capitalize' }}>
              {user?.plan || 'Free'} Plan
            </span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 'var(--space-4)' }}>
            <div className="stat-card" style={{ background: 'var(--bg-tertiary)', padding: 'var(--space-4)', borderRadius: 'var(--radius-md)' }}>
              <span className="stat-label">QR Codes</span>
              <span className="stat-value" style={{ fontSize: 'var(--text-xl)' }}>{plan.qr}</span>
            </div>
            <div className="stat-card" style={{ background: 'var(--bg-tertiary)', padding: 'var(--space-4)', borderRadius: 'var(--radius-md)' }}>
              <span className="stat-label">Scans</span>
              <span className="stat-value" style={{ fontSize: 'var(--text-xl)' }}>{plan.scans}</span>
            </div>
            <div className="stat-card" style={{ background: 'var(--bg-tertiary)', padding: 'var(--space-4)', borderRadius: 'var(--radius-md)' }}>
              <span className="stat-label">Analytics History</span>
              <span className="stat-value" style={{ fontSize: 'var(--text-xl)' }}>{plan.analytics}</span>
            </div>
          </div>
        </div>

        {/* Security */}
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 'var(--space-4)' }}>
            <Shield size={20} style={{ color: 'var(--green)' }} /> <h3 style={{ fontWeight: 700 }}>Security</h3>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 'var(--space-3) 0', borderBottom: '1px solid var(--separator)' }}>
            <div>
              <div style={{ fontWeight: 600 }}>Two-Factor Authentication</div>
              <div style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}>Add an extra layer of security</div>
            </div>
            <span className="badge badge-orange">Coming Soon</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 'var(--space-3) 0' }}>
            <div>
              <div style={{ fontWeight: 600 }}>API Keys</div>
              <div style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}>Manage programmatic access</div>
            </div>
            <span className="badge badge-orange">Coming Soon</span>
          </div>
        </div>
      </div>
    </div>
  );
}
