"use client";
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { Order, OrderStatus } from '@/types';

const statusColors: Record<string, string> = {
  en_attente: 'var(--accent-danger)',
  en_preparation: 'var(--accent-warning)',
  pret: 'var(--accent-success)',
};

export default function KitchenPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchOrders();
    const channel = supabase.channel('resto-orders-kds')
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
      .in('status', ['en_attente', 'en_preparation', 'pret'])
      .order('created_at', { ascending: true });
    
    if (data) setOrders(data);
    setLoading(false);
  }

  const updateStatus = async (orderId: string, newStatus: OrderStatus) => {
    const { error } = await supabase
      .from('resto-orders')
      .update({ status: newStatus })
      .eq('id', orderId);
    
    if (!error) fetchOrders();
  };

  const pending = orders.filter(o => o.status === 'en_attente');
  const prepping = orders.filter(o => o.status === 'en_preparation');
  const ready = orders.filter(o => o.status === 'pret');

  const TicketCard = ({ order }: { order: any }) => (
    <div className="glass-panel" style={{ padding: '1.2rem', borderLeft: `6px solid ${statusColors[order.status]}`, background: '#fff' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.8rem' }}>
        <h3 style={{ margin: 0, fontSize: '1.1rem' }}>#{order.id.slice(0, 4).toUpperCase()}</h3>
        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: '600' }}>
          {new Date(order.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </span>
      </div>
      
      <div style={{ marginBottom: '1rem', color: 'var(--accent-secondary)', fontWeight: '800', fontSize: '1.1rem' }}>
        {order.type === 'salle' ? `🏠 Table ${order.tablenumber}` : `🚗 Client: ${order.customername}`}
      </div>

      <div style={{ background: 'var(--bg-tertiary)', borderRadius: '8px', padding: '0.8rem', marginBottom: '1rem' }}>
        <ul style={{ padding: 0, listStyle: 'none' }}>
            {order.items.map((item: any, i: number) => (
            <li key={i} style={{ fontSize: '0.95rem', fontWeight: '500', display: 'flex', justifyContent: 'space-between' }}>
                <span>{item.quantity}x {item.name}</span>
            </li>
            ))}
        </ul>
      </div>
      
      <div style={{ display: 'flex', gap: '0.5rem' }}>
        {order.status === 'en_attente' && (
          <button className="btn-primary" style={{ width: '100%', fontSize: '0.85rem' }} onClick={() => updateStatus(order.id, 'en_preparation')}>
            COMMANDER PRÉPARATION
          </button>
        )}
        {order.status === 'en_preparation' && (
          <button 
            className="btn-primary" 
            style={{ width: '100%', fontSize: '0.85rem', background: 'var(--accent-success)', boxShadow: '0 4px 12px rgba(16, 185, 129, 0.2)' }} 
            onClick={() => updateStatus(order.id, 'pret')}
          >
            MARQUER PRÊT ✓
          </button>
        )}
        {order.status === 'pret' && (
          order.type === 'salle' ? (
            <button 
              className="btn-primary" 
              style={{ width: '100%', fontSize: '0.85rem', background: 'var(--text-primary)', color: '#fff' }} 
              onClick={() => updateStatus(order.id, 'livre')}
            >
              MARQUER SERVI 🍽️
            </button>
          ) : (
            <div style={{ width: '100%', textAlign: 'center', padding: '0.5rem', background: 'rgba(16, 185, 129, 0.1)', color: 'var(--accent-success)', borderRadius: '8px', fontWeight: '700' }}>
              EN ATTENTE LIVREUR
            </div>
          )
        )}
      </div>
    </div>
  );

  return (
    <div style={{ padding: '1.5rem', height: '100vh', display: 'flex', flexDirection: 'column' }} className="animate-fade-in">
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
         <h1 style={{ color: 'var(--text-primary)', fontSize: '2rem' }}>Écran de <span style={{ color: 'var(--accent-warning)' }}>Cuisine</span></h1>
         <Link href="/" className="btn-secondary">Sortir</Link>
      </header>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1.5rem', flex: 1, overflow: 'hidden' }}>
        {/* En attente */}
        <div style={{ display: 'flex', flexDirection: 'column', background: 'var(--bg-tertiary)', padding: '1.2rem', borderRadius: 'var(--border-radius-lg)' }}>
          <h2 style={{ color: statusColors.en_attente, marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between' }}>
            En attente <span>{pending.length}</span>
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', overflowY: 'auto' }}>
            {pending.map(o => <TicketCard key={o.id} order={o} />)}
          </div>
        </div>

        {/* En Prepa */}
        <div style={{ display: 'flex', flexDirection: 'column', background: 'var(--bg-tertiary)', padding: '1.2rem', borderRadius: 'var(--border-radius-lg)', border: '2px dashed var(--accent-warning)' }}>
          <h2 style={{ color: statusColors.en_preparation, marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between' }}>
            En préparation <span>{prepping.length}</span>
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', overflowY: 'auto' }}>
            {prepping.map(o => <TicketCard key={o.id} order={o} />)}
          </div>
        </div>

        {/* Pret */}
        <div style={{ display: 'flex', flexDirection: 'column', background: 'var(--bg-tertiary)', padding: '1.2rem', borderRadius: 'var(--border-radius-lg)' }}>
          <h2 style={{ color: statusColors.pret, marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between' }}>
            Prêt / Au Passe <span>{ready.length}</span>
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', overflowY: 'auto' }}>
            {ready.map(o => <TicketCard key={o.id} order={o} />)}
          </div>
        </div>
      </div>
    </div>
  );
}
