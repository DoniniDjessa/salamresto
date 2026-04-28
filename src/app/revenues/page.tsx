"use client";
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';

type Period = 'today' | 'week' | 'month' | 'custom';

export default function RevenuesPage() {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<Period>('today');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  useEffect(() => {
    fetchRevenues();
  }, [period, startDate, endDate]);

  async function fetchRevenues() {
    setLoading(true);
    let query = supabase.from('resto-orders').select('*').order('created_at', { ascending: false });

    const now = new Date();
    let start = new Date();

    if (period === 'today') {
      start.setHours(0, 0, 0, 0);
      query = query.gte('created_at', start.toISOString());
    } else if (period === 'week') {
      start.setDate(now.getDate() - 7);
      query = query.gte('created_at', start.toISOString());
    } else if (period === 'month') {
      start.setMonth(now.getMonth() - 1);
      query = query.gte('created_at', start.toISOString());
    } else if (period === 'custom' && startDate && endDate) {
      query = query.gte('created_at', new Date(startDate).toISOString())
                   .lte('created_at', new Date(endDate).toISOString());
    }

    const { data } = await query;
    if (data) setOrders(data);
    setLoading(false);
  }

  const total = orders.reduce((acc, o) => acc + (o.total || 0), 0);
  const count = orders.length;

  return (
    <div style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }} className="animate-fade-in">
       <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '3rem' }}>
          <div>
            <h1 style={{ fontSize: '2.5rem' }}>Suivi des <span style={{ color: 'var(--accent-success)' }}>Revenus</span></h1>
            <p style={{ color: 'var(--text-muted)' }}>Analyse détaillée de vos entrées d'argent</p>
          </div>
          <Link href="/" className="btn-secondary">Retour</Link>
       </header>

       {/* Filters */}
       <div className="glass-panel" style={{ padding: '1.5rem', marginBottom: '2rem', display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <button className={period === 'today' ? 'btn-primary' : 'btn-secondary'} onClick={() => setPeriod('today')}>Aujourd'hui</button>
          <button className={period === 'week' ? 'btn-primary' : 'btn-secondary'} onClick={() => setPeriod('week')}>7 Jours</button>
          <button className={period === 'month' ? 'btn-primary' : 'btn-secondary'} onClick={() => setPeriod('month')}>30 Jours</button>
          <button className={period === 'custom' ? 'btn-primary' : 'btn-secondary'} onClick={() => setPeriod('custom')}>Personnalisé</button>
          
          {period === 'custom' && (
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                <input type="date" className="input-field" value={startDate} onChange={e => setStartDate(e.target.value)} />
                <span>à</span>
                <input type="date" className="input-field" value={endDate} onChange={e => setEndDate(e.target.value)} />
            </div>
          )}
       </div>

       {/* Top Stats */}
       <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem', marginBottom: '3rem' }}>
          <div className="glass-panel" style={{ padding: '2rem', background: '#fff', borderLeft: '8px solid var(--accent-success)' }}>
             <p style={{ color: 'var(--text-muted)', fontWeight: '700', fontSize: '0.8rem' }}>TOTAL ENCAISSÉ</p>
             <h2 style={{ fontSize: '2.5rem', color: 'var(--accent-success)' }}>{total.toLocaleString()} F</h2>
          </div>
          <div className="glass-panel" style={{ padding: '2rem', background: '#fff', borderLeft: '8px solid var(--accent-secondary)' }}>
             <p style={{ color: 'var(--text-muted)', fontWeight: '700', fontSize: '0.8rem' }}>NOMBRE DE VENTES</p>
             <h2 style={{ fontSize: '2.5rem' }}>{count}</h2>
          </div>
       </div>

       {/* Orders List */}
       <section className="glass-panel" style={{ background: '#fff', padding: '2rem' }}>
          <h2 style={{ marginBottom: '1.5rem' }}>Détail des transactions</h2>
          {loading ? <p>Analyse des données...</p> : orders.length === 0 ? <p style={{ color: 'var(--text-muted)' }}>Aucune vente sur cette période.</p> : (
            <div style={{ display: 'flex', flexDirection: 'column' }}>
                {orders.map(o => (
                  <div key={o.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1.2rem', borderBottom: '1px solid var(--border-color)' }}>
                      <div>
                          <p style={{ fontWeight: '700' }}>{o.type === 'salle' ? `🏠 Table ${o.tablenumber}` : `🚗 ${o.customername}`}</p>
                          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                            {new Date(o.created_at).toLocaleString()} | {o.items.length} articles
                          </p>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                          <p style={{ fontWeight: '900', fontSize: '1.2rem' }}>{o.total.toLocaleString()} F</p>
                          <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', background: 'var(--bg-tertiary)', padding: '0.2rem 0.4rem', borderRadius: '4px' }}>
                            {o.payment_method === 'online' ? 'PAYÉ' : 'À LA LIVRAISON'}
                          </span>
                      </div>
                  </div>
                ))}
            </div>
          )}
       </section>
    </div>
  );
}
