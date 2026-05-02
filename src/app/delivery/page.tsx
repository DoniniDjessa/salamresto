"use client";
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { Order, OrderStatus } from '@/types';

import { Truck, MapPin, User, CheckCircle, Package, ArrowRight, Clock, Phone } from 'lucide-react';

export default function DeliveryDashboard() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchOrders();
    const channel = supabase.channel('resto-orders-delivery')
      .on('postgres_changes', { event: '*', table: 'resto-orders', schema: 'public' }, () => {
        fetchOrders();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  async function fetchOrders() {
    const { data } = await supabase
      .from('resto-orders')
      .select('*')
      .eq('type', 'external')
      .in('status', ['pret', 'en_livraison', 'livre'])
      .order('updated_at', { ascending: false });
    
    if (data) setOrders(data);
    setLoading(false);
  }

  const updateStatus = async (orderId: string, newStatus: OrderStatus) => {
    const { error } = await supabase
      .from('resto-orders')
      .update({ status: newStatus, updated_at: new Date().toISOString() })
      .eq('id', orderId);
    
    if (!error) fetchOrders();
  };

  return (
    <div style={{ padding: '2.5rem', background: 'var(--bg-primary)', minHeight: '100vh' }} className="animate-fade-in">
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '3rem' }}>
         <div>
            <h1 style={{ fontSize: '2.2rem', fontWeight: '900', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <Truck size={32} color="var(--accent-primary)" /> Logistique <span style={{ color: 'var(--accent-primary)' }}>& Livraisons</span>
            </h1>
            <p style={{ color: 'var(--text-secondary)' }}>Suivez vos livreurs et assurez la satisfaction client</p>
         </div>
         <div style={{ display: 'flex', gap: '1.5rem' }}>
            <div className="glass-panel" style={{ padding: '0.8rem 1.5rem', display: 'flex', alignItems: 'center', gap: '1rem', background: 'var(--bg-secondary)' }}>
                <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: 'var(--accent-primary)' }}></div>
                <span style={{ fontWeight: '800' }}>{orders.filter(o => o.status === 'en_livraison').length} EN ROUTE</span>
            </div>
         </div>
      </header>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '2rem' }}>
        {/* Prêt par la cuisine */}
        <section style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', padding: '0 0.5rem' }}>
            <Package size={18} color="var(--accent-primary)" />
            <h2 style={{ fontSize: '0.85rem', fontWeight: '900', color: 'var(--text-muted)', letterSpacing: '0.1em' }}>PRÊTS POUR DÉPART</h2>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
            {orders.filter(o => o.status === 'pret').map(o => (
              <div key={o.id} className="glass-panel hover-scale" style={{ padding: '1.8rem', background: 'var(--bg-secondary)', borderRadius: '28px', borderLeft: '4px solid var(--accent-primary)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
                    <h3 style={{ fontSize: '1.1rem', fontWeight: '900' }}>#{o.id.slice(0, 4).toUpperCase()}</h3>
                    <div style={{ padding: '0.4rem 0.8rem', background: o.payment_method === 'online' ? 'var(--accent-success)' : 'var(--accent-warning)', borderRadius: '10px', fontSize: '0.65rem', fontWeight: '900', color: 'white' }}>
                        {o.payment_method === 'online' ? 'PAYÉ' : 'À PAYER'}
                    </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '1.8rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
                        <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'var(--bg-tertiary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <User size={14} color="var(--text-secondary)" />
                        </div>
                        <span style={{ fontWeight: '800', fontSize: '0.95rem' }}>{o.customername}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
                        <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'var(--bg-tertiary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <MapPin size={14} color="var(--text-secondary)" />
                        </div>
                        <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: '1.4' }}>{o.deliveryaddress}</span>
                    </div>
                </div>
                <button 
                  className="hover-scale" 
                  style={{ width: '100%', padding: '1.2rem', borderRadius: '16px', background: 'var(--accent-primary)', color: 'white', border: 'none', fontWeight: '800', fontSize: '0.95rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.8rem', boxShadow: 'var(--shadow-glow)' }} 
                  onClick={() => updateStatus(o.id, 'en_livraison')}
                >
                  DÉMARRER COURSE <ArrowRight size={18} />
                </button>
              </div>
            ))}
            {orders.filter(o => o.status === 'pret').length === 0 && (
                <div className="glass-panel" style={{ padding: '3rem', textAlign: 'center', background: 'rgba(255,255,255,0.02)', border: '1px dashed var(--border-color)', borderRadius: '24px' }}>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Aucun colis en attente</p>
                </div>
            )}
          </div>
        </section>

        {/* En Cours */}
        <section style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', padding: '0 0.5rem' }}>
            <Truck size={18} color="var(--accent-secondary)" />
            <h2 style={{ fontSize: '0.85rem', fontWeight: '900', color: 'var(--text-muted)', letterSpacing: '0.1em' }}>EN ROUTE</h2>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
            {orders.filter(o => o.status === 'en_livraison').map(o => (
              <div key={o.id} className="glass-panel hover-scale" style={{ padding: '1.8rem', background: 'var(--bg-secondary)', borderRadius: '28px', borderLeft: '4px solid var(--accent-secondary)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                    <h3 style={{ fontSize: '1rem', fontWeight: '900' }}>{o.customername}</h3>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--accent-secondary)' }}>
                        <Clock size={14} />
                        <span style={{ fontSize: '0.75rem', fontWeight: '800' }}>32 min</span>
                    </div>
                </div>
                <p style={{ fontSize: '1.5rem', fontWeight: '900', color: 'white', marginBottom: '1.2rem' }}>{o.total.toLocaleString()} <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>F</span></p>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '2rem' }}>
                    <MapPin size={14} /> {o.deliveryaddress}
                </div>
                <div style={{ display: 'flex', gap: '0.8rem' }}>
                    <button style={{ flex: 1, padding: '1rem', borderRadius: '12px', background: 'var(--bg-tertiary)', border: 'none', color: 'white', cursor: 'pointer' }}><Phone size={18} /></button>
                    <button 
                        className="hover-scale" 
                        style={{ flex: 3, padding: '1rem', borderRadius: '12px', background: 'var(--accent-success)', color: 'white', border: 'none', fontWeight: '800', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }} 
                        onClick={() => updateStatus(o.id, 'livre')}
                    >
                        <CheckCircle size={18} /> TERMINER
                    </button>
                </div>
              </div>
            ))}
            {orders.filter(o => o.status === 'en_livraison').length === 0 && (
                <div className="glass-panel" style={{ padding: '3rem', textAlign: 'center', background: 'rgba(255,255,255,0.02)', border: '1px dashed var(--border-color)', borderRadius: '24px' }}>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Aucune course active</p>
                </div>
            )}
          </div>
        </section>

        {/* Historique du jour */}
        <section style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', padding: '0 0.5rem' }}>
            <CheckCircle size={18} color="var(--accent-success)" />
            <h2 style={{ fontSize: '0.85rem', fontWeight: '900', color: 'var(--text-muted)', letterSpacing: '0.1em' }}>SUCCÈS (JOUR)</h2>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
            {orders.filter(o => o.status === 'livre').map(o => (
              <div key={o.id} className="glass-panel" style={{ padding: '1.2rem', background: 'var(--bg-secondary)', borderRadius: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', opacity: 0.8 }}>
                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                    <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'rgba(16, 185, 129, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <CheckCircle size={16} color="var(--accent-success)" />
                    </div>
                    <div>
                        <p style={{ fontWeight: '800', fontSize: '0.9rem' }}>{o.customername}</p>
                        <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>#{o.id.slice(0, 4).toUpperCase()}</p>
                    </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                    <p style={{ fontWeight: '900', color: 'var(--accent-success)' }}>{o.total.toLocaleString()} F</p>
                    <p style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>Livré à 14:02</p>
                </div>
              </div>
            ))}
            {orders.filter(o => o.status === 'livre').length === 0 && (
                <div className="glass-panel" style={{ padding: '3rem', textAlign: 'center', background: 'rgba(255,255,255,0.02)', border: '1px dashed var(--border-color)', borderRadius: '24px' }}>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Aucune livraison terminée</p>
                </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
