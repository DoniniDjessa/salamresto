"use client";
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { History, Search, Calendar, Filter, ChevronRight, CheckCircle, Smartphone, Monitor } from 'lucide-react';

export default function OrderHistory() {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetchHistory();
  }, []);

  async function fetchHistory() {
    const { data } = await supabase
      .from('resto-orders')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (data) setOrders(data);
    setLoading(false);
  }

  const filteredOrders = orders.filter(o => 
    o.customername?.toLowerCase().includes(search.toLowerCase()) || 
    o.tablenumber?.toString().includes(search) ||
    o.id.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div style={{ padding: '2.5rem', background: 'var(--bg-primary)', minHeight: '100vh' }} className="animate-fade-in">
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '3rem' }}>
         <div>
            <h1 style={{ fontSize: '2.2rem', fontWeight: '900', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <History size={32} color="var(--accent-primary)" /> Historique <span style={{ color: 'var(--accent-primary)' }}>des Commandes</span>
            </h1>
            <p style={{ color: 'var(--text-secondary)' }}>Consultez et gérez toutes les transactions passées</p>
         </div>
         <div className="glass-panel" style={{ padding: '0.5rem 1.5rem', background: 'var(--bg-secondary)', borderRadius: '16px', display: 'flex', alignItems: 'center', gap: '1rem', width: '350px' }}>
            <Search size={18} color="var(--text-muted)" />
            <input 
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Rechercher une commande..." 
                style={{ background: 'transparent', border: 'none', color: 'white', outline: 'none', width: '100%', padding: '0.5rem 0', fontSize: '0.9rem' }}
            />
         </div>
      </header>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr 1fr 1fr 1fr 0.5fr', padding: '1rem 2rem', color: 'var(--text-muted)', fontSize: '0.75rem', fontWeight: '900', letterSpacing: '0.1em' }}>
            <span>DATE / ID</span>
            <span>CLIENT / TABLE</span>
            <span>TYPE</span>
            <span>STATUT</span>
            <span>TOTAL</span>
            <span></span>
        </div>

        {loading ? <p>Chargement des archives...</p> : (
            filteredOrders.map(o => (
                <div key={o.id} className="glass-panel hover-scale" style={{ display: 'grid', gridTemplateColumns: '1fr 2fr 1fr 1fr 1fr 0.5fr', padding: '1.5rem 2rem', background: 'var(--bg-secondary)', borderRadius: '20px', alignItems: 'center' }}>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <span style={{ fontWeight: '800', fontSize: '0.9rem' }}>{new Date(o.created_at).toLocaleDateString()}</span>
                        <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>#{o.id.slice(0, 8).toUpperCase()}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: 'var(--bg-tertiary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            {o.type === 'salle' ? <Monitor size={18} /> : <Smartphone size={18} />}
                        </div>
                        <span style={{ fontWeight: '800' }}>{o.type === 'salle' ? `Table ${o.tablenumber}` : o.customername}</span>
                    </div>
                    <span style={{ fontSize: '0.8rem', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase' }}>{o.type}</span>
                    <div>
                        <span style={{ padding: '0.4rem 0.8rem', borderRadius: '8px', fontSize: '0.65rem', fontWeight: '900', background: 'rgba(16, 185, 129, 0.1)', color: 'var(--accent-success)' }}>
                            {o.status.toUpperCase()}
                        </span>
                    </div>
                    <span style={{ fontWeight: '900', fontSize: '1.1rem' }}>{o.total.toLocaleString()} F</span>
                    <button style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
                        <ChevronRight size={20} />
                    </button>
                </div>
            ))
        )}

        {!loading && filteredOrders.length === 0 && (
            <div style={{ padding: '5rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                <History size={48} style={{ opacity: 0.2, marginBottom: '1.5rem' }} />
                <p>Aucune commande trouvée</p>
            </div>
        )}
      </div>
    </div>
  );
}
