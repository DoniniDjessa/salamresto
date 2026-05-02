
"use client";
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Bell, Clock, Phone, CreditCard, User, CheckCircle, Trash2, ShoppingBag } from 'lucide-react';

export default function AlertsPage() {
  const [alerts, setAlerts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAlerts();
    const channel = supabase.channel('alerts-updates')
      .on('postgres_changes', { event: '*', table: 'resto-notifications', schema: 'public' }, () => {
        fetchAlerts();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  async function fetchAlerts() {
    const { data } = await supabase.from('resto-notifications').select('*').order('created_at', { ascending: false });
    if (data) setAlerts(data);
    setLoading(false);
  }

  async function markAsResolved(id: string) {
    const { error } = await supabase.from('resto-notifications').update({ status: 'resolved' }).eq('id', id);
    if (!error) fetchAlerts();
  }

  async function deleteAlert(id: string) {
    const { error } = await supabase.from('resto-notifications').delete().eq('id', id);
    if (!error) fetchAlerts();
  }

  const getAlertIcon = (type: string) => {
    switch (type) {
        case 'call': return <Phone size={24} color="var(--accent-primary)" />;
        case 'bill': return <CreditCard size={24} color="var(--accent-success)" />;
        case 'order': return <ShoppingBag size={24} color="var(--accent-warning)" />;
        default: return <Bell size={24} color="var(--accent-warning)" />;
    }
  };

  const getAlertTitle = (type: string) => {
    switch (type) {
        case 'call': return "Appel Serveur";
        case 'bill': return "Demande d'Addition";
        case 'order': return "Nouvelle Commande";
        default: return "Alerte Client";
    }
  };

  return (
    <div style={{ padding: '2.5rem', background: 'var(--bg-primary)', minHeight: '100vh' }} className="animate-fade-in">
        <header style={{ marginBottom: '3rem' }}>
            <h1 style={{ fontSize: '2.2rem', fontWeight: '900', color: 'white', marginBottom: '0.5rem' }}>Centre d'Alertes</h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Notifications en temps réel des actions clients en salle.</p>
        </header>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
            {alerts.length === 0 && !loading && (
                <div className="glass-panel" style={{ padding: '4rem', textAlign: 'center', background: 'var(--bg-secondary)', borderRadius: '32px' }}>
                    <Bell size={48} color="var(--bg-tertiary)" style={{ marginBottom: '1.5rem' }} />
                    <h3 style={{ color: 'var(--text-muted)' }}>Aucune alerte pour le moment</h3>
                </div>
            )}

            {alerts.map(alert => (
                <div 
                    key={alert.id} 
                    className="glass-panel" 
                    style={{ 
                        padding: '1.8rem', 
                        background: alert.status === 'resolved' ? 'rgba(255,255,255,0.02)' : 'var(--bg-secondary)', 
                        borderRadius: '24px', 
                        display: 'flex', 
                        justifyContent: 'space-between', 
                        alignItems: 'center',
                        borderLeft: `6px solid ${alert.status === 'resolved' ? 'var(--bg-tertiary)' : (alert.type === 'bill' ? 'var(--accent-success)' : 'var(--accent-primary)')}`,
                        opacity: alert.status === 'resolved' ? 0.6 : 1,
                        transition: 'all 0.3s'
                    }}
                >
                    <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center' }}>
                        <div style={{ width: '60px', height: '60px', borderRadius: '16px', background: 'var(--bg-tertiary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            {getAlertIcon(alert.type)}
                        </div>
                        <div>
                            <h3 style={{ fontSize: '1.2rem', fontWeight: '900', marginBottom: '0.3rem' }}>{getAlertTitle(alert.type)}</h3>
                            <div style={{ display: 'flex', gap: '1.2rem', alignItems: 'center' }}>
                                <p style={{ fontSize: '1rem', fontWeight: '800', color: 'var(--accent-primary)' }}>TABLE {alert.table}</p>
                                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                    <Clock size={14} /> {new Date(alert.created_at).toLocaleTimeString()}
                                </p>
                            </div>
                        </div>
                    </div>

                    <div style={{ display: 'flex', gap: '1rem' }}>
                        {alert.status === 'pending' ? (
                            <button 
                                onClick={() => markAsResolved(alert.id)}
                                style={{ padding: '0.8rem 1.5rem', background: 'var(--accent-success)', color: 'white', border: 'none', borderRadius: '12px', fontWeight: '800', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.6rem' }}
                            >
                                <CheckCircle size={18} /> RÉSOLU
                            </button>
                        ) : (
                            <button 
                                onClick={() => deleteAlert(alert.id)}
                                style={{ padding: '0.8rem', background: 'var(--bg-tertiary)', color: '#EF4444', border: 'none', borderRadius: '12px', cursor: 'pointer' }}
                            >
                                <Trash2 size={18} />
                            </button>
                        )}
                    </div>
                </div>
            ))}
        </div>
    </div>
  );
}
