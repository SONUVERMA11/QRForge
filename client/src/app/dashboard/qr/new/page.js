'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import { ArrowLeft, Link2, Tag, QrCode, Download, Copy, Check, ExternalLink } from 'lucide-react';
import Link from 'next/link';
import styles from './create-qr.module.css';

export default function CreateQRPage() {
  const router = useRouter();
  const [label, setLabel] = useState('');
  const [destinationUrl, setDestinationUrl] = useState('');
  const [tags, setTags] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);
  const [copied, setCopied] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!destinationUrl.startsWith('http')) {
      setError('URL must start with http:// or https://');
      return;
    }
    setLoading(true);
    try {
      const body = { destinationUrl, label: label || undefined };
      if (tags.trim()) body.tags = tags.split(',').map(t => t.trim()).filter(Boolean);
      const res = await api.createQR(body);
      setResult(res.data);
    } catch (err) {
      setError(err.message || 'Failed to create QR code');
    } finally {
      setLoading(false);
    }
  };

  const copyUrl = () => {
    if (result?.qrUrl) {
      navigator.clipboard.writeText(result.qrUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const downloadQR = () => {
    if (result?.qrImage) {
      const link = document.createElement('a');
      link.download = `qrforge-${result.shortCode}.png`;
      link.href = result.qrImage;
      link.click();
    }
  };

  if (result) {
    return (
      <div className="animate-fade-in">
        <div className={styles.successPage}>
          <div className={`card ${styles.successCard}`}>
            <div className={styles.successIcon}>🎉</div>
            <h2>QR Code Created!</h2>
            <p className={styles.successDesc}>Your dynamic QR code is ready. Scan it, share it, or download it.</p>

            <div className={styles.qrPreviewWrapper}>
              <div className="qr-preview">
                <img src={result.qrImage} alt="QR Code" />
              </div>
            </div>

            <div className={styles.qrUrlRow}>
              <div className={styles.qrUrlBox}>
                <Link2 size={16} />
                <span>{result.qrUrl}</span>
              </div>
              <button onClick={copyUrl} className="btn btn-secondary btn-sm">
                {copied ? <Check size={16} /> : <Copy size={16} />}
                {copied ? 'Copied!' : 'Copy'}
              </button>
            </div>

            <div className={styles.destRow}>
              <span className={styles.destLabel}>Redirects to:</span>
              <a href={result.destinationUrl} target="_blank" rel="noopener noreferrer" className={styles.destUrl}>
                {result.destinationUrl} <ExternalLink size={12} />
              </a>
            </div>

            <div className={styles.actionRow}>
              <button onClick={downloadQR} className="btn btn-secondary">
                <Download size={18} /> Download PNG
              </button>
              <Link href={`/dashboard/qr/${result.id}`} className="btn btn-primary">
                View Dashboard
              </Link>
            </div>

            <Link href="/dashboard/qr/new" className="btn btn-ghost" onClick={() => setResult(null)}>
              + Create Another
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      <div className={styles.header}>
        <Link href="/dashboard/qr" className="btn btn-ghost btn-sm">
          <ArrowLeft size={16} /> Back
        </Link>
        <h1 className={styles.title}>Create QR Code</h1>
      </div>

      <div className={styles.createLayout}>
        <div className={`card ${styles.formCard}`}>
          {error && <div className={styles.error}>{error}</div>}

          <form onSubmit={handleSubmit} className={styles.form}>
            <div className="input-group">
              <label className="input-label">Destination URL *</label>
              <div className={styles.inputWrapper}>
                <Link2 size={18} className={styles.inputIcon} />
                <input type="url" className="input" placeholder="https://example.com/your-page" value={destinationUrl} onChange={e => setDestinationUrl(e.target.value)} required style={{ paddingLeft: 44 }} />
              </div>
              <span className={styles.hint}>The URL people will be redirected to when scanning your QR code</span>
            </div>

            <div className="input-group">
              <label className="input-label">Label (optional)</label>
              <div className={styles.inputWrapper}>
                <QrCode size={18} className={styles.inputIcon} />
                <input type="text" className="input" placeholder="e.g. Restaurant Menu, Business Card" value={label} onChange={e => setLabel(e.target.value)} style={{ paddingLeft: 44 }} />
              </div>
            </div>

            <div className="input-group">
              <label className="input-label">Tags (optional)</label>
              <div className={styles.inputWrapper}>
                <Tag size={18} className={styles.inputIcon} />
                <input type="text" className="input" placeholder="marketing, summer-2025, menu" value={tags} onChange={e => setTags(e.target.value)} style={{ paddingLeft: 44 }} />
              </div>
              <span className={styles.hint}>Separate with commas</span>
            </div>

            <button type="submit" className="btn btn-primary btn-lg" disabled={loading} style={{ width: '100%', marginTop: 'var(--space-4)' }}>
              {loading ? 'Creating...' : 'Generate QR Code'} <QrCode size={18} />
            </button>
          </form>
        </div>

        <div className={`card ${styles.previewCard}`}>
          <h3 className={styles.previewTitle}>Preview</h3>
          <div className={styles.previewQR}>
            <QrCode size={80} strokeWidth={1} style={{ color: 'var(--text-quaternary)' }} />
          </div>
          <p className={styles.previewHint}>QR code will appear here after creation</p>
        </div>
      </div>
    </div>
  );
}
