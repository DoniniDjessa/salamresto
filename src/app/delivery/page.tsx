"use client";
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Order, OrderStatus } from '@/types';
import { Truck, MapPin, User, CheckCircle, Package, ArrowRight, Clock, Phone, Plus, X } from 'lucide-react';

export default function LivraisonsDashboard() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newOrder, setNewOrder] = useState({
    customername: '',
    deliveryaddress: '',
    total: '',
    payment_method: 'cash'
  });

  useEffect(() => {
    fetchOrders();
    const channel = supabase.channel('resto-orders-livraisons')
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
      .in('status', ['en_attente', 'en_preparation', 'pret', 'en_livraison', 'livre'])
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

  const handleCreateOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    const { error } = await supabase.from('resto-orders').insert([{
      type: 'external',
      customername: newOrder.customername,
      deliveryaddress: newOrder.deliveryaddress,
      total: parseFloat(newOrder.total),
      payment_method: newOrder.payment_method,
      status: 'en_attente',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      items: [] // Manual order usually starts empty or as a package
    }]);

    if (!error) {
      setShowAddForm(false);
      setNewOrder({ customername: '', deliveryaddress: '', total: '', payment_method: 'cash' });
      fetchOrders();
    } else {
      alert("Erreur: " + error.message);
    }
  };

  return (
    <div style={{ padding: '2.5rem', background: 'var(--bg-primary)', minHeight: '100vh' }} className="animate-fade-in">
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '3rem' }}>
         <div>
            <h1 style={{ fontSize: '2.2rem', fontWeight: '900', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <Truck size={32} color="var(--accent-primary)" /> Livraisons <span style={{ color: 'var(--accent-primary)' }}>& Logistique</span>
            </h1>
            <p style={{ color: 'var(--text-secondary)' }}>Suivez vos livreurs et gérez vos expéditions</p>
         </div>
         <div style={{ display: 'flex', gap: '1.5rem' }}>
            <button 
              onClick={() => setShowAddForm(true)}
              className="btn-primary hover-scale" 
              style={{ padding: '0.8rem 1.5rem', display: 'flex', alignItems: 'center', gap: '0.8rem', borderRadius: '12px' }}
            >
                <Plus size={20} /> NOUVELLE LIVRAISON
            </button>
         </div>
      </header>

      {/* Add Order Modal Overlay */}
      {showAddForm && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(10px)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div className="glass-panel" style={{ padding: '2.5rem', width: '500px', background: 'var(--bg-secondary)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
              <h2 style={{ fontSize: '1.5rem', fontWeight: '900' }}>Créer une Livraison</h2>
              <button onClick={() => setShowAddForm(false)} style={{ background: 'transparent', border: 'none', color: 'white', cursor: 'pointer' }}><X size={24} /></button>
            </div>
            <form onSubmit={handleCreateOrder} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>NOM DU CLIENT</label>
                <input required value={newOrder.customername} onChange={e => setNewOrder({...newOrder, customername: e.target.value})} style={{ width: '100%', padding: '1rem', background: 'var(--bg-tertiary)', border: 'none', borderRadius: '12px', color: 'white' }} />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>ADRESSE DE LIVRAISON</label>
                <input required value={newOrder.deliveryaddress} onChange={e => setNewOrder({...newOrder, deliveryaddress: e.target.value})} style={{ width: '100%', padding: '1rem', background: 'var(--bg-tertiary)', border: 'none', borderRadius: '12px', color: 'white' }} />
              </div>
              <div style={{ display: 'flex', gap: '1rem' }}>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>MONTANT TOTAL</label>
                  <input required type="number" value={newOrder.total} onChange={e => setNewOrder({...newOrder, total: e.target.value})} style={{ width: '100%', padding: '1rem', background: 'var(--bg-tertiary)', border: 'none', borderRadius: '12px', color: 'white' }} />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>PAIEMENT</label>
                  <select value={newOrder.payment_method} onChange={e => setNewOrder({...newOrder, payment_method: e.target.value})} style={{ width: '100%', padding: '1rem', background: 'var(--bg-tertiary)', border: 'none', borderRadius: '12px', color: 'white' }}>
                    <option value="cash">Espèces</option>
                    <option value="online">Payé (Lien/Carte)</option>
                  </select>
                </div>
              </div>
              <button type="submit" className="btn-primary" style={{ marginTop: '1rem', padding: '1.2rem', fontWeight: '800' }}>ENREGISTRER LA LIVRAISON</button>
            </form>
          </div>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '2rem' }}>
        {/* Prêt par la cuisine */}
        <section style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', padding: '0 0.5rem' }}>
            <Package size={18} color="var(--accent-primary)" />
            <h2 style={{ fontSize: '0.85rem', fontWeight: '900', color: 'var(--text-muted)', letterSpacing: '0.1em' }}>PRÊTS POUR DÉPART</h2>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
            {orders.filter(o => o.status === 'pret' || o.status === 'en_attente').map(o => (
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
                        <span style={{ fontSize: '0.75rem', fontWeight: '800' }}>En cours...</span>
                    </div>
                </div>
                <p style={{ fontSize: '1.5rem', fontWeight: '900', color: 'white', marginBottom: '1.2rem' }}>{o.total?.toLocaleString()} <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>F</span></p>
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
                    <p style={{ fontWeight: '900', color: 'var(--accent-success)' }}>{o.total?.toLocaleString()} F</p>
                    <p style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>{new Date(o.updated_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</p>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
