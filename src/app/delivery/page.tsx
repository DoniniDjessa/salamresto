"use client";
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { OrderStatus } from '@/types';
import { Truck, MapPin, User, CheckCircle, Clock, Phone, X, CreditCard, Printer } from 'lucide-react';
import RoleGuard from '@/components/RoleGuard';
import ModalPortal from '@/components/ModalPortal';
import ReceiptModal, { type ReceiptOrder } from '@/components/ReceiptModal';

const STATUS_LABEL: Record<string, { label: string; cls: string }> = {
  en_livraison: { label: 'En livraison', cls: 'badge-warning' },
  livre:        { label: 'Livrée',       cls: 'badge-success' },
  paye:         { label: 'Payée',        cls: 'badge-neutral' },
};

const todayStart = () => { const d = new Date(); d.setHours(0,0,0,0); return d.toISOString(); };

export default function LivraisonsDashboard() {
  const [active,      setActive]      = useState<any[]>([]);
  const [todayAll,    setTodayAll]    = useState<any[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [payingOrder, setPayingOrder] = useState<any | null>(null);
  const [payMethod,   setPayMethod]   = useState<'cash' | 'wave' | 'orange'>('cash');
  const [payPhone,    setPayPhone]    = useState('');
  const [payLoading,  setPayLoading]  = useState(false);
  const [receiptOrder, setReceiptOrder] = useState<ReceiptOrder | null>(null);

  useEffect(() => {
    fetchActive();
    fetchTodayAll();
    const ch = supabase.channel('resto-orders-livraisons')
      .on('postgres_changes', { event: '*', table: 'resto-orders', schema: 'public' }, () => {
        fetchActive(); fetchTodayAll();
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  async function fetchActive() {
    const { data } = await supabase.from('resto-orders').select('*')
      .in('status', ['en_livraison', 'livre'])
      .not('deliveryaddress', 'is', null)
      .order('created_at', { ascending: true });
    if (data) setActive(data.filter((o: any) => o.deliveryaddress));
    setLoading(false);
  }

  async function fetchTodayAll() {
    const { data } = await supabase.from('resto-orders').select('*')
      .eq('type', 'external')
      .not('deliveryaddress', 'is', null)
      .gte('created_at', todayStart())
      .order('created_at', { ascending: false });
    if (data) setTodayAll(data.filter((o: any) => o.deliveryaddress));
  }

  const markDelivered = async (id: string) => {
    await supabase.from('resto-orders').update({ status: 'livre' as OrderStatus }).eq('id', id);
    fetchActive(); fetchTodayAll();
  };

  const cancelDelivery = async (id: string) => {
    if (!confirm('Annuler cette livraison ? La commande retournera dans l\'onglet Externe.')) return;
    await supabase.from('resto-orders').update({ status: 'pret' as OrderStatus }).eq('id', id);
    fetchActive(); fetchTodayAll();
  };

  const openPayForm = (o: any) => {
    setPayingOrder(o);
    setPayPhone(o.contactphone || '');
    setPayMethod('cash');
  };

  const closePayForm = () => {
    setPayingOrder(null);
    setPayPhone('');
    setPayMethod('cash');
  };

  const markPaid = async () => {
    if (!payingOrder) return;
    setPayLoading(true);
    await supabase.from('resto-orders').update({
      status: 'paye' as OrderStatus,
      payment_method: payMethod,
      ...(payPhone.trim() ? { contactphone: payPhone.trim() } : {}),
    }).eq('id', payingOrder.id);
    closePayForm();
    setPayLoading(false);
    fetchActive(); fetchTodayAll();
  };

  const todayPaidTotal = todayAll.filter(o => o.status === 'paye').reduce((a: number, o: any) => a + (o.total || 0), 0);

  const thS: React.CSSProperties = { padding: '0.6rem 1rem', textAlign: 'left', fontWeight: '800', fontSize: '0.62rem', color: 'var(--text-muted)', letterSpacing: '0.08em', textTransform: 'uppercase', borderBottom: '1px solid var(--border-color)', background: 'var(--bg-secondary)', whiteSpace: 'nowrap' };
  const tdS: React.CSSProperties = { padding: '0.75rem 1rem', borderBottom: '1px solid var(--border-color)', fontSize: '0.82rem', verticalAlign: 'middle' };

  const PAY_METHODS: { key: 'cash' | 'wave' | 'orange'; label: string }[] = [
    { key: 'cash',   label: 'Espèces' },
    { key: 'wave',   label: 'Wave'    },
    { key: 'orange', label: 'Orange'  },
  ];

  return (
    <RoleGuard allowedRoles={['superAdmin', 'admin', 'manager', 'caisse', 'serveur', 'livreur']}>
    <div className="page-wrap animate-fade-in">

      {/* Header */}
      <header className="page-header">
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: '900', display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <Truck size={26} color="var(--accent-primary)" /> Livraisons
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Livraisons en cours · {active.length} en route</p>
        </div>
        <div style={{ textAlign: 'center', padding: '0.75rem 1.25rem', background: 'rgba(245,158,11,0.08)', borderRadius: '12px', border: '1px solid rgba(245,158,11,0.2)' }}>
          <p style={{ fontSize: '1.4rem', fontWeight: '900', color: 'var(--accent-warning)' }}>{active.length}</p>
          <p style={{ fontSize: '0.6rem', fontWeight: '900', color: 'var(--accent-warning)', letterSpacing: '0.08em' }}>EN ROUTE</p>
        </div>
      </header>

      {/* Active deliveries */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1rem', marginBottom: '2.5rem' }}>
        {loading ? (
          <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '3rem', color: 'var(--text-muted)', fontSize: '0.85rem' }}>Chargement…</div>
        ) : active.length === 0 ? (
          <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '3rem', color: 'var(--text-muted)', background: 'rgba(245,158,11,0.05)', borderRadius: '16px', border: '1px dashed rgba(245,158,11,0.25)' }}>
            <Truck size={32} style={{ opacity: 0.3, marginBottom: '0.75rem', display: 'block', margin: '0 auto 0.75rem' }} />
            <p style={{ fontWeight: '700', fontSize: '0.85rem' }}>Aucune livraison en cours</p>
            <p style={{ fontSize: '0.75rem', marginTop: '0.25rem' }}>Les livraisons apparaissent ici depuis l'onglet Externe</p>
          </div>
        ) : (
          active.map(o => {
            const isPaying = payingOrder?.id === o.id;
            return (
              <div key={o.id} style={{ background: 'white', border: '1px solid var(--border-color)', borderRadius: '16px', padding: '1.25rem', boxShadow: 'var(--shadow-sm)', borderTop: `3px solid ${o.status === 'livre' ? 'var(--accent-success)' : 'var(--accent-warning)'}` }}>
                {/* Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.875rem' }}>
                  <p style={{ fontWeight: '900', fontSize: '0.9rem' }}>#{o.id.slice(0,5).toUpperCase()}</p>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <Clock size={11} color="var(--text-muted)" />
                    <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontWeight: '700' }}>
                      {new Date(o.created_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                </div>

                {/* Client info */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem', marginBottom: '0.875rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                    <User size={13} color="var(--text-secondary)" />
                    <span style={{ fontWeight: '800', fontSize: '0.875rem' }}>{o.customername || '—'}</span>
                  </div>
                  {o.contactphone && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                      <Phone size={12} color="var(--text-secondary)" />
                      <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>{o.contactphone}</span>
                    </div>
                  )}
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.6rem' }}>
                    <MapPin size={12} color="var(--text-secondary)" style={{ marginTop: '0.1rem', flexShrink: 0 }} />
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>{o.deliveryaddress}</span>
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.875rem' }}>
                  <p style={{ fontSize: '1.1rem', fontWeight: '900' }}>{(o.total || 0).toLocaleString()} F</p>
                  <button onClick={() => setReceiptOrder(o)} title="Imprimer le reçu"
                    style={{ width: '34px', height: '34px', borderRadius: '8px', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--text-muted)', flexShrink: 0 }}>
                    <Printer size={14} />
                  </button>
                </div>

                {/* Actions */}
                {o.status === 'en_livraison' ? (
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button onClick={() => markDelivered(o.id)}
                      style={{ flex: 1, padding: '0.75rem', borderRadius: '10px', background: 'var(--accent-success)', color: 'white', border: 'none', fontWeight: '800', fontSize: '0.8rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem', boxShadow: '0 4px 12px rgba(16,185,129,0.22)' }}>
                      <CheckCircle size={15} /> LIVRÉ
                    </button>
                    <button onClick={() => cancelDelivery(o.id)}
                      style={{ padding: '0.75rem 1rem', borderRadius: '10px', background: 'rgba(239,68,68,0.07)', color: 'var(--accent-danger)', border: '1px solid rgba(239,68,68,0.18)', fontWeight: '800', fontSize: '0.78rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                      <X size={14} /> Annuler
                    </button>
                  </div>
                ) : isPaying ? (
                  /* Inline payment form */
                  <div style={{ background: 'var(--bg-secondary)', borderRadius: '12px', padding: '0.875rem', border: '1px solid var(--border-color)' }}>
                    <p style={{ fontSize: '0.65rem', fontWeight: '900', letterSpacing: '0.08em', color: 'var(--text-muted)', marginBottom: '0.6rem' }}>MODE DE PAIEMENT</p>
                    <div style={{ display: 'flex', gap: '0.4rem', marginBottom: '0.75rem' }}>
                      {PAY_METHODS.map(m => (
                        <button key={m.key} onClick={() => setPayMethod(m.key)}
                          style={{ flex: 1, padding: '0.45rem 0.25rem', borderRadius: '8px', border: `2px solid ${payMethod === m.key ? 'var(--accent-primary)' : 'var(--border-color)'}`, background: payMethod === m.key ? 'rgba(249,115,22,0.08)' : 'transparent', color: payMethod === m.key ? 'var(--accent-primary)' : 'var(--text-muted)', fontWeight: '800', fontSize: '0.7rem', cursor: 'pointer' }}>
                          {m.label}
                        </button>
                      ))}
                    </div>
                    <input type="tel" placeholder="N° téléphone (optionnel)" value={payPhone}
                      onChange={e => setPayPhone(e.target.value)}
                      style={{ width: '100%', padding: '0.5rem 0.75rem', borderRadius: '8px', border: '1px solid var(--border-color)', fontSize: '0.8rem', marginBottom: '0.6rem', boxSizing: 'border-box', outline: 'none' }} />
                    <div style={{ display: 'flex', gap: '0.4rem' }}>
                      <button onClick={markPaid} disabled={payLoading}
                        style={{ flex: 1, padding: '0.65rem', borderRadius: '9px', background: 'var(--accent-primary)', color: 'white', border: 'none', fontWeight: '800', fontSize: '0.78rem', cursor: 'pointer', boxShadow: 'var(--shadow-glow)' }}>
                        {payLoading ? '…' : 'CONFIRMER ✓'}
                      </button>
                      <button onClick={closePayForm}
                        style={{ padding: '0.65rem 0.875rem', borderRadius: '9px', background: 'transparent', color: 'var(--text-muted)', border: '1px solid var(--border-color)', fontWeight: '700', fontSize: '0.78rem', cursor: 'pointer' }}>
                        Annuler
                      </button>
                    </div>
                  </div>
                ) : (
                  /* livre: show PAYER button */
                  <button onClick={() => openPayForm(o)}
                    style={{ width: '100%', padding: '0.7rem', borderRadius: '10px', background: 'var(--accent-primary)', color: 'white', border: 'none', fontWeight: '800', fontSize: '0.8rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.45rem', boxShadow: 'var(--shadow-glow)' }}>
                    <CreditCard size={15} /> ENCAISSER
                  </button>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Table du jour */}
      <div className="glass-panel" style={{ overflow: 'hidden' }}>
        <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <p style={{ fontWeight: '800', fontSize: '0.9rem' }}>
            Livraisons du jour
            <span style={{ marginLeft: '0.5rem', background: 'var(--bg-tertiary)', color: 'var(--text-secondary)', padding: '0.1rem 0.5rem', borderRadius: '100px', fontSize: '0.7rem', fontWeight: '700' }}>
              {todayAll.length}
            </span>
          </p>
          <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
            Encaissé: <strong style={{ color: 'var(--accent-success)' }}>{todayPaidTotal.toLocaleString()} F</strong>
          </span>
        </div>
        {todayAll.length === 0 ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
            Aucune livraison aujourd'hui
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th style={thS}>Heure</th>
                  <th style={thS}>Client</th>
                  <th style={thS}>Adresse</th>
                  <th style={{ ...thS, textAlign: 'right' }}>Total</th>
                  <th style={thS}>Statut</th>
                </tr>
              </thead>
              <tbody>
                {todayAll.map((o, idx) => {
                  const meta = STATUS_LABEL[o.status] || { label: o.status, cls: 'badge-neutral' };
                  const isPaid = o.status === 'paye';
                  return (
                    <tr key={o.id}
                      style={{ background: idx % 2 === 0 ? 'white' : 'var(--bg-secondary)' }}
                      onMouseEnter={e => (e.currentTarget.style.background = 'rgba(249,115,22,0.04)')}
                      onMouseLeave={e => (e.currentTarget.style.background = idx % 2 === 0 ? 'white' : 'var(--bg-secondary)')}
                    >
                      <td style={tdS}>
                        <span style={{ fontWeight: '700', fontSize: '0.78rem' }}>
                          {new Date(o.created_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </td>
                      <td style={tdS}>
                        <p style={{ fontWeight: '800', fontSize: '0.82rem' }}>{o.customername || '—'}</p>
                        {o.contactphone && <p style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>{o.contactphone}</p>}
                      </td>
                      <td style={{ ...tdS, maxWidth: '200px' }}>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {o.deliveryaddress}
                        </span>
                      </td>
                      <td style={{ ...tdS, textAlign: 'right', fontWeight: '900', color: isPaid ? 'var(--accent-success)' : 'var(--text-primary)', whiteSpace: 'nowrap' }}>
                        {(o.total || 0).toLocaleString()} F
                      </td>
                      <td style={tdS}>
                        <span className={`badge ${meta.cls}`}>{meta.label}</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <ModalPortal>
        {receiptOrder && (
          <ReceiptModal order={receiptOrder} onClose={() => setReceiptOrder(null)} />
        )}
      </ModalPortal>
    </div>
    </RoleGuard>
  );
}
