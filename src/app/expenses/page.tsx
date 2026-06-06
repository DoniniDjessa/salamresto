"use client";
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { CreditCard, Plus, Filter, Trash2, Calendar, TrendingDown } from 'lucide-react';

type Period = 'today' | 'week' | 'month' | 'custom';

export default function ExpensesPage() {
  const [expenses, setExpenses] = useState<any[]>([]);
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [period, setPeriod] = useState<Period>('today');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  useEffect(() => {
    fetchExpenses();
  }, [period, startDate, endDate]);

  async function fetchExpenses() {
    setLoading(true);
    let query = supabase.from('resto-expenses').select('*').eq('type', 'staff').order('created_at', { ascending: false });

    const now = new Date();
    let start = new Date();

    if (period === 'today') {
      start.setHours(0, 0, 0, 0);
      query = query.gte('created_at', start.toISOString());
    } else if (period === 'week') {
      start.setDate(now.getDate() - 7);
      query = query.gte('created_at', start.toISOString());
    } else if (period === 'month') {
      start.setMonth(now.getMonth() - 1);
      query = query.gte('created_at', start.toISOString());
    } else if (period === 'custom' && startDate && endDate) {
      query = query.gte('created_at', new Date(startDate).toISOString())
                   .lte('created_at', new Date(endDate).toISOString());
    }

    const { data } = await query;
    if (data) setExpenses(data);
    setLoading(false);
  }

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !amount) return;
    
    setSubmitting(true);
    const { error } = await supabase.from('resto-expenses').insert([{
        title,
        amount: parseFloat(amount),
        type: 'staff'
    }]);

    if (!error) {
        setTitle('');
        setAmount('');
        fetchExpenses();
    } else {
        alert("Erreur: " + error.message);
    }
    setSubmitting(false);
  };

  const totalExpenses = expenses.reduce((acc, e) => acc + (e.amount || 0), 0);

  return (
    <div style={{ padding: '2.5rem', background: 'var(--bg-primary)', minHeight: '100vh' }} className="animate-fade-in">
       <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '3rem' }}>
          <div>
            <h1 style={{ fontSize: '2.2rem', fontWeight: '900', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <CreditCard size={32} color="var(--accent-primary)" /> Gestion des <span style={{ color: 'var(--accent-primary)' }}>Dépenses</span>
            </h1>
            <p style={{ color: 'var(--text-secondary)' }}>Contrôlez les coûts opérationnels de votre établissement</p>
          </div>
       </header>

       <div style={{ display: 'grid', gridTemplateColumns: '380px 1fr', gap: '2.5rem', alignItems: 'start' }}>
          {/* Left Panel: Form & Stats */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
             <section className="glass-panel" style={{ padding: '2rem', background: 'var(--bg-secondary)', borderRadius: '28px' }}>
                <h2 style={{ fontSize: '1.2rem', fontWeight: '800', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
                    <Plus size={20} color="var(--accent-primary)" /> Nouveau Retrait
                </h2>
                <form onSubmit={handleAdd} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                        <label style={{ fontSize: '0.8rem', fontWeight: '700', color: 'var(--text-muted)' }}>MOTIF / LIBELLÉ</label>
                        <input 
                            className="glass-panel" 
                            style={{ padding: '1rem', background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', color: 'white', borderRadius: '14px', outline: 'none' }}
                            placeholder="Ex: Facture CIE, Achat Marché..." 
                            value={title}
                            onChange={e => setTitle(e.target.value)}
                            required
                        />
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                        <label style={{ fontSize: '0.8rem', fontWeight: '700', color: 'var(--text-muted)' }}>MONTANT (F)</label>
                        <input 
                            type="number"
                            className="glass-panel" 
                            style={{ padding: '1rem', background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', color: 'white', borderRadius: '14px', outline: 'none', fontSize: '1.2rem', fontWeight: '800' }}
                            placeholder="0 F" 
                            value={amount}
                            onChange={e => setAmount(e.target.value)}
                            required
                        />
                    </div>
                    <button 
                        type="submit" 
                        className="hover-scale" 
                        disabled={submitting}
                        style={{ padding: '1.2rem', borderRadius: '16px', background: 'var(--accent-primary)', color: 'white', border: 'none', fontWeight: '800', fontSize: '1rem', cursor: 'pointer', boxShadow: 'var(--shadow-glow)' }}
                    >
                        {submitting ? 'Enregistrement...' : 'ENREGISTRER'}
                    </button>
                </form>
             </section>

             <div className="glass-panel" style={{ padding: '2rem', background: 'var(--bg-secondary)', borderLeft: '6px solid var(--accent-primary)', borderRadius: '28px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
                    <div style={{ padding: '0.6rem', background: 'rgba(139, 92, 246, 0.1)', borderRadius: '10px' }}>
                        <TrendingDown color="var(--accent-primary)" size={20} />
                    </div>
                    <p style={{ color: 'var(--text-secondary)', fontWeight: '800', fontSize: '0.8rem' }}>TOTAL PÉRIODE</p>
                </div>
                <h2 style={{ fontSize: '2.5rem', fontWeight: '900' }}>{totalExpenses.toLocaleString()} <span style={{ fontSize: '1.1rem', color: 'var(--text-secondary)' }}>F</span></h2>
             </div>
          </div>

          {/* Right Panel: List & Filters */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
             <div className="glass-panel" style={{ padding: '1rem 2rem', background: 'var(--bg-secondary)', borderRadius: '24px', display: 'flex', gap: '1.5rem', alignItems: 'center' }}>
                <Filter size={18} color="var(--text-muted)" />
                <div style={{ display: 'flex', gap: '0.8rem' }}>
                    {['today', 'week', 'month', 'custom'].map(p => (
                        <button 
                            key={p}
                            onClick={() => setPeriod(p as Period)}
                            style={{ padding: '0.6rem 1rem', borderRadius: '10px', background: period === p ? 'var(--accent-primary)' : 'var(--bg-tertiary)', color: 'white', border: 'none', fontSize: '0.75rem', fontWeight: '800', cursor: 'pointer' }}
                        >
                            {p.toUpperCase()}
                        </button>
                    ))}
                </div>
                {period === 'custom' && (
                    <div style={{ display: 'flex', gap: '0.8rem', alignItems: 'center', marginLeft: 'auto' }}>
                        <input type="date" className="glass-panel" style={{ padding: '0.5rem', background: 'var(--bg-tertiary)', border: 'none', color: 'white', fontSize: '0.8rem', borderRadius: '8px' }} value={startDate} onChange={e => setStartDate(e.target.value)} />
                        <span style={{ opacity: 0.3 }}>-</span>
                        <input type="date" className="glass-panel" style={{ padding: '0.5rem', background: 'var(--bg-tertiary)', border: 'none', color: 'white', fontSize: '0.8rem', borderRadius: '8px' }} value={endDate} onChange={e => setEndDate(e.target.value)} />
                    </div>
                )}
             </div>

             <section className="glass-panel" style={{ background: 'var(--bg-secondary)', padding: '2rem', borderRadius: '32px', flex: 1 }}>
                <h2 style={{ fontSize: '1.4rem', fontWeight: '900', marginBottom: '2rem' }}>Historique des Sorties</h2>
                {loading ? <p>Mise à jour...</p> : expenses.length === 0 ? <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '4rem' }}>Aucune dépense enregistrée.</p> : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        {expenses.map(e => (
                            <div key={e.id} className="glass-panel hover-scale" style={{ padding: '1.2rem 1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-tertiary)', borderRadius: '20px' }}>
                                <div style={{ display: 'flex', gap: '1.2rem', alignItems: 'center' }}>
                                    <div style={{ padding: '0.8rem', background: 'var(--bg-secondary)', borderRadius: '12px', color: 'var(--accent-primary)' }}>
                                        <CreditCard size={20} />
                                    </div>
                                    <div>
                                        <p style={{ fontWeight: '800', fontSize: '1.05rem', marginBottom: '0.2rem' }}>{e.title}</p>
                                        <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                            <Calendar size={12} /> {new Date(e.created_at).toLocaleDateString()}
                                        </p>
                                    </div>
                                </div>
                                <div style={{ textAlign: 'right' }}>
                                    <p style={{ fontWeight: '900', color: 'white', fontSize: '1.3rem' }}>{e.amount.toLocaleString()} F</p>
                                    <span style={{ fontSize: '0.65rem', fontWeight: '800', color: 'var(--text-muted)', letterSpacing: '0.05em' }}>CASH / SORTIE CAISSE</span>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
             </section>
          </div>
       </div>
    </div>
  );
}
