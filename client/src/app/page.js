'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import Link from 'next/link';
import { QrCode, BarChart3, Zap, Shield, Globe, Palette, ArrowRight, Sparkles, Check } from 'lucide-react';
import styles from './page.module.css';

export default function LandingPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && user) router.push('/dashboard');
  }, [user, loading, router]);

  if (loading) return null;

  const features = [
    { icon: <QrCode size={24} />, title: 'Dynamic QR Codes', desc: 'Change destination URLs anytime. Print once, update forever.' },
    { icon: <BarChart3 size={24} />, title: 'Real-Time Analytics', desc: 'Track every scan with device, location, and browser data.' },
    { icon: <Zap size={24} />, title: 'Smart Rules Engine', desc: 'Redirect based on time, location, device type, or A/B tests.' },
    { icon: <Shield size={24} />, title: 'Enterprise Security', desc: 'Password protection, IP filtering, and GDPR compliance.' },
    { icon: <Globe size={24} />, title: 'Global Performance', desc: 'Sub-10ms redirects with intelligent caching worldwide.' },
    { icon: <Palette size={24} />, title: 'QR Design Studio', desc: 'Brand your QR codes with custom colors, logos, and styles.' },
  ];

  const plans = [
    { name: 'Free', price: '$0', period: '/forever', qr: '5 QR Codes', scans: '500 scans/mo', features: ['Basic analytics', '30-day history', 'PNG export'] },
    { name: 'Pro', price: '$49', period: '/month', qr: '500 QR Codes', scans: '100K scans/mo', features: ['Advanced analytics', '1-year history', 'Custom domain', 'A/B testing', 'Smart rules'], popular: true },
    { name: 'Enterprise', price: 'Custom', period: '', qr: 'Unlimited', scans: 'Unlimited', features: ['Everything in Pro', 'SSO/SAML', 'Dedicated support', 'Custom SLA', 'API access'] },
  ];

  return (
    <div className={styles.landing}>
      {/* Nav */}
      <nav className={styles.nav}>
        <div className={styles.navInner}>
          <Link href="/" className={styles.logo}>
            <div className={styles.logoIcon}><QrCode size={20} /></div>
            <span>QRForge</span>
          </Link>
          <div className={styles.navLinks}>
            <Link href="/login" className="btn btn-ghost">Sign In</Link>
            <Link href="/register" className="btn btn-primary">Get Started Free</Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className={styles.hero}>
        <div className={styles.heroGlow} />
        <div className={styles.heroBadge}>
          <Sparkles size={14} />
          <span>The Future of QR Codes</span>
        </div>
        <h1 className={styles.heroTitle}>
          Print Once.<br />
          <span className={styles.gradient}>Update Forever.</span>
        </h1>
        <p className={styles.heroDesc}>
          Create dynamic QR codes that you control. Change the destination URL anytime — 
          no reprinting required. Track every scan with enterprise-grade analytics.
        </p>
        <div className={styles.heroCTA}>
          <Link href="/register" className="btn btn-primary btn-lg">
            Start Building Free <ArrowRight size={18} />
          </Link>
          <Link href="#features" className="btn btn-secondary btn-lg">
            See How It Works
          </Link>
        </div>
        <div className={styles.heroStats}>
          <div><span>10M+</span><small>QR Scans Tracked</small></div>
          <div className={styles.heroDivider} />
          <div><span>&lt;10ms</span><small>Redirect Latency</small></div>
          <div className={styles.heroDivider} />
          <div><span>99.99%</span><small>Uptime SLA</small></div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className={styles.features}>
        <div className="container">
          <h2 className={styles.sectionTitle}>Everything you need to master QR</h2>
          <p className={styles.sectionDesc}>From generation to analytics, QRForge handles the entire lifecycle of your QR codes.</p>
          <div className={styles.featureGrid}>
            {features.map((f, i) => (
              <div key={i} className={`card card-hover ${styles.featureCard}`} style={{ animationDelay: `${i * 80}ms` }}>
                <div className={styles.featureIcon}>{f.icon}</div>
                <h3>{f.title}</h3>
                <p>{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className={styles.pricing}>
        <div className="container">
          <h2 className={styles.sectionTitle}>Simple, transparent pricing</h2>
          <p className={styles.sectionDesc}>Start free. Scale when you need to.</p>
          <div className={styles.priceGrid}>
            {plans.map((plan, i) => (
              <div key={i} className={`card ${styles.priceCard} ${plan.popular ? styles.popular : ''}`}>
                {plan.popular && <div className={styles.popularBadge}>Most Popular</div>}
                <h3>{plan.name}</h3>
                <div className={styles.priceAmount}>
                  <span>{plan.price}</span>
                  <small>{plan.period}</small>
                </div>
                <div className={styles.priceDetails}>
                  <div className={styles.priceHighlight}>{plan.qr}</div>
                  <div className={styles.priceHighlight}>{plan.scans}</div>
                </div>
                <ul className={styles.priceFeatures}>
                  {plan.features.map((f, j) => (
                    <li key={j}><Check size={16} /> {f}</li>
                  ))}
                </ul>
                <Link href="/register" className={`btn ${plan.popular ? 'btn-primary' : 'btn-secondary'}`} style={{ width: '100%' }}>
                  {plan.name === 'Enterprise' ? 'Contact Sales' : 'Get Started'}
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className={styles.footer}>
        <div className="container">
          <div className={styles.footerInner}>
            <div className={styles.footerBrand}>
              <div className={styles.logo}>
                <div className={styles.logoIcon}><QrCode size={20} /></div>
                <span>QRForge</span>
              </div>
              <p>The world&apos;s most advanced dynamic QR code platform.</p>
            </div>
            <div className={styles.footerCopy}>
              © {new Date().getFullYear()} QRForge. All rights reserved.
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
