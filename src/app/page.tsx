"use client";
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

export default function Home() {
  const router = useRouter();
  const [recentOrders, setRecentOrders] = useState<any[]>([]);
  const [stats, setStats] = useState({ totalRevenue: 0, totalExpenses: 0, deliveryWaiting: 0, deliverySuccess: 0 });
  const [loading, setLoading] = useState(true);
  
  // Backoffice Security
  const [showPinModal, setShowPinModal] = useState(false);
  const [pin, setPin] = useState('');

  useEffect(() => {
    fetchHomeData();
    const channel = supabase.channel('home-updates')
      .on('postgres_changes', { event: '*', table: 'resto-orders', schema: 'public' }, () => {
        fetchHomeData();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  async function fetchHomeData() {
    const { data: orders } = await supabase.from('resto-orders').select('*').order('created_at', { ascending: false }).limit(10);
    const { data: allOrders } = await supabase.from('resto-orders').select('total, type, status');
    const { data: expenses } = await supabase.from('resto-expenses').select('amount');
    
    if (orders) setRecentOrders(orders);
    
    let totalRev = 0;
    let totalExp = 0;
    let dWaiting = 0;
    let dSuccess = 0;

    if (allOrders) {
        totalRev = allOrders.reduce((acc, o) => acc + (o.total || 0), 0);
        dWaiting = allOrders.filter(o => o.type === 'external' && o.status !== 'livre' && o.status !== 'annule').length;
        dSuccess = allOrders.filter(o => o.type === 'external' && o.status === 'livre').length;
    }
    if (expenses) {
        totalExp = expenses.reduce((acc, e) => acc + (e.amount || 0), 0);
    }

    setStats({ 
        totalRevenue: totalRev, 
        totalExpenses: totalExp, 
        deliveryWaiting: dWaiting,
        deliverySuccess: dSuccess
    });
    setLoading(false);
  }

  const handleAdminAccess = () => {
    if (pin === '0044') {
        router.push('/admin');
    } else {
        alert("Code incorrect !");
        setPin('');
    }
  };

  return (
    <main style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto', position: 'relative' }} className="animate-fade-in">
      
      {/* Hidden/Small Backoffice Toggle */}
      <button 
        onClick={() => setShowPinModal(true)}
        style={{ position: 'fixed', bottom: '20px', right: '20px', width: '40px', height: '40px', borderRadius: '50%', background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', color: 'var(--text-muted)', fontSize: '0.8rem', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: 'var(--shadow-md)' }}
        title="Admin"
      >
        ⚙️
      </button>

      <header style={{ textAlign: 'center', marginBottom: '4rem' }}>
        <h1 style={{ fontSize: '4rem', background: 'linear-gradient(135deg, var(--text-primary), var(--accent-primary))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', marginBottom: '0.5rem', fontWeight: '900' }}>
          SalamResto
        </h1>
        <div style={{ height: '4px', width: '60px', background: 'var(--accent-primary)', margin: '0 auto', borderRadius: '10px' }}></div>
      </header>

      {/* Summary Cards Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.5rem', marginBottom: '3rem' }}>
         <div className="glass-panel" style={{ padding: '1.5rem', background: '#fff', borderLeft: '6px solid var(--accent-success)' }}>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: '700' }}>RECETTES (CA)</p>
            <h2 style={{ fontSize: '1.8rem' }}>{stats.totalRevenue.toLocaleString()} F</h2>
         </div>
         <div className="glass-panel" style={{ padding: '1.5rem', background: '#fff', borderLeft: '6px solid var(--accent-danger)' }}>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: '700' }}>DÉPENSES</p>
            <h2 style={{ fontSize: '1.8rem' }}>{stats.totalExpenses.toLocaleString()} F</h2>
         </div>
         <div className="glass-panel" style={{ padding: '1.5rem', background: '#fff', borderLeft: '6px solid var(--accent-primary)' }}>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: '700', marginBottom: '0.5rem' }}>LIVRAISONS</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                <p style={{ fontSize: '0.9rem', fontWeight: 'bold' }}>Commandes</p>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>En attente: <span style={{ color: 'var(--accent-warning)', fontWeight: '800' }}>{stats.deliveryWaiting}</span></p>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Livrées: <span style={{ color: 'var(--accent-success)', fontWeight: '800' }}>{stats.deliverySuccess}</span></p>
            </div>
         </div>
      </div>
      
      {/* Navigation Main Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
        gap: '1.5rem',
        marginBottom: '4rem'
      }}>
        <Link href="/pos" className="glass-panel" style={{ padding: '2rem', display: 'flex', gap: '1rem', alignItems: 'center' }}>
            <span style={{ fontSize: '2rem' }}>🖥️</span>
            <div><h3 style={{ fontSize: '1.1rem', color: 'var(--text-primary)' }}>Vente Salle</h3></div>
        </Link>
        <Link href="/client/order" className="glass-panel" style={{ padding: '2rem', display: 'flex', gap: '1rem', alignItems: 'center' }}>
            <span style={{ fontSize: '2rem' }}>📱</span>
            <div><h3 style={{ fontSize: '1.1rem', color: 'var(--text-primary)' }}>Commande Web</h3></div>
        </Link>
        <Link href="/kitchen" className="glass-panel" style={{ padding: '2rem', display: 'flex', gap: '1rem', alignItems: 'center' }}>
            <span style={{ fontSize: '2rem' }}>🍳</span>
            <div><h3 style={{ fontSize: '1.1rem', color: 'var(--text-primary)' }}>Écran Cuisine</h3></div>
        </Link>
        <Link href="/delivery" className="glass-panel" style={{ padding: '2rem', display: 'flex', gap: '1rem', alignItems: 'center' }}>
            <span style={{ fontSize: '2rem' }}>🚚</span>
            <div><h3 style={{ fontSize: '1.1rem', color: 'var(--text-primary)' }}>Logistique</h3></div>
        </Link>
        <Link href="/expenses" className="glass-panel" style={{ padding: '2rem', display: 'flex', gap: '1rem', alignItems: 'center' }}>
            <span style={{ fontSize: '2rem' }}>💸</span>
            <div><h3 style={{ fontSize: '1.1rem', color: 'var(--text-primary)' }}>Dépenses</h3></div>
        </Link>
        <Link href="/revenues" className="glass-panel" style={{ padding: '2rem', display: 'flex', gap: '1rem', alignItems: 'center' }}>
            <span style={{ fontSize: '2rem' }}>📈</span>
            <div><h3 style={{ fontSize: '1.1rem', color: 'var(--text-primary)' }}>Revenus</h3></div>
        </Link>
      </div>

      {/* Timeline Section */}
      <section className="glass-panel" style={{ background: '#fff', padding: '2rem' }}>
        <h3 style={{ marginBottom: '2rem', fontSize: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.7rem' }}>
            🕒 Activité Récente 
        </h3>
        
        {loading ? <p>Mise à jour...</p> : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {recentOrders.length === 0 ? <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '2rem' }}>Aucune activité.</p> : recentOrders.map(o => (
                     <div key={o.id} style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1rem', borderBottom: '1px solid var(--border-color)', fontSize: '0.9rem' }}>
                        <div style={{ fontWeight: '800', width: '70px', color: 'var(--text-muted)', fontSize: '0.75rem' }}>
                            {new Date(o.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                        <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                            <span style={{ fontWeight: '700', marginBottom: '0.3rem' }}>{o.type === 'salle' ? `🏠 Table ${o.tablenumber}` : `🚗 ${o.customername}`}</span>
                            <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>
                                {o.items && o.items.map((it: any) => `${it.quantity}x ${it.name}`).join(', ')}
                            </span>
                        </div>
                        <div style={{ 
                            background: o.status === 'pret' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(245, 158, 11, 0.1)', 
                            color: o.status === 'pret' ? 'var(--accent-success)' : 'var(--accent-warning)',
                            padding: '0.2rem 0.5rem', borderRadius: '4px', fontSize: '0.65rem', fontWeight: '900'
                        }}>
                            {o.status.toUpperCase()}
                        </div>
                        <div style={{ fontWeight: '900', textAlign: 'right', minWidth: '80px' }}>{o.total.toLocaleString()} F</div>
                    </div>
                ))}
            </div>
        )}
      </section>

      {/* Security PIN Modal */}
      {showPinModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(10px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
            <div className="glass-panel" style={{ background: '#fff', padding: '2.5rem', width: '320px', textAlign: 'center' }}>
                <h3 style={{ marginBottom: '1.5rem' }}>Accès Sécurisé Admin</h3>
                <input 
                    type="password" 
                    className="input-field" 
                    style={{ textAlign: 'center', fontSize: '1.5rem', letterSpacing: '0.5rem', marginBottom: '1.5rem' }} 
                    placeholder="****" 
                    value={pin}
                    onChange={(e) => setPin(e.target.value)}
                    autoFocus
                />
                <div style={{ display: 'flex', gap: '1rem' }}>
                    <button className="btn-secondary" style={{ flex: 1 }} onClick={() => { setShowPinModal(false); setPin(''); }}>Annuler</button>
                    <button className="btn-primary" style={{ flex: 1 }} onClick={handleAdminAccess}>Valider</button>
                </div>
            </div>
        </div>
      )}

    </main>
  );
}
