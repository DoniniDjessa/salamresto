"use client";
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';

import { BarChart3, TrendingUp, Calendar, CreditCard, ChevronRight, FileText, Clock } from 'lucide-react';

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
    <div style={{ padding: '2.5rem', background: 'var(--bg-primary)', minHeight: '100vh' }} className="animate-fade-in">
       <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '3rem' }}>
          <div>
            <h1 style={{ fontSize: '2.2rem', fontWeight: '900', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <BarChart3 size={32} color="var(--accent-primary)" /> Suivi des <span style={{ color: 'var(--accent-primary)' }}>Revenus</span>
            </h1>
            <p style={{ color: 'var(--text-secondary)' }}>Analyse détaillée de vos performances commerciales</p>
          </div>
       </header>

       {/* Filters */}
       <div className="glass-panel" style={{ padding: '1.2rem 2rem', marginBottom: '2.5rem', display: 'flex', gap: '1.5rem', alignItems: 'center', background: 'var(--bg-secondary)', borderRadius: '24px' }}>
          <div style={{ display: 'flex', gap: '0.8rem' }}>
            {[
                { id: 'today', label: "Aujourd'hui" },
                { id: 'week', label: "7 Jours" },
                { id: 'month', label: "30 Jours" },
                { id: 'custom', label: "Personnalisé" },
            ].map(p => (
                <button 
                    key={p.id}
                    onClick={() => setPeriod(p.id as Period)}
                    style={{ 
                        padding: '0.8rem 1.2rem', 
                        borderRadius: '12px', 
                        background: period === p.id ? 'var(--accent-primary)' : 'var(--bg-tertiary)', 
                        color: 'white', 
                        border: 'none', 
                        fontSize: '0.85rem', 
                        fontWeight: '800', 
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                        boxShadow: period === p.id ? 'var(--shadow-glow)' : 'none'
                    }}
                >
                    {p.label}
                </button>
            ))}
          </div>
          
          {period === 'custom' && (
            <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', marginLeft: 'auto' }}>
                <Calendar size={18} color="var(--text-muted)" />
                <input type="date" className="glass-panel" style={{ padding: '0.6rem', background: 'var(--bg-tertiary)', border: 'none', color: 'white', borderRadius: '10px' }} value={startDate} onChange={e => setStartDate(e.target.value)} />
                <span style={{ opacity: 0.5 }}>à</span>
                <input type="date" className="glass-panel" style={{ padding: '0.6rem', background: 'var(--bg-tertiary)', border: 'none', color: 'white', borderRadius: '10px' }} value={endDate} onChange={e => setEndDate(e.target.value)} />
            </div>
          )}
       </div>

       {/* Top Stats */}
       <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '2rem', marginBottom: '3rem' }}>
          <div className="glass-panel" style={{ padding: '2.5rem', background: 'var(--bg-secondary)', borderLeft: '6px solid var(--accent-primary)', borderRadius: '32px' }}>
             <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
                <div style={{ padding: '0.8rem', background: 'rgba(139, 92, 246, 0.1)', borderRadius: '14px' }}>
                    <TrendingUp color="var(--accent-primary)" />
                </div>
                <p style={{ color: 'var(--text-secondary)', fontWeight: '800', fontSize: '0.9rem', letterSpacing: '0.05em' }}>TOTAL ENCAISSÉ</p>
             </div>
             <h2 style={{ fontSize: '3rem', fontWeight: '900', color: 'white' }}>{total.toLocaleString()} <span style={{ fontSize: '1.2rem', color: 'var(--text-secondary)' }}>F</span></h2>
          </div>
          
          <div className="glass-panel" style={{ padding: '2.5rem', background: 'var(--bg-secondary)', borderLeft: '6px solid #6366F1', borderRadius: '32px' }}>
             <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
                <div style={{ padding: '0.8rem', background: 'rgba(99, 102, 241, 0.1)', borderRadius: '14px' }}>
                    <FileText color="#6366F1" />
                </div>
                <p style={{ color: 'var(--text-secondary)', fontWeight: '800', fontSize: '0.9rem', letterSpacing: '0.05em' }}>NOMBRE DE VENTES</p>
             </div>
             <h2 style={{ fontSize: '3rem', fontWeight: '900', color: 'white' }}>{count} <span style={{ fontSize: '1.2rem', color: 'var(--text-secondary)' }}>COMMANDES</span></h2>
          </div>
       </div>

       {/* Transaction List */}
       <section className="glass-panel" style={{ background: 'var(--bg-secondary)', padding: '2.5rem', borderRadius: '32px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
            <h2 style={{ fontSize: '1.4rem', fontWeight: '900' }}>Détail des Transactions</h2>
            <button style={{ background: 'transparent', border: 'none', color: 'var(--accent-primary)', fontWeight: '800', cursor: 'pointer' }}>Exporter CSV</button>
          </div>
          
          {loading ? <p>Mise à jour des données...</p> : orders.length === 0 ? <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '4rem' }}>Aucune vente sur cette période.</p> : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {orders.map(o => (
                  <div key={o.id} className="glass-panel hover-scale" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1.5rem', background: 'var(--bg-tertiary)', borderRadius: '20px' }}>
                      <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center' }}>
                          <div style={{ width: '50px', height: '50px', borderRadius: '14px', background: 'var(--bg-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem' }}>
                            {o.type === 'salle' ? '🏠' : '🚗'}
                          </div>
                          <div>
                              <p style={{ fontWeight: '900', fontSize: '1.1rem', marginBottom: '0.2rem' }}>{o.type === 'salle' ? `Table ${o.tablenumber}` : o.customername || 'Client Web'}</p>
                              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <Clock size={12} /> {new Date(o.created_at).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                                <span style={{ opacity: 0.3 }}>|</span>
                                {o.items?.length} articles
                              </p>
                          </div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                          <p style={{ fontWeight: '900', fontSize: '1.4rem', color: 'var(--accent-primary)', marginBottom: '0.3rem' }}>{o.total.toLocaleString()} F</p>
                          <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                            <span style={{ fontSize: '0.6rem', color: 'white', background: 'var(--accent-success)', padding: '0.2rem 0.5rem', borderRadius: '6px', fontWeight: '900' }}>PAYÉ</span>
                            <span style={{ fontSize: '0.6rem', color: 'var(--text-muted)', background: 'var(--bg-secondary)', padding: '0.2rem 0.5rem', borderRadius: '6px', fontWeight: '900' }}>ESPECES</span>
                          </div>
                      </div>
                  </div>
                ))}
            </div>
          )}
       </section>
    </div>
  );
}
