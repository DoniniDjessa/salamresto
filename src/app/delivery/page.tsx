"use client";
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { Order, OrderStatus } from '@/types';

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
    <div style={{ padding: '2rem', maxWidth: '1400px', margin: '0 auto' }} className="animate-fade-in">
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '3rem' }}>
         <h1 style={{ fontSize: '2.5rem' }}>Suivi des <span style={{ color: 'var(--accent-success)' }}>Livraisons</span></h1>
         <Link href="/" className="btn-secondary">Quitter</Link>
      </header>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '2rem' }}>
        {/* Prêt par la cuisine */}
        <section>
          <h2 style={{ marginBottom: '1.5rem', fontSize: '1.4rem', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <span style={{ width: '12px', height: '12px', background: 'var(--accent-primary)', borderRadius: '50%' }}></span>
            Prêtes pour Départ
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
            {orders.filter(o => o.status === 'pret').map(o => (
              <div key={o.id} className="glass-panel" style={{ padding: '1.5rem', background: '#fff' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                    <h3 style={{ fontSize: '1.1rem' }}>#{o.id.slice(0, 4).toUpperCase()}</h3>
                    <span style={{ background: 'var(--bg-tertiary)', padding: '0.3rem 0.6rem', borderRadius: '6px', fontSize: '0.75rem', fontWeight: '700' }}>
                        {o.payment_method === 'online' ? 'PAYÉ' : 'À PAYER'}
                    </span>
                </div>
                <p style={{ fontWeight: '700', marginBottom: '0.5rem' }}>👤 {o.customername}</p>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '1.2rem' }}>📍 {o.deliveryaddress}</p>
                <button 
                  className="btn-primary" 
                  style={{ width: '100%', padding: '1rem', background: 'var(--accent-secondary)' }} 
                  onClick={() => updateStatus(o.id, 'en_livraison')}
                >
                  🚀 Lancer la Course
                </button>
              </div>
            ))}
            {orders.filter(o => o.status === 'pret').length === 0 && <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '2rem' }}>Rien à expédier.</p>}
          </div>
        </section>

        {/* En Cours */}
        <section>
          <h2 style={{ marginBottom: '1.5rem', fontSize: '1.4rem', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <span style={{ width: '12px', height: '12px', background: 'var(--accent-secondary)', borderRadius: '50%' }}></span>
            En route
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
            {orders.filter(o => o.status === 'en_livraison').map(o => (
              <div key={o.id} className="glass-panel" style={{ padding: '1.5rem', border: '1px solid var(--accent-secondary)', background: 'rgba(59, 130, 246, 0.02)' }}>
                <h3 style={{ marginBottom: '0.5rem' }}>{o.customername}</h3>
                <p style={{ fontSize: '0.9rem', fontWeight: 'bold', color: 'var(--accent-primary)', marginBottom: '1rem' }}>Total: {o.total.toLocaleString()} F</p>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '1.5rem' }}>📍 {o.deliveryaddress}</p>
                <button 
                  className="btn-primary" 
                  style={{ width: '100%', padding: '1rem', background: 'var(--accent-success)' }} 
                  onClick={() => updateStatus(o.id, 'livre')}
                >
                  ✅ Terminer Livraison
                </button>
              </div>
            ))}
            {orders.filter(o => o.status === 'en_livraison').length === 0 && <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '2rem' }}>Aucune course active.</p>}
          </div>
        </section>

        {/* Historique du jour */}
        <section>
          <h2 style={{ marginBottom: '1.5rem', fontSize: '1.4rem', color: 'var(--text-muted)' }}>Livrées</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
            {orders.filter(o => o.status === 'livre').map(o => (
              <div key={o.id} className="glass-panel" style={{ padding: '1rem', opacity: 0.6, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                    <p style={{ fontWeight: '600' }}>{o.customername}</p>
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>#{o.id.slice(0, 4).toUpperCase()}</p>
                </div>
                <p style={{ fontWeight: '800', color: 'var(--accent-success)' }}>{o.total.toLocaleString()} F</p>
              </div>
            ))}
            {orders.filter(o => o.status === 'livre').length === 0 && <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '2rem' }}>Pas encore de succès.</p>}
          </div>
        </section>
      </div>
    </div>
  );
}
