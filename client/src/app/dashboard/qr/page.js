'use client';
import { useState, useEffect, useCallback } from 'react';
import api from '@/lib/api';
import Link from 'next/link';
import { Plus, Search, QrCode, ExternalLink, Copy, Trash2, MoreHorizontal, Check, ToggleLeft, ToggleRight } from 'lucide-react';
import styles from './qr-list.module.css';

export default function QRListPage() {
  const [qrCodes, setQrCodes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [pagination, setPagination] = useState({});
  const [copiedId, setCopiedId] = useState(null);

  const fetchQRCodes = useCallback(async () => {
    setLoading(true);
    try {
      const params = { limit: 20 };
      if (search) params.search = search;
      const res = await api.listQR(params);
      setQrCodes(res.data || []);
      setPagination(res.pagination || {});
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => { fetchQRCodes(); }, [fetchQRCodes]);

  const copyUrl = (qr) => {
    const url = `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/r/${qr.short_code}`;
    navigator.clipboard.writeText(url);
    setCopiedId(qr.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const toggleActive = async (qr) => {
    try {
      await api.updateQR(qr.id, { isActive: !qr.is_active });
      fetchQRCodes();
    } catch (err) {
      console.error(err);
    }
  };

  const deleteQR = async (qr) => {
    if (!confirm(`Delete "${qr.label}"? This cannot be undone.`)) return;
    try {
      await api.deleteQR(qr.id);
      fetchQRCodes();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="animate-fade-in">
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>QR Codes</h1>
          <p className={styles.subtitle}>{pagination.total || 0} total</p>
        </div>
        <Link href="/dashboard/qr/new" className="btn btn-primary">
          <Plus size={18} /> Create QR Code
        </Link>
      </div>

      {/* Search */}
      <div className={styles.toolbar}>
        <div className={styles.searchBox}>
          <Search size={18} className={styles.searchIcon} />
          <input type="text" className="input" placeholder="Search QR codes..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
      </div>

      {/* QR Grid */}
      {loading ? (
        <div className="grid-cards">
          {[1,2,3,4,5,6].map(i => <div key={i} className="card"><div className="skeleton" style={{ height: 200 }} /></div>)}
        </div>
      ) : qrCodes.length > 0 ? (
        <div className="grid-cards">
          {qrCodes.map((qr, i) => (
            <div key={qr.id} className={`card card-hover ${styles.qrCard}`} style={{ animationDelay: `${i * 40}ms` }}>
              <div className={styles.qrCardHeader}>
                <div className={styles.qrLabel}>{qr.label}</div>
                <div className={styles.qrActions}>
                  <button onClick={() => copyUrl(qr)} className="btn btn-ghost btn-icon btn-sm" title="Copy URL">
                    {copiedId === qr.id ? <Check size={16} /> : <Copy size={16} />}
                  </button>
                  <button onClick={() => toggleActive(qr)} className="btn btn-ghost btn-icon btn-sm" title="Toggle active">
                    {qr.is_active ? <ToggleRight size={18} style={{ color: 'var(--green)' }} /> : <ToggleLeft size={18} />}
                  </button>
                  <button onClick={() => deleteQR(qr)} className="btn btn-ghost btn-icon btn-sm" title="Delete">
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>

              <Link href={`/dashboard/qr/${qr.id}`} className={styles.qrCardBody}>
                <div className={styles.qrCodeBadge}>
                  <QrCode size={14} />
                  <span>{qr.short_code}</span>
                </div>
                {qr.current_url && (
                  <div className={styles.qrDestination}>
                    <ExternalLink size={12} />
                    <span>{qr.current_url}</span>
                  </div>
                )}
              </Link>

              <div className={styles.qrCardFooter}>
                <div className={styles.qrStat}>
                  <span className={styles.qrStatValue}>{qr.total_scans}</span>
                  <span className={styles.qrStatLabel}>scans</span>
                </div>
                <div className={`badge ${qr.is_active ? 'badge-green' : 'badge-red'}`}>
                  {qr.is_active ? 'Active' : 'Inactive'}
                </div>
                {qr.tags?.length > 0 && (
                  <div className={styles.qrTags}>
                    {qr.tags.slice(0, 2).map((tag, j) => (
                      <span key={j} className="badge badge-blue">{tag}</span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="card">
          <div className="empty-state">
            <div className="empty-state-icon"><QrCode size={32} /></div>
            <h3 className="empty-state-title">No QR codes yet</h3>
            <p className="empty-state-desc">Create your first dynamic QR code and start tracking scans.</p>
            <Link href="/dashboard/qr/new" className="btn btn-primary"><Plus size={18} /> Create QR Code</Link>
          </div>
        </div>
      )}
    </div>
  );
}
