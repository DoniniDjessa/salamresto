"use client";
import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { Order, OrderStatus } from '@/types';
import { ChefHat, Clock, CheckCircle2, Play, Coffee } from 'lucide-react';
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
  order, onUpdate, isCave = false,
}: {
  order: any;
  onUpdate: (id: string, s: OrderStatus) => void;
  isCave?: boolean;
}) {
  const age = Math.floor((Date.now() - new Date(order.created_at).getTime()) / 60000);
  const isUrgent = age > 15 && order.status === 'en_attente';
  const borderColor = isCave ? '#6366F1' : STATUS_COLOR[order.status];

  return (
    <div className="ticket-card animate-fade-in" style={{
      borderTop: `3px solid ${borderColor}`,
      background: isUrgent ? 'rgba(239,68,68,0.03)' : 'white',
    }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.875rem' }}>
        <div>
          <p style={{ fontSize: '0.62rem', fontWeight: '900', color: 'var(--text-muted)', letterSpacing: '0.08em' }}>
            {order.type === 'salle' ? `TABLE ${order.tablenumber}` : order.customername || 'EXTERNE'}
          </p>
          <h3 style={{ fontSize: '1.05rem', fontWeight: '900', marginTop: '0.1rem' }}>
            #{order.id.slice(0, 5).toUpperCase()}
          </h3>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', padding: '0.25rem 0.6rem', borderRadius: '100px', background: isUrgent ? 'rgba(239,68,68,0.1)' : 'var(--bg-secondary)', border: '1px solid var(--border-color)' }}>
          <Clock size={11} color={isUrgent ? 'var(--accent-danger)' : 'var(--text-muted)'} />
          <span style={{ fontSize: '0.65rem', fontWeight: '800', color: isUrgent ? 'var(--accent-danger)' : 'var(--text-muted)' }}>{age}m</span>
        </div>
      </div>

      {/* Items */}
      <div style={{ background: 'var(--bg-secondary)', borderRadius: '10px', padding: '0.75rem', marginBottom: '0.875rem', border: '1px solid var(--border-color)' }}>
        <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
          {order.items?.map((item: any, i: number) => (
            <li key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem', fontWeight: '800' }}>
              <span>{item.quantity}× {item.name}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Actions */}
      {order.status === 'en_attente' && (
        isCave ? (
          <button onClick={() => onUpdate(order.id, 'pret')}
            style={{ width: '100%', padding: '0.7rem', borderRadius: '9px', background: '#6366F1', color: 'white', border: 'none', fontWeight: '800', fontSize: '0.78rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem' }}>
            <CheckCircle2 size={14} /> SERVIR
          </button>
        ) : (
          <button onClick={() => onUpdate(order.id, 'en_preparation')}
            style={{ width: '100%', padding: '0.7rem', borderRadius: '9px', background: 'var(--accent-danger)', color: 'white', border: 'none', fontWeight: '800', fontSize: '0.78rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem' }}>
            <Play size={14} /> COMMENCER
          </button>
        )
      )}
      {order.status === 'en_preparation' && !isCave && (
        <button onClick={() => onUpdate(order.id, 'pret')}
          style={{ width: '100%', padding: '0.7rem', borderRadius: '9px', background: 'var(--accent-success)', color: 'white', border: 'none', fontWeight: '800', fontSize: '0.78rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem', boxShadow: '0 4px 12px rgba(16,185,129,0.22)' }}>
          <CheckCircle2 size={14} /> TERMINER
        </button>
      )}
      {order.status === 'pret' && (
        <button onClick={() => onUpdate(order.id, 'livre')}
          style={{ width: '100%', padding: '0.7rem', borderRadius: '9px', background: 'var(--text-primary)', color: 'white', border: 'none', fontWeight: '800', fontSize: '0.78rem', cursor: 'pointer' }}>
          SERVIR / EXPÉDIER ✓
        </button>
      )}
    </div>
  );
}

export default function KitchenPage() {
  const [orders,     setOrders]     = useState<Order[]>([]);
  const [products,   setProducts]   = useState<any[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [activeTab,  setActiveTab]  = useState<'cuisine' | 'cave'>('cuisine');

  useEffect(() => {
    fetchOrders();
    loadProducts();
    const ch = supabase.channel('resto-orders-kds')
      .on('postgres_changes', { event: '*', table: 'resto-orders', schema: 'public' }, fetchOrders)
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
    { label: 'EN ATTENTE',     color: STATUS_COLOR.en_attente,    bg: STATUS_BG.en_attente,    orders: cuisineOrders.filter(o => o.status === 'en_attente')     },
    { label: 'EN PRÉPARATION', color: STATUS_COLOR.en_preparation, bg: STATUS_BG.en_preparation, orders: cuisineOrders.filter(o => o.status === 'en_preparation') },
    { label: 'PRÊT AU PASSE',  color: STATUS_COLOR.pret,          bg: STATUS_BG.pret,          orders: cuisineOrders.filter(o => o.status === 'pret')           },
  ];

  const caveCols = [
    { label: 'EN ATTENTE', color: '#6366F1',               bg: 'rgba(99,102,241,0.08)',  orders: caveOrders.filter(o => ['en_attente','en_preparation'].includes(o.status as string)) },
    { label: 'SERVI',      color: 'var(--accent-success)', bg: 'rgba(16,185,129,0.08)', orders: caveOrders.filter(o => o.status === 'pret') },
  ];

  const activeCols  = activeTab === 'cuisine' ? cuisineCols  : caveCols;
  const gridCols    = activeTab === 'cuisine' ? 3 : 2;
  const pendingCave = caveOrders.filter(o => o.status === 'en_attente').length;

  return (
    <RoleGuard allowedRoles={['superAdmin', 'admin', 'manager', 'caisse', 'serveur']}>
    <div style={{ padding: '1.5rem', height: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--bg-primary)' }} className="animate-fade-in">

      {/* Header */}
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: 'rgba(249,115,22,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <ChefHat size={22} color="var(--accent-primary)" />
          </div>
          <div>
            <h1 style={{ fontSize: '1.3rem', fontWeight: '900' }}>Écran Cuisine</h1>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <span className="live-dot" />
              <p style={{ color: 'var(--text-muted)', fontSize: '0.72rem' }}>Temps réel · {orders.length} ticket(s) actif(s)</p>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          {/* Tab switcher */}
          <div style={{ display: 'flex', gap: '0', background: 'var(--bg-secondary)', borderRadius: '10px', padding: '3px', border: '1px solid var(--border-color)' }}>
            {(['cuisine', 'cave'] as const).map(tab => (
              <button key={tab} onClick={() => setActiveTab(tab)}
                style={{ padding: '0.4rem 1.1rem', borderRadius: '7px', background: activeTab === tab ? 'white' : 'transparent', color: activeTab === tab ? 'var(--text-primary)' : 'var(--text-muted)', border: 'none', fontWeight: '800', fontSize: '0.78rem', cursor: 'pointer', transition: 'all 0.15s', boxShadow: activeTab === tab ? 'var(--shadow-sm)' : 'none', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                {tab === 'cuisine' ? <ChefHat size={13} /> : <Coffee size={13} />}
                {tab === 'cuisine' ? 'Cuisine' : 'Cave'}
                {tab === 'cave' && pendingCave > 0 && (
                  <span style={{ background: '#6366F1', color: 'white', padding: '0.05rem 0.4rem', borderRadius: '100px', fontSize: '0.6rem', fontWeight: '900' }}>{pendingCave}</span>
                )}
              </button>
            ))}
          </div>

          {/* Count badges */}
          {activeCols.map(c => (
            <div key={c.label} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 0.875rem', background: c.bg, border: `1px solid ${c.color}22`, borderRadius: '100px' }}>
              <span style={{ fontSize: '1rem', fontWeight: '900', color: c.color }}>{c.orders.length}</span>
              <span style={{ fontSize: '0.62rem', fontWeight: '900', color: c.color, letterSpacing: '0.06em' }}>{c.label}</span>
            </div>
          ))}
        </div>
      </header>

      {/* KDS Columns */}
      <div style={{ display: 'grid', gridTemplateColumns: `repeat(${gridCols}, 1fr)`, gap: '1.25rem', flex: 1, overflow: 'hidden' }}>
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
    </div>
    </RoleGuard>
  );
}
