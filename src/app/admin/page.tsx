"use client";
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { Order, Product, User } from '@/types';
import { 
  Activity, 
  Users, 
  Utensils, 
  Wallet, 
  PieChart, 
  Plus, 
  Trash2, 
  Upload, 
  ChevronRight, 
  TrendingUp, 
  Truck,
  ChefHat,
  Monitor,
  Smartphone,
  CreditCard,
  BarChart3,
  Search,
  Bell,
  Settings,
  MoreVertical,
  ArrowRight,
  Clock,
  Phone,
  UserCircle,
  Table as TableIcon,
  QrCode,
  UserCheck,
  ChevronLeft,
  TrendingDown
} from 'lucide-react';

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState<'analytics' | 'hr' | 'menu' | 'accounting' | 'adminexpenses' | 'profiles' | 'settings' | 'clients'>('analytics');
  const [orders, setOrders] = useState<any[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [expenses, setExpenses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  // Form states
  const [newProductName, setNewProductName] = useState('');
  const [newProductPrice, setNewProductPrice] = useState('');
  const [newProductCategory, setNewProductCategory] = useState<'dish' | 'drink' | 'dessert' | 'collation'>('dish');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [productOptions, setProductOptions] = useState<{name: string, price: number}[]>([]);
  const [optName, setOptName] = useState('');
  const [optPrice, setOptPrice] = useState('');

  // HR form
  const [newUserName, setNewUserName] = useState('');
  const [newUserRole, setNewUserRole] = useState<Role>('serveur' as any);
  
  // Exp form
  const [expTitle, setExpTitle] = useState('');
  const [expAmount, setExpAmount] = useState('');
  
  // Profile editing
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [profilePhone, setProfilePhone] = useState('');
  const [profileEmail, setProfileEmail] = useState('');
  const [profileSalary, setProfileSalary] = useState('');
  const [selectedQrTable, setSelectedQrTable] = useState<number>(1);

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

      } else if (activeTab === 'hr' || activeTab === 'profiles') {
        const { data, error } = await supabase.from('resto-users').select('*');
        if (error) throw error;
        if (data) setUsers(data);
      } else if (activeTab === 'menu') {
        const { data, error } = await supabase.from('resto-products').select('*').order('created_at', { ascending: false });
        if (error) throw error;
        if (data) setProducts(data);
      } else if (activeTab === 'settings' || activeTab === 'clients') {
        const { data: oData } = await supabase.from('resto-orders').select('*').order('created_at', { ascending: false });
        if (oData) setOrders(oData || []);
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

  async function addUser() {
      if (!newUserName) return alert("Nom requis");
      
      setLoading(true);
      try {
          // 1. Create Alias Email
          const aliasEmail = `${newUserName.toLowerCase().trim().replace(/\s+/g, '.')}@salamresto.local`;
          const defaultPassword = '0000';

          // 2. Create Auth User (using a separate client to avoid logout if possible, 
          // but since we don't have service role, we use the standard one)
          const { data: authData, error: authError } = await supabase.auth.signUp({
              email: aliasEmail,
              password: defaultPassword,
          });

          if (authError) throw authError;

          // 3. Create Profile in resto-users
          const { error: dbError } = await supabase.from('resto-users').insert([{
              id: authData.user?.id,
              name: newUserName,
              role: newUserRole,
              baseSalary: 0 // Default to 0, edited later
          }]);

          if (dbError) throw dbError;

          alert(`Membre créé !\nEmail : ${aliasEmail}\nPass : ${defaultPassword}`);
          setNewUserName('');
          fetchData();
      } catch (err: any) {
          alert("Erreur creation : " + err.message);
      }
      setLoading(false);
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

  async function updateProfile() {
      if (!editingUser) return;
      setLoading(true);
      try {
          const { error } = await supabase.from('resto-users').update({
              phone: profilePhone,
              email: profileEmail,
              baseSalary: parseFloat(profileSalary) || 0
          }).eq('id', editingUser.id);

          if (error) throw error;
          alert("Profil mis à jour !");
          setEditingUser(null);
          fetchData();
      } catch (err: any) {
          alert("Erreur : " + err.message);
      }
      setLoading(false);
  }

  const caSalle = orders.filter(o => o.type === 'salle').reduce((acc, o) => acc + o.total, 0);
  const caExterne = orders.filter(o => o.type === 'external').reduce((acc, o) => acc + o.total, 0);
  const caTotal = caSalle + caExterne;
  const recentOrders = orders.slice(0, 10);

  const tabs = [
    { id: 'analytics', label: 'Analyses', icon: Activity },
    { id: 'clients', label: 'Clients', icon: UserCheck },
    { id: 'hr', label: 'Équipe', icon: Users },
    { id: 'profiles', label: 'Profils', icon: UserCircle },
    { id: 'menu', label: 'Menu', icon: Utensils },
    { id: 'adminexpenses', label: 'Dépenses', icon: Wallet },
    { id: 'accounting', label: 'Comptabilité', icon: PieChart },
    { id: 'settings', label: 'Paramètres', icon: Settings },
  ];

  return (
    <div style={{ padding: '2.5rem', background: 'var(--bg-primary)', minHeight: '100vh', display: 'flex', gap: isSidebarCollapsed ? '1rem' : '3rem' }} className="animate-fade-in">
      
      {/* Sub-Sidebar */}
      <aside style={{ 
          width: isSidebarCollapsed ? '64px' : '240px', 
          display: 'flex', 
          flexDirection: 'column', 
          gap: '2rem',
          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          overflow: 'hidden',
          whiteSpace: 'nowrap'
      }}>
         <div style={{ display: 'flex', alignItems: 'center', justifyContent: isSidebarCollapsed ? 'center' : 'space-between' }}>
            {!isSidebarCollapsed && (
                <div>
                    <h1 style={{ fontSize: '1.5rem', fontWeight: '900', color: 'white', marginBottom: '0.2rem' }}>Admin</h1>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.75rem' }}>Gestion centrale</p>
                </div>
            )}
            <button 
                onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
                style={{ 
                    background: 'var(--bg-secondary)', 
                    border: 'none', 
                    color: 'white', 
                    padding: '0.5rem', 
                    borderRadius: '10px', 
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                }}
            >
                {isSidebarCollapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
            </button>
         </div>
         
         <nav style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
            {tabs.map(tab => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                    <button 
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id as any)}
                        title={isSidebarCollapsed ? tab.label : ''}
                        style={{ 
                            padding: isSidebarCollapsed ? '1rem' : '1rem 1.5rem', 
                            borderRadius: '16px', 
                            background: isActive ? 'var(--accent-primary)' : 'var(--bg-secondary)', 
                            color: isActive ? 'white' : 'var(--text-secondary)', 
                            border: 'none', 
                            display: 'flex', 
                            alignItems: 'center', 
                            justifyContent: isSidebarCollapsed ? 'center' : 'flex-start',
                            gap: '1rem', 
                            fontWeight: '800', 
                            cursor: 'pointer',
                            transition: 'all 0.2s',
                            boxShadow: isActive ? 'var(--shadow-glow)' : 'none'
                        }}
                    >
                        <Icon size={20} /> {!isSidebarCollapsed && tab.label}
                    </button>
                );
            })}
         </nav>
      </aside>

      {/* Main Area */}
      <main style={{ flex: 1 }}>
        {loading ? <p>Synchronisation en cours...</p> : (
          <div className="animate-fade-in">
             {/* TAB: Analytics */}
             {activeTab === 'analytics' && (
               <div style={{ display: 'flex', flexDirection: 'column', gap: '2.5rem' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '2rem' }}>
                     <div className="glass-panel" style={{ padding: '2rem', background: 'var(--bg-secondary)', borderLeft: '6px solid var(--accent-primary)', borderRadius: '32px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.2rem' }}>
                            <div style={{ padding: '0.6rem', background: 'rgba(139, 92, 246, 0.1)', borderRadius: '12px' }}><TrendingUp size={20} color="var(--accent-primary)" /></div>
                            <p style={{ color: 'var(--text-secondary)', fontWeight: '800', fontSize: '0.8rem' }}>CA TOTAL</p>
                        </div>
                        <h3 style={{ fontSize: '2.5rem', fontWeight: '900' }}>{caTotal.toLocaleString()} F</h3>
                     </div>
                     <div className="glass-panel" style={{ padding: '2rem', background: 'var(--bg-secondary)', borderLeft: '6px solid #6366F1', borderRadius: '32px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.2rem' }}>
                            <div style={{ padding: '0.6rem', background: 'rgba(99, 102, 241, 0.1)', borderRadius: '12px' }}><Utensils size={20} color="#6366F1" /></div>
                            <p style={{ color: 'var(--text-secondary)', fontWeight: '800', fontSize: '0.8rem' }}>SALLE</p>
                        </div>
                        <h3 style={{ fontSize: '2.5rem', fontWeight: '900' }}>{caSalle.toLocaleString()} F</h3>
                     </div>
                     <div className="glass-panel" style={{ padding: '2rem', background: 'var(--bg-secondary)', borderLeft: '6px solid #F59E0B', borderRadius: '32px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.2rem' }}>
                            <div style={{ padding: '0.6rem', background: 'rgba(245, 158, 11, 0.1)', borderRadius: '12px' }}><Truck size={20} color="#F59E0B" /></div>
                            <p style={{ color: 'var(--text-secondary)', fontWeight: '800', fontSize: '0.8rem' }}>LIVRAISON</p>
                        </div>
                        <h3 style={{ fontSize: '2.5rem', fontWeight: '900' }}>{caExterne.toLocaleString()} F</h3>
                     </div>
                  </div>

                  <section className="glass-panel" style={{ background: 'var(--bg-secondary)', padding: '2.5rem', borderRadius: '32px' }}>
                     <h3 style={{ fontSize: '1.4rem', fontWeight: '900', marginBottom: '2rem', display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
                        <Activity size={24} color="var(--accent-primary)" /> Flux des Commandes
                     </h3>
                     <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        {recentOrders.map(o => (
                            <div key={o.id} className="glass-panel hover-scale" style={{ padding: '1.2rem 1.5rem', background: 'var(--bg-tertiary)', borderRadius: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center' }}>
                                    <span style={{ fontSize: '0.75rem', fontWeight: '800', color: 'var(--text-muted)' }}>{new Date(o.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                    <div>
                                        <p style={{ fontWeight: '800', fontSize: '1rem' }}>{o.type === 'salle' ? `Table ${o.tablenumber}` : o.customername}</p>
                                        <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{o.items.length} articles</p>
                                    </div>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
                                    <span style={{ padding: '0.3rem 0.6rem', background: 'var(--bg-secondary)', borderRadius: '8px', fontSize: '0.65rem', fontWeight: '900', color: 'var(--accent-success)' }}>{o.status.toUpperCase()}</span>
                                    <span style={{ fontWeight: '900', fontSize: '1.2rem' }}>{o.total.toLocaleString()} F</span>
                                </div>
                            </div>
                        ))}
                     </div>
                  </section>
               </div>
             )}

             {/* TAB: HR */}
             {activeTab === 'hr' && (
               <div style={{ display: 'flex', flexDirection: 'column', gap: '2.5rem' }}>
                   <div className="glass-panel" style={{ padding: '2.5rem', background: 'var(--bg-secondary)', borderRadius: '32px' }}>
                      <h2 style={{ fontSize: '1.4rem', fontWeight: '900', marginBottom: '1.5rem' }}>Nouveau Membre</h2>
                      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: '1.2rem' }}>
                         <input className="glass-panel" value={newUserName} onChange={e => setNewUserName(e.target.value)} style={{ padding: '1rem', background: 'var(--bg-tertiary)', border: 'none', color: 'white', borderRadius: '14px' }} placeholder="Nom complet" />
                         <select className="glass-panel" value={newUserRole} onChange={e => setNewUserRole(e.target.value as any)} style={{ padding: '1rem', background: 'var(--bg-tertiary)', border: 'none', color: 'white', borderRadius: '14px' }}>
                             <option value="serveur">Serveur</option>
                             <option value="livreur">Livreur</option>
                             <option value="caissiere">Caissière</option>
                             <option value="admin">Admin</option>
                         </select>
                         <button className="hover-scale" onClick={addUser} style={{ background: 'var(--accent-primary)', color: 'white', border: 'none', borderRadius: '14px', fontWeight: '800' }}>CREER COMPTE</button>
                      </div>
                      <p style={{ marginTop: '1rem', fontSize: '0.75rem', color: 'var(--text-muted)' }}>* L'identifiant sera généré automatiquement (nom@salamresto.local) avec le mot de passe "0000"</p>
                   </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1.5rem' }}>
                     {users.map(u => (
                        <div key={u.id} className="glass-panel hover-scale" style={{ padding: '2rem', background: 'var(--bg-secondary)', borderRadius: '28px' }}>
                           <div style={{ width: '50px', height: '50px', borderRadius: '16px', background: 'var(--bg-tertiary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem', marginBottom: '1.5rem' }}>
                              {u.role === 'admin' ? '👑' : '🧑‍🍳'}
                           </div>
                           <h4 style={{ fontSize: '1.2rem', fontWeight: '900', marginBottom: '0.3rem' }}>{u.name}</h4>
                           <p style={{ color: 'var(--accent-primary)', fontSize: '0.7rem', fontWeight: '900', letterSpacing: '0.1em' }}>{u.role.toUpperCase()}</p>
                           <div style={{ marginTop: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <p style={{ fontWeight: '800', fontSize: '1.1rem' }}>{u.baseSalary?.toLocaleString()} F</p>
                              <ChevronRight size={18} color="var(--text-muted)" />
                           </div>
                        </div>
                     ))}
                  </div>
               </div>
             )}

              {/* TAB: Settings (Parameters) */}
              {activeTab === 'settings' && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2.5rem' }}>
                    <div className="glass-panel" style={{ padding: '2.5rem', background: 'var(--bg-secondary)', borderRadius: '32px' }}>
                        <h2 style={{ fontSize: '1.4rem', fontWeight: '900', marginBottom: '1.5rem' }}>Générateur de QR Codes</h2>
                        <p style={{ color: 'var(--text-muted)', marginBottom: '2rem', fontSize: '0.9rem' }}>Sélectionnez une table pour générer son QR code client.</p>
                        
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', marginBottom: '2.5rem' }}>
                            {[1, 2, 3, 4, 5, 6, 7, 8].map(tId => (
                                <button 
                                    key={tId} 
                                    className="glass-panel hover-scale" 
                                    onClick={() => setSelectedQrTable(tId)}
                                    style={{ 
                                        padding: '1rem', 
                                        background: selectedQrTable === tId ? 'var(--accent-primary)' : 'var(--bg-tertiary)', 
                                        color: 'white', 
                                        border: 'none', 
                                        borderRadius: '12px', 
                                        fontWeight: '800',
                                        cursor: 'pointer'
                                    }}
                                >
                                    {tId}
                                </button>
                            ))}
                        </div>

                        <div style={{ textAlign: 'center', padding: '2rem', background: 'var(--bg-tertiary)', borderRadius: '24px', border: '2px dashed var(--border-color)' }}>
                            <QrCode size={120} color="var(--accent-primary)" style={{ marginBottom: '1.5rem' }} />
                            <p style={{ fontWeight: '800' }}>QR Code Table {selectedQrTable}</p>
                            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>Lien: http://localhost:3000/table/{selectedQrTable}</p>
                            <button style={{ marginTop: '1.5rem', padding: '0.8rem 1.5rem', background: 'white', color: 'black', border: 'none', borderRadius: '10px', fontWeight: '900' }}>IMPRIMER QR</button>
                        </div>
                    </div>

                    <div className="glass-panel" style={{ padding: '2.5rem', background: 'var(--bg-secondary)', borderRadius: '32px' }}>
                        <h2 style={{ fontSize: '1.4rem', fontWeight: '900', marginBottom: '1.5rem' }}>Configurations Système</h2>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                            <div style={{ padding: '1.2rem', background: 'var(--bg-tertiary)', borderRadius: '18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span>Notifications Sonores</span>
                                <div style={{ width: '40px', height: '20px', background: 'var(--accent-primary)', borderRadius: '10px' }}></div>
                            </div>
                            <div style={{ padding: '1.2rem', background: 'var(--bg-tertiary)', borderRadius: '18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span>Impression Automatique Cuisine</span>
                                <div style={{ width: '40px', height: '20px', background: 'var(--bg-secondary)', borderRadius: '10px', border: '1px solid var(--border-color)' }}></div>
                            </div>
                        </div>
                    </div>
                </div>
              )}

              {/* TAB: Clients */}
              {activeTab === 'clients' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                    <h2 style={{ fontSize: '1.6rem', fontWeight: '900' }}>Dashboard Clients</h2>
                    <div className="glass-panel" style={{ padding: '2.5rem', background: 'var(--bg-secondary)', borderRadius: '32px' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1.5rem' }}>
                            {/* Derive clients from orders */}
                            {Array.from(new Set(orders.map(o => o.customername).filter(Boolean))).map((name, idx) => {
                                const clientOrders = orders.filter(o => o.customername === name);
                                const totalSpent = clientOrders.reduce((acc, o) => acc + o.total, 0);
                                return (
                                    <div key={idx} className="glass-panel hover-scale" style={{ padding: '1.5rem', background: 'var(--bg-tertiary)', borderRadius: '20px' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
                                            <div style={{ width: '45px', height: '45px', borderRadius: '50%', background: 'var(--accent-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '900' }}>
                                                {String(name)[0].toUpperCase()}
                                            </div>
                                            <div>
                                                <p style={{ fontWeight: '800' }}>{name}</p>
                                                <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{clientOrders.length} Commandes</p>
                                            </div>
                                        </div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '1rem' }}>
                                            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>TOTAL DÉPENSÉ</span>
                                            <span style={{ fontWeight: '900', color: 'var(--accent-success)' }}>{totalSpent.toLocaleString()} F</span>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
              )}

              {/* TAB: Profiles */}
              {activeTab === 'profiles' && (
                <div style={{ display: 'grid', gridTemplateColumns: editingUser ? '1fr 1fr' : '1fr', gap: '2.5rem' }}>
                    <div className="glass-panel" style={{ padding: '2.5rem', background: 'var(--bg-secondary)', borderRadius: '32px' }}>
                        <h2 style={{ fontSize: '1.4rem', fontWeight: '900', marginBottom: '1.5rem' }}>Gestion des Profils</h2>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '1rem' }}>
                            {users.map(u => (
                                <div 
                                    key={u.id} 
                                    className="glass-panel hover-scale" 
                                    onClick={() => {
                                        setEditingUser(u);
                                        setProfilePhone(u.phone || '');
                                        setProfileEmail(u.email || '');
                                        setProfileSalary(u.baseSalary?.toString() || '');
                                    }}
                                    style={{ padding: '1.2rem', textAlign: 'center', cursor: 'pointer', border: editingUser?.id === u.id ? '2px solid var(--accent-primary)' : '1px solid transparent' }}
                                >
                                    <div style={{ width: '60px', height: '60px', borderRadius: '50%', background: 'var(--bg-tertiary)', margin: '0 auto 1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem', overflow: 'hidden' }}>
                                        {u.avatar ? <img src={u.avatar} style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} /> : '👤'}
                                    </div>
                                    <h4 style={{ fontSize: '0.9rem', fontWeight: '800' }}>{u.name}</h4>
                                    <p style={{ fontSize: '0.65rem', color: 'var(--accent-primary)', fontWeight: '900' }}>{u.role.toUpperCase()}</p>
                                </div>
                            ))}
                        </div>
                    </div>

                    {editingUser && (
                        <div className="glass-panel animate-slide-up" style={{ padding: '2.5rem', background: 'var(--bg-secondary)', borderRadius: '32px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                                <h3 style={{ fontSize: '1.4rem', fontWeight: '900' }}>Éditer Profil : {editingUser.name}</h3>
                                <button onClick={() => setEditingUser(null)} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>FERMER</button>
                            </div>
                            
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                                <div>
                                    <label style={{ fontSize: '0.75rem', fontWeight: '800', color: 'var(--text-muted)', display: 'block', marginBottom: '0.5rem' }}>NUMÉRO DE TÉLÉPHONE</label>
                                    <input className="glass-panel" value={profilePhone} onChange={e => setProfilePhone(e.target.value)} style={{ width: '100%', padding: '1rem', background: 'var(--bg-tertiary)', border: 'none', color: 'white', borderRadius: '14px' }} placeholder="+223 ..." />
                                </div>
                                <div>
                                    <label style={{ fontSize: '0.75rem', fontWeight: '800', color: 'var(--text-muted)', display: 'block', marginBottom: '0.5rem' }}>EMAIL PROFESSIONNEL</label>
                                    <input className="glass-panel" value={profileEmail} onChange={e => setProfileEmail(e.target.value)} style={{ width: '100%', padding: '1rem', background: 'var(--bg-tertiary)', border: 'none', color: 'white', borderRadius: '14px' }} placeholder="nom@salamresto.local" />
                                </div>
                                <div>
                                    <label style={{ fontSize: '0.75rem', fontWeight: '800', color: 'var(--text-muted)', display: 'block', marginBottom: '0.5rem' }}>SALAIRE DE BASE (F)</label>
                                    <input className="glass-panel" value={profileSalary} onChange={e => setProfileSalary(e.target.value)} type="number" style={{ width: '100%', padding: '1rem', background: 'var(--bg-tertiary)', border: 'none', color: 'white', borderRadius: '14px' }} placeholder="Ex: 150000" />
                                </div>
                                
                                <button className="hover-scale" onClick={updateProfile} style={{ marginTop: '1rem', padding: '1.2rem', background: 'var(--accent-primary)', color: 'white', border: 'none', borderRadius: '16px', fontWeight: '900', cursor: 'pointer' }}>
                                    ENREGISTRER LES MODIFICATIONS
                                </button>
                            </div>
                        </div>
                    )}
                </div>
              )}

              {/* TAB: Menu */}

             {activeTab === 'menu' && (
               <div style={{ display: 'flex', flexDirection: 'column', gap: '2.5rem' }}>
                  <div className="glass-panel" style={{ padding: '2.5rem', background: 'var(--bg-secondary)', borderRadius: '32px' }}>
                     <h2 style={{ fontSize: '1.4rem', fontWeight: '900', marginBottom: '2rem' }}>Gestion du Menu</h2>
                     <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
                            <input className="glass-panel" style={{ padding: '1rem', background: 'var(--bg-tertiary)', border: 'none', color: 'white', borderRadius: '14px' }} value={newProductName} onChange={e => setNewProductName(e.target.value)} placeholder="Nom du produit" />
                            <input className="glass-panel" style={{ padding: '1rem', background: 'var(--bg-tertiary)', border: 'none', color: 'white', borderRadius: '14px' }} value={newProductPrice} onChange={e => setNewProductPrice(e.target.value)} placeholder="Prix de base (F)" type="number" />
                            <select className="glass-panel" style={{ padding: '1rem', background: 'var(--bg-tertiary)', border: 'none', color: 'white', borderRadius: '14px' }} value={newProductCategory} onChange={e => setNewProductCategory(e.target.value as any)}>
                                <option value="dish">Plat Principal</option>
                                <option value="drink">Boisson</option>
                                <option value="dessert">Dessert</option>
                            </select>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
                            <div className="glass-panel" style={{ height: '120px', background: 'var(--bg-tertiary)', borderRadius: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px dashed var(--border-color)', cursor: 'pointer' }}>
                                <Upload size={24} color="var(--text-muted)" />
                                <span style={{ marginLeft: '1rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>Photo du plat</span>
                            </div>
                            <button className="hover-scale" onClick={addProduct} disabled={uploading} style={{ padding: '1.2rem', borderRadius: '16px', background: 'var(--accent-primary)', color: 'white', border: 'none', fontWeight: '900', cursor: 'pointer' }}>
                                {uploading ? 'ENREGISTREMENT...' : 'AJOUTER AU MENU'}
                            </button>
                        </div>
                     </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '1.5rem' }}>
                     {products.map(p => (
                         <div key={p.id} className="glass-panel hover-scale" style={{ padding: '1rem', background: 'var(--bg-secondary)', borderRadius: '24px', textAlign: 'center' }}>
                            <div style={{ 
                                background: p.image ? `url(${p.image}) center/cover` : 'var(--bg-tertiary)', 
                                height: '100px', 
                                borderRadius: '16px', 
                                marginBottom: '1rem', 
                                display: 'flex', 
                                alignItems: 'center', 
                                justifyContent: 'center', 
                                fontSize: '2rem',
                                overflow: 'hidden'
                            }}>
                                {!p.image && '🥘'}
                            </div>
                           <h4 style={{ fontWeight: '800', fontSize: '0.9rem', marginBottom: '0.3rem' }}>{p.name}</h4>
                           <p style={{ color: 'var(--accent-primary)', fontWeight: '900' }}>{p.price.toLocaleString()} F</p>
                           <button onClick={() => deleteProduct(p.id)} style={{ marginTop: '1rem', background: 'transparent', border: 'none', color: '#EF4444', cursor: 'pointer' }}><Trash2 size={16} /></button>
                        </div>
                     ))}
                  </div>
               </div>
             )}

             {/* TAB: Accounting Dashboard */}
             {activeTab === 'accounting' && (
               <div style={{ display: 'flex', flexDirection: 'column', gap: '2.5rem' }}>
                  <div className="glass-panel" style={{ padding: '2.5rem', background: 'var(--bg-secondary)', borderRadius: '32px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '3rem' }}>
                        <h2 style={{ fontSize: '1.6rem', fontWeight: '900' }}>Bilan Financier</h2>
                        <select className="glass-panel" value={period} onChange={e => setPeriod(e.target.value as any)} style={{ padding: '0.8rem 1.5rem', background: 'var(--bg-tertiary)', border: 'none', color: 'white', borderRadius: '12px' }}>
                            <option value="today">Aujourd'hui</option>
                            <option value="week">7 Jours</option>
                            <option value="month">Ce Mois</option>
                        </select>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.5rem' }}>
                        <div className="glass-panel" style={{ padding: '2rem', background: 'var(--bg-tertiary)', borderRadius: '24px' }}>
                            <p style={{ fontSize: '0.7rem', fontWeight: '900', color: 'var(--accent-success)', marginBottom: '0.5rem' }}>ENTRÉES (CA)</p>
                            <h3 style={{ fontSize: '1.8rem', fontWeight: '900' }}>{caTotal.toLocaleString()} F</h3>
                        </div>
                        <div className="glass-panel" style={{ padding: '2rem', background: 'var(--bg-tertiary)', borderRadius: '24px' }}>
                            <p style={{ fontSize: '0.7rem', fontWeight: '900', color: '#EF4444', marginBottom: '0.5rem' }}>DÉPENSES</p>
                            <h3 style={{ fontSize: '1.8rem', fontWeight: '900' }}>{expenses.reduce((acc, e) => acc + e.amount, 0).toLocaleString()} F</h3>
                        </div>
                        <div className="glass-panel" style={{ padding: '2rem', background: 'var(--bg-tertiary)', borderRadius: '24px', border: '2px solid var(--accent-primary)' }}>
                            <p style={{ fontSize: '0.7rem', fontWeight: '900', color: 'var(--accent-primary)', marginBottom: '0.5rem' }}>SOLDE</p>
                            <h3 style={{ fontSize: '2rem', fontWeight: '900', color: 'var(--accent-primary)' }}>{(caTotal - expenses.reduce((acc, e) => acc + e.amount, 0)).toLocaleString()} F</h3>
                        </div>
                    </div>
                  </div>
               </div>
             )}

             {/* TAB: Admin Expenses */}
             {activeTab === 'adminexpenses' && (
               <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2.5rem' }}>
                  <section className="glass-panel" style={{ padding: '2.5rem', background: 'var(--bg-secondary)', borderRadius: '32px' }}>
                     <h3 style={{ fontSize: '1.4rem', fontWeight: '900', marginBottom: '2rem' }}>Nouvelle Dépense Resto</h3>
                     <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                        <input className="glass-panel" style={{ padding: '1.2rem', background: 'var(--bg-tertiary)', border: 'none', color: 'white', borderRadius: '16px' }} value={expTitle} onChange={e => setExpTitle(e.target.value)} placeholder="Motif (Loyer, CIE, Grossiste...)" />
                        <input className="glass-panel" style={{ padding: '1.2rem', background: 'var(--bg-tertiary)', border: 'none', color: 'white', borderRadius: '16px' }} value={expAmount} onChange={e => setExpAmount(e.target.value)} placeholder="Montant (F)" type="number" />
                        <button className="hover-scale" style={{ padding: '1.2rem', background: 'var(--accent-primary)', color: 'white', border: 'none', borderRadius: '16px', fontWeight: '900' }} onClick={addExpense}>ENREGISTRER</button>
                     </div>
                  </section>

                  <section className="glass-panel" style={{ padding: '2.5rem', background: 'var(--bg-secondary)', borderRadius: '32px' }}>
                     <h3 style={{ fontSize: '1.4rem', fontWeight: '900', marginBottom: '2rem' }}>Historique Administratif</h3>
                     <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', maxHeight: '500px', overflowY: 'auto' }}>
                        {expenses.filter(e => e.type === 'admin').map(e => (
                            <div key={e.id} className="glass-panel" style={{ padding: '1.2rem', background: 'var(--bg-tertiary)', borderRadius: '16px', display: 'flex', justifyContent: 'space-between' }}>
                                <div>
                                    <p style={{ fontWeight: '800' }}>{e.title}</p>
                                    <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{new Date(e.created_at).toLocaleDateString()}</p>
                                </div>
                                <span style={{ fontWeight: '900', color: '#EF4444' }}>-{e.amount.toLocaleString()} F</span>
                            </div>
                        ))}
                     </div>
                  </section>
               </div>
             )}
          </div>
        )}
      </main>
    </div>
  );
}

function StatMiniCard({ title, value, color, isRaw = false }: any) {
    return (
        <div className="glass-panel" style={{ padding: '1.2rem', background: 'var(--bg-secondary)', borderRadius: '20px', borderLeft: `4px solid ${color}` }}>
            <p style={{ fontSize: '0.65rem', fontWeight: '900', color: 'var(--text-muted)', letterSpacing: '0.05em', marginBottom: '0.5rem' }}>{title}</p>
            <h4 style={{ fontSize: '1.3rem', fontWeight: '900' }}>{isRaw ? value : `${value.toLocaleString()} F`}</h4>
        </div>
    );
}

function ProgressBar({ label, value, total, color }: any) {
    const pct = total > 0 ? (value / total) * 100 : 0;
    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', fontWeight: '800' }}>
                <span style={{ color: 'var(--text-secondary)' }}>{label}</span>
                <span>{pct.toFixed(0)}%</span>
            </div>
            <div style={{ width: '100%', height: '8px', background: 'var(--bg-tertiary)', borderRadius: '10px', overflow: 'hidden' }}>
                <div style={{ width: `${pct}%`, height: '100%', background: color, borderRadius: '10px' }} />
            </div>
        </div>
    );
}
