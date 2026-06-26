'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { QrCode, LayoutDashboard, QrCodeIcon, BarChart3, Settings, LogOut, Plus, ChevronRight } from 'lucide-react';
import styles from './dashboard.module.css';

export default function DashboardLayout({ children }) {
  const { user, loading, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!loading && !user) router.push('/login');
  }, [user, loading, router]);

  if (loading || !user) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
        <div className="skeleton" style={{ width: 48, height: 48, borderRadius: '50%' }} />
      </div>
    );
  }

  const navItems = [
    { href: '/dashboard', icon: <LayoutDashboard size={20} />, label: 'Overview' },
    { href: '/dashboard/qr', icon: <QrCodeIcon size={20} />, label: 'QR Codes' },
    { href: '/dashboard/analytics', icon: <BarChart3 size={20} />, label: 'Analytics' },
    { href: '/dashboard/settings', icon: <Settings size={20} />, label: 'Settings' },
  ];

  const isActive = (href) => {
    if (href === '/dashboard') return pathname === '/dashboard';
    return pathname.startsWith(href);
  };

  return (
    <div className={styles.dashLayout}>
      {/* Sidebar */}
      <aside className={styles.sidebar}>
        <div className={styles.sidebarHeader}>
          <Link href="/dashboard" className={styles.sidebarLogo}>
            <div className={styles.logoIcon}><QrCode size={18} /></div>
            <span>QRForge</span>
          </Link>
        </div>

        <div className={styles.sidebarCreate}>
          <Link href="/dashboard/qr/new" className="btn btn-primary" style={{ width: '100%' }}>
            <Plus size={18} /> New QR Code
          </Link>
        </div>

        <nav className={styles.sidebarNav}>
          {navItems.map(item => (
            <Link key={item.href} href={item.href} className={`${styles.navItem} ${isActive(item.href) ? styles.navActive : ''}`}>
              {item.icon}
              <span>{item.label}</span>
              {isActive(item.href) && <ChevronRight size={16} className={styles.navArrow} />}
            </Link>
          ))}
        </nav>

        <div className={styles.sidebarFooter}>
          <div className={styles.userInfo}>
            <div className={styles.avatar}>{user.name?.charAt(0)?.toUpperCase() || 'U'}</div>
            <div>
              <div className={styles.userName}>{user.name}</div>
              <div className={styles.userPlan}>{user.plan || 'Free'} Plan</div>
            </div>
          </div>
          <button onClick={() => { logout(); router.push('/'); }} className={`btn btn-ghost btn-icon ${styles.logoutBtn}`}>
            <LogOut size={18} />
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className={styles.mainContent}>
        {children}
      </main>
    </div>
  );
}
