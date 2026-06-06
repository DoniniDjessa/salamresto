"use client";
import { useState, useEffect, Suspense } from 'react';
import { supabase } from '@/lib/supabase';
import { OrderStatus } from '@/types';
import {
  TrendingUp, ShoppingBag, Clock, CheckCircle2,
  CreditCard, Search, Monitor, Smartphone, Utensils, ChevronDown,
  Truck, MapPin, Phone, X
} from 'lucide-react';
import RoleGuard from '@/components/RoleGuard';

/* ─── helpers ──────────────────────────────────────────────── */
const todayStart = () => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
};

const monthStart = () => {
  const d = new Date();
  d.setDate(1); d.setHours(0, 0, 0, 0);
  return d.toISOString();
};

const PAID = (s: string) => s === 'termine' || s === 'paye';

const STATUS_META: Record<string, { label: string; cls: string }> = {
  en_attente:    { label: 'En attente',     cls: 'badge-warning' },
  en_preparation:{ label: 'En préparation', cls: 'badge-info'    },
  pret:          { label: 'Prête ✓',        cls: 'badge-success' },
  termine:       { label: 'Réglée',         cls: 'badge-neutral' },
  paye:          { label: 'Clôturée',       cls: 'badge-neutral' },
  en_livraison:  { label: 'En livraison',   cls: 'badge-warning' },
  livre:         { label: 'Livrée',         cls: 'badge-success' },
};

const sourceLabel = (o: any) => {
  if (o.type === 'salle')    return { icon: <Monitor size={14}/>,    text: `Table ${o.tablenumber}` };
  if (o.type === 'comptoir') return { icon: <Utensils size={14}/>,   text: o.customername || 'Comptoir' };
  return                            { icon: <Smartphone size={14}/>, text: o.customername || 'Livraison' };
};

const thStyle: React.CSSProperties = {
  padding: '0.7rem 1rem', textAlign: 'left', fontWeight: '800',
  fontSize: '0.65rem', color: 'var(--text-muted)', letterSpacing: '0.08em',
  textTransform: 'uppercase', borderBottom: '1px solid var(--border-color)',
  background: 'var(--bg-secondary)', whiteSpace: 'nowrap',
};
const tdStyle: React.CSSProperties = {
  padding: '0.875rem 1rem', borderBottom: '1px solid var(--border-color)',
  fontSize: '0.82rem', verticalAlign: 'middle',
};

/* ─── main content ─────────────────────────────────────────── */
function VentesContent() {
  const [orders,     setOrders]     = useState<any[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [period,     setPeriod]     = useState<'today' | 'month' | 'range'>('today');
  const [startDate,  setStartDate]  = useState('');
  const [endDate,    setEndDate]    = useState('');
  const [search,     setSearch]     = useState('');

  const [showDeliveryModal, setShowDeliveryModal] = useState(false);
  const [deliveryOrder, setDeliveryOrder] = useState<any | null>(null);
  const [deliveryForm, setDeliveryForm] = useState({ customername: '', contactphone: '', deliveryaddress: '', startNow: true });

  useEffect(() => {
    fetchOrders();
    const ch = supabase.channel('ventes-live')
      .on('postgres_changes', { event: '*', table: 'resto-orders', schema: 'public' }, fetchOrders)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [period, startDate, endDate]);

  async function fetchOrders() {
    setLoading(true);
    let q = supabase.from('resto-orders').select('*').order('created_at', { ascending: false });

    if (period === 'today') {
      q = q.gte('created_at', todayStart());
    } else if (period === 'month') {
      q = q.gte('created_at', monthStart());
    } else if (period === 'range' && startDate && endDate) {
      const end = new Date(endDate); end.setDate(end.getDate() + 1);
      q = q.gte('created_at', new Date(startDate).toISOString()).lte('created_at', end.toISOString());
    } else if (period === 'range') {
      q = q.gte('created_at', todayStart());
    }

    const { data } = await q;
    if (data) setOrders(data);
    setLoading(false);
  }

  async function encaisser(id: string) {
    await supabase.from('resto-orders').update({ status: 'termine' as OrderStatus }).eq('id', id);
    fetchOrders();
  }

  async function encaisserExternal(id: string) {
    await supabase.from('resto-orders').update({ status: 'paye' as OrderStatus }).eq('id', id);
    fetchOrders();
  }

  const openDeliveryModal = (o: any) => {
    setDeliveryOrder(o);
    setDeliveryForm({ customername: o.customername || '', contactphone: o.contactphone || '', deliveryaddress: o.deliveryaddress || '', startNow: true });
    setShowDeliveryModal(true);
  };

  const saveDelivery = async (e?: any) => {
    if (e && e.preventDefault) e.preventDefault();
    if (!deliveryOrder) return;
    const updates: any = {
      customername: deliveryForm.customername,
      contactphone: deliveryForm.contactphone,
      deliveryaddress: deliveryForm.deliveryaddress,
    };
    if (deliveryForm.startNow) updates.status = 'en_livraison';
    await supabase.from('resto-orders').update(updates).eq('id', deliveryOrder.id);
    setShowDeliveryModal(false);
    setDeliveryOrder(null);
    fetchOrders();
  };

  // Client-side text filter
  const filtered = orders.filter(o => {
    if (!search.trim()) return true;
    const s = search.toLowerCase();
    return (
      String(o.tablenumber || '').includes(s) ||
      (o.customername || '').toLowerCase().includes(s) ||
      (o.status || '').toLowerCase().includes(s) ||
      (o.items || []).some((i: any) => (i.name || '').toLowerCase().includes(s))
    );
  });

  // Stat calculations
  const revenue       = filtered.filter(o => PAID(o.status)).reduce((a, o) => a + (o.total || 0), 0);
  const toSettle      = filtered.filter(o => o.status === 'pret');
  const inKitchen     = filtered.filter(o => ['en_attente', 'en_preparation'].includes(o.status));
  const settled       = filtered.filter(o => PAID(o.status));

  const tiles = [
    { label: "CA ENCAISSÉ",         value: `${revenue.toLocaleString()} F`, icon: <TrendingUp size={18}/>, color: 'var(--accent-primary)',  bg: 'rgba(249,115,22,0.09)'  },
    { label: "COMMANDES",           value: `${filtered.length}`,             icon: <ShoppingBag size={18}/>, color: 'var(--accent-success)', bg: 'rgba(16,185,129,0.09)'  },
    { label: "À ENCAISSER",         value: `${toSettle.length}`,             icon: <CreditCard size={18}/>, color: 'var(--accent-warning)', bg: 'rgba(245,158,11,0.09)'  },
    { label: "EN CUISINE",          value: `${inKitchen.length}`,            icon: <Clock size={18}/>,      color: '#6366F1',               bg: 'rgba(99,102,241,0.09)'  },
  ];

  const periodLabel = { today: "Aujourd'hui", month: 'Ce mois', range: 'Période' };

  return (
    <RoleGuard allowedRoles={['superAdmin', 'admin', 'manager', 'caisse']}>
    <div className="page-wrap animate-fade-in">

      {/* Header */}
      <header className="page-header">
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: '900' }}>Ventes</h1>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.2rem' }}>
            <span className="live-dot" />
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.82rem' }}>
              Caisse en temps réel · {periodLabel[period]}
            </p>
          </div>
        </div>
      </header>

      {/* ── Filters ── */}
      <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.75rem', flexWrap: 'wrap', alignItems: 'center' }}>

        {/* Period selector */}
        <div style={{ display: 'flex', background: 'var(--bg-secondary)', borderRadius: '12px', padding: '4px', border: '1px solid var(--border-color)', gap: '2px' }}>
          {(['today', 'month', 'range'] as const).map(p => (
            <button key={p} onClick={() => setPeriod(p)}
              style={{ padding: '0.5rem 1rem', borderRadius: '9px', background: period === p ? 'white' : 'transparent', color: period === p ? 'var(--text-primary)' : 'var(--text-secondary)', border: 'none', fontWeight: '700', fontSize: '0.78rem', cursor: 'pointer', transition: 'all 0.15s', boxShadow: period === p ? 'var(--shadow-sm)' : 'none', whiteSpace: 'nowrap' }}>
              {p === 'today' ? "Aujourd'hui" : p === 'month' ? 'Ce Mois' : 'Période'}
            </button>
          ))}
        </div>

        {/* Date range inputs */}
        {period === 'range' && (
          <>
            <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)}
              style={{ padding: '0.5rem 0.75rem', border: '1.5px solid var(--border-color)', borderRadius: '9px', fontSize: '0.78rem', fontFamily: 'var(--font-body)', color: 'var(--text-primary)', background: 'white', outline: 'none' }} />
            <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>→</span>
            <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)}
              style={{ padding: '0.5rem 0.75rem', border: '1.5px solid var(--border-color)', borderRadius: '9px', fontSize: '0.78rem', fontFamily: 'var(--font-body)', color: 'var(--text-primary)', background: 'white', outline: 'none' }} />
          </>
        )}

        {/* Search */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'white', border: '1.5px solid var(--border-color)', borderRadius: '10px', padding: '0.5rem 0.875rem', boxShadow: 'var(--shadow-sm)', marginLeft: 'auto' }}>
          <Search size={14} color="var(--text-muted)" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Table, client, plat…"
            style={{ border: 'none', outline: 'none', background: 'transparent', color: 'var(--text-primary)', fontSize: '0.8rem', width: '190px', fontFamily: 'var(--font-body)' }} />
        </div>
      </div>

      {/* ── Stat tiles ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1.25rem', marginBottom: '2rem' }}>
        {tiles.map(t => (
          <div key={t.label} className="stat-tile">
            <div className="stat-tile-top" style={{ background: t.color }} />
            <div className="stat-tile-icon" style={{ background: t.bg, color: t.color }}>{t.icon}</div>
            <p className="stat-tile-value">{t.value}</p>
            <p className="stat-tile-label">{t.label}</p>
          </div>
        ))}
      </div>

      {/* ── Orders table ── */}
      <div className="glass-panel" style={{ overflow: 'hidden' }}>

        {/* Table header bar */}
        <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <p style={{ fontWeight: '800', fontSize: '0.9rem' }}>
            Commandes
            <span style={{ marginLeft: '0.5rem', background: 'var(--bg-tertiary)', color: 'var(--text-secondary)', padding: '0.1rem 0.5rem', borderRadius: '100px', fontSize: '0.7rem', fontWeight: '700' }}>
              {filtered.length}
            </span>
          </p>
          {toSettle.length > 0 && (
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.3rem 0.75rem', background: 'rgba(249,115,22,0.08)', border: '1px solid rgba(249,115,22,0.2)', borderRadius: '100px', fontSize: '0.7rem', fontWeight: '800', color: 'var(--accent-primary)' }}>
              <CreditCard size={12}/> {toSettle.length} à encaisser
            </span>
          )}
        </div>

        {loading ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>Chargement…</div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: '4rem', textAlign: 'center', color: 'var(--text-muted)' }}>
            <ShoppingBag size={36} style={{ opacity: 0.25, marginBottom: '0.75rem' }} />
            <p style={{ fontSize: '0.85rem' }}>Aucune commande sur cette période</p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th style={thStyle}>Heure</th>
                  <th style={thStyle}>Source</th>
                  <th style={thStyle}>Articles</th>
                  <th style={{ ...thStyle, textAlign: 'right' }}>Total</th>
                  <th style={thStyle}>Statut</th>
                  <th style={thStyle}>Action</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((o, idx) => {
                  const src   = sourceLabel(o);
                  const meta  = STATUS_META[o.status] || { label: o.status, cls: 'badge-neutral' };
                  const isPret = o.status === 'pret';
                  const time  = new Date(o.created_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
                  const date  = new Date(o.created_at).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' });
                  const firstItem = o.items?.[0]?.name || '—';
                  const moreItems = (o.items?.length || 0) - 1;

                  return (
                    <tr key={o.id}
                      style={{ background: isPret ? 'rgba(249,115,22,0.02)' : idx % 2 === 0 ? 'white' : 'var(--bg-secondary)', transition: 'background 0.1s' }}
                      onMouseEnter={e => (e.currentTarget.style.background = 'rgba(249,115,22,0.04)')}
                      onMouseLeave={e => (e.currentTarget.style.background = isPret ? 'rgba(249,115,22,0.02)' : idx % 2 === 0 ? 'white' : 'var(--bg-secondary)')}
                    >
                      {/* Time */}
                      <td style={tdStyle}>
                        <p style={{ fontWeight: '700' }}>{time}</p>
                        {period !== 'today' && <p style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>{date}</p>}
                      </td>

                      {/* Source */}
                      <td style={tdStyle}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-secondary)' }}>
                          {src.icon}
                          <span style={{ fontWeight: '800', color: 'var(--text-primary)' }}>{src.text}</span>
                        </div>
                      </td>

                      {/* Articles */}
                      <td style={tdStyle}>
                        <p style={{ color: 'var(--text-primary)' }}>
                          {firstItem}
                          {moreItems > 0 && <span style={{ color: 'var(--text-muted)', fontSize: '0.72rem' }}> +{moreItems}</span>}
                        </p>
                        <p style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>{o.items?.length || 0} article(s)</p>
                        {o.type === 'external' && (
                          <div style={{ marginTop: '0.45rem', display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                            <MapPin size={12} color="var(--text-muted)" />
                            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', lineHeight: 1.2 }}>
                              <div>{o.deliveryaddress || '—'}</div>
                              {o.contactphone && <div style={{ fontWeight: 800, color: 'var(--text-primary)' }}>{o.contactphone}</div>}
                            </div>
                          </div>
                        )}
                      </td>

                      {/* Total */}
                      <td style={{ ...tdStyle, textAlign: 'right', fontWeight: '900', fontSize: '0.9rem', color: PAID(o.status) ? 'var(--accent-success)' : 'var(--text-primary)', whiteSpace: 'nowrap' }}>
                        {(o.total || 0).toLocaleString()} F
                      </td>

                      {/* Status */}
                      <td style={tdStyle}>
                        <span className={`badge ${meta.cls}`}>{meta.label}</span>
                      </td>

                      {/* Action */}
                      <td style={tdStyle}>
                        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                          {o.type === 'external' && (
                            <>
                              <button title="Ajouter / démarrer livraison" onClick={() => openDeliveryModal(o)}
                                style={{ width: '38px', height: '38px', borderRadius: '8px', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                                <Truck size={16} color="var(--text-secondary)" />
                              </button>
                              {!PAID(o.status) && (
                                <button onClick={() => encaisserExternal(o.id)}
                                  style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', padding: '0.4rem 0.75rem', background: 'var(--accent-primary)', color: 'white', border: 'none', borderRadius: '8px', fontWeight: '800', fontSize: '0.7rem', cursor: 'pointer', boxShadow: 'var(--shadow-glow)', whiteSpace: 'nowrap' }}>
                                  <CreditCard size={13}/> ENCAISSER
                                </button>
                              )}
                            </>
                          )}
                          {o.type !== 'external' && isPret && (
                            <button onClick={() => encaisser(o.id)}
                              style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', padding: '0.4rem 0.875rem', background: 'var(--accent-primary)', color: 'white', border: 'none', borderRadius: '8px', fontWeight: '800', fontSize: '0.7rem', cursor: 'pointer', boxShadow: 'var(--shadow-glow)', whiteSpace: 'nowrap' }}>
                              <CreditCard size={13}/> ENCAISSER
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
      {/* Delivery modal */}
      {showDeliveryModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 1200, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <form onSubmit={saveDelivery} style={{ background: 'white', borderRadius: '16px', padding: '1.25rem', width: '420px', boxShadow: 'var(--shadow-lg)', border: '1px solid var(--border-color)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: '900' }}><Truck size={18} /> Détails Livraison</h3>
              <button type="button" onClick={() => setShowDeliveryModal(false)} style={{ background: 'transparent', border: 'none', cursor: 'pointer' }}><X size={18} /></button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
              <input placeholder="Nom du client" value={deliveryForm.customername} onChange={e => setDeliveryForm(f => ({ ...f, customername: e.target.value }))} style={{ padding: '0.7rem', borderRadius: '10px', border: '1.5px solid var(--border-color)', background: 'var(--bg-tertiary)' }} required />
              <input placeholder="Téléphone" value={deliveryForm.contactphone} onChange={e => setDeliveryForm(f => ({ ...f, contactphone: e.target.value }))} style={{ padding: '0.7rem', borderRadius: '10px', border: '1.5px solid var(--border-color)', background: 'var(--bg-tertiary)' }} />
              <textarea placeholder="Adresse de livraison" value={deliveryForm.deliveryaddress} onChange={e => setDeliveryForm(f => ({ ...f, deliveryaddress: e.target.value }))} style={{ padding: '0.7rem', borderRadius: '10px', border: '1.5px solid var(--border-color)', background: 'var(--bg-tertiary)' }} rows={3} />
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <input type="checkbox" checked={deliveryForm.startNow} onChange={e => setDeliveryForm(f => ({ ...f, startNow: e.target.checked }))} />
                <span style={{ fontWeight: '800', fontSize: '0.9rem' }}>Démarrer la livraison maintenant</span>
              </label>
              <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.25rem' }}>
                <button type="submit" className="btn-primary" style={{ flex: 1, justifyContent: 'center' }}>Enregistrer</button>
                <button type="button" onClick={() => setShowDeliveryModal(false)} className="btn-secondary" style={{ flex: 1, justifyContent: 'center' }}>Annuler</button>
              </div>
            </div>
          </form>
        </div>
      )}
    </div>
    </RoleGuard>
  );
}

export default function VentesPage() {
  return (
    <Suspense fallback={<div style={{ padding: '2rem', color: 'var(--text-muted)' }}>Chargement…</div>}>
      <VentesContent />
    </Suspense>
  );
}
