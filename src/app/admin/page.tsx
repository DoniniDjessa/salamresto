"use client";
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { Order, Product, User } from '@/types';

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState<'analytics' | 'hr' | 'menu' | 'accounting' | 'adminexpenses'>('analytics');
  const [orders, setOrders] = useState<any[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [expenses, setExpenses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Form states
  const [newProductName, setNewProductName] = useState('');
  const [newProductPrice, setNewProductPrice] = useState('');
  const [newProductCategory, setNewProductCategory] = useState<'dish' | 'drink' | 'dessert' | 'collation'>('dish');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [productOptions, setProductOptions] = useState<{name: string, price: number}[]>([]);
  const [optName, setOptName] = useState('');
  const [optPrice, setOptPrice] = useState('');

  // Exp form
  const [expTitle, setExpTitle] = useState('');
  const [expAmount, setExpAmount] = useState('');
  
  // Filters for Accounting
  const [period, setPeriod] = useState<'today' | 'week' | 'month' | 'custom'>('month');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  useEffect(() => {
    fetchData();
    const channel = supabase.channel('admin-updates')
      .on('postgres_changes', { event: '*', table: 'resto-orders', schema: 'public' }, () => {
        fetchData();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [activeTab]);

  async function fetchData() {
    setLoading(true);
    try {
      if (activeTab === 'analytics' || activeTab === 'accounting' || activeTab === 'adminexpenses') {
        let qOrders = supabase.from('resto-orders').select('*').order('created_at', { ascending: false });
        let qExpenses = supabase.from('resto-expenses').select('*').order('created_at', { ascending: false });

        if (activeTab === 'accounting' || activeTab === 'adminexpenses') {
            const now = new Date();
            let start = new Date();
            if (period === 'today') { start.setHours(0, 0, 0, 0); qOrders = qOrders.gte('created_at', start.toISOString()); qExpenses = qExpenses.gte('created_at', start.toISOString()); }
            else if (period === 'week') { start.setDate(now.getDate() - 7); qOrders = qOrders.gte('created_at', start.toISOString()); qExpenses = qExpenses.gte('created_at', start.toISOString()); }
            else if (period === 'month') { start.setMonth(now.getMonth() - 1); qOrders = qOrders.gte('created_at', start.toISOString()); qExpenses = qExpenses.gte('created_at', start.toISOString()); }
            else if (period === 'custom' && startDate && endDate) {
                qOrders = qOrders.gte('created_at', new Date(startDate).toISOString()).lte('created_at', new Date(endDate).toISOString());
                qExpenses = qExpenses.gte('created_at', new Date(startDate).toISOString()).lte('created_at', new Date(endDate).toISOString());
            }
        }

        const { data: oData } = await qOrders;
        const { data: eData } = await qExpenses;
        const { data: uData } = await supabase.from('resto-users').select('*');

        if (oData) setOrders(oData);
        if (eData) setExpenses(eData);
        if (uData) setUsers(uData);

      } else if (activeTab === 'hr') {
        const { data, error } = await supabase.from('resto-users').select('*');
        if (error) throw error;
        if (data) setUsers(data);
      } else if (activeTab === 'menu') {
        const { data, error } = await supabase.from('resto-products').select('*').order('created_at', { ascending: false });
        if (error) throw error;
        if (data) setProducts(data);
      }
    } catch (err: any) {
      console.error("Fetch error:", err.message);
    }
    setLoading(false);
  }

  // CRUD Menu with Image Upload
  async function addProduct() {
      if(!newProductName || !newProductPrice) return alert("Remplissez les champs");
      
      setUploading(true);
      let imageUrl = '';

      if (selectedFile) {
          const fileExt = selectedFile.name.split('.').pop();
          const fileName = `${Math.random()}.${fileExt}`;
          const { error: uploadError, data } = await supabase.storage
              .from('resto-bucket')
              .upload(fileName, selectedFile);

          if (uploadError) {
              alert("Erreur upload image: " + uploadError.message);
          } else if (data) {
              const { data: publicData } = supabase.storage.from('resto-bucket').getPublicUrl(fileName);
              imageUrl = publicData.publicUrl;
          }
      }

      const { error } = await supabase.from('resto-products').insert([{
          name: newProductName,
          price: parseFloat(newProductPrice),
          category: newProductCategory,
          image: imageUrl,
          options: productOptions.length > 0 ? productOptions : null
      }]);

      if(!error) {
          setNewProductName(''); setNewProductPrice(''); setSelectedFile(null);
          setProductOptions([]);
          fetchData();
      } else {
          alert("Erreur base de données: " + error.message);
      }
      setUploading(false);
  }

  async function deleteProduct(id: string) {
      if(!confirm("Supprimer ce produit ?")) return;
      const { error } = await supabase.from('resto-products').delete().eq('id', id);
      if(!error) fetchData();
  }

  async function addExpense() {
      if(!expTitle || !expAmount) return alert("Remplissez les champs");
      const { error } = await supabase.from('resto-expenses').insert([{ 
          title: expTitle, 
          amount: parseFloat(expAmount),
          type: 'admin' 
      }]);
      if (!error) {
          setExpTitle(''); setExpAmount('');
          fetchData();
      }
  }

  // Analytics Calcs
  const caSalle = orders.filter(o => o.type === 'salle').reduce((acc, o) => acc + o.total, 0);
  const caExterne = orders.filter(o => o.type === 'external').reduce((acc, o) => acc + o.total, 0);
  const caTotal = caSalle + caExterne;

  const recentOrders = orders.slice(0, 10);

  return (
    <div style={{ padding: '2rem', maxWidth: '1400px', margin: '0 auto', display: 'flex', gap: '2rem', height: '100vh' }}>
      
      {/* Sidebar Navigation */}
      <aside className="glass-panel" style={{ width: '280px', padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1.2rem', height: 'fit-content' }}>
         <h1 style={{ fontSize: '1.8rem', fontWeight: '900', color: 'var(--text-primary)', marginBottom: '1.5rem' }}>Administration</h1>
         <nav style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
            <button className={activeTab === 'analytics' ? 'btn-primary' : 'btn-secondary'} onClick={() => setActiveTab('analytics')} style={{ justifyContent: 'flex-start', width: '100%' }}>
              📊 Dashboard
            </button>
            <button className={activeTab === 'hr' ? 'btn-primary' : 'btn-secondary'} onClick={() => setActiveTab('hr')} style={{ justifyContent: 'flex-start', width: '100%' }}>
              👥 Équipe & Paie
            </button>
            <button className={activeTab === 'menu' ? 'btn-primary' : 'btn-secondary'} onClick={() => setActiveTab('menu')} style={{ justifyContent: 'flex-start', width: '100%' }}>
              🍔 Menu
            </button>
            <button className={activeTab === 'adminexpenses' ? 'btn-primary' : 'btn-secondary'} onClick={() => setActiveTab('adminexpenses')} style={{ justifyContent: 'flex-start', width: '100%' }}>
              💸 Dépenses Resto
            </button>
            <button className={activeTab === 'accounting' ? 'btn-primary' : 'btn-secondary'} onClick={() => setActiveTab('accounting')} style={{ justifyContent: 'flex-start', width: '100%' }}>
              💰 Comptabilité
            </button>
         </nav>
         
         <div style={{ marginTop: '2rem' }}>
            <Link href="/" className="btn-secondary" style={{ width: '100%', display: 'block', textAlign: 'center' }}>← Accueil</Link>
         </div>
      </aside>

      {/* Main Content Area */}
      <main className="glass-panel" style={{ flex: 1, padding: '2.5rem', overflowY: 'auto' }}>
        
        {loading ? <p>Synchronisation...</p> : (
          <>
            {/* TAB 1: Analytics & Timeline */}
            {activeTab === 'analytics' && (
              <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                 <h2 style={{ fontSize: '2rem' }}>Tableau de bord</h2>
                 
                 <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1.5rem' }}>
                    <div style={{ background: '#fff', padding: '1.5rem', borderRadius: '16px', borderLeft: '8px solid var(--accent-success)', boxShadow: 'var(--shadow-md)' }}>
                       <p style={{ color: 'var(--text-muted)', fontWeight: '600', fontSize: '0.8rem' }}>CA TOTAL</p>
                       <h3 style={{ fontSize: '1.8rem' }}>{caTotal.toLocaleString()} F</h3>
                    </div>
                    <div style={{ background: '#fff', padding: '1.5rem', borderRadius: '16px', borderLeft: '8px solid var(--accent-primary)', boxShadow: 'var(--shadow-md)' }}>
                       <p style={{ color: 'var(--text-muted)', fontWeight: '600', fontSize: '0.8rem' }}>SALLE</p>
                       <h3 style={{ fontSize: '1.8rem' }}>{caSalle.toLocaleString()} F</h3>
                    </div>
                    <div style={{ background: '#fff', padding: '1.5rem', borderRadius: '16px', borderLeft: '8px solid var(--accent-secondary)', boxShadow: 'var(--shadow-md)' }}>
                       <p style={{ color: 'var(--text-muted)', fontWeight: '600', fontSize: '0.8rem' }}>LIVRAISON</p>
                       <h3 style={{ fontSize: '1.8rem' }}>{caExterne.toLocaleString()} F</h3>
                    </div>
                 </div>

                 {/* Timeline Box */}
                 <div className="glass-panel" style={{ background: '#fff', padding: '2rem' }}>
                    <h3 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        🕒 Timeline des Commandes <span style={{ fontSize: '0.8rem', fontWeight: 'normal', color: 'var(--text-muted)' }}>(10 dernières)</span>
                    </h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        {recentOrders.length === 0 ? (
                            <p style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '2rem' }}>
                                Aucune commande enregistrée pour le moment.
                            </p>
                        ) : recentOrders.map((o: any) => (
                            <div key={o.id} style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', padding: '1rem', borderBottom: '1px solid var(--border-color)' }}>
                                <div style={{ fontSize: '0.75rem', fontWeight: '800', width: '80px', color: 'var(--text-muted)' }}>
                                    {new Date(o.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </div>
                                <div style={{ flex: 1 }}>
                                    <p style={{ fontWeight: '700', fontSize: '0.95rem' }}>{o.type === 'salle' ? `Table ${o.tablenumber}` : `External: ${o.customername}`}</p>
                                    <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                                        {o.items.map((it: any) => `${it.quantity}x ${it.name}`).join(', ')}
                                    </p>
                                </div>
                                <div style={{ 
                                    background: o.status === 'pret' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(245, 158, 11, 0.1)', 
                                    color: o.status === 'pret' ? 'var(--accent-success)' : 'var(--accent-warning)',
                                    padding: '0.3rem 0.6rem', borderRadius: '6px', fontSize: '0.7rem', fontWeight: '800'
                                }}>
                                    {o.status.toUpperCase()}
                                </div>
                                <div style={{ fontWeight: '900', width: '100px', textAlign: 'right' }}>{o.total.toLocaleString()} F</div>
                            </div>
                        ))}
                    </div>
                 </div>
              </div>
            )}

            {/* TAB 2: HR */}
            {activeTab === 'hr' && (
              <div className="animate-fade-in">
                 <h2 style={{ marginBottom: '2rem', fontSize: '2rem' }}>Personnel</h2>
                 <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1.5rem' }}>
                    {users.map(u => (
                       <div key={u.id} className="glass-panel" style={{ padding: '1.5rem', background: '#fff' }}>
                          <h4 style={{ fontSize: '1.2rem' }}>{u.name}</h4>
                          <p style={{ color: 'var(--text-muted)' }}>{u.role}</p>
                          <p style={{ fontWeight: '700', marginTop: '0.5rem' }}>{u.baseSalary?.toLocaleString()} F</p>
                       </div>
                    ))}
                 </div>
              </div>
            )}

            {/* TAB 3: Menu (CRUD with Images) */}
            {activeTab === 'menu' && (
              <div className="animate-fade-in">
                 <h2 style={{ marginBottom: '2rem', fontSize: '2rem' }}>Menu Management</h2>
                 
                 <div className="glass-panel" style={{ padding: '2rem', background: 'var(--bg-tertiary)', marginBottom: '3rem', border: '1px solid var(--accent-secondary)' }}>
                    <h3 style={{ marginBottom: '1.5rem' }}>Nouveau délice</h3>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1.5rem' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            <input className="input-field" value={newProductName} onChange={e => setNewProductName(e.target.value)} placeholder="Nom du plat" />
                            <input type="number" className="input-field" value={newProductPrice} onChange={e => setNewProductPrice(e.target.value)} placeholder="Prix (F)" />
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            <select className="input-field" value={newProductCategory} onChange={e => setNewProductCategory(e.target.value as any)}>
                                <option value="dish">Plat principal</option>
                                <option value="drink">Boisson</option>
                                <option value="dessert">Dessert</option>
                                <option value="collation">Collation</option>
                            </select>
                            <input type="file" onChange={e => setSelectedFile(e.target.files?.[0] || null)} style={{ fontSize: '0.8rem' }} accept="image/*" />
                        </div>
                    </div>
                    
                    {/* Gestion des Variantes/Options */}
                    <div style={{ marginTop: '1.5rem', paddingTop: '1.5rem', borderTop: '1px solid var(--border-color)' }}>
                        <h4 style={{ marginBottom: '1rem', fontSize: '1rem' }}>Variantes / Options (Optionnel)</h4>
                        <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
                            Si ce produit a des tailles ou parfums avec des prix différents (ex: Pizza Moyenne à 5000F, Pizza Grande à 7000F), ajoutez-les ici. Le prix de base sera ignoré.
                        </p>
                        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', marginBottom: '1rem' }}>
                            <input className="input-field" placeholder="Nom de l'option (ex: Grande)" value={optName} onChange={e => setOptName(e.target.value)} />
                            <input type="number" className="input-field" placeholder="Prix (F)" value={optPrice} onChange={e => setOptPrice(e.target.value)} />
                            <button 
                                className="btn-secondary" 
                                onClick={() => {
                                    if(optName && optPrice) {
                                        setProductOptions([...productOptions, { name: optName, price: parseFloat(optPrice) }]);
                                        setOptName(''); setOptPrice('');
                                    }
                                }}
                            >
                                + Option
                            </button>
                        </div>
                        {productOptions.length > 0 && (
                            <div style={{ background: '#fff', padding: '1rem', borderRadius: '8px' }}>
                                {productOptions.map((opt, i) => (
                                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--bg-tertiary)', padding: '0.5rem 0' }}>
                                        <span style={{ fontWeight: '600' }}>{opt.name}</span>
                                        <span>{opt.price.toLocaleString()} F</span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    <button className="btn-primary" onClick={addProduct} disabled={uploading} style={{ width: '100%', marginTop: '2rem' }}>
                        {uploading ? 'Chargement image...' : '✅ Enregistrer le produit'}
                    </button>
                 </div>

                 <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '1.5rem' }}>
                    {products.map(p => (
                       <div key={p.id} className="glass-panel" style={{ padding: '1rem', background: '#fff', overflow: 'hidden' }}>
                            <div style={{ 
                                height: '140px', background: p.image ? `url(${p.image}) center/cover` : 'var(--bg-tertiary)', 
                                borderRadius: '12px', marginBottom: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center'
                            }}>
                                {!p.image && <span style={{ fontSize: '2rem' }}>🍲</span>}
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <h4 style={{ fontWeight: '700' }}>{p.name}</h4>
                                <button onClick={() => deleteProduct(p.id)} style={{ color: 'var(--accent-danger)', fontSize: '0.7rem' }}>🗑️</button>
                            </div>
                            <p style={{ color: 'var(--accent-primary)', fontWeight: '900', marginTop: '0.5rem' }}>
                                {p.options && p.options.length > 0 ? `Dès ${Math.min(...p.options.map(o => o.price)).toLocaleString()} F` : `${p.price.toLocaleString()} F`}
                            </p>
                            {p.options && p.options.length > 0 && (
                                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                                    {p.options.length} options disponibles
                                </p>
                            )}
                       </div>
                    ))}
                 </div>
              </div>
            )}

            {/* TAB 4: Accounting */}
            {activeTab === 'accounting' && (
              <div className="animate-fade-in">
                 <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                    <h2 style={{ fontSize: '2rem' }}>Bilan de Gestion</h2>
                    <div style={{ display: 'flex', gap: '0.8rem', alignItems: 'center' }}>
                        <select className="input-field" value={period} onChange={e => setPeriod(e.target.value as any)} style={{ padding: '0.5rem' }}>
                            <option value="today">Aujourd'hui</option>
                            <option value="week">Cest 7 jours</option>
                            <option value="month">Ce mois</option>
                            <option value="custom">Dates personnalisées</option>
                        </select>
                        {period === 'custom' && (
                            <>
                                <input type="date" className="input-field" style={{ padding: '0.4rem' }} value={startDate} onChange={e => setStartDate(e.target.value)} />
                                <input type="date" className="input-field" style={{ padding: '0.4rem' }} value={endDate} onChange={e => setEndDate(e.target.value)} />
                                <button className="btn-secondary" onClick={() => fetchData()}>Go</button>
                            </>
                        )}
                    </div>
                 </div>
                 
                 {/* Financial Matrix */}
                 <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.2rem', marginBottom: '3rem' }}>
                    <div style={{ background: '#fff', padding: '1.2rem', borderRadius: '12px', borderLeft: '6px solid var(--accent-success)' }}>
                       <p style={{ color: 'var(--text-muted)', fontWeight: '700', fontSize: '0.7rem' }}>VENUES (VENTES)</p>
                       <h3 style={{ fontSize: '1.5rem' }}>{caTotal.toLocaleString()} F</h3>
                    </div>
                    <div style={{ background: '#fff', padding: '1.2rem', borderRadius: '12px', borderLeft: '6px solid var(--accent-warning)' }}>
                       <p style={{ color: 'var(--text-muted)', fontWeight: '700', fontSize: '0.7rem' }}>DÉPENSES ÉQUIPE</p>
                       <h3 style={{ fontSize: '1.5rem' }}>{expenses.filter(e => e.type === 'staff').reduce((acc, e) => acc + e.amount, 0).toLocaleString()} F</h3>
                    </div>
                    <div style={{ background: '#fff', padding: '1.2rem', borderRadius: '12px', borderLeft: '6px solid var(--accent-danger)' }}>
                       <p style={{ color: 'var(--text-muted)', fontWeight: '700', fontSize: '0.7rem' }}>DÉPENSES RESTO (ADMIN)</p>
                       <h3 style={{ fontSize: '1.5rem' }}>{expenses.filter(e => e.type === 'admin').reduce((acc, e) => acc + e.amount, 0).toLocaleString()} F</h3>
                    </div>
                    <div style={{ background: '#fff', padding: '1.2rem', borderRadius: '12px', borderLeft: '6px solid var(--text-primary)' }}>
                       <p style={{ color: 'var(--text-muted)', fontWeight: '700', fontSize: '0.7rem' }}>SALAIRES ESTIMÉS</p>
                       <h3 style={{ fontSize: '1.5rem' }}>{users.reduce((acc, u) => acc + (u.baseSalary || 0), 0).toLocaleString()} F</h3>
                    </div>
                    <div style={{ background: 'var(--bg-tertiary)', padding: '1.2rem', borderRadius: '12px', border: '1px solid var(--accent-primary)' }}>
                       <p style={{ color: 'var(--accent-primary)', fontWeight: '800', fontSize: '0.7rem' }}>SOLDE FINAL</p>
                       <h3 style={{ fontSize: '1.6rem', color: 'var(--accent-primary)' }}>
                        {(caTotal - expenses.reduce((acc, e) => acc + e.amount, 0) - users.reduce((acc, u) => acc + (u.baseSalary || 0), 0)).toLocaleString()} F
                       </h3>
                    </div>
                 </div>
              </div>
            )}

            {/* TAB 5: Admin Expenses */}
            {activeTab === 'adminexpenses' && (
              <div className="animate-fade-in">
                 <h2 style={{ marginBottom: '2rem', fontSize: '2rem' }}>Dépenses Administratives (Resto)</h2>
                 
                 <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
                    <div className="glass-panel" style={{ padding: '2rem', background: '#fff' }}>
                        <h3 style={{ marginBottom: '1.5rem', fontSize: '1.1rem' }}>Nouvelle Dépense Resto</h3>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            <input className="input-field" value={expTitle} onChange={e => setExpTitle(e.target.value)} placeholder="Motif (ex: Loyer, Grossiste, Facture...)" />
                            <input type="number" className="input-field" value={expAmount} onChange={e => setExpAmount(e.target.value)} placeholder="Montant (F)" />
                            <button className="btn-primary" style={{ background: 'var(--accent-danger)' }} onClick={addExpense}>
                                Enregistrer la Dépense Resto
                            </button>
                        </div>
                    </div>

                    <div className="glass-panel" style={{ padding: '2rem', background: '#fff' }}>
                        <h3 style={{ marginBottom: '1.5rem', fontSize: '1.1rem' }}>Historique Resto</h3>
                        <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
                            {expenses.filter(e => e.type === 'admin').length === 0 ? (
                                <p style={{ color: 'var(--text-muted)' }}>Aucune dépense administrative enregistrée.</p>
                            ) : expenses.filter(e => e.type === 'admin').map(e => (
                                <div key={e.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.8rem 0', borderBottom: '1px solid var(--border-color)' }}>
                                    <div>
                                        <p style={{ fontWeight: '600' }}>{e.title}</p>
                                        <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{new Date(e.created_at).toLocaleDateString()}</p>
                                    </div>
                                    <p style={{ fontWeight: '700', color: 'var(--accent-danger)' }}>-{e.amount.toLocaleString()} F</p>
                                </div>
                            ))}
                        </div>
                    </div>
                 </div>
              </div>
            )}
          </>
        )}

      </main>
    </div>
  );
}
