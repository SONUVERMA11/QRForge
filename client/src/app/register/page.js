'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import Link from 'next/link';
import { QrCode, Mail, Lock, User, Eye, EyeOff, ArrowRight } from 'lucide-react';
import styles from '../auth.module.css';

export default function RegisterPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();
  const router = useRouter();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (password.length < 8) { setError('Password must be at least 8 characters'); return; }
    setLoading(true);
    try {
      await register({ name, email, password });
      router.push('/dashboard');
    } catch (err) {
      setError(err.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.authPage}>
      <div className={styles.authGlow} />
      <div className={styles.authCard}>
        <Link href="/" className={styles.authLogo}>
          <div className={styles.logoIcon}><QrCode size={24} /></div>
          <span>QRForge</span>
        </Link>
        <h1>Create your account</h1>
        <p className={styles.authSubtitle}>Start building dynamic QR codes for free</p>

        {error && <div className={styles.authError}>{error}</div>}

        <form onSubmit={handleSubmit} className={styles.authForm}>
          <div className="input-group">
            <label className="input-label">Full Name</label>
            <div className={styles.inputWrapper}>
              <User size={18} className={styles.inputIcon} />
              <input type="text" className="input" placeholder="John Doe" value={name} onChange={e => setName(e.target.value)} required />
            </div>
          </div>

          <div className="input-group">
            <label className="input-label">Email</label>
            <div className={styles.inputWrapper}>
              <Mail size={18} className={styles.inputIcon} />
              <input type="email" className="input" placeholder="you@example.com" value={email} onChange={e => setEmail(e.target.value)} required />
            </div>
          </div>

          <div className="input-group">
            <label className="input-label">Password</label>
            <div className={styles.inputWrapper}>
              <Lock size={18} className={styles.inputIcon} />
              <input type={showPw ? 'text' : 'password'} className="input" placeholder="Minimum 8 characters" value={password} onChange={e => setPassword(e.target.value)} required minLength={8} />
              <button type="button" className={styles.inputAction} onClick={() => setShowPw(!showPw)}>
                {showPw ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <button type="submit" className="btn btn-primary btn-lg" disabled={loading} style={{ width: '100%' }}>
            {loading ? 'Creating...' : 'Create Account'} <ArrowRight size={18} />
          </button>
        </form>

        <p className={styles.authSwitch}>
          Already have an account? <Link href="/login">Sign in</Link>
        </p>
      </div>
    </div>
  );
}
