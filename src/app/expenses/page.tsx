"use client";
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';

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
    <div style={{ padding: '2rem', maxWidth: '1000px', margin: '0 auto' }} className="animate-fade-in">
       <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '3rem' }}>
          <h1 style={{ fontSize: '2.5rem' }}>Gestion des <span style={{ color: 'var(--accent-danger)' }}>Dépenses Équipe</span></h1>
          <Link href="/" className="btn-secondary">Retour</Link>
       </header>

       {/* Filters */}
       <div className="glass-panel" style={{ padding: '1.5rem', marginBottom: '2rem', display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <button className={period === 'today' ? 'btn-primary' : 'btn-secondary'} onClick={() => setPeriod('today')}>Aujourd'hui</button>
          <button className={period === 'week' ? 'btn-primary' : 'btn-secondary'} onClick={() => setPeriod('week')}>7 Jours</button>
          <button className={period === 'month' ? 'btn-primary' : 'btn-secondary'} onClick={() => setPeriod('month')}>30 Jours</button>
          <button className={period === 'custom' ? 'btn-primary' : 'btn-secondary'} onClick={() => setPeriod('custom')}>Personnalisé</button>
          
          {period === 'custom' && (
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                <input type="date" className="input-field" value={startDate} onChange={e => setStartDate(e.target.value)} />
                <span>à</span>
                <input type="date" className="input-field" value={endDate} onChange={e => setEndDate(e.target.value)} />
            </div>
          )}
       </div>

       <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr', gap: '2rem' }}>
          {/* Form Left */}
          <section className="glass-panel" style={{ padding: '2rem', background: '#fff', height: 'fit-content' }}>
             <h2 style={{ marginBottom: '1.5rem', fontSize: '1.2rem' }}>Nouvelle Dépense</h2>
             <form onSubmit={handleAdd} style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    <label style={{ fontSize: '0.85rem', fontWeight: '600' }}>Motif / Libellé</label>
                    <input 
                        className="input-field" 
                        placeholder="Ex: Achat viande, Facture..." 
                        value={title}
                        onChange={e => setTitle(e.target.value)}
                        required
                    />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    <label style={{ fontSize: '0.85rem', fontWeight: '600' }}>Montant (F)</label>
                    <input 
                        type="number"
                        className="input-field" 
                        placeholder="0 F" 
                        value={amount}
                        onChange={e => setAmount(e.target.value)}
                        required
                    />
                </div>
                <button 
                    type="submit" 
                    className="btn-primary" 
                    disabled={submitting}
                    style={{ background: 'var(--accent-danger)', marginTop: '0.5rem' }}
                >
                    {submitting ? 'Enregistrement...' : 'Valider la dépense'}
                </button>
             </form>

             <div style={{ marginTop: '2.5rem', paddingTop: '2.5rem', borderTop: '1px solid var(--border-color)' }}>
                 <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', fontWeight: '700', marginBottom: '0.5rem' }}>TOTAL DÉPENSÉ</p>
                 <h2 style={{ fontSize: '2rem', color: 'var(--accent-danger)' }}>{totalExpenses.toLocaleString()} F</h2>
             </div>
          </section>

          {/* List Right */}
          <section>
             <h2 style={{ marginBottom: '1.5rem', fontSize: '1.2rem' }}>Historique récent</h2>
             <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {loading ? <p>Chargement...</p> : expenses.length === 0 ? <p style={{ color: 'var(--text-muted)' }}>Aucune dépense.</p> : expenses.map(e => (
                    <div key={e.id} className="glass-panel" style={{ padding: '1.2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#fff' }}>
                        <div>
                            <p style={{ fontWeight: '700', fontSize: '1rem' }}>{e.title}</p>
                            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{new Date(e.created_at).toLocaleDateString()}</p>
                        </div>
                        <p style={{ fontWeight: '900', color: 'var(--accent-danger)', fontSize: '1.1rem' }}>-{e.amount.toLocaleString()} F</p>
                    </div>
                ))}
             </div>
          </section>
       </div>
    </div>
  );
}
