"use client";
import { useState, useEffect, useMemo, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { Order, OrderStatus } from '@/types';
import { ChefHat, Clock, CheckCircle2, Play, Coffee, Volume2, VolumeX } from 'lucide-react';
import RoleGuard from '@/components/RoleGuard';

const CAVE_CATS = new Set(['boissons', 'cave', 'thé/café', 'the/cafe']);

const STATUS_COLOR: Record<string, string> = {
  en_attente:    'var(--accent-danger)',
  en_preparation:'var(--accent-warning)',
  pret:          'var(--accent-success)',
};
const STATUS_BG: Record<string, string> = {
  en_attente:    'rgba(239,68,68,0.08)',
  en_preparation:'rgba(245,158,11,0.08)',
  pret:          'rgba(16,185,129,0.08)',
};

function TicketCard({
  order, onUpdate, isCave = false, mobile = false,
}: {
  order: any;
  onUpdate: (id: string, s: OrderStatus) => void;
  isCave?: boolean;
  mobile?: boolean;
}) {
  const age = Math.floor((Date.now() - new Date(order.created_at).getTime()) / 60000);
  const isUrgent = age > 15 && order.status === 'en_attente';
  const borderColor = isCave ? '#6366F1' : STATUS_COLOR[order.status];

  const fs = {
    label:  mobile ? '0.5rem'  : '0.62rem',
    title:  mobile ? '0.78rem' : '1.05rem',
    item:   mobile ? '0.65rem' : '0.875rem',
    age:    mobile ? '0.55rem' : '0.65rem',
    btn:    mobile ? '0.62rem' : '0.78rem',
  };

  return (
    <div className="ticket-card animate-fade-in" style={{
      borderTop: `3px solid ${borderColor}`,
      background: isUrgent ? 'rgba(239,68,68,0.03)' : 'white',
      padding: mobile ? '0.6rem' : '1.1rem',
    }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: mobile ? '0.5rem' : '0.875rem' }}>
        <div>
          <p style={{ fontSize: fs.label, fontWeight: '900', color: 'var(--text-muted)', letterSpacing: '0.08em' }}>
            {order.type === 'salle' ? `TABLE ${order.tablenumber}` : order.customername || 'EXTERNE'}
          </p>
          <h3 style={{ fontSize: fs.title, fontWeight: '900', marginTop: '0.05rem' }}>
            #{order.id.slice(0, 5).toUpperCase()}
          </h3>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.2rem', padding: mobile ? '0.15rem 0.4rem' : '0.25rem 0.6rem', borderRadius: '100px', background: isUrgent ? 'rgba(239,68,68,0.1)' : 'var(--bg-secondary)', border: '1px solid var(--border-color)', flexShrink: 0 }}>
          <Clock size={mobile ? 9 : 11} color={isUrgent ? 'var(--accent-danger)' : 'var(--text-muted)'} />
          <span style={{ fontSize: fs.age, fontWeight: '800', color: isUrgent ? 'var(--accent-danger)' : 'var(--text-muted)' }}>{age}m</span>
        </div>
      </div>

      {/* Items */}
      <div style={{ background: 'var(--bg-secondary)', borderRadius: mobile ? '7px' : '10px', padding: mobile ? '0.5rem' : '0.75rem', marginBottom: mobile ? '0.5rem' : '0.875rem', border: '1px solid var(--border-color)' }}>
        <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: mobile ? '0.3rem' : '0.45rem' }}>
          {order.items?.map((item: any, i: number) => (
            <li key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: fs.item, fontWeight: '800' }}>
              <span>{item.quantity}× {item.name}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Actions */}
      {order.status === 'en_attente' && (
        isCave ? (
          <button onClick={() => onUpdate(order.id, 'pret')}
            style={{ width: '100%', padding: mobile ? '0.5rem' : '0.7rem', borderRadius: '9px', background: '#6366F1', color: 'white', border: 'none', fontWeight: '800', fontSize: fs.btn, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.3rem' }}>
            <CheckCircle2 size={mobile ? 11 : 14} /> SERVIR
          </button>
        ) : (
          <button onClick={() => onUpdate(order.id, 'en_preparation')}
            style={{ width: '100%', padding: mobile ? '0.5rem' : '0.7rem', borderRadius: '9px', background: 'var(--accent-danger)', color: 'white', border: 'none', fontWeight: '800', fontSize: fs.btn, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.3rem' }}>
            <Play size={mobile ? 11 : 14} /> COMMENCER
          </button>
        )
      )}
      {order.status === 'en_preparation' && !isCave && (
        <button onClick={() => onUpdate(order.id, 'pret')}
          style={{ width: '100%', padding: mobile ? '0.5rem' : '0.7rem', borderRadius: '9px', background: 'var(--accent-success)', color: 'white', border: 'none', fontWeight: '800', fontSize: fs.btn, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.3rem', boxShadow: '0 4px 12px rgba(16,185,129,0.22)' }}>
          <CheckCircle2 size={mobile ? 11 : 14} /> TERMINER
        </button>
      )}
      {order.status === 'pret' && (
        <button onClick={() => onUpdate(order.id, 'livre')}
          style={{ width: '100%', padding: mobile ? '0.5rem' : '0.7rem', borderRadius: '9px', background: 'var(--text-primary)', color: 'white', border: 'none', fontWeight: '800', fontSize: fs.btn, cursor: 'pointer' }}>
          SERVIR / EXPÉDIER ✓
        </button>
      )}
    </div>
  );
}

export default function KitchenPage() {
  const [orders,       setOrders]       = useState<Order[]>([]);
  const [products,     setProducts]     = useState<any[]>([]);
  const [,             setLoading]      = useState(true);
  const [activeTab,    setActiveTab]    = useState<'cuisine' | 'cave'>('cuisine');
  const [mobileColIdx, setMobileColIdx] = useState(0);
  const [isMobile,     setIsMobile]     = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const soundRef   = useRef(true);
  const audioCtx   = useRef<AudioContext | null>(null);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  // Unlock AudioContext on first user interaction (required by Android/iOS)
  useEffect(() => {
    const unlock = () => {
      if (!audioCtx.current) {
        audioCtx.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      if (audioCtx.current.state === 'suspended') audioCtx.current.resume();
    };
    document.addEventListener('touchstart', unlock, { once: true });
    document.addEventListener('click',      unlock, { once: true });
    return () => {
      document.removeEventListener('touchstart', unlock);
      document.removeEventListener('click',      unlock);
    };
  }, []);

  function playBell() {
    if (!soundRef.current) return;
    try {
      const ctx = audioCtx.current || new (window.AudioContext || (window as any).webkitAudioContext)();
      audioCtx.current = ctx;
      if (ctx.state === 'suspended') ctx.resume();
      // Three dings: low → high → low
      ([[660, 0], [880, 0.18], [660, 0.36]] as [number, number][]).forEach(([freq, delay]) => {
        const osc  = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.type = 'sine';
        const t = ctx.currentTime + delay;
        osc.frequency.setValueAtTime(freq, t);
        gain.gain.setValueAtTime(0, t);
        gain.gain.linearRampToValueAtTime(0.5, t + 0.01);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.75);
        osc.start(t);
        osc.stop(t + 0.75);
      });
    } catch (_) {/* audio unavailable */}
  }

  function toggleSound() {
    const next = !soundRef.current;
    soundRef.current = next;
    setSoundEnabled(next);
  }

  useEffect(() => {
    fetchOrders();
    loadProducts();
    const ch = supabase.channel('resto-orders-kds')
      .on('postgres_changes', { event: 'INSERT', table: 'resto-orders', schema: 'public' }, () => {
        playBell();
        fetchOrders();
      })
      .on('postgres_changes', { event: 'UPDATE', table: 'resto-orders', schema: 'public' }, fetchOrders)
      .on('postgres_changes', { event: 'DELETE', table: 'resto-orders', schema: 'public' }, fetchOrders)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  async function fetchOrders() {
    const { data } = await supabase.from('resto-orders').select('*')
      .in('status', ['en_attente', 'en_preparation', 'pret'])
      .order('created_at', { ascending: true });
    if (data) setOrders(data);
    setLoading(false);
  }

  async function loadProducts() {
    const { data } = await supabase.from('resto-products').select('id,category');
    if (data) setProducts(data);
  }

  const updateStatus = async (id: string, s: OrderStatus) => {
    await supabase.from('resto-orders').update({ status: s }).eq('id', id);
    fetchOrders();
  };

  const productCatMap = useMemo(() => {
    const m: Record<string, string> = {};
    products.forEach(p => { m[p.id] = p.category || ''; });
    return m;
  }, [products]);

  const isCaveOrder = (order: any) =>
    order.items?.length > 0 &&
    order.items.every((item: any) =>
      CAVE_CATS.has(productCatMap[(item.id as string || '').split('__')[0]] || '')
    );

  const cuisineOrders = orders.filter(o => !isCaveOrder(o));
  const caveOrders    = orders.filter(o => isCaveOrder(o));

  const cuisineCols = [
    { label: 'EN ATTENTE',     short: 'ATTENTE',  color: STATUS_COLOR.en_attente,    bg: STATUS_BG.en_attente,    orders: cuisineOrders.filter(o => o.status === 'en_attente')     },
    { label: 'EN PRÉPARATION', short: 'PRÉP.',     color: STATUS_COLOR.en_preparation, bg: STATUS_BG.en_preparation, orders: cuisineOrders.filter(o => o.status === 'en_preparation') },
    { label: 'PRÊT AU PASSE',  short: 'PRÊT',     color: STATUS_COLOR.pret,          bg: STATUS_BG.pret,          orders: cuisineOrders.filter(o => o.status === 'pret')           },
  ];

  const caveCols = [
    { label: 'EN ATTENTE', short: 'ATTENTE', color: '#6366F1',               bg: 'rgba(99,102,241,0.08)',  orders: caveOrders.filter(o => ['en_attente','en_preparation'].includes(o.status as string)) },
    { label: 'SERVI',      short: 'SERVI',   color: 'var(--accent-success)', bg: 'rgba(16,185,129,0.08)', orders: caveOrders.filter(o => o.status === 'pret') },
  ];

  const activeCols = activeTab === 'cuisine' ? cuisineCols : caveCols;
  const pendingCave = caveOrders.filter(o => o.status === 'en_attente').length;

  // Clamp mobileColIdx when switching tabs
  const safeMobileColIdx = Math.min(mobileColIdx, activeCols.length - 1);
  const mobileCol = activeCols[safeMobileColIdx];

  return (
    <RoleGuard allowedRoles={['superAdmin', 'admin', 'manager', 'caisse', 'serveur']}>
    <div style={{ padding: isMobile ? '0.75rem' : '1.5rem', height: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--bg-primary)' }} className="animate-fade-in">

      {/* ── Header ── */}
      <header style={{ marginBottom: isMobile ? '0.5rem' : '1rem' }}>

        {/* Row 1: brand + tab switcher */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: isMobile ? '0.5rem' : '0.75rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? '0.5rem' : '0.75rem' }}>
            <div style={{ width: isMobile ? '30px' : '40px', height: isMobile ? '30px' : '40px', borderRadius: '10px', background: 'rgba(249,115,22,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <ChefHat size={isMobile ? 16 : 22} color="var(--accent-primary)" />
            </div>
            <div>
              <h1 style={{ fontSize: isMobile ? '0.9rem' : '1.3rem', fontWeight: '900', lineHeight: 1 }}>Écran Cuisine</h1>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', marginTop: '0.1rem' }}>
                <span className="live-dot" />
                <p style={{ color: 'var(--text-muted)', fontSize: isMobile ? '0.55rem' : '0.72rem' }}>
                  Temps réel · {orders.length} ticket(s)
                </p>
              </div>
            </div>
          </div>

          {/* Sound toggle + Cuisine / Cave switcher */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexShrink: 0 }}>
          <button onClick={toggleSound} title={soundEnabled ? 'Couper le son' : 'Activer le son'}
            style={{ width: isMobile ? '30px' : '36px', height: isMobile ? '30px' : '36px', borderRadius: '9px', border: '1px solid var(--border-color)', background: soundEnabled ? 'rgba(249,115,22,0.08)' : 'var(--bg-secondary)', color: soundEnabled ? 'var(--accent-primary)' : 'var(--text-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
            {soundEnabled ? <Volume2 size={isMobile ? 13 : 16} /> : <VolumeX size={isMobile ? 13 : 16} />}
          </button>
          <div style={{ display: 'flex', gap: 0, background: 'var(--bg-secondary)', borderRadius: '9px', padding: '2px', border: '1px solid var(--border-color)' }}>
            {(['cuisine', 'cave'] as const).map(tab => (
              <button key={tab} onClick={() => { setActiveTab(tab); setMobileColIdx(0); }}
                style={{ padding: isMobile ? '0.3rem 0.6rem' : '0.4rem 1.1rem', borderRadius: '7px', background: activeTab === tab ? 'white' : 'transparent', color: activeTab === tab ? 'var(--text-primary)' : 'var(--text-muted)', border: 'none', fontWeight: '800', fontSize: isMobile ? '0.6rem' : '0.78rem', cursor: 'pointer', transition: 'all 0.15s', boxShadow: activeTab === tab ? 'var(--shadow-sm)' : 'none', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                {tab === 'cuisine' ? <ChefHat size={isMobile ? 10 : 13} /> : <Coffee size={isMobile ? 10 : 13} />}
                {tab === 'cuisine' ? 'Cuisine' : 'Cave'}
                {tab === 'cave' && pendingCave > 0 && (
                  <span style={{ background: '#6366F1', color: 'white', padding: '0.05rem 0.35rem', borderRadius: '100px', fontSize: isMobile ? '0.5rem' : '0.6rem', fontWeight: '900' }}>{pendingCave}</span>
                )}
              </button>
            ))}
          </div>
          </div>
        </div>

        {/* Row 2 desktop: count badges | Row 2 mobile: column selector tabs */}
        {isMobile ? (
          <div style={{ display: 'flex', gap: '0.35rem' }}>
            {activeCols.map((col, idx) => (
              <button key={col.label} onClick={() => setMobileColIdx(idx)}
                style={{ flex: 1, padding: '0.4rem 0.25rem', borderRadius: '8px', border: `1.5px solid ${safeMobileColIdx === idx ? col.color : 'var(--border-color)'}`, background: safeMobileColIdx === idx ? col.bg : 'transparent', color: safeMobileColIdx === idx ? col.color : 'var(--text-muted)', fontWeight: '800', fontSize: '0.55rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.25rem', transition: 'all 0.15s', letterSpacing: '0.04em' }}>
                <span style={{ fontWeight: '900', fontSize: '0.7rem', color: 'inherit' }}>{col.orders.length}</span>
                {col.short}
              </button>
            ))}
          </div>
        ) : (
          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', justifyContent: 'flex-end' }}>
            {activeCols.map(c => (
              <div key={c.label} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 0.875rem', background: c.bg, border: `1px solid ${c.color}22`, borderRadius: '100px' }}>
                <span style={{ fontSize: '1rem', fontWeight: '900', color: c.color }}>{c.orders.length}</span>
                <span style={{ fontSize: '0.62rem', fontWeight: '900', color: c.color, letterSpacing: '0.06em' }}>{c.label}</span>
              </div>
            ))}
          </div>
        )}
      </header>

      {/* ── KDS columns ── */}
      {isMobile ? (
        /* Mobile: single column, full width */
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
          <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {mobileCol.orders.map(o => (
              <TicketCard key={o.id} order={o} onUpdate={updateStatus} isCave={activeTab === 'cave'} mobile />
            ))}
            {mobileCol.orders.length === 0 && (
              <div style={{ textAlign: 'center', padding: '2rem 1rem', color: 'var(--text-muted)', background: mobileCol.bg, borderRadius: '12px', border: `1px dashed ${mobileCol.color}40`, marginTop: '0.5rem' }}>
                <p style={{ fontSize: '0.68rem', fontWeight: '700' }}>Aucun ticket</p>
              </div>
            )}
          </div>
        </div>
      ) : (
        /* Desktop: multi-column grid */
        <div style={{ display: 'grid', gridTemplateColumns: `repeat(${activeCols.length}, 1fr)`, gap: '1.25rem', flex: 1, overflow: 'hidden' }}>
          {activeCols.map(col => (
            <div key={col.label} style={{ display: 'flex', flexDirection: 'column', minHeight: 0 }}>
              <div className="col-header">
                <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: col.color, flexShrink: 0 }} />
                <span className="col-header-label" style={{ color: col.color }}>{col.label}</span>
                <span className="col-count">{col.orders.length}</span>
              </div>
              <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.75rem', paddingRight: '0.25rem' }}>
                {col.orders.map(o => (
                  <TicketCard key={o.id} order={o} onUpdate={updateStatus} isCave={activeTab === 'cave'} />
                ))}
                {col.orders.length === 0 && (
                  <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)', background: col.bg, borderRadius: '14px', border: `1px dashed ${col.color}30` }}>
                    {activeTab === 'cave' && <Coffee size={22} color={col.color} style={{ opacity: 0.3, marginBottom: '0.5rem', display: 'block', margin: '0 auto 0.5rem' }} />}
                    <p style={{ fontSize: '0.78rem', fontWeight: '700' }}>Aucun ticket</p>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
    </RoleGuard>
  );
}
