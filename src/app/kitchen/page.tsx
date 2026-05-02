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

import { ChefHat, Clock, CheckCircle2, ChevronRight, Play } from 'lucide-react';


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
    <div className="glass-panel" style={{ padding: '1.5rem', background: 'var(--bg-secondary)', borderLeft: `4px solid ${statusColors[order.status]}`, borderRadius: '24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.2rem' }}>
        <div>
            <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: '900' }}>#{order.id.slice(0, 4).toUpperCase()}</h3>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.2rem' }}>
                <Clock size={12} color="var(--text-muted)" />
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: '700' }}>
                    {new Date(order.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
            </div>
        </div>
        <div style={{ padding: '0.4rem 0.8rem', background: 'var(--bg-tertiary)', borderRadius: '10px', fontSize: '0.8rem', fontWeight: '800', color: 'var(--accent-primary)' }}>
            {order.type === 'salle' ? `T${order.tablenumber}` : 'LIVR.'}
        </div>
      </div>
      
      <div style={{ background: 'var(--bg-tertiary)', borderRadius: '16px', padding: '1rem', marginBottom: '1.5rem' }}>
        <ul style={{ padding: 0, listStyle: 'none', margin: 0, display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
            {order.items.map((item: any, i: number) => (
            <li key={i} style={{ fontSize: '1rem', fontWeight: '800', display: 'flex', justifyContent: 'space-between', color: 'var(--text-primary)' }}>
                <span>{item.quantity}x {item.name}</span>
            </li>
            ))}
        </ul>
      </div>
      
      <div style={{ display: 'flex', gap: '0.5rem' }}>
        {order.status === 'en_attente' && (
          <button className="hover-scale" style={{ width: '100%', padding: '0.8rem', borderRadius: '12px', background: 'var(--accent-primary)', color: 'white', border: 'none', fontWeight: '800', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }} onClick={() => updateStatus(order.id, 'en_preparation')}>
            <Play size={16} /> COMMENCER
          </button>
        )}
        {order.status === 'en_preparation' && (
          <button 
            className="hover-scale" 
            style={{ width: '100%', padding: '0.8rem', borderRadius: '12px', background: 'var(--accent-success)', color: 'white', border: 'none', fontWeight: '800', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', boxShadow: '0 4px 15px rgba(16, 185, 129, 0.2)' }} 
            onClick={() => updateStatus(order.id, 'pret')}
          >
            <CheckCircle2 size={16} /> TERMINER
          </button>
        )}
        {order.status === 'pret' && (
          <button 
            className="hover-scale" 
            style={{ width: '100%', padding: '0.8rem', borderRadius: '12px', background: 'var(--text-primary)', color: 'var(--bg-primary)', border: 'none', fontWeight: '800', cursor: 'pointer' }} 
            onClick={() => updateStatus(order.id, 'livre')}
          >
            SERVIR / EXPÉDIER
          </button>
        )}
      </div>
    </div>
  );

  return (
    <div style={{ padding: '2rem', height: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--bg-primary)' }} className="animate-fade-in">
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2.5rem' }}>
         <div>
            <h1 style={{ fontSize: '2rem', fontWeight: '900', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <ChefHat size={32} color="var(--accent-primary)" /> Écran Cuisine <span style={{ color: 'var(--accent-primary)' }}>(KDS)</span>
            </h1>
            <p style={{ color: 'var(--text-secondary)' }}>Gestion des commandes en temps réel</p>
         </div>
         <div style={{ display: 'flex', gap: '1.2rem' }}>
            <div className="glass-panel" style={{ padding: '0.8rem 1.8rem', display: 'flex', alignItems: 'center', gap: '1rem', background: 'rgba(239, 68, 68, 0.1)', borderRadius: '100px', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
                <span style={{ fontWeight: '900', color: 'var(--accent-danger)', fontSize: '1.4rem' }}>{pending.length}</span>
                <span style={{ fontSize: '0.75rem', color: 'white', fontWeight: '800', letterSpacing: '0.05em' }}>EN ATTENTE</span>
            </div>
            <div className="glass-panel" style={{ padding: '0.8rem 1.8rem', display: 'flex', alignItems: 'center', gap: '1rem', background: 'rgba(16, 185, 129, 0.1)', borderRadius: '100px', border: '1px solid rgba(16, 185, 129, 0.2)' }}>
                <span style={{ fontWeight: '900', color: 'var(--accent-success)', fontSize: '1.4rem' }}>{ready.length}</span>
                <span style={{ fontSize: '0.75rem', color: 'white', fontWeight: '800', letterSpacing: '0.05em' }}>PRÊT / PASSE</span>
            </div>
         </div>
      </header>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '2rem', flex: 1, overflow: 'hidden' }}>
        {/* En attente */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 0.5rem' }}>
              <h2 style={{ fontSize: '0.8rem', fontWeight: '900', color: statusColors.en_attente, letterSpacing: '0.1em' }}>EN ATTENTE</h2>
              <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: 'var(--bg-tertiary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem', fontWeight: '900' }}>{pending.length}</div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem', overflowY: 'auto', paddingRight: '0.5rem' }}>
            {pending.map(o => <TicketCard key={o.id} order={o} />)}
          </div>
        </div>

        {/* En Prepa */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 0.5rem' }}>
              <h2 style={{ fontSize: '0.8rem', fontWeight: '900', color: statusColors.en_preparation, letterSpacing: '0.1em' }}>EN PRÉPARATION</h2>
              <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: 'var(--bg-tertiary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem', fontWeight: '900' }}>{prepping.length}</div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem', overflowY: 'auto', paddingRight: '0.5rem' }}>
            {prepping.map(o => <TicketCard key={o.id} order={o} />)}
          </div>
        </div>

        {/* Pret */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 0.5rem' }}>
              <h2 style={{ fontSize: '0.8rem', fontWeight: '900', color: statusColors.pret, letterSpacing: '0.1em' }}>PRÊT / AU PASSE</h2>
              <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: 'var(--bg-tertiary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem', fontWeight: '900' }}>{ready.length}</div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem', overflowY: 'auto', paddingRight: '0.5rem' }}>
            {ready.map(o => <TicketCard key={o.id} order={o} />)}
          </div>
        </div>
      </div>
    </div>
  );
}
