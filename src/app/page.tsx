"use client";
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

import { TrendingUp, ShoppingBag, Truck, Users, Activity, Bell, Search, ChevronRight, ArrowUpRight, DollarSign, Clock, Settings, Monitor, Smartphone } from 'lucide-react';

export default function Home() {
  const router = useRouter();
  const [recentOrders, setRecentOrders] = useState<any[]>([]);
  const [stats, setStats] = useState({ totalRevenue: 0, totalExpenses: 0, deliveryWaiting: 0, deliverySuccess: 0 });
  const [loading, setLoading] = useState(true);
  
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
    <div style={{ padding: '2.5rem', background: 'var(--bg-primary)', minHeight: '100vh' }} className="animate-fade-in">
      
      {/* Top Header */}
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '3rem' }}>
         <div>
            <h1 style={{ fontSize: '2.2rem', fontWeight: '900', color: 'white', marginBottom: '0.5rem' }}>Bonjour, <span style={{ color: 'var(--accent-primary)' }}>Chef Zack</span></h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Voici l'état de votre restaurant aujourd'hui.</p>
         </div>
         <div style={{ display: 'flex', gap: '1.2rem', alignItems: 'center' }}>
            <div className="glass-panel" style={{ padding: '0.8rem 1.2rem', display: 'flex', alignItems: 'center', gap: '0.8rem', background: 'var(--bg-secondary)', borderRadius: '16px', width: '300px' }}>
                <Search size={18} color="var(--text-muted)" />
                <input placeholder="Rechercher..." style={{ background: 'transparent', border: 'none', color: 'white', outline: 'none', width: '100%', fontSize: '0.9rem' }} />
            </div>
            <button className="glass-panel" style={{ width: '48px', height: '48px', borderRadius: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-secondary)' }}>
                <Bell size={20} color="var(--text-secondary)" />
            </button>
         </div>
      </header>

      {/* Hero Section / Main Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1.5rem', marginBottom: '3rem' }}>
         <div className="glass-panel hover-scale" style={{ padding: '2rem', background: 'var(--bg-secondary)', borderRadius: '28px', borderLeft: '4px solid var(--accent-primary)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
                <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: 'rgba(139, 92, 246, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <TrendingUp size={20} color="var(--accent-primary)" />
                </div>
                <ArrowUpRight size={18} color="var(--accent-success)" />
            </div>
            <p style={{ color: 'var(--text-secondary)', fontWeight: '800', fontSize: '0.75rem', letterSpacing: '0.1em', marginBottom: '0.5rem' }}>REVENU TOTAL</p>
            <h2 style={{ fontSize: '1.8rem', fontWeight: '900' }}>{stats.totalRevenue.toLocaleString()} F</h2>
         </div>

         <div className="glass-panel hover-scale" style={{ padding: '2rem', background: 'var(--bg-secondary)', borderRadius: '28px', borderLeft: '4px solid var(--accent-success)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
                <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: 'rgba(16, 185, 129, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <ShoppingBag size={20} color="var(--accent-success)" />
                </div>
                <ArrowUpRight size={18} color="var(--accent-success)" />
            </div>
            <p style={{ color: 'var(--text-secondary)', fontWeight: '800', fontSize: '0.75rem', letterSpacing: '0.1em', marginBottom: '0.5rem' }}>COMMANDES</p>
            <h2 style={{ fontSize: '1.8rem', fontWeight: '900' }}>{recentOrders.length} <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>AUJOURD'HUI</span></h2>
         </div>

         <div className="glass-panel hover-scale" style={{ padding: '2rem', background: 'var(--bg-secondary)', borderRadius: '28px', borderLeft: '4px solid var(--accent-secondary)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
                <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: 'rgba(245, 158, 11, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Truck size={20} color="var(--accent-secondary)" />
                </div>
                <div style={{ fontSize: '0.7rem', fontWeight: '900', color: 'var(--accent-secondary)' }}>{stats.deliveryWaiting} EN ATTENTE</div>
            </div>
            <p style={{ color: 'var(--text-secondary)', fontWeight: '800', fontSize: '0.75rem', letterSpacing: '0.1em', marginBottom: '0.5rem' }}>LIVRAISONS</p>
            <h2 style={{ fontSize: '1.8rem', fontWeight: '900' }}>{stats.deliverySuccess} <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>SUCCÈS</span></h2>
         </div>

         <div className="glass-panel hover-scale" style={{ padding: '2rem', background: 'var(--bg-secondary)', borderRadius: '28px', borderLeft: '4px solid #F43F5E' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
                <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: 'rgba(244, 63, 94, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Activity size={20} color="#F43F5E" />
                </div>
            </div>
            <p style={{ color: 'var(--text-secondary)', fontWeight: '800', fontSize: '0.75rem', letterSpacing: '0.1em', marginBottom: '0.5rem' }}>DÉPENSES</p>
            <h2 style={{ fontSize: '1.8rem', fontWeight: '900' }}>{stats.totalExpenses.toLocaleString()} F</h2>
         </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '2rem' }}>
         {/* Recent Activity */}
         <section className="glass-panel" style={{ padding: '2.5rem', background: 'var(--bg-secondary)', borderRadius: '32px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                <h3 style={{ fontSize: '1.4rem', fontWeight: '900', display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
                    <Clock size={22} color="var(--accent-primary)" /> Activité Récente
                </h3>
                <Link href="/history" style={{ fontSize: '0.8rem', fontWeight: '800', color: 'var(--accent-primary)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    VOIR TOUT <ChevronRight size={14} />
                </Link>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {recentOrders.map(o => (
                    <div key={o.id} style={{ padding: '1.2rem', background: 'var(--bg-tertiary)', borderRadius: '18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ display: 'flex', gap: '1.2rem', alignItems: 'center' }}>
                            <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'var(--bg-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                {o.type === 'salle' ? <Monitor size={18} /> : <Smartphone size={18} />}
                            </div>
                            <div>
                                <p style={{ fontWeight: '800', fontSize: '1rem' }}>{o.type === 'salle' ? `Table ${o.tablenumber}` : o.customername}</p>
                                <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{new Date(o.created_at).toLocaleTimeString()}</p>
                            </div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                            <p style={{ fontWeight: '900', color: 'white' }}>{o.total.toLocaleString()} F</p>
                            <p style={{ fontSize: '0.65rem', fontWeight: '900', color: 'var(--accent-success)' }}>{o.status.toUpperCase()}</p>
                        </div>
                    </div>
                ))}
            </div>
         </section>

         {/* Quick Actions / Performance */}
         <section style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            <div className="glass-panel" style={{ padding: '2.5rem', background: 'linear-gradient(135deg, var(--accent-primary) 0%, #4F46E5 100%)', borderRadius: '32px', color: 'white' }}>
                <h3 style={{ fontSize: '1.5rem', fontWeight: '900', marginBottom: '1rem' }}>Performance Menu</h3>
                <p style={{ fontSize: '0.85rem', opacity: 0.8, marginBottom: '2rem' }}>Vos plats les plus vendus cette semaine.</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontWeight: '700' }}>Pizza Pepperoni</span>
                        <span style={{ background: 'rgba(255,255,255,0.2)', padding: '0.2rem 0.6rem', borderRadius: '6px', fontSize: '0.7rem' }}>42 ventes</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontWeight: '700' }}>Attiéké Poisson</span>
                        <span style={{ background: 'rgba(255,255,255,0.2)', padding: '0.2rem 0.6rem', borderRadius: '6px', fontSize: '0.7rem' }}>38 ventes</span>
                    </div>
                </div>
            </div>

            <div className="glass-panel" style={{ padding: '2rem', background: 'var(--bg-secondary)', borderRadius: '24px' }}>
                <h4 style={{ fontWeight: '800', marginBottom: '1.5rem' }}>État des Livreurs</h4>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
                    <div style={{ flex: 1, textAlign: 'center' }}>
                        <p style={{ fontSize: '1.5rem', fontWeight: '900', color: 'var(--accent-primary)' }}>4</p>
                        <p style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontWeight: '800' }}>ACTIFS</p>
                    </div>
                    <div style={{ flex: 1, textAlign: 'center' }}>
                        <p style={{ fontSize: '1.5rem', fontWeight: '900', color: 'var(--accent-success)' }}>12</p>
                        <p style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontWeight: '800' }}>LIVRÉS</p>
                    </div>
                </div>
            </div>
         </section>
      </div>

      {/* Security Admin Link (Hidden) */}
      <button 
        onClick={() => setShowPinModal(true)}
        style={{ position: 'fixed', bottom: '2rem', right: '2rem', width: '48px', height: '48px', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '50%', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
      >
        <Settings size={20} />
      </button>

      {/* PIN Modal */}
      {showPinModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(10px)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div className="glass-panel" style={{ padding: '3rem', width: '380px', textAlign: 'center' }}>
                <h3 style={{ marginBottom: '1rem' }}>Accès Administrateur</h3>
                <input 
                    type="password" 
                    className="input-field" 
                    style={{ textAlign: 'center', fontSize: '2rem', marginBottom: '2rem' }} 
                    placeholder="PIN" 
                    value={pin}
                    onChange={e => setPin(e.target.value)}
                />
                <div style={{ display: 'flex', gap: '1rem' }}>
                    <button className="btn-secondary" style={{ flex: 1 }} onClick={() => setShowPinModal(false)}>ANNULER</button>
                    <button className="btn-primary" style={{ flex: 1 }} onClick={handleAdminAccess}>VALIDER</button>
                </div>
            </div>
        </div>
      )}
    </div>
  );
}
