
"use client";
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { Table as TableIcon, QrCode, Monitor, Smartphone, Clock, ChevronRight, Plus } from 'lucide-react';

export default function TablesPage() {
  const [localTables, setLocalTables] = useState<{id: number, status: string}[]>([
    { id: 1, status: 'libre' },
    { id: 2, status: 'libre' },
    { id: 3, status: 'libre' },
    { id: 4, status: 'libre' },
  ]);
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
    const channel = supabase.channel('tables-updates')
      .on('postgres_changes', { event: '*', table: 'resto-orders', schema: 'public' }, () => {
        fetchData();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  async function fetchData() {
    setLoading(true);
    const { data: oData } = await supabase.from('resto-orders').select('*').neq('status', 'paye');
    if (oData) setOrders(oData);
    setLoading(false);
  }

  return (
    <div style={{ padding: '2.5rem', background: 'var(--bg-primary)', minHeight: '100vh' }} className="animate-fade-in">
        <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '3rem' }}>
            <div>
                <h1 style={{ fontSize: '2.2rem', fontWeight: '900', color: 'white', marginBottom: '0.5rem' }}>Gestion des Tables</h1>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Suivi en temps réel de l'occupation de la salle.</p>
            </div>
            <button 
                onClick={() => setLocalTables([...localTables, { id: localTables.length + 1, status: 'libre' }])}
                style={{ padding: '1rem 2rem', background: 'var(--accent-primary)', color: 'white', border: 'none', borderRadius: '16px', fontWeight: '800', cursor: 'pointer' }}
            >
                + AJOUTER UNE TABLE
            </button>
        </header>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '2rem' }}>
            {localTables.map(t => {
                const activeOrder = orders.find(o => o.tablenumber === t.id && o.status !== 'paye');
                const isOccupied = !!activeOrder;
                
                return (
                    <div key={t.id} className="glass-panel" style={{ padding: '1.5rem', background: 'var(--bg-secondary)', borderRadius: '24px', borderTop: `6px solid ${isOccupied ? 'var(--accent-warning)' : 'var(--accent-success)'}`, transition: 'all 0.3s' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.2rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
                                <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: 'var(--bg-tertiary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <TableIcon size={18} color={isOccupied ? 'var(--accent-warning)' : 'var(--accent-success)'} />
                                </div>
                                <h3 style={{ fontSize: '1.1rem', fontWeight: '900' }}>Table {t.id}</h3>
                            </div>
                            <span style={{ fontSize: '0.65rem', fontWeight: '900', color: isOccupied ? 'var(--accent-warning)' : 'var(--accent-success)', background: 'rgba(255,255,255,0.05)', padding: '0.3rem 0.6rem', borderRadius: '6px' }}>
                                {isOccupied ? 'OCCUPÉE' : 'LIBRE'}
                            </span>
                        </div>

                        {isOccupied ? (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                <div style={{ padding: '1rem', background: 'var(--bg-tertiary)', borderRadius: '14px', border: '1px solid rgba(255,255,255,0.03)' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.8rem' }}>
                                        <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontWeight: '800' }}>CLIENT : <span style={{ color: 'white' }}>{activeOrder.customername || 'Invité'}</span></span>
                                        <span style={{ fontSize: '0.65rem', color: 'var(--accent-primary)', fontWeight: '900' }}>{activeOrder.status.toUpperCase()}</span>
                                    </div>
                                    
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', marginBottom: '1rem', maxHeight: '100px', overflowY: 'auto', paddingRight: '0.5rem' }}>
                                        {activeOrder.items?.map((item: any, idx: number) => (
                                            <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem' }}>
                                                <span style={{ color: 'var(--text-secondary)' }}>{item.quantity}x {item.name}</span>
                                                <span style={{ fontWeight: '700' }}>{(item.price * item.quantity).toLocaleString()} F</span>
                                            </div>
                                        ))}
                                    </div>

                                    <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '0.8rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <p style={{ fontSize: '1.1rem', fontWeight: '900' }}>{activeOrder.total.toLocaleString()} F</p>
                                        <div style={{ display: 'flex', gap: '0.4rem' }}>
                                            <Link href={`/pos?table=${t.id}`} title="Ajouter Commande" style={{ width: '32px', height: '32px', background: 'var(--accent-primary)', borderRadius: '8px', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', textDecoration: 'none' }}>
                                                <Plus size={16} />
                                            </Link>
                                        </div>
                                    </div>
                                </div>
                                <button 
                                    onClick={async () => {
                                        if (confirm(`Voulez-vous vider la Table ${t.id} ?`)) {
                                            await supabase.from('resto-orders').update({ status: 'paye' }).eq('id', activeOrder.id);
                                            fetchData();
                                        }
                                    }}
                                    style={{ width: '100%', padding: '0.7rem', background: 'rgba(239, 68, 68, 0.08)', color: '#EF4444', border: 'none', borderRadius: '10px', fontSize: '0.75rem', fontWeight: '800', cursor: 'pointer' }}
                                >
                                    VIDER LA TABLE
                                </button>
                            </div>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                                <div style={{ padding: '2rem 1rem', background: 'rgba(16, 185, 129, 0.03)', borderRadius: '16px', border: '1px dashed rgba(16, 185, 129, 0.15)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.8rem' }}>
                                    <p style={{ color: 'var(--text-muted)', fontSize: '0.75rem', textAlign: 'center' }}>Disponible</p>
                                    <Link href={`/pos?table=${t.id}`} style={{ padding: '0.5rem 1rem', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '8px', color: 'white', fontSize: '0.7rem', fontWeight: '800', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                        <Plus size={14} /> OUVRIR NOTE
                                    </Link>
                                </div>
                            </div>
                        )}
                    </div>
                );
            })}
        </div>
    </div>
  );
}
