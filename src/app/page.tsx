"use client";
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import {
  TrendingUp, ShoppingBag, Truck, Activity,
  Bell, Search, ChevronRight, Clock, Monitor, Smartphone,
} from 'lucide-react';
import RoleGuard from '@/components/RoleGuard';
import { useAuth } from '@/context/AuthContext';

type Period = 'today' | 'yesterday' | 'month' | 'month-pick' | 'range';

const todayStr  = () => new Date().toISOString().split('T')[0];
const curMonthStr = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`; };

export default function Home() {
  const { profile } = useAuth();
  const [recentOrders, setRecentOrders] = useState<any[]>([]);
  const [stats, setStats]   = useState({ totalRevenue: 0, totalExpenses: 0, deliveryWaiting: 0, deliverySuccess: 0 });
  const [loading, setLoading] = useState(true);

  // ── Date filters ──
  const [period,    setPeriod]    = useState<Period>('today');
  const [monthPick, setMonthPick] = useState<string>(curMonthStr);
  const [startDate, setStartDate] = useState('');
  const [endDate,   setEndDate]   = useState('');

  useEffect(() => {
    fetchHomeData();
    const ch = supabase.channel('home-updates')
      .on('postgres_changes', { event: '*', table: 'resto-orders', schema: 'public' }, fetchHomeData)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [period, monthPick, startDate, endDate]);

  function buildRange(): { from: string; to: string } | null {
    const now = new Date();
    if (period === 'today') {
      const d = new Date(); d.setHours(0,0,0,0);
      return { from: d.toISOString(), to: now.toISOString() };
    }
    if (period === 'yesterday') {
      const f = new Date(); f.setDate(f.getDate()-1); f.setHours(0,0,0,0);
      const t = new Date(); t.setDate(t.getDate()-1); t.setHours(23,59,59,999);
      return { from: f.toISOString(), to: t.toISOString() };
    }
    if (period === 'month') {
      const f = new Date(now.getFullYear(), now.getMonth(), 1);
      return { from: f.toISOString(), to: now.toISOString() };
    }
    if (period === 'month-pick' && monthPick) {
      const [y, m] = monthPick.split('-').map(Number);
      return {
        from: new Date(y, m-1, 1).toISOString(),
        to:   new Date(y, m, 0, 23, 59, 59).toISOString(),
      };
    }
    if (period === 'range' && startDate && endDate) {
      const t = new Date(endDate); t.setDate(t.getDate()+1);
      return { from: new Date(startDate).toISOString(), to: t.toISOString() };
    }
    // range with incomplete inputs → today
    const d = new Date(); d.setHours(0,0,0,0);
    return { from: d.toISOString(), to: now.toISOString() };
  }

  async function fetchHomeData() {
    const range = buildRange();

    let qOrders   = supabase.from('resto-orders').select('*').order('created_at', { ascending: false });
    let qAllOrders = supabase.from('resto-orders').select('total, type, status');
    let qExpenses  = supabase.from('resto-expenses').select('amount');

    if (range) {
      qOrders    = qOrders.gte('created_at', range.from).lte('created_at', range.to);
      qAllOrders = qAllOrders.gte('created_at', range.from).lte('created_at', range.to);
      qExpenses  = qExpenses.gte('created_at', range.from).lte('created_at', range.to);
    }

    const [{ data: orders }, { data: allOrders }, { data: expenses }] = await Promise.all([
      qOrders.limit(8),
      qAllOrders,
      qExpenses,
    ]);

    if (orders) setRecentOrders(orders);
    const totalRevenue    = allOrders?.filter(o => o.status === 'termine' || o.status === 'paye').reduce((a, o) => a + (o.total || 0), 0) ?? 0;
    const deliveryWaiting = allOrders?.filter(o => o.type === 'external' && o.status !== 'livre' && o.status !== 'annule').length ?? 0;
    const deliverySuccess = allOrders?.filter(o => o.type === 'external' && o.status === 'livre').length ?? 0;
    const totalExpenses   = expenses?.reduce((a, e) => a + (e.amount || 0), 0) ?? 0;
    setStats({ totalRevenue, totalExpenses, deliveryWaiting, deliverySuccess });
    setLoading(false);
  }

  const periodLabel: Record<Period, string> = {
    today:       "Aujourd'hui",
    yesterday:   'Hier',
    month:       'Ce Mois',
    'month-pick': monthPick ? new Date(monthPick + '-01').toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' }) : 'Mois',
    range:       'Période',
  };

  const tiles = [
    { label: 'REVENU TOTAL',          value: `${stats.totalRevenue.toLocaleString()} F`,  icon: <TrendingUp size={18}/>, color: 'var(--accent-primary)', bg: 'rgba(249,115,22,0.09)',  sub: `${recentOrders.length} commandes` },
    { label: 'COMMANDES',             value: `${recentOrders.length}`,                    icon: <ShoppingBag size={18}/>,color: 'var(--accent-success)', bg: 'rgba(16,185,129,0.09)',  sub: periodLabel[period] },
    { label: 'LIVRAISONS RÉUSSIES',  value: `${stats.deliverySuccess}`,                  icon: <Truck size={18}/>,      color: 'var(--accent-warning)', bg: 'rgba(245,158,11,0.09)',  sub: `${stats.deliveryWaiting} en attente` },
    { label: 'DÉPENSES',              value: `${stats.totalExpenses.toLocaleString()} F`, icon: <Activity size={18}/>,   color: 'var(--accent-danger)',  bg: 'rgba(239,68,68,0.09)',   sub: periodLabel[period] },
  ];

  const statusStyle = (s: string): React.CSSProperties => {
    if (s === 'paye')       return { background: 'rgba(16,185,129,0.1)', color: '#059669' };
    if (s === 'en_attente') return { background: 'rgba(239,68,68,0.1)',  color: '#DC2626' };
    return { background: 'rgba(249,115,22,0.1)', color: '#EA580C' };
  };

  const btnStyle = (active: boolean): React.CSSProperties => ({
    padding: '0.5rem 1rem', borderRadius: '9px',
    background: active ? 'white' : 'transparent',
    color: active ? 'var(--text-primary)' : 'var(--text-secondary)',
    border: 'none', fontWeight: '700', fontSize: '0.78rem',
    cursor: 'pointer', transition: 'all 0.15s',
    boxShadow: active ? 'var(--shadow-sm)' : 'none',
    whiteSpace: 'nowrap' as const,
  });

  return (
    <RoleGuard allowedRoles={['superAdmin', 'admin', 'manager', 'caisse']}>
    <div className="page-wrap animate-fade-in">

      {/* Header */}
      <header className="page-header">
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: '900', marginBottom: '0.2rem' }}>
            Bonjour, <span style={{ color: 'var(--accent-primary)' }}>{profile?.name || 'Chef'}</span> 👋
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
            Tableau de bord · {periodLabel[period]}
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.875rem', alignItems: 'center' }}>
          <div style={{ padding: '0.65rem 1rem', display: 'flex', alignItems: 'center', gap: '0.6rem', background: 'white', border: '1.5px solid var(--border-color)', borderRadius: '12px', width: '240px', boxShadow: 'var(--shadow-sm)' }}>
            <Search size={15} color="var(--text-muted)" />
            <input placeholder="Rechercher..." style={{ background: 'transparent', border: 'none', color: 'var(--text-primary)', outline: 'none', width: '100%', fontSize: '0.8rem' }} />
          </div>
          <button style={{ width: '42px', height: '42px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'white', border: '1.5px solid var(--border-color)', cursor: 'pointer', boxShadow: 'var(--shadow-sm)' }}>
            <Bell size={17} color="var(--text-secondary)" />
          </button>
        </div>
      </header>

      {/* ── Date filters ── */}
      <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ display: 'flex', background: 'var(--bg-secondary)', borderRadius: '12px', padding: '4px', border: '1px solid var(--border-color)', gap: '2px' }}>
          {(['today', 'yesterday', 'month', 'month-pick', 'range'] as const).map(p => (
            <button key={p} onClick={() => setPeriod(p)} style={btnStyle(period === p)}>
              {p === 'today' ? "Aujourd'hui" : p === 'yesterday' ? 'Hier' : p === 'month' ? 'Ce Mois' : p === 'month-pick' ? 'Mois ↓' : 'Période'}
            </button>
          ))}
        </div>

        {period === 'month-pick' && (
          <input
            type="month"
            value={monthPick}
            onChange={e => { if (e.target.value) setMonthPick(e.target.value); }}
            style={{ padding: '0.5rem 0.75rem', border: '1.5px solid var(--accent-primary)', borderRadius: '9px', fontSize: '0.78rem', fontFamily: 'var(--font-body)', color: 'var(--text-primary)', background: 'white', outline: 'none', cursor: 'pointer' }}
          />
        )}

        {period === 'range' && (
          <>
            <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)}
              style={{ padding: '0.5rem 0.75rem', border: '1.5px solid var(--border-color)', borderRadius: '9px', fontSize: '0.78rem', fontFamily: 'var(--font-body)', color: 'var(--text-primary)', background: 'white', outline: 'none' }} />
            <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>→</span>
            <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)}
              style={{ padding: '0.5rem 0.75rem', border: '1.5px solid var(--border-color)', borderRadius: '9px', fontSize: '0.78rem', fontFamily: 'var(--font-body)', color: 'var(--text-primary)', background: 'white', outline: 'none' }} />
          </>
        )}
      </div>

      {/* Stat Tiles */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1.25rem', marginBottom: '2.5rem' }}>
        {tiles.map(t => (
          <div key={t.label} className="stat-tile">
            <div className="stat-tile-top" style={{ background: t.color }} />
            <div className="stat-tile-icon" style={{ background: t.bg, color: t.color }}>{t.icon}</div>
            <p className="stat-tile-value">{t.value}</p>
            <p className="stat-tile-label">{t.label}</p>
            {t.sub && <p style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>{t.sub}</p>}
          </div>
        ))}
      </div>

      {/* Main Content */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.7fr 1fr', gap: '1.5rem' }}>

        {/* Recent Orders */}
        <section className="glass-panel" style={{ padding: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: '900', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <Clock size={17} color="var(--accent-primary)" /> Activité Récente
            </h3>
            <Link href="/admin" style={{ fontSize: '0.72rem', fontWeight: '800', color: 'var(--accent-primary)', display: 'flex', alignItems: 'center', gap: '0.3rem', textDecoration: 'none' }}>
              VOIR TOUT <ChevronRight size={12} />
            </Link>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
            {recentOrders.map(o => (
              <div key={o.id} style={{ padding: '0.875rem 1rem', background: 'var(--bg-secondary)', borderRadius: '12px', border: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', gap: '0.875rem', alignItems: 'center' }}>
                  <div style={{ width: '34px', height: '34px', borderRadius: '9px', background: 'white', border: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    {o.type === 'salle'
                      ? <Monitor size={15} color="var(--accent-primary)" />
                      : <Smartphone size={15} color="var(--accent-primary)" />}
                  </div>
                  <div>
                    <p style={{ fontWeight: '800', fontSize: '0.85rem' }}>
                      {o.type === 'salle' ? `Table ${o.tablenumber}` : o.customername}
                    </p>
                    <p style={{ fontSize: '0.67rem', color: 'var(--text-muted)' }}>
                      {new Date(o.created_at).toLocaleTimeString()}
                    </p>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.875rem' }}>
                  <span className="badge" style={statusStyle(o.status)}>{o.status?.toUpperCase()}</span>
                  <p style={{ fontWeight: '900', fontSize: '0.9rem' }}>{o.total.toLocaleString()} F</p>
                </div>
              </div>
            ))}
            {recentOrders.length === 0 && !loading && (
              <div style={{ textAlign: 'center', padding: '2.5rem', color: 'var(--text-muted)' }}>
                <ShoppingBag size={32} style={{ opacity: 0.3, marginBottom: '0.5rem' }} />
                <p style={{ fontSize: '0.8rem' }}>Aucune commande sur cette période</p>
              </div>
            )}
          </div>
        </section>

        {/* Right panel */}
        <section style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

          {/* Performance card */}
          <div style={{ padding: '1.5rem', background: 'linear-gradient(135deg, var(--accent-primary) 0%, #C2410C 100%)', borderRadius: '1.1rem', color: 'white', boxShadow: 'var(--shadow-glow)' }}>
            <p style={{ fontSize: '0.65rem', fontWeight: '900', letterSpacing: '0.1em', opacity: 0.8, marginBottom: '0.3rem' }}>PERFORMANCE MENU</p>
            <h3 style={{ fontSize: '1.05rem', fontWeight: '900', color: 'white', marginBottom: '1.1rem' }}>Plats les plus vendus</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {[
                { name: 'Attiéké Poisson', sales: 42, pct: 100 },
                { name: 'Kedjenou Poulet',  sales: 38, pct: 90  },
                { name: 'Alloco Plantain',  sales: 31, pct: 74  },
              ].map(item => (
                <div key={item.name}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.3rem' }}>
                    <span style={{ fontSize: '0.8rem', fontWeight: '700' }}>{item.name}</span>
                    <span style={{ fontSize: '0.7rem', opacity: 0.85, fontWeight: '800' }}>{item.sales} ventes</span>
                  </div>
                  <div style={{ height: '4px', background: 'rgba(255,255,255,0.2)', borderRadius: '4px', overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${item.pct}%`, background: 'white', borderRadius: '4px', opacity: 0.9 }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Livraisons card */}
          <div className="glass-panel" style={{ padding: '1.25rem' }}>
            <p style={{ fontSize: '0.7rem', fontWeight: '900', color: 'var(--text-muted)', letterSpacing: '0.08em', marginBottom: '0.875rem' }}>ÉTAT DES LIVRAISONS</p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
              {[
                { label: 'EN ATTENTE', value: stats.deliveryWaiting, color: 'var(--accent-danger)',  bg: 'rgba(239,68,68,0.06)' },
                { label: 'SUCCÈS',     value: stats.deliverySuccess,  color: 'var(--accent-success)', bg: 'rgba(16,185,129,0.06)' },
              ].map(s => (
                <div key={s.label} style={{ textAlign: 'center', padding: '1rem 0.5rem', background: s.bg, borderRadius: '10px', border: `1px solid ${s.bg}` }}>
                  <p style={{ fontSize: '1.6rem', fontWeight: '900', color: s.color, lineHeight: 1 }}>{s.value}</p>
                  <p style={{ fontSize: '0.58rem', color: 'var(--text-muted)', fontWeight: '900', letterSpacing: '0.08em', marginTop: '0.2rem' }}>{s.label}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Quick access */}
          <div className="glass-panel" style={{ padding: '1.25rem' }}>
            <p style={{ fontSize: '0.7rem', fontWeight: '900', color: 'var(--text-muted)', letterSpacing: '0.08em', marginBottom: '0.875rem' }}>ACCÈS RAPIDE</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {[
                { label: 'Vente en salle',  path: '/pos',            color: 'var(--accent-primary)' },
                { label: 'Écran cuisine',   path: '/kitchen',         color: 'var(--accent-success)' },
                { label: 'Gestion menu',    path: '/admin?tab=menu',  color: 'var(--accent-warning)' },
              ].map(l => (
                <Link key={l.path} href={l.path} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.65rem 0.875rem', background: 'var(--bg-secondary)', borderRadius: '10px', border: '1px solid var(--border-color)', textDecoration: 'none', transition: 'all 0.15s' }}>
                  <span style={{ fontWeight: '700', fontSize: '0.82rem', color: 'var(--text-primary)' }}>{l.label}</span>
                  <ChevronRight size={14} color={l.color} />
                </Link>
              ))}
            </div>
          </div>
        </section>
      </div>
    </div>
    </RoleGuard>
  );
}
