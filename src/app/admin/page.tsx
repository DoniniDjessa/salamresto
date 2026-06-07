"use client";
import { useState, useEffect, Suspense, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Product, User, ProductVariant, ProductSizeOption } from '@/types';
import {
  Activity, Users, Utensils, Wallet, PieChart,
  Plus, Trash2, Upload, ChevronRight, TrendingUp, Truck, RotateCcw,
  Monitor, Smartphone, CreditCard, UserCircle,
  UserCheck, Edit2, X, ImagePlus, UserPlus, ShoppingBag, ArrowUpRight, ArrowDownRight,
  Search
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import RoleGuard from '@/components/RoleGuard';
import ModalPortal from '@/components/ModalPortal';

const card: React.CSSProperties = {
  background: '#FFFFFF',
  border: '1px solid var(--border-color)',
  borderRadius: '20px',
  boxShadow: 'var(--shadow-sm)',
  padding: '1.75rem',
};

const IS: React.CSSProperties = {          // inputStyle
  padding: '0.8rem 1rem',
  background: 'var(--bg-tertiary)',
  border: '1.5px solid var(--border-color)',
  color: 'var(--text-primary)',
  borderRadius: '10px',
  outline: 'none',
  width: '100%',
  fontFamily: 'var(--font-body)',
  fontSize: '0.875rem',
};

function AdminContent() {
  const searchParams = useSearchParams();
  const activeTab = (searchParams.get('tab') || 'analytics') as string;
  const { profile: currentUserProfile } = useAuth();

  const [orders,       setOrders]       = useState<any[]>([]);
  const [products,     setProducts]     = useState<Product[]>([]);
  const [users,        setUsers]        = useState<User[]>([]);
  const [authProfiles, setAuthProfiles] = useState<any[]>([]);
  const [expenses,     setExpenses]     = useState<any[]>([]);
  const [loading,      setLoading]      = useState(true);

  // ── Create auth user ──
  const [showCreateUser,    setShowCreateUser]    = useState(false);
  const [newUserAuthName,   setNewUserAuthName]   = useState('');
  const [newUserAuthEmail,  setNewUserAuthEmail]  = useState('');
  const [newUserAuthRole,   setNewUserAuthRole]   = useState('caisse');
  const [createUserLoading, setCreateUserLoading] = useState(false);
  const [createUserError,   setCreateUserError]   = useState('');

  // ── Menu: basic fields ──
  const [newProductName,     setNewProductName]     = useState('');
  const [newProductPrice,    setNewProductPrice]    = useState('');
  const [newProductCategory, setNewProductCategory] = useState('plat principal');
  const [selectedFile,       setSelectedFile]       = useState<File | null>(null);
  const [uploading,          setUploading]          = useState(false);
  const [filterCategory,     setFilterCategory]     = useState('all');
  const [menuSearch,         setMenuSearch]         = useState('');
  const [menuFilterStatus,   setMenuFilterStatus]   = useState<'all'|'active'|'archived'>('active');

  // ── Menu: déclinaisons (simple — non-variant products) ──
  const [simpleDecls,  setSimpleDecls]  = useState<ProductSizeOption[]>([]);
  const [sDeclLabel,   setSDeclLabel]   = useState('');
  const [sDeclPrice,   setSDeclPrice]   = useState('');

  // ── Menu: variants (plat principal only) ──
  const [hasVariants,     setHasVariants]     = useState(false);
  const [productVariants, setProductVariants] = useState<(ProductVariant & { _file?: File })[]>([]);
  const [variantName,     setVariantName]     = useState('');

  // Per-variant déclinaison form
  const [openDeclFor,  setOpenDeclFor]  = useState<string | null>(null);
  const [vDeclLabel,   setVDeclLabel]   = useState('');
  const [vDeclPrice,   setVDeclPrice]   = useState('');

  // ── Edit product ──
  const [editingProduct,   setEditingProduct]   = useState<Product | null>(null);
  const [editProdName,     setEditProdName]     = useState('');
  const [editProdPrice,    setEditProdPrice]    = useState('');
  const [editProdCategory, setEditProdCategory] = useState('');
  const [editFile,         setEditFile]         = useState<File | null>(null);
  // Edit children
  const [editVariants,    setEditVariants]    = useState<ProductVariant[]>([]);
  const [editSimpleDecls, setEditSimpleDecls] = useState<ProductSizeOption[]>([]);
  const [editNewVarName,  setEditNewVarName]  = useState('');
  const [editOpenDeclFor, setEditOpenDeclFor] = useState<string | null>(null);
  const [editVDeclLabel,  setEditVDeclLabel]  = useState('');
  const [editVDeclPrice,  setEditVDeclPrice]  = useState('');
  const [editSDeclLabel,  setEditSDeclLabel]  = useState('');
  const [editSDeclPrice,  setEditSDeclPrice]  = useState('');

  // ── HR ──
  const [newUserName, setNewUserName] = useState('');
  const [newUserRole, setNewUserRole] = useState<any>('serveur');

  // ── Profile ──
  const [editingUser,   setEditingUser]   = useState<User | null>(null);
  const [profilePhone,  setProfilePhone]  = useState('');
  const [profileEmail,  setProfileEmail]  = useState('');
  const [profileSalary, setProfileSalary] = useState('');

  // ── Expenses ──
  const [expTitle, setExpTitle]   = useState('');
  const [expAmount, setExpAmount] = useState('');

  // ── Date range filter (shared across analytics / accounting / dépenses) ──
  const [dateFrom,   setDateFrom]   = useState<string>(() => {
    const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().split('T')[0];
  });
  const [dateTo,     setDateTo]     = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [datePreset, setDatePreset] = useState<'today'|'week'|'month'|'all'|'custom'>('month');

  // ── Pagination ──
  const [ordersPage,  setOrdersPage]  = useState(1);
  const [clientsPage, setClientsPage] = useState(1);
  const PER_PAGE = 10;

  // ── Dépenses controls ──
  const [depensesSubTab, setDepensesSubTab] = useState<'ordinaire'|'admin'>('ordinaire');
  const [expType,        setExpType]        = useState<'ordinaire'|'admin'>('ordinaire');

  function applyPreset(preset: 'today'|'week'|'month'|'all') {
    setDatePreset(preset);
    setOrdersPage(1);
    if (preset === 'all') return;
    const now = new Date();
    const from = new Date();
    if (preset === 'today') { from.setHours(0,0,0,0); }
    if (preset === 'week')  { from.setDate(now.getDate() - 7); }
    if (preset === 'month') { from.setDate(1); from.setHours(0,0,0,0); }
    setDateFrom(from.toISOString().split('T')[0]);
    setDateTo(now.toISOString().split('T')[0]);
  }

  useEffect(() => { fetchData(); }, [activeTab, dateFrom, dateTo]);

  async function fetchData() {
    setLoading(true);
    try {
      if (['analytics','accounting','adminexpenses'].includes(activeTab)) {
        let qO = supabase.from('resto-orders').select('*').order('created_at', { ascending: false });
        let qE = supabase.from('resto-expenses').select('*').order('created_at', { ascending: false });
        if (datePreset !== 'all') {
          const fromISO = new Date(dateFrom + 'T00:00:00').toISOString();
          const toISO   = new Date(dateTo   + 'T23:59:59').toISOString();
          qO = qO.gte('created_at', fromISO).lte('created_at', toISO);
          qE = qE.gte('created_at', fromISO).lte('created_at', toISO);
        }
        const [{ data: oD }, { data: eD }, { data: uD }] = await Promise.all([qO, qE, supabase.from('resto-users').select('*')]);
        if (oD) setOrders(oD); if (eD) setExpenses(eD); if (uD) setUsers(uD);
      } else if (activeTab === 'hr') {
        const { data } = await supabase.from('resto-users').select('*');
        if (data) setUsers(data);
      } else if (activeTab === 'profiles') {
        const { data } = await supabase.from('profiles').select('*');
        if (data) setAuthProfiles(data);
      } else if (activeTab === 'menu') {
        const { data } = await supabase.from('resto-products').select('*').order('created_at', { ascending: false });
        if (data) setProducts(data);
      } else if (activeTab === 'clients') {
        const { data } = await supabase.from('resto-orders').select('*').order('created_at', { ascending: false });
        if (data) setOrders(data || []);
      }
    } catch (err: any) { console.error(err.message); }
    setLoading(false);
  }

  // ── Variant helpers ──
  const addVariant = () => {
    if (!variantName.trim()) return;
    setProductVariants(prev => [...prev, { id: Date.now().toString(), name: variantName.trim(), options: [] }]);
    setVariantName('');
  };

  const removeVariant = (id: string) => {
    setProductVariants(prev => prev.filter(v => v.id !== id));
    if (openDeclFor === id) setOpenDeclFor(null);
  };

  const addVariantDecl = (variantId: string) => {
    if (!vDeclPrice) return alert('Le prix est requis');
    const decl: ProductSizeOption = { price: parseFloat(vDeclPrice) };
    if (vDeclLabel.trim()) decl.name = vDeclLabel.trim();
    setProductVariants(prev => prev.map(v =>
      v.id === variantId ? { ...v, options: [...(v.options||[]), decl] } : v
    ));
    setVDeclLabel(''); setVDeclPrice('');
  };

  const removeVariantDecl = (variantId: string, idx: number) =>
    setProductVariants(prev => prev.map(v =>
      v.id === variantId ? { ...v, options: (v.options||[]).filter((_,i)=>i!==idx) } : v
    ));

  const setVariantFile = (id: string, file: File) =>
    setProductVariants(prev => prev.map(v => v.id === id ? { ...v, _file: file } : v));

  // ── Add product ──
  async function addProduct() {
    if (!newProductName.trim()) return alert('Remplissez le nom du produit');
    const isVariantDish = newProductCategory === 'plat principal' && hasVariants;

    setUploading(true);

    // Upload main product image
    let imageUrl = '';
    if (selectedFile) {
      const ext = selectedFile.name.split('.').pop();
      const fn  = `${Date.now()}_main.${ext}`;
      const { error: upErr, data } = await supabase.storage.from('resto-bucket').upload(fn, selectedFile);
      if (!upErr && data) {
        const { data: pub } = supabase.storage.from('resto-bucket').getPublicUrl(fn);
        imageUrl = pub.publicUrl;
      }
    }

    // Upload per-variant images
    const variantsWithImages = await Promise.all(
      productVariants.map(async (v) => {
        const { _file, ...vClean } = v;
        if (!_file) return vClean;
        const ext = _file.name.split('.').pop();
        const fn  = `${Date.now()}_var_${v.id}.${ext}`;
        const { error: upErr, data } = await supabase.storage.from('resto-bucket').upload(fn, _file);
        if (!upErr && data) {
          const { data: pub } = supabase.storage.from('resto-bucket').getPublicUrl(fn);
          return { ...vClean, image: pub.publicUrl };
        }
        return vClean;
      })
    );

    const { error } = await supabase.from('resto-products').insert([{
      name:     newProductName.trim(),
      price:    isVariantDish ? 0 : (parseFloat(newProductPrice) || 0),
      category: newProductCategory,
      image:    imageUrl,
      variants: isVariantDish && variantsWithImages.length > 0 ? variantsWithImages : null,
      options:  !isVariantDish && simpleDecls.length > 0 ? simpleDecls : null,
    }]);

    setUploading(false);
    if (!error) {
      setNewProductName(''); setNewProductPrice(''); setSelectedFile(null);
      setSimpleDecls([]); setProductVariants([]); setHasVariants(false);
      setSDeclLabel(''); setSDeclPrice(''); setVariantName('');
      fetchData();
    } else alert('Erreur: ' + error.message);
  }

  async function deleteProduct(id: string) {
    if (!confirm('Retirer ce produit du menu ? Il ne sera plus disponible aux commandes mais les ventes passées restent intactes.')) return;
    const { error } = await supabase.from('resto-products').update({ available: false }).eq('id', id);
    if (error) { alert('Erreur: ' + error.message); return; }
    fetchData();
  }

  async function restoreProduct(id: string) {
    const { error } = await supabase.from('resto-products').update({ available: true }).eq('id', id);
    if (error) { alert('Erreur: ' + error.message); return; }
    fetchData();
  }

  async function updateProduct() {
    if (!editingProduct) return;
    setUploading(true);

    let imageUrl = editingProduct.image ?? '';
    if (editFile) {
      const ext = editFile.name.split('.').pop();
      const fn  = `${Date.now()}_edit.${ext}`;
      const { error: upErr, data } = await supabase.storage.from('resto-bucket').upload(fn, editFile);
      if (!upErr && data) {
        const { data: pub } = supabase.storage.from('resto-bucket').getPublicUrl(fn);
        imageUrl = pub.publicUrl;
      }
    }

    const { error } = await supabase.from('resto-products').update({
      name:     editProdName,
      price:    parseFloat(editProdPrice) || 0,
      category: editProdCategory,
      image:    imageUrl,
      variants: editVariants.length > 0 ? editVariants : null,
      options:  editVariants.length === 0 && editSimpleDecls.length > 0 ? editSimpleDecls : null,
    }).eq('id', editingProduct.id);

    if (!error) {
      setEditingProduct(null); setEditFile(null);
      setEditVariants([]); setEditSimpleDecls([]);
      fetchData();
    }
    else alert('Erreur: ' + error.message);
    setUploading(false);
  }

  async function addUser() {
    if (!newUserName.trim()) return alert('Nom requis');
    setLoading(true);
    try {
      const email = `${newUserName.toLowerCase().trim().replace(/\s+/g,'.')}@salamresto.local`;
      const { data: auth, error: ae } = await supabase.auth.signUp({ email, password: '0000' });
      if (ae) throw ae;
      const { error: de } = await supabase.from('resto-users').insert([{ id: auth.user?.id, name: newUserName.trim(), role: newUserRole, baseSalary: 0 }]);
      if (de) throw de;
      alert(`Compte créé !\nEmail: ${email}\nMdp: 0000`);
      setNewUserName(''); fetchData();
    } catch (err: any) { alert('Erreur: ' + err.message); }
    setLoading(false);
  }

  async function addExpense() {
    if (!expTitle.trim() || !expAmount) return alert('Remplissez les champs');
    const amount = parseFloat(expAmount);
    if (isNaN(amount) || amount <= 0) return alert('Montant invalide');

    const now = new Date().toISOString();
    const title = expType === 'admin'
      ? `[ADMIN] ${expTitle.trim()}`
      : expTitle.trim();

    // Try full payload with type first; fall back without type if DB rejects the value
    let { error } = await supabase.from('resto-expenses')
      .insert([{ title, amount, type: expType, created_at: now }]);

    if (error) {
      const r2 = await supabase.from('resto-expenses')
        .insert([{ title, amount, type: 'ordinaire', created_at: now }]);
      if (r2.error) {
        const r3 = await supabase.from('resto-expenses')
          .insert([{ title, amount, created_at: now }]);
        if (r3.error) { alert('Erreur: ' + r3.error.message); return; }
      }
    }

    setExpTitle(''); setExpAmount(''); fetchData();
  }

  async function updateProfile() {
    if (!editingUser) return;
    setLoading(true);
    try {
      const { error } = await supabase.from('resto-users').update({ phone: profilePhone, email: profileEmail, baseSalary: parseFloat(profileSalary)||0 }).eq('id', editingUser.id);
      if (error) throw error;
      setEditingUser(null); fetchData();
    } catch (err: any) { alert('Erreur: ' + err.message); }
    setLoading(false);
  }

  async function createAuthUser() {
    if (!newUserAuthName.trim() || !newUserAuthEmail.trim()) return;
    setCreateUserLoading(true);
    setCreateUserError('');
    try {
      const res = await fetch('/api/create-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: newUserAuthEmail, name: newUserAuthName, role: newUserAuthRole }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Erreur création');
      setShowCreateUser(false);
      setNewUserAuthName(''); setNewUserAuthEmail(''); setNewUserAuthRole('caisse');
      fetchData();
    } catch (e: any) { setCreateUserError(e.message); }
    setCreateUserLoading(false);
  }

  const paid = (o: any) => o.status === 'termine' || o.status === 'paye';
  const paidOrders = orders.filter(paid);
  const caSalle    = paidOrders.filter(o => o.type === 'salle'   ).reduce((a,o)=>a+(o.total||0),0);
  const caExterne  = paidOrders.filter(o => o.type === 'external').reduce((a,o)=>a+(o.total||0),0);
  const caComptoir = paidOrders.filter(o => o.type === 'comptoir').reduce((a,o)=>a+(o.total||0),0);
  const caTotal    = caSalle + caExterne + caComptoir;
  const avgOrder   = paidOrders.length ? Math.round(caTotal / paidOrders.length) : 0;
  const totalExpenses = expenses.reduce((a,e) => a + (e.amount||0), 0);
  const isAdminExp    = (e: any) => e.type === 'admin' || (e.title || '').startsWith('[ADMIN] ');
  const expOrdinaire  = expenses.filter(e => !isAdminExp(e)).reduce((a,e) => a + e.amount, 0);
  const expAdmin      = expenses.filter(e =>  isAdminExp(e)).reduce((a,e) => a + e.amount, 0);
  const payByCash     = paidOrders.filter(o => o.payment_method === 'cash'  ).reduce((a,o)=>a+(o.total||0),0);
  const payByWave     = paidOrders.filter(o => o.payment_method === 'wave'  ).reduce((a,o)=>a+(o.total||0),0);
  const payByOrange   = paidOrders.filter(o => o.payment_method === 'orange').reduce((a,o)=>a+(o.total||0),0);

  const bestItems = useMemo(() => {
    const map: Record<string, { name: string; qty: number; revenue: number }> = {};
    paidOrders.forEach(o => {
      (o.items || []).forEach((item: any) => {
        const key = item.name || '?';
        if (!map[key]) map[key] = { name: key, qty: 0, revenue: 0 };
        map[key].qty     += item.quantity || 1;
        map[key].revenue += (item.price || 0) * (item.quantity || 1);
      });
    });
    return Object.values(map).sort((a, b) => b.qty - a.qty);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orders]);

  const tabTitles: Record<string,string> = {
    analytics: 'Analyses', menu: 'Gestion du Menu', hr: 'Équipe',
    profiles: 'Profils', clients: 'Clients', adminexpenses: 'Dépenses', accounting: 'Comptabilité',
  };

  const CATS = ['plat principal','boissons','dessert','collation','garnitures','cave','thé/café','autres'];

  const filterBar = (
    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', flexWrap:'wrap', gap:'0.75rem' }}>
      <div style={{ display:'flex', gap:'0.4rem', flexWrap:'wrap' }}>
        {([['today',"Aujourd'hui"],['week','7 jours'],['month','Ce mois'],['all','Tout temps']] as const).map(([v,l]) => (
          <button key={v} onClick={() => applyPreset(v)}
            style={{ padding:'0.4rem 0.875rem', borderRadius:'8px', border:`1.5px solid ${datePreset===v?'var(--accent-primary)':'var(--border-color)'}`, background:datePreset===v?'var(--accent-primary)':'white', color:datePreset===v?'white':'var(--text-secondary)', fontWeight:'700', fontSize:'0.72rem', cursor:'pointer', transition:'all 0.15s' }}>
            {l}
          </button>
        ))}
      </div>
      {datePreset !== 'all' && (
        <div style={{ display:'flex', gap:'0.5rem', alignItems:'center' }}>
          <input type="date" value={dateFrom}
            onChange={e => { setDateFrom(e.target.value); setDatePreset('custom'); }}
            style={{ ...IS, width:'145px', fontSize:'0.78rem', padding:'0.45rem 0.75rem' }} />
          <span style={{ color:'var(--text-muted)', fontWeight:'700', fontSize:'0.85rem' }}>→</span>
          <input type="date" value={dateTo}
            onChange={e => { setDateTo(e.target.value); setDatePreset('custom'); }}
            style={{ ...IS, width:'145px', fontSize:'0.78rem', padding:'0.45rem 0.75rem' }} />
        </div>
      )}
    </div>
  );

  return (
    <RoleGuard allowedRoles={['superAdmin', 'admin']}>
    <div style={{ padding: '2rem', background: 'var(--bg-primary)', minHeight: '100vh' }} className="animate-fade-in">

      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '1.75rem', fontWeight: '900' }}>{tabTitles[activeTab] || 'Administration'}</h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginTop: '0.2rem' }}>Gestion centrale du restaurant</p>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--text-muted)' }}>Chargement...</div>
      ) : (
        <div className="animate-fade-in">

          {/* ══ ANALYTICS ══ */}
          {activeTab === 'analytics' && (
            <div style={{ display:'flex', flexDirection:'column', gap:'1.75rem' }}>

              {filterBar}

              {/* KPI tiles */}
              <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(160px,1fr))', gap:'1rem' }}>
                {[
                  { label:'CA TOTAL',    value:`${caTotal.toLocaleString()} F`,   color:'var(--accent-primary)', sub:`${paidOrders.length} réglées`,      icon:<TrendingUp size={17}/> },
                  { label:'PANIER MOY.', value:`${avgOrder.toLocaleString()} F`,  color:'#6366F1',              sub:'par commande',                       icon:<ShoppingBag size={17}/> },
                  { label:'SALLE',       value:`${caSalle.toLocaleString()} F`,   color:'#0EA5E9',              sub:`${paidOrders.filter(o=>o.type==='salle').length} cmd`,   icon:<Monitor size={17}/> },
                  { label:'LIVRAISON',   value:`${caExterne.toLocaleString()} F`, color:'var(--accent-warning)',sub:`${paidOrders.filter(o=>o.type==='external').length} cmd`, icon:<Truck size={17}/> },
                  { label:'EMPORTÉ',    value:`${caComptoir.toLocaleString()} F`,color:'var(--accent-success)',sub:`${paidOrders.filter(o=>o.type==='comptoir').length} cmd`, icon:<Smartphone size={17}/> },
                  { label:'DÉPENSES',    value:`${totalExpenses.toLocaleString()} F`, color:'var(--accent-danger)', sub:'toutes catégories',               icon:<CreditCard size={17}/> },
                ].map(s => (
                  <div key={s.label} className="stat-tile">
                    <div className="stat-tile-top" style={{ background:s.color }} />
                    <div className="stat-tile-icon" style={{ background:`${s.color}14`, color:s.color }}>{s.icon}</div>
                    <p className="stat-tile-value" style={{ fontSize:'1.15rem' }}>{s.value}</p>
                    <p className="stat-tile-label">{s.label}</p>
                    {s.sub && <p style={{ fontSize:'0.62rem', color:'var(--text-muted)', marginTop:'0.1rem' }}>{s.sub}</p>}
                  </div>
                ))}
              </div>

              {/* Rankings + CA breakdown */}
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'1.5rem' }}>

                {/* Best sellers */}
                <div style={card}>
                  <h3 style={{ fontWeight:'900', fontSize:'1rem', marginBottom:'1.25rem', display:'flex', alignItems:'center', gap:'0.5rem' }}>
                    <TrendingUp size={17} color="var(--accent-primary)"/> Classement des Plats
                  </h3>
                  <div style={{ display:'flex', flexDirection:'column', gap:'0.75rem' }}>
                    {bestItems.slice(0,8).map((item, i) => (
                      <div key={item.name} style={{ display:'flex', alignItems:'center', gap:'0.75rem' }}>
                        <span style={{ width:'22px', height:'22px', borderRadius:'7px', background: i===0?'#F59E0B':i===1?'#9CA3AF':i===2?'#B45309':'var(--bg-tertiary)', color: i<3?'white':'var(--text-muted)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'0.62rem', fontWeight:'900', flexShrink:0 }}>
                          {i+1}
                        </span>
                        <div style={{ flex:1, minWidth:0 }}>
                          <div style={{ display:'flex', justifyContent:'space-between', marginBottom:'0.2rem' }}>
                            <p style={{ fontWeight:'800', fontSize:'0.8rem', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', maxWidth:'140px' }}>{item.name}</p>
                            <span style={{ fontSize:'0.72rem', fontWeight:'900', color:'var(--text-muted)', flexShrink:0, marginLeft:'0.5rem' }}>{item.qty}×</span>
                          </div>
                          <div style={{ height:'4px', background:'var(--bg-tertiary)', borderRadius:'2px' }}>
                            <div style={{ height:'100%', width:`${bestItems[0]?.qty?(item.qty/bestItems[0].qty)*100:0}%`, background: i===0?'#F59E0B':'var(--accent-primary)', borderRadius:'2px', transition:'width 0.5s' }} />
                          </div>
                        </div>
                      </div>
                    ))}
                    {bestItems.length===0 && <p style={{ textAlign:'center', color:'var(--text-muted)', fontSize:'0.8rem', padding:'2rem 0' }}>Aucune donnée pour cette période</p>}
                  </div>
                </div>

                {/* Right column: CA by channel + payment methods */}
                <div style={{ display:'flex', flexDirection:'column', gap:'1rem' }}>
                  <div style={card}>
                    <h3 style={{ fontWeight:'900', fontSize:'0.9rem', marginBottom:'1rem' }}>Répartition du CA</h3>
                    {[
                      { label:'Salle',     value:caSalle,    color:'#6366F1' },
                      { label:'Livraison', value:caExterne,  color:'var(--accent-warning)' },
                      { label:'Emporté',  value:caComptoir, color:'var(--accent-success)' },
                    ].map(ch => (
                      <div key={ch.label} style={{ marginBottom:'0.75rem' }}>
                        <div style={{ display:'flex', justifyContent:'space-between', marginBottom:'0.25rem' }}>
                          <span style={{ fontSize:'0.78rem', fontWeight:'700' }}>{ch.label}</span>
                          <span style={{ fontSize:'0.75rem', fontWeight:'900', color:ch.color }}>
                            {ch.value.toLocaleString()} F · {caTotal?((ch.value/caTotal)*100).toFixed(0):0}%
                          </span>
                        </div>
                        <div style={{ height:'5px', background:'var(--bg-tertiary)', borderRadius:'3px' }}>
                          <div style={{ height:'100%', width:caTotal?`${(ch.value/caTotal)*100}%`:'0%', background:ch.color, borderRadius:'3px', transition:'width 0.5s' }} />
                        </div>
                      </div>
                    ))}
                  </div>
                  <div style={card}>
                    <h3 style={{ fontWeight:'900', fontSize:'0.9rem', marginBottom:'1rem' }}>Modes de paiement</h3>
                    {[
                      { label:'Espèces',      value:payByCash,   color:'var(--accent-success)' },
                      { label:'Wave',         value:payByWave,   color:'#7C3AED' },
                      { label:'Orange Money', value:payByOrange, color:'#EA580C' },
                    ].map(pm => (
                      <div key={pm.label} style={{ marginBottom:'0.65rem' }}>
                        <div style={{ display:'flex', justifyContent:'space-between', marginBottom:'0.2rem' }}>
                          <span style={{ fontSize:'0.78rem', fontWeight:'700' }}>{pm.label}</span>
                          <span style={{ fontSize:'0.75rem', fontWeight:'900', color:pm.color }}>{pm.value.toLocaleString()} F</span>
                        </div>
                        <div style={{ height:'5px', background:'var(--bg-tertiary)', borderRadius:'3px' }}>
                          <div style={{ height:'100%', width:caTotal?`${(pm.value/caTotal)*100}%`:'0%', background:pm.color, borderRadius:'3px', transition:'width 0.5s' }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Orders flux */}
              <div style={card}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'1.25rem' }}>
                  <h3 style={{ fontSize:'1rem', fontWeight:'900', display:'flex', alignItems:'center', gap:'0.5rem' }}>
                    <Activity size={18} color="var(--accent-primary)"/> Flux des Commandes
                  </h3>
                  <span style={{ fontSize:'0.72rem', color:'var(--text-muted)', fontWeight:'700' }}>{orders.length} commande(s)</span>
                </div>
                <div style={{ display:'flex', flexDirection:'column', gap:'0.5rem' }}>
                  {orders.slice((ordersPage-1)*PER_PAGE, ordersPage*PER_PAGE).map(o => (
                    <div key={o.id} style={{ padding:'0.75rem 1rem', background:'var(--bg-secondary)', borderRadius:'10px', border:'1px solid var(--border-color)', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                      <div style={{ display:'flex', gap:'1rem', alignItems:'center' }}>
                        <span style={{ fontSize:'0.63rem', fontWeight:'800', color:'var(--text-muted)', whiteSpace:'nowrap' }}>
                          {new Date(o.created_at).toLocaleString('fr-FR',{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'})}
                        </span>
                        <div>
                          <p style={{ fontWeight:'800', fontSize:'0.82rem' }}>{o.type==='salle'?`Table ${o.tablenumber}`:o.customername||'—'}</p>
                          <p style={{ fontSize:'0.62rem', color:'var(--text-muted)' }}>{(o.type||'').toUpperCase()} · {o.items?.length||0} article(s)</p>
                        </div>
                      </div>
                      <div style={{ display:'flex', alignItems:'center', gap:'0.875rem' }}>
                        <span className={`badge ${paid(o)?'badge-success':o.status==='en_attente'?'badge-danger':'badge-warning'}`}>
                          {o.status?.replace(/_/g,' ')}
                        </span>
                        <span style={{ fontWeight:'900', fontSize:'0.875rem', whiteSpace:'nowrap' }}>{(o.total||0).toLocaleString()} F</span>
                      </div>
                    </div>
                  ))}
                  {orders.length === 0 && <p style={{ textAlign:'center', color:'var(--text-muted)', padding:'2rem' }}>Aucune commande sur cette période</p>}
                </div>
                {orders.length > PER_PAGE && (
                  <div style={{ display:'flex', justifyContent:'center', alignItems:'center', gap:'0.5rem', marginTop:'1.25rem' }}>
                    <button onClick={() => setOrdersPage(p => Math.max(1,p-1))} disabled={ordersPage===1}
                      style={{ padding:'0.4rem 0.875rem', borderRadius:'8px', background:'var(--bg-secondary)', border:'1px solid var(--border-color)', color:ordersPage===1?'var(--text-muted)':'var(--text-primary)', fontWeight:'700', fontSize:'0.78rem', cursor:ordersPage===1?'not-allowed':'pointer' }}>
                      ← Préc.
                    </button>
                    <span style={{ fontSize:'0.78rem', fontWeight:'800', color:'var(--text-muted)' }}>{ordersPage}/{Math.ceil(orders.length/PER_PAGE)}</span>
                    <button onClick={() => setOrdersPage(p => Math.min(Math.ceil(orders.length/PER_PAGE),p+1))} disabled={ordersPage===Math.ceil(orders.length/PER_PAGE)}
                      style={{ padding:'0.4rem 0.875rem', borderRadius:'8px', background:'var(--bg-secondary)', border:'1px solid var(--border-color)', color:ordersPage===Math.ceil(orders.length/PER_PAGE)?'var(--text-muted)':'var(--text-primary)', fontWeight:'700', fontSize:'0.78rem', cursor:ordersPage===Math.ceil(orders.length/PER_PAGE)?'not-allowed':'pointer' }}>
                      Suiv. →
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ══ MENU ══ */}
          {activeTab === 'menu' && (
            <div style={{ display:'grid', gridTemplateColumns:'420px 1fr', gap:'2rem', alignItems:'start' }}>

              {/* ── Add product form — sticky so it stays in view while list scrolls ── */}
              <div style={{ ...card, position:'sticky', top:'2rem', maxHeight:'calc(100vh - 5rem)', overflowY:'auto' }}>
                <h2 style={{ fontSize:'1.05rem', fontWeight:'900', marginBottom:'1.25rem' }}>Ajouter un produit</h2>

                {/* Category selector */}
                <div style={{ display:'flex', gap:'0.4rem', flexWrap:'wrap', marginBottom:'1.1rem' }}>
                  {CATS.map(cat => (
                    <button key={cat} onClick={() => { setNewProductCategory(cat); setHasVariants(false); setProductVariants([]); }}
                      style={{ padding:'0.4rem 0.75rem', borderRadius:'7px', background: newProductCategory===cat?'var(--accent-primary)':'var(--bg-tertiary)', color: newProductCategory===cat?'white':'var(--text-secondary)', border:'none', fontWeight:'700', fontSize:'0.68rem', cursor:'pointer', textTransform:'uppercase', transition:'all 0.15s' }}>
                      {cat}
                    </button>
                  ))}
                </div>

                {/* Product name */}
                <div style={{ marginBottom:'0.875rem' }}>
                  <label style={{ fontSize:'0.62rem', fontWeight:'900', color:'var(--text-muted)', letterSpacing:'0.08em', display:'block', marginBottom:'0.35rem' }}>NOM DU PLAT *</label>
                  <input style={IS} value={newProductName} onChange={e=>setNewProductName(e.target.value)} placeholder="Ex: Kedjenou, Attiéké..." />
                </div>

                {/* Main image upload — hidden when plat has sous-plats (images go on variants) */}
                {!(hasVariants && newProductCategory === 'plat principal') && (
                  <div style={{ marginBottom:'1.1rem' }}>
                    <label style={{ fontSize:'0.62rem', fontWeight:'900', color:'var(--text-muted)', letterSpacing:'0.08em', display:'block', marginBottom:'0.35rem' }}>PHOTO DU PLAT</label>
                    <label style={{ display:'flex', alignItems:'center', gap:'0.75rem', padding:'0.75rem 1rem', background:'var(--bg-tertiary)', borderRadius:'10px', border:'1.5px dashed var(--border-color)', cursor:'pointer' }}>
                      <Upload size={18} color="var(--text-muted)" />
                      <span style={{ fontSize:'0.78rem', color: selectedFile?'var(--text-primary)':'var(--text-muted)', fontWeight:'600' }}>{selectedFile ? selectedFile.name : 'Choisir une image…'}</span>
                      <input type="file" accept="image/*" style={{ display:'none' }} onChange={e=>setSelectedFile(e.target.files?.[0]||null)} />
                    </label>
                  </div>
                )}

                {/* ── PLAT PRINCIPAL: has-variants toggle ── */}
                {newProductCategory === 'plat principal' && (
                  <label style={{ display:'flex', alignItems:'center', gap:'0.75rem', padding:'0.75rem 1rem', background:'var(--bg-secondary)', borderRadius:'10px', border:'1.5px solid var(--border-color)', cursor:'pointer', marginBottom:'1.1rem', userSelect:'none' }}>
                    <input type="checkbox" checked={hasVariants} onChange={e=>{ setHasVariants(e.target.checked); setProductVariants([]); if (e.target.checked) setSelectedFile(null); }}
                      style={{ width:'15px', height:'15px', accentColor:'var(--accent-primary)' }} />
                    <div>
                      <p style={{ fontWeight:'800', fontSize:'0.82rem' }}>Ce plat a des sous-plats</p>
                      <p style={{ fontSize:'0.68rem', color:'var(--text-muted)', marginTop:'0.1rem' }}>Ex: Kedjenou de poulet, Kedjenou de pintade…</p>
                    </div>
                  </label>
                )}

                {/* ── VARIANTS builder ── */}
                {hasVariants && newProductCategory === 'plat principal' ? (
                  <div style={{ marginBottom:'1.1rem' }}>
                    <p style={{ fontSize:'0.62rem', fontWeight:'900', color:'var(--text-muted)', letterSpacing:'0.1em', marginBottom:'0.5rem' }}>SOUS-PLATS</p>

                    {/* Add variant input */}
                    <div style={{ display:'flex', gap:'0.4rem', marginBottom:'0.75rem' }}>
                      <input style={{ ...IS, flex:1 }} value={variantName} onChange={e=>setVariantName(e.target.value)} placeholder="Nom du sous-plat…"
                        onKeyDown={e=>{ if(e.key==='Enter') addVariant(); }} />
                      <button onClick={addVariant} style={{ padding:'0 0.875rem', background:'var(--accent-primary)', color:'white', border:'none', borderRadius:'10px', cursor:'pointer', flexShrink:0, fontWeight:'800' }}>
                        <Plus size={16}/>
                      </button>
                    </div>

                    {/* Variant list */}
                    {productVariants.map(v => (
                      <div key={v.id} style={{ background:'var(--bg-secondary)', borderRadius:'12px', padding:'0.875rem', marginBottom:'0.6rem', border:'1px solid var(--border-color)' }}>
                        {/* Variant header */}
                        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'0.6rem' }}>
                          <p style={{ fontWeight:'800', fontSize:'0.875rem' }}>{v.name}</p>
                          <div style={{ display:'flex', gap:'0.4rem' }}>
                            {/* Image upload for variant */}
                            <label title="Photo" style={{ width:'28px', height:'28px', borderRadius:'7px', background:'var(--bg-tertiary)', border:'1px solid var(--border-color)', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer' }}>
                              <ImagePlus size={14} color={v._file ? 'var(--accent-primary)' : 'var(--text-muted)'} />
                              <input type="file" accept="image/*" style={{ display:'none' }} onChange={e=>{ if(e.target.files?.[0]) setVariantFile(v.id, e.target.files[0]); }} />
                            </label>
                            <button onClick={()=>setOpenDeclFor(openDeclFor===v.id?null:v.id)}
                              style={{ padding:'0.2rem 0.6rem', background: openDeclFor===v.id?'var(--accent-primary)':'var(--bg-tertiary)', color: openDeclFor===v.id?'white':'var(--text-secondary)', border:'none', borderRadius:'7px', fontSize:'0.65rem', fontWeight:'800', cursor:'pointer' }}>
                              + Déclinaison
                            </button>
                            <button onClick={()=>removeVariant(v.id)} style={{ background:'transparent', border:'none', color:'var(--accent-danger)', cursor:'pointer' }}><X size={15}/></button>
                          </div>
                        </div>

                        {/* Existing déclinaisons */}
                        {(v.options||[]).map((o,i)=>(
                          <div key={i} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'0.3rem 0.6rem', background:'white', borderRadius:'7px', marginBottom:'0.3rem', border:'1px solid var(--border-color)' }}>
                            <span style={{ fontSize:'0.78rem', fontWeight:'700' }}>{o.name || <span style={{ color:'var(--text-muted)', fontStyle:'italic' }}>Sans nom</span>}</span>
                            <div style={{ display:'flex', alignItems:'center', gap:'0.5rem' }}>
                              <span style={{ color:'var(--accent-primary)', fontWeight:'900', fontSize:'0.78rem' }}>{o.price.toLocaleString()} F</span>
                              <button onClick={()=>removeVariantDecl(v.id,i)} style={{ background:'transparent', border:'none', color:'var(--text-muted)', cursor:'pointer' }}><X size={12}/></button>
                            </div>
                          </div>
                        ))}

                        {/* Add déclinaison form */}
                        {openDeclFor === v.id && (
                          <div style={{ display:'flex', gap:'0.4rem', marginTop:'0.5rem' }}>
                            <input style={{ ...IS, flex:2, padding:'0.5rem 0.75rem', fontSize:'0.78rem' }} value={vDeclLabel} onChange={e=>setVDeclLabel(e.target.value)} placeholder="Label (optionnel)" />
                            <input style={{ ...IS, flex:1, padding:'0.5rem 0.75rem', fontSize:'0.78rem' }} value={vDeclPrice} onChange={e=>setVDeclPrice(e.target.value)} placeholder="Prix *" type="number" required />
                            <button onClick={()=>addVariantDecl(v.id)} style={{ padding:'0.5rem 0.7rem', background:'var(--accent-primary)', color:'white', border:'none', borderRadius:'8px', cursor:'pointer', flexShrink:0 }}>
                              <Plus size={14}/>
                            </button>
                          </div>
                        )}
                      </div>
                    ))}

                    {productVariants.length === 0 && (
                      <p style={{ textAlign:'center', color:'var(--text-muted)', fontSize:'0.75rem', padding:'0.75rem 0' }}>Ajoutez au moins un sous-plat</p>
                    )}
                  </div>
                ) : (
                  /* ── Simple price + déclinaisons ── */
                  <div style={{ marginBottom:'1.1rem' }}>
                    <label style={{ fontSize:'0.62rem', fontWeight:'900', color:'var(--text-muted)', letterSpacing:'0.08em', display:'block', marginBottom:'0.35rem' }}>
                      PRIX DE BASE <span style={{ fontWeight:'500', color:'var(--text-muted)' }}>(optionnel)</span>
                    </label>
                    <input style={IS} value={newProductPrice} onChange={e=>setNewProductPrice(e.target.value)} placeholder="Ex: 3000" type="number" />

                    {/* Déclinaisons (optional) */}
                    <div style={{ marginTop:'0.875rem', background:'var(--bg-secondary)', borderRadius:'10px', padding:'0.875rem', border:'1px solid var(--border-color)' }}>
                      <p style={{ fontSize:'0.62rem', fontWeight:'900', color:'var(--text-muted)', letterSpacing:'0.1em', marginBottom:'0.6rem' }}>DÉCLINAISONS <span style={{ fontWeight:'600', textTransform:'none', letterSpacing:0 }}>(optionnel)</span></p>

                      <div style={{ display:'flex', gap:'0.4rem', marginBottom:'0.6rem' }}>
                        <input style={{ ...IS, flex:2, padding:'0.5rem 0.75rem', fontSize:'0.78rem' }} value={sDeclLabel} onChange={e=>setSDeclLabel(e.target.value)} placeholder="Label (optionnel)" />
                        <input style={{ ...IS, flex:1, padding:'0.5rem 0.75rem', fontSize:'0.78rem' }} value={sDeclPrice} onChange={e=>setSDeclPrice(e.target.value)} placeholder="Prix *" type="number" required />
                        <button onClick={()=>{
                          if(!sDeclPrice) return alert('Le prix est requis');
                          const d: ProductSizeOption = { price: parseFloat(sDeclPrice) };
                          if(sDeclLabel.trim()) d.name = sDeclLabel.trim();
                          setSimpleDecls(p=>[...p, d]);
                          setSDeclLabel(''); setSDeclPrice('');
                        }} style={{ padding:'0.5rem 0.7rem', background:'var(--accent-primary)', color:'white', border:'none', borderRadius:'8px', cursor:'pointer', flexShrink:0 }}>
                          <Plus size={14}/>
                        </button>
                      </div>

                      {simpleDecls.map((d,i)=>(
                        <div key={i} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'0.3rem 0.6rem', background:'white', borderRadius:'7px', marginBottom:'0.3rem', border:'1px solid var(--border-color)' }}>
                          <span style={{ fontSize:'0.78rem', fontWeight:'700' }}>{d.name || <span style={{ color:'var(--text-muted)', fontStyle:'italic' }}>Sans nom</span>}</span>
                          <div style={{ display:'flex', alignItems:'center', gap:'0.5rem' }}>
                            <span style={{ color:'var(--accent-primary)', fontWeight:'900', fontSize:'0.78rem' }}>{d.price.toLocaleString()} F</span>
                            <button onClick={()=>setSimpleDecls(p=>p.filter((_,j)=>j!==i))} style={{ background:'transparent', border:'none', color:'var(--text-muted)', cursor:'pointer' }}><X size={12}/></button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Submit */}
                <button className="hover-scale" onClick={addProduct} disabled={uploading}
                  style={{ width:'100%', padding:'0.9rem', borderRadius:'12px', background:'var(--accent-primary)', color:'white', border:'none', fontWeight:'900', fontSize:'0.875rem', cursor:'pointer', boxShadow:'var(--shadow-glow)' }}>
                  {uploading ? 'ENREGISTREMENT…' : '+ AJOUTER AU MENU'}
                </button>
              </div>

              {/* ── Product list ── */}
              <div>
                {/* ── Search + status filter ── */}
                <div style={{ display:'flex', gap:'0.65rem', marginBottom:'0.875rem', alignItems:'center', flexWrap:'wrap' }}>
                  {/* Search input */}
                  <div style={{ position:'relative', flex:1, minWidth:'160px' }}>
                    <Search size={14} style={{ position:'absolute', left:'0.75rem', top:'50%', transform:'translateY(-50%)', color:'var(--text-muted)', pointerEvents:'none' }} />
                    <input
                      value={menuSearch}
                      onChange={e=>setMenuSearch(e.target.value)}
                      placeholder="Rechercher un plat…"
                      style={{ width:'100%', padding:'0.55rem 0.75rem 0.55rem 2.25rem', borderRadius:'10px', border:'1.5px solid var(--border-color)', background:'var(--bg-secondary)', fontSize:'0.82rem', fontWeight:'600', color:'var(--text-primary)', outline:'none' }}
                    />
                  </div>
                  {/* Status toggle */}
                  <div style={{ display:'flex', background:'var(--bg-tertiary)', borderRadius:'10px', padding:'3px', gap:'2px', flexShrink:0 }}>
                    {(['active','all','archived'] as const).map(s=>(
                      <button key={s} onClick={()=>setMenuFilterStatus(s)}
                        style={{ padding:'0.35rem 0.75rem', borderRadius:'8px', border:'none', fontWeight:'800', fontSize:'0.65rem', cursor:'pointer', transition:'all 0.15s', letterSpacing:'0.04em',
                          background: menuFilterStatus===s ? (s==='archived' ? 'var(--accent-danger)' : 'var(--accent-primary)') : 'transparent',
                          color: menuFilterStatus===s ? 'white' : 'var(--text-muted)',
                          boxShadow: menuFilterStatus===s ? '0 2px 8px rgba(0,0,0,0.15)' : 'none',
                        }}>
                        {s==='active'?'ACTIFS':s==='archived'?'RETIRÉS':'TOUS'}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Category chips */}
                <div style={{ display:'flex', gap:'0.4rem', flexWrap:'wrap', marginBottom:'1.1rem' }}>
                  {['all',...CATS].map(cat=>(
                    <button key={cat} onClick={()=>setFilterCategory(cat)}
                      style={{ padding:'0.4rem 0.875rem', borderRadius:'7px', background: filterCategory===cat?'var(--accent-primary)':'var(--bg-tertiary)', color: filterCategory===cat?'white':'var(--text-secondary)', border:'none', fontWeight:'700', fontSize:'0.68rem', cursor:'pointer', textTransform:'uppercase', transition:'all 0.15s' }}>
                      {cat==='all'?'TOUS':cat}
                    </button>
                  ))}
                </div>

                {/* Result count */}
                {(() => {
                  const norm = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
                  const total = products.filter(p => {
                    const matchCat    = filterCategory==='all' || p.category===filterCategory;
                    const matchSearch = !menuSearch.trim() || norm(p.name).includes(norm(menuSearch));
                    const matchStatus = menuFilterStatus==='all' || (menuFilterStatus==='active' ? p.available!==false : p.available===false);
                    return matchCat && matchSearch && matchStatus;
                  }).length;
                  return total === 0 ? (
                    <p style={{ textAlign:'center', color:'var(--text-muted)', padding:'2rem 0', fontSize:'0.82rem' }}>Aucun produit trouvé</p>
                  ) : (
                    <p style={{ fontSize:'0.62rem', fontWeight:'900', color:'var(--text-muted)', letterSpacing:'0.1em', marginBottom:'0.75rem' }}>{total} PRODUIT{total>1?'S':''}</p>
                  );
                })()}

                <div style={{ display:'grid', gridTemplateColumns:'1fr', gap:'0.75rem' }}>
                  {products.filter(p=>{
                    const norm = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
                    const matchCat    = filterCategory==='all' || p.category===filterCategory;
                    const matchSearch = !menuSearch.trim() || norm(p.name).includes(norm(menuSearch));
                    const matchStatus = menuFilterStatus==='all' || (menuFilterStatus==='active' ? p.available!==false : p.available===false);
                    return matchCat && matchSearch && matchStatus;
                  }).map(p=>{
                    const isArchived = p.available === false;
                    const priceLine = (() => {
                      if (p.variants?.length) {
                        const prices = [...new Set(p.variants.flatMap(v => v.options?.length ? v.options.map(o=>o.price) : v.price?[v.price]:[] ))].sort((a,b)=>a-b);
                        return prices.length ? prices.map(pr=>pr.toLocaleString()).join(' · ')+' F' : `${p.variants.length} sous-plat(s)`;
                      }
                      if (p.options?.length) {
                        const prices = [...new Set(p.options.map(o=>o.price))].sort((a,b)=>a-b);
                        return prices.map(pr=>pr.toLocaleString()).join(' · ')+' F';
                      }
                      return p.price.toLocaleString()+' F';
                    })();
                    return (
                      <div key={p.id} className={isArchived ? '' : 'hover-scale'} style={{ display:'flex', alignItems:'center', gap:'1rem', padding:'0.75rem 1rem', background: isArchived ? 'var(--bg-tertiary)' : 'white', border:'1px solid var(--border-color)', borderRadius:'14px', boxShadow:'var(--shadow-sm)', opacity: isArchived ? 0.6 : 1 }}>
                        {/* Thumbnail */}
                        <div style={{ width:'52px', height:'52px', borderRadius:'10px', background: p.image?`url(${p.image}) center/cover`:'var(--bg-tertiary)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'1.4rem', overflow:'hidden', flexShrink:0, filter: isArchived ? 'grayscale(1)' : 'none' }}>
                          {!p.image && '🥘'}
                        </div>
                        {/* Info */}
                        <div style={{ flex:1, minWidth:0 }}>
                          <h4 style={{ fontWeight:'800', fontSize:'0.875rem', marginBottom:'0.1rem', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', textDecoration: isArchived ? 'line-through' : 'none' }}>{p.name}</h4>
                          <p style={{ fontSize:'0.62rem', color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.06em' }}>
                            {p.category}{isArchived && <span style={{ color:'var(--accent-danger)', fontWeight:'900', marginLeft:'0.5rem' }}>RETIRÉ</span>}
                          </p>
                        </div>
                        {/* Prices */}
                        <p style={{ color: isArchived ? 'var(--text-muted)' : 'var(--accent-primary)', fontWeight:'900', fontSize:'0.82rem', flexShrink:0, whiteSpace:'nowrap' }}>{priceLine}</p>
                        {/* Actions */}
                        <div style={{ display:'flex', gap:'0.4rem', flexShrink:0 }}>
                          {!isArchived && (
                            <button onClick={()=>{ setEditingProduct(p); setEditProdName(p.name); setEditProdPrice(p.price>0?p.price.toString():''); setEditProdCategory(p.category||''); setEditFile(null); setEditVariants(p.variants?JSON.parse(JSON.stringify(p.variants)):[]); setEditSimpleDecls(p.options?JSON.parse(JSON.stringify(p.options)):[]); setEditOpenDeclFor(null); }}
                              style={{ background:'var(--bg-secondary)', border:'1px solid var(--border-color)', color:'var(--accent-primary)', cursor:'pointer', borderRadius:'8px', width:'32px', height:'32px', display:'flex', alignItems:'center', justifyContent:'center' }}><Edit2 size={14}/></button>
                          )}
                          {isArchived ? (
                            <button onClick={()=>restoreProduct(p.id)} title="Remettre au menu" style={{ background:'rgba(16,185,129,0.08)', border:'1px solid rgba(16,185,129,0.25)', color:'var(--accent-success)', cursor:'pointer', borderRadius:'8px', width:'32px', height:'32px', display:'flex', alignItems:'center', justifyContent:'center' }}><RotateCcw size={14}/></button>
                          ) : (
                            <button onClick={()=>deleteProduct(p.id)} title="Retirer du menu" style={{ background:'rgba(239,68,68,0.06)', border:'1px solid rgba(239,68,68,0.15)', color:'var(--accent-danger)', cursor:'pointer', borderRadius:'8px', width:'32px', height:'32px', display:'flex', alignItems:'center', justifyContent:'center' }}><Trash2 size={14}/></button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* ── Edit modal ── */}
              <ModalPortal>
              {editingProduct && (
                <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.45)', backdropFilter:'blur(8px)', zIndex:3000, display:'flex', alignItems:'center', justifyContent:'center', padding:'1rem' }}>
                  <div style={{ background:'white', border:'1px solid var(--border-color)', borderRadius:'24px', width:'100%', maxWidth:'680px', maxHeight:'90vh', display:'flex', flexDirection:'column', boxShadow:'var(--shadow-lg)', overflow:'hidden' }}>

                    {/* Modal header */}
                    <div style={{ padding:'1.25rem 1.5rem', borderBottom:'1px solid var(--border-color)', display:'flex', justifyContent:'space-between', alignItems:'center', flexShrink:0 }}>
                      <h3 style={{ fontWeight:'900', fontSize:'1.05rem' }}>Modifier : {editingProduct.name}</h3>
                      <button onClick={()=>{ setEditingProduct(null); setEditFile(null); setEditVariants([]); setEditSimpleDecls([]); }} style={{ background:'var(--bg-tertiary)', border:'none', borderRadius:'8px', padding:'0.35rem', cursor:'pointer' }}><X size={18} color="var(--text-secondary)"/></button>
                    </div>

                    {/* Scrollable body */}
                    <div style={{ flex:1, overflowY:'auto', padding:'1.25rem 1.5rem', display:'flex', flexDirection:'column', gap:'1rem' }}>

                      {/* ── Base fields ── */}
                      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'0.75rem' }}>
                        <div>
                          <p style={{ fontSize:'0.62rem', fontWeight:'900', color:'var(--text-muted)', letterSpacing:'0.08em', marginBottom:'0.35rem' }}>NOM *</p>
                          <input style={IS} value={editProdName} onChange={e=>setEditProdName(e.target.value)} placeholder="Nom du plat" />
                        </div>
                        <div>
                          <p style={{ fontSize:'0.62rem', fontWeight:'900', color:'var(--text-muted)', letterSpacing:'0.08em', marginBottom:'0.35rem' }}>
                            PRIX {(editVariants.length > 0 || editSimpleDecls.length > 0) ? <span style={{ color:'var(--accent-success)', fontWeight:'600' }}>(optionnel)</span> : '*'}
                          </p>
                          <input style={IS} value={editProdPrice} onChange={e=>setEditProdPrice(e.target.value)} placeholder={(editVariants.length > 0 || editSimpleDecls.length > 0) ? 'Optionnel' : 'Ex: 3000'} type="number" />
                        </div>
                      </div>
                      <div>
                        <p style={{ fontSize:'0.62rem', fontWeight:'900', color:'var(--text-muted)', letterSpacing:'0.08em', marginBottom:'0.35rem' }}>CATÉGORIE</p>
                        <select style={IS} value={editProdCategory} onChange={e=>setEditProdCategory(e.target.value)}>
                          {CATS.map(c=><option key={c} value={c}>{c}</option>)}
                        </select>
                      </div>

                      {/* ── Image (only if no variants) ── */}
                      {editVariants.length === 0 && (
                        <div>
                          <p style={{ fontSize:'0.62rem', fontWeight:'900', color:'var(--text-muted)', letterSpacing:'0.08em', marginBottom:'0.4rem' }}>PHOTO DU PLAT</p>
                          {(editFile || editingProduct.image) && (
                            <div style={{ width:'100%', height:'90px', borderRadius:'10px', marginBottom:'0.5rem', background: editFile ? `url(${URL.createObjectURL(editFile)}) center/cover` : `url(${editingProduct.image}) center/cover`, border:'1px solid var(--border-color)' }} />
                          )}
                          <label style={{ display:'flex', alignItems:'center', gap:'0.75rem', padding:'0.65rem 1rem', background:'var(--bg-tertiary)', borderRadius:'10px', border:'1.5px dashed var(--border-color)', cursor:'pointer' }}>
                            <Upload size={15} color="var(--text-muted)" />
                            <span style={{ fontSize:'0.78rem', color: editFile ? 'var(--text-primary)' : 'var(--text-muted)', fontWeight:'600' }}>
                              {editFile ? editFile.name : 'Changer la photo…'}
                            </span>
                            <input type="file" accept="image/*" style={{ display:'none' }} onChange={e=>setEditFile(e.target.files?.[0]||null)} />
                          </label>
                        </div>
                      )}

                      {/* ── Variants (sous-plats) editor ── */}
                      {editVariants.length > 0 && (
                        <div style={{ background:'var(--bg-secondary)', borderRadius:'14px', padding:'1rem', border:'1px solid var(--border-color)' }}>
                          <p style={{ fontSize:'0.62rem', fontWeight:'900', color:'var(--text-muted)', letterSpacing:'0.08em', marginBottom:'0.75rem' }}>SOUS-PLATS</p>

                          {editVariants.map(v => (
                            <div key={v.id} style={{ background:'white', borderRadius:'12px', padding:'0.875rem', marginBottom:'0.75rem', border:'1px solid var(--border-color)' }}>

                              {/* Variant header: name + remove */}
                              <div style={{ display:'flex', gap:'0.5rem', marginBottom:'0.6rem', alignItems:'center' }}>
                                <input
                                  value={v.name}
                                  onChange={e => setEditVariants(prev => prev.map(ev => ev.id===v.id ? {...ev, name:e.target.value} : ev))}
                                  style={{ ...IS, flex:1, padding:'0.5rem 0.75rem', fontSize:'0.82rem' }}
                                  placeholder="Nom du sous-plat"
                                />
                                <button onClick={() => setEditVariants(prev => prev.filter(ev => ev.id !== v.id))}
                                  style={{ background:'transparent', border:'none', color:'var(--accent-danger)', cursor:'pointer', flexShrink:0 }}>
                                  <X size={15}/>
                                </button>
                              </div>

                              {/* Variant image */}
                              <label style={{ display:'flex', alignItems:'center', gap:'0.6rem', padding:'0.4rem 0.75rem', background:'var(--bg-secondary)', borderRadius:'8px', border:'1px dashed var(--border-color)', cursor:'pointer', marginBottom:'0.6rem' }}>
                                {v.image
                                  ? <div style={{ width:'24px', height:'24px', borderRadius:'4px', background:`url(${v.image}) center/cover`, flexShrink:0 }} />
                                  : <Upload size={13} color="var(--text-muted)" />
                                }
                                <span style={{ fontSize:'0.7rem', color:'var(--text-muted)', fontWeight:'600' }}>{v.image ? 'Changer la photo' : 'Ajouter une photo'}</span>
                                <input type="file" accept="image/*" style={{ display:'none' }} onChange={async e => {
                                  const f = e.target.files?.[0]; if (!f) return;
                                  const ext = f.name.split('.').pop();
                                  const fn  = `${Date.now()}_var.${ext}`;
                                  const { error, data } = await supabase.storage.from('resto-bucket').upload(fn, f);
                                  if (!error && data) {
                                    const { data: pub } = supabase.storage.from('resto-bucket').getPublicUrl(fn);
                                    setEditVariants(prev => prev.map(ev => ev.id===v.id ? {...ev, image:pub.publicUrl} : ev));
                                  }
                                }} />
                              </label>

                              {/* Existing déclinaisons */}
                              {(v.options||[]).map((o, idx) => (
                                <div key={idx} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'0.3rem 0.5rem', background:'var(--bg-tertiary)', borderRadius:'7px', marginBottom:'0.3rem' }}>
                                  <span style={{ fontSize:'0.75rem', fontWeight:'700' }}>{o.name||'—'}</span>
                                  <div style={{ display:'flex', alignItems:'center', gap:'0.5rem' }}>
                                    <span style={{ fontSize:'0.75rem', fontWeight:'900', color:'var(--accent-primary)' }}>{o.price.toLocaleString()} F</span>
                                    <button onClick={() => setEditVariants(prev => prev.map(ev => ev.id===v.id ? {...ev, options:(ev.options||[]).filter((_,i)=>i!==idx)} : ev))}
                                      style={{ background:'transparent', border:'none', color:'var(--text-muted)', cursor:'pointer' }}><X size={12}/></button>
                                  </div>
                                </div>
                              ))}

                              {/* Add déclinaison */}
                              {editOpenDeclFor === v.id ? (
                                <div style={{ display:'flex', gap:'0.4rem', marginTop:'0.5rem' }}>
                                  <input value={editVDeclLabel} onChange={e=>setEditVDeclLabel(e.target.value)} placeholder="Label (optionnel)" style={{ ...IS, flex:2, padding:'0.45rem 0.65rem', fontSize:'0.75rem' }} />
                                  <input value={editVDeclPrice} onChange={e=>setEditVDeclPrice(e.target.value)} placeholder="Prix *" type="number" style={{ ...IS, flex:1, padding:'0.45rem 0.65rem', fontSize:'0.75rem' }} />
                                  <button onClick={() => {
                                    if (!editVDeclPrice) return;
                                    setEditVariants(prev => prev.map(ev => ev.id===v.id ? {...ev, options:[...(ev.options||[]), {name:editVDeclLabel||undefined, price:parseFloat(editVDeclPrice)}]} : ev));
                                    setEditVDeclLabel(''); setEditVDeclPrice('');
                                  }} style={{ padding:'0.45rem 0.7rem', background:'var(--accent-primary)', color:'white', border:'none', borderRadius:'7px', cursor:'pointer', flexShrink:0 }}>
                                    <Plus size={14}/>
                                  </button>
                                </div>
                              ) : (
                                <button onClick={() => setEditOpenDeclFor(v.id)}
                                  style={{ marginTop:'0.5rem', width:'100%', padding:'0.35rem', background:'transparent', border:'1px dashed var(--border-color)', borderRadius:'7px', fontSize:'0.68rem', fontWeight:'700', color:'var(--text-muted)', cursor:'pointer' }}>
                                  + Ajouter une déclinaison
                                </button>
                              )}
                            </div>
                          ))}

                          {/* Add new variant */}
                          <div style={{ display:'flex', gap:'0.5rem' }}>
                            <input value={editNewVarName} onChange={e=>setEditNewVarName(e.target.value)} placeholder="Nouveau sous-plat…" style={{ ...IS, flex:1, padding:'0.55rem 0.875rem', fontSize:'0.82rem' }}
                              onKeyDown={e => { if(e.key==='Enter' && editNewVarName.trim()){ setEditVariants(prev=>[...prev,{id:Date.now().toString(),name:editNewVarName.trim(),options:[]}]); setEditNewVarName(''); }}} />
                            <button onClick={() => { if(!editNewVarName.trim()) return; setEditVariants(prev=>[...prev,{id:Date.now().toString(),name:editNewVarName.trim(),options:[]}]); setEditNewVarName(''); }}
                              style={{ padding:'0.55rem 1rem', background:'var(--accent-primary)', color:'white', border:'none', borderRadius:'9px', cursor:'pointer', flexShrink:0 }}>
                              <Plus size={15}/>
                            </button>
                          </div>
                        </div>
                      )}

                      {/* ── Simple déclinaisons editor ── */}
                      {editVariants.length === 0 && editSimpleDecls.length > 0 && (
                        <div style={{ background:'var(--bg-secondary)', borderRadius:'14px', padding:'1rem', border:'1px solid var(--border-color)' }}>
                          <p style={{ fontSize:'0.62rem', fontWeight:'900', color:'var(--text-muted)', letterSpacing:'0.08em', marginBottom:'0.75rem' }}>DÉCLINAISONS</p>

                          {editSimpleDecls.map((o, idx) => (
                            <div key={idx} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'0.4rem 0.75rem', background:'white', borderRadius:'8px', marginBottom:'0.4rem', border:'1px solid var(--border-color)' }}>
                              <span style={{ fontSize:'0.8rem', fontWeight:'700' }}>{o.name||'—'}</span>
                              <div style={{ display:'flex', alignItems:'center', gap:'0.75rem' }}>
                                <span style={{ fontWeight:'900', color:'var(--accent-primary)', fontSize:'0.8rem' }}>{o.price.toLocaleString()} F</span>
                                <button onClick={() => setEditSimpleDecls(prev => prev.filter((_,i)=>i!==idx))}
                                  style={{ background:'transparent', border:'none', color:'var(--accent-danger)', cursor:'pointer' }}><X size={14}/></button>
                              </div>
                            </div>
                          ))}

                          <div style={{ display:'flex', gap:'0.5rem', marginTop:'0.5rem' }}>
                            <input value={editSDeclLabel} onChange={e=>setEditSDeclLabel(e.target.value)} placeholder="Label (optionnel)" style={{ ...IS, flex:2, padding:'0.5rem 0.75rem', fontSize:'0.8rem' }} />
                            <input value={editSDeclPrice} onChange={e=>setEditSDeclPrice(e.target.value)} placeholder="Prix *" type="number" style={{ ...IS, flex:1, padding:'0.5rem 0.75rem', fontSize:'0.8rem' }} />
                            <button onClick={() => { if(!editSDeclPrice) return; setEditSimpleDecls(prev=>[...prev,{name:editSDeclLabel||undefined,price:parseFloat(editSDeclPrice)}]); setEditSDeclLabel(''); setEditSDeclPrice(''); }}
                              style={{ padding:'0.5rem 0.875rem', background:'var(--accent-primary)', color:'white', border:'none', borderRadius:'9px', cursor:'pointer', flexShrink:0 }}>
                              <Plus size={15}/>
                            </button>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Modal footer */}
                    <div style={{ padding:'1rem 1.5rem', borderTop:'1px solid var(--border-color)', display:'flex', gap:'0.75rem', flexShrink:0 }}>
                      <button onClick={updateProduct} disabled={uploading} className="btn-primary" style={{ flex:1, justifyContent:'center' }}>{uploading ? '…' : 'ENREGISTRER'}</button>
                      <button onClick={()=>{ setEditingProduct(null); setEditFile(null); setEditVariants([]); setEditSimpleDecls([]); }} className="btn-secondary" style={{ flex:1, justifyContent:'center' }}>ANNULER</button>
                    </div>
                  </div>
                </div>
              )}
              </ModalPortal>
            </div>
          )}

          {/* ══ HR ══ */}
          {activeTab === 'hr' && (
            <div style={{ display:'flex', flexDirection:'column', gap:'1.75rem' }}>
              <div style={card}>
                <h2 style={{ fontSize:'1.05rem', fontWeight:'900', marginBottom:'1.1rem' }}>Nouveau Membre</h2>
                <div style={{ display:'grid', gridTemplateColumns:'2fr 1fr 1fr', gap:'0.875rem' }}>
                  <input style={IS} value={newUserName} onChange={e=>setNewUserName(e.target.value)} placeholder="Nom complet" />
                  <select style={IS} value={newUserRole} onChange={e=>setNewUserRole(e.target.value)}>
                    <option value="serveur">Serveur</option>
                    <option value="livreur">Livreur</option>
                    <option value="caissiere">Caissière</option>
                    <option value="admin">Admin</option>
                  </select>
                  <button className="btn-primary" onClick={addUser} style={{ justifyContent:'center' }}>CRÉER</button>
                </div>
                <p style={{ marginTop:'0.6rem', fontSize:'0.72rem', color:'var(--text-muted)' }}>Identifiant: nom@salamresto.local · Mot de passe: 0000</p>
              </div>
              <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(240px,1fr))', gap:'1.1rem' }}>
                {users.map(u=>(
                  <div key={u.id} className="glass-panel hover-scale" style={{ padding:'1.5rem' }}>
                    <div style={{ width:'44px', height:'44px', borderRadius:'12px', background:'var(--bg-tertiary)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'1.3rem', marginBottom:'1.1rem' }}>
                      {u.role==='admin'?'👑':'🧑‍🍳'}
                    </div>
                    <h4 style={{ fontWeight:'900', marginBottom:'0.2rem' }}>{u.name}</h4>
                    <p style={{ color:'var(--accent-primary)', fontSize:'0.68rem', fontWeight:'900', letterSpacing:'0.08em' }}>{u.role.toUpperCase()}</p>
                    <div style={{ marginTop:'1.1rem', display:'flex', justifyContent:'space-between', alignItems:'center', borderTop:'1px solid var(--border-color)', paddingTop:'0.875rem' }}>
                      <p style={{ fontWeight:'800' }}>{u.baseSalary?.toLocaleString()} F</p>
                      <ChevronRight size={15} color="var(--text-muted)"/>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ══ PROFILES ══ */}
          {activeTab === 'profiles' && (
            <div style={card}>
              {/* Header */}
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'1.25rem' }}>
                <h2 style={{ fontSize:'1.05rem', fontWeight:'900' }}>Comptes utilisateurs</h2>
                <button onClick={()=>{ setShowCreateUser(!showCreateUser); setCreateUserError(''); }}
                  style={{ display:'flex', alignItems:'center', gap:'0.4rem', padding:'0.5rem 0.875rem', background:'var(--accent-primary)', color:'white', border:'none', borderRadius:'9px', fontWeight:'800', fontSize:'0.78rem', cursor:'pointer', boxShadow:'var(--shadow-glow)' }}>
                  <UserPlus size={14}/> Créer un compte
                </button>
              </div>

              {/* Create user form */}
              {showCreateUser && (
                <div style={{ marginBottom:'1.5rem', padding:'1.25rem', background:'var(--bg-secondary)', borderRadius:'14px', border:'1px solid var(--border-color)' }}>
                  <h3 style={{ fontWeight:'900', fontSize:'0.9rem', marginBottom:'0.875rem' }}>Nouveau compte</h3>
                  <p style={{ fontSize:'0.72rem', color:'var(--text-muted)', marginBottom:'0.875rem' }}>Mot de passe par défaut : <strong>00000000</strong> (à changer après connexion)</p>
                  {createUserError && (
                    <p style={{ color:'var(--accent-danger)', fontSize:'0.78rem', marginBottom:'0.75rem', fontWeight:'600' }}>{createUserError}</p>
                  )}
                  <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'0.75rem' }}>
                    <input style={IS} value={newUserAuthName} onChange={e=>setNewUserAuthName(e.target.value)} placeholder="Nom complet" />
                    <input style={IS} value={newUserAuthEmail} onChange={e=>setNewUserAuthEmail(e.target.value)} placeholder="Email" type="email" />
                    <select style={{ ...IS, gridColumn:'1/-1', appearance:'none', cursor:'pointer' }} value={newUserAuthRole} onChange={e=>setNewUserAuthRole(e.target.value)}>
                      {currentUserProfile?.role === 'superAdmin' && <option value="superAdmin">Super Admin</option>}
                      <option value="admin">Administrateur</option>
                      <option value="manager">Manager</option>
                      <option value="caisse">Caissier(e)</option>
                      <option value="serveur">Serveur / Serveuse</option>
                      <option value="livreur">Livreur</option>
                    </select>
                  </div>
                  <div style={{ display:'flex', gap:'0.5rem', marginTop:'0.875rem' }}>
                    <button onClick={createAuthUser} disabled={createUserLoading}
                      style={{ flex:1, padding:'0.65rem', background:'var(--accent-primary)', color:'white', border:'none', borderRadius:'9px', fontWeight:'800', fontSize:'0.8rem', cursor:createUserLoading?'not-allowed':'pointer', opacity:createUserLoading?0.7:1 }}>
                      {createUserLoading ? 'Création…' : 'Créer le compte'}
                    </button>
                    <button onClick={()=>{ setShowCreateUser(false); setCreateUserError(''); }}
                      style={{ padding:'0.65rem 1rem', background:'transparent', color:'var(--text-muted)', border:'1px solid var(--border-color)', borderRadius:'9px', fontWeight:'700', cursor:'pointer' }}>
                      Annuler
                    </button>
                  </div>
                </div>
              )}

              {/* Profiles grid */}
              <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(155px,1fr))', gap:'0.875rem' }}>
                {authProfiles.map(u=>(
                  <div key={u.id} className="glass-panel" style={{ padding:'1.1rem', textAlign:'center' }}>
                    <div style={{ width:'48px', height:'48px', borderRadius:'50%', background:'var(--bg-tertiary)', margin:'0 auto 0.75rem', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'1.3rem' }}>
                      👤
                    </div>
                    <h4 style={{ fontSize:'0.82rem', fontWeight:'800', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{u.name || '—'}</h4>
                    <p style={{ fontSize:'0.62rem', color:'var(--accent-primary)', fontWeight:'900', textTransform:'uppercase', marginTop:'0.2rem' }}>{u.role}</p>
                    <p style={{ fontSize:'0.6rem', color:'var(--text-muted)', marginTop:'0.25rem', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{u.email}</p>
                  </div>
                ))}
                {authProfiles.length === 0 && (
                  <p style={{ color:'var(--text-muted)', fontSize:'0.82rem', padding:'1rem' }}>Aucun compte enregistré</p>
                )}
              </div>
            </div>
          )}

          {/* ══ CLIENTS ══ */}
          {activeTab === 'clients' && (() => {
            const clientNames = Array.from(new Set(orders.map(o=>o.customername).filter(Boolean)));
            const totalClients = clientNames.length;
            const pagedClients = clientNames.slice((clientsPage-1)*PER_PAGE, clientsPage*PER_PAGE);
            return (
              <div>
                <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(240px,1fr))', gap:'1.1rem', marginBottom:'1.25rem' }}>
                  {pagedClients.map((name, i) => {
                    const co = orders.filter(o=>o.customername===name);
                    return (
                      <div key={i} className="glass-panel hover-scale" style={{ padding:'1.25rem' }}>
                        <div style={{ display:'flex', alignItems:'center', gap:'0.875rem', marginBottom:'0.875rem' }}>
                          <div style={{ width:'40px', height:'40px', borderRadius:'50%', background:'var(--accent-primary)', display:'flex', alignItems:'center', justifyContent:'center', color:'white', fontWeight:'900' }}>
                            {String(name)[0].toUpperCase()}
                          </div>
                          <div>
                            <p style={{ fontWeight:'800', fontSize:'0.875rem' }}>{name}</p>
                            <p style={{ fontSize:'0.68rem', color:'var(--text-muted)' }}>{co.length} commande(s)</p>
                          </div>
                        </div>
                        <div style={{ display:'flex', justifyContent:'space-between', borderTop:'1px solid var(--border-color)', paddingTop:'0.75rem' }}>
                          <span style={{ fontSize:'0.72rem', color:'var(--text-muted)' }}>TOTAL</span>
                          <span style={{ fontWeight:'900', color:'var(--accent-success)' }}>{co.reduce((a,o)=>a+o.total,0).toLocaleString()} F</span>
                        </div>
                      </div>
                    );
                  })}
                  {totalClients === 0 && <p style={{ color:'var(--text-muted)', padding:'2rem' }}>Aucun client</p>}
                </div>
                {totalClients > PER_PAGE && (
                  <div style={{ display:'flex', justifyContent:'center', alignItems:'center', gap:'0.5rem' }}>
                    <button onClick={() => setClientsPage(p => Math.max(1, p-1))} disabled={clientsPage === 1}
                      style={{ padding:'0.4rem 0.875rem', borderRadius:'8px', background:'var(--bg-secondary)', border:'1px solid var(--border-color)', color: clientsPage===1?'var(--text-muted)':'var(--text-primary)', fontWeight:'700', fontSize:'0.78rem', cursor: clientsPage===1?'not-allowed':'pointer' }}>
                      ← Préc.
                    </button>
                    <span style={{ fontSize:'0.78rem', fontWeight:'800', color:'var(--text-muted)' }}>
                      {clientsPage} / {Math.ceil(totalClients/PER_PAGE)}
                    </span>
                    <button onClick={() => setClientsPage(p => Math.min(Math.ceil(totalClients/PER_PAGE), p+1))} disabled={clientsPage === Math.ceil(totalClients/PER_PAGE)}
                      style={{ padding:'0.4rem 0.875rem', borderRadius:'8px', background:'var(--bg-secondary)', border:'1px solid var(--border-color)', color: clientsPage===Math.ceil(totalClients/PER_PAGE)?'var(--text-muted)':'var(--text-primary)', fontWeight:'700', fontSize:'0.78rem', cursor: clientsPage===Math.ceil(totalClients/PER_PAGE)?'not-allowed':'pointer' }}>
                      Suiv. →
                    </button>
                  </div>
                )}
              </div>
            );
          })()}

          {/* ══ DÉPENSES ══ */}
          {activeTab === 'adminexpenses' && (
            <div style={{ display:'flex', flexDirection:'column', gap:'1.75rem' }}>

              {filterBar}

              {/* Add form */}
              <div style={card}>
                <h3 style={{ fontSize:'1.05rem', fontWeight:'900', marginBottom:'1.25rem' }}>Nouvelle Dépense</h3>
                {/* Type toggle */}
                <div style={{ display:'flex', gap:'0.4rem', marginBottom:'1rem' }}>
                  {([['ordinaire','Ordinaire'],['admin','Administration']] as const).map(([v,l]) => (
                    <button key={v} onClick={() => setExpType(v)}
                      style={{ flex:1, padding:'0.55rem', borderRadius:'9px', border:`1.5px solid ${expType===v?'var(--accent-primary)':'var(--border-color)'}`, background:expType===v?'var(--accent-primary)':'transparent', color:expType===v?'white':'var(--text-secondary)', fontWeight:'800', fontSize:'0.78rem', cursor:'pointer', transition:'all 0.15s' }}>
                      {l}
                    </button>
                  ))}
                </div>
                <div style={{ display:'flex', gap:'0.75rem' }}>
                  <input style={{ ...IS, flex:2 }} value={expTitle} onChange={e=>setExpTitle(e.target.value)} placeholder={expType==='admin'?'Salaire, Loyer, Électricité…':'Ingrédients, Fournitures…'} />
                  <input style={{ ...IS, flex:1 }} value={expAmount} onChange={e=>setExpAmount(e.target.value)} placeholder="Montant (F)" type="number" />
                  <button className="btn-primary" onClick={addExpense} style={{ justifyContent:'center', whiteSpace:'nowrap', flexShrink:0 }}>+ AJOUTER</button>
                </div>
              </div>

              {/* Summary bar */}
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:'1rem' }}>
                {[
                  { label:'TOTAL', value:totalExpenses, color:'var(--accent-danger)' },
                  { label:'ORDINAIRES', value:expOrdinaire, color:'var(--accent-warning)' },
                  { label:'ADMINISTRATION', value:expAdmin, color:'#7C3AED' },
                ].map(s => (
                  <div key={s.label} style={{ ...card, padding:'1.25rem', borderTop:`3px solid ${s.color}` }}>
                    <p style={{ fontSize:'0.63rem', fontWeight:'900', color:s.color, letterSpacing:'0.08em', marginBottom:'0.4rem' }}>{s.label}</p>
                    <p style={{ fontSize:'1.4rem', fontWeight:'900' }}>{s.value.toLocaleString()} <span style={{ fontSize:'0.7rem', color:'var(--text-muted)' }}>F</span></p>
                  </div>
                ))}
              </div>

              {/* Sub-tabs */}
              <div style={card}>
                <div style={{ display:'flex', gap:'0.4rem', marginBottom:'1.25rem' }}>
                  {([['ordinaire','Ordinaires'],['admin','Administration']] as const).map(([v,l]) => (
                    <button key={v} onClick={() => setDepensesSubTab(v)}
                      style={{ padding:'0.45rem 1.1rem', borderRadius:'8px', border:'none', background:depensesSubTab===v?'var(--bg-tertiary)':'transparent', color:depensesSubTab===v?'var(--text-primary)':'var(--text-muted)', fontWeight:'800', fontSize:'0.78rem', cursor:'pointer' }}>
                      {l} <span style={{ marginLeft:'0.3rem', fontSize:'0.65rem', background:depensesSubTab===v?'var(--accent-primary)':'var(--bg-tertiary)', color:depensesSubTab===v?'white':'var(--text-muted)', borderRadius:'100px', padding:'0.1rem 0.4rem', fontWeight:'900' }}>
                        {v==='ordinaire' ? expenses.filter(e=>!isAdminExp(e)).length : expenses.filter(e=>isAdminExp(e)).length}
                      </span>
                    </button>
                  ))}
                </div>
                <div style={{ display:'flex', flexDirection:'column', gap:'0.6rem' }}>
                  {(depensesSubTab==='ordinaire' ? expenses.filter(e=>!isAdminExp(e)) : expenses.filter(e=>isAdminExp(e))).map(e => (
                    <div key={e.id} style={{ padding:'0.875rem 1rem', background:'var(--bg-secondary)', borderRadius:'10px', border:'1px solid var(--border-color)', borderLeft:`3px solid ${depensesSubTab==='admin'?'#7C3AED':'var(--accent-warning)'}`, display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                      <div>
                        <p style={{ fontWeight:'800', fontSize:'0.875rem' }}>{(e.title || '').replace(/^\[ADMIN\]\s*/, '')}</p>
                        <p style={{ fontSize:'0.63rem', color:'var(--text-muted)', marginTop:'0.15rem' }}>{new Date(e.created_at).toLocaleDateString('fr-FR',{day:'2-digit',month:'short',year:'numeric'})}</p>
                      </div>
                      <span style={{ fontWeight:'900', color:'var(--accent-danger)', whiteSpace:'nowrap', marginLeft:'1rem' }}>- {e.amount.toLocaleString()} F</span>
                    </div>
                  ))}
                  {(depensesSubTab==='ordinaire' ? expenses.filter(e=>!isAdminExp(e)) : expenses.filter(e=>isAdminExp(e))).length === 0 && (
                    <p style={{ textAlign:'center', color:'var(--text-muted)', padding:'2rem', fontSize:'0.82rem' }}>Aucune dépense dans cette catégorie</p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ══ COMPTABILITÉ ══ */}
          {activeTab === 'accounting' && (() => {
            const netResult = caTotal - totalExpenses;
            const margin = caTotal > 0 ? ((netResult / caTotal) * 100).toFixed(1) : '0.0';
            return (
              <div style={{ display:'flex', flexDirection:'column', gap:'1.75rem' }}>

                {/* Period + header */}
                <div style={{ display:'flex', flexDirection:'column', gap:'1rem' }}>
                  <h2 style={{ fontWeight:'900', fontSize:'1.1rem' }}>Tableau de Bord Comptable</h2>
                  {filterBar}
                </div>

                {/* P&L summary */}
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:'1.25rem' }}>
                  {[
                    { label:'REVENUS (CA)', value:caTotal,      color:'#10B981', icon:<ArrowUpRight size={18}/>,   sub:`${paidOrders.length} commandes réglées` },
                    { label:'DÉPENSES',     value:totalExpenses, color:'#EF4444', icon:<ArrowDownRight size={18}/>, sub:`Ord: ${expOrdinaire.toLocaleString()} F · Admin: ${expAdmin.toLocaleString()} F` },
                    { label:'RÉSULTAT NET', value:netResult,     color: netResult>=0?'#6366F1':'#EF4444', icon:<TrendingUp size={18}/>, sub:`Marge: ${margin}%` },
                  ].map(s => (
                    <div key={s.label} style={{ ...card, borderTop:`3px solid ${s.color}`, padding:'1.5rem' }}>
                      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:'0.75rem' }}>
                        <p style={{ fontSize:'0.63rem', fontWeight:'900', color:s.color, letterSpacing:'0.09em' }}>{s.label}</p>
                        <div style={{ color:s.color }}>{s.icon}</div>
                      </div>
                      <p style={{ fontSize:'1.6rem', fontWeight:'900', color:s.color, marginBottom:'0.25rem' }}>
                        {netResult < 0 && s.label==='RÉSULTAT NET' ? '- ' : ''}{Math.abs(s.value).toLocaleString()} <span style={{ fontSize:'0.68rem', color:'var(--text-muted)', fontWeight:'700' }}>F</span>
                      </p>
                      <p style={{ fontSize:'0.65rem', color:'var(--text-muted)', marginTop:'0.1rem' }}>{s.sub}</p>
                    </div>
                  ))}
                </div>

                {/* Revenue breakdown + Expenses breakdown */}
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'1.5rem' }}>
                  <div style={card}>
                    <h3 style={{ fontWeight:'900', fontSize:'0.95rem', marginBottom:'1.25rem', display:'flex', alignItems:'center', gap:'0.5rem' }}>
                      <ArrowUpRight size={16} color="var(--accent-success)"/> Répartition des Revenus
                    </h3>
                    <table style={{ width:'100%', borderCollapse:'collapse', fontSize:'0.82rem' }}>
                      <thead>
                        <tr style={{ borderBottom:'1px solid var(--border-color)' }}>
                          {['Canal','Commandes','CA','% CA'].map(h => (
                            <th key={h} style={{ padding:'0.5rem 0.4rem', textAlign:'left', fontSize:'0.62rem', fontWeight:'900', color:'var(--text-muted)', letterSpacing:'0.06em' }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {[
                          { label:'Salle',     ca:caSalle,    cnt:paidOrders.filter(o=>o.type==='salle').length    },
                          { label:'Livraison', ca:caExterne,  cnt:paidOrders.filter(o=>o.type==='external').length },
                          { label:'Emporté',  ca:caComptoir, cnt:paidOrders.filter(o=>o.type==='comptoir').length },
                        ].map(row => (
                          <tr key={row.label} style={{ borderBottom:'1px solid var(--border-color)' }}>
                            <td style={{ padding:'0.65rem 0.4rem', fontWeight:'700' }}>{row.label}</td>
                            <td style={{ padding:'0.65rem 0.4rem', color:'var(--text-muted)' }}>{row.cnt}</td>
                            <td style={{ padding:'0.65rem 0.4rem', fontWeight:'900' }}>{row.ca.toLocaleString()} F</td>
                            <td style={{ padding:'0.65rem 0.4rem', color:'var(--accent-primary)', fontWeight:'800' }}>{caTotal?((row.ca/caTotal)*100).toFixed(1):0}%</td>
                          </tr>
                        ))}
                        <tr style={{ background:'var(--bg-secondary)' }}>
                          <td style={{ padding:'0.65rem 0.4rem', fontWeight:'900' }}>TOTAL</td>
                          <td style={{ padding:'0.65rem 0.4rem', fontWeight:'900' }}>{paidOrders.length}</td>
                          <td style={{ padding:'0.65rem 0.4rem', fontWeight:'900', color:'var(--accent-success)' }}>{caTotal.toLocaleString()} F</td>
                          <td style={{ padding:'0.65rem 0.4rem', fontWeight:'900' }}>100%</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  <div style={card}>
                    <h3 style={{ fontWeight:'900', fontSize:'0.95rem', marginBottom:'1.25rem', display:'flex', alignItems:'center', gap:'0.5rem' }}>
                      <ArrowDownRight size={16} color="var(--accent-danger)"/> Répartition des Dépenses
                    </h3>
                    <table style={{ width:'100%', borderCollapse:'collapse', fontSize:'0.82rem' }}>
                      <thead>
                        <tr style={{ borderBottom:'1px solid var(--border-color)' }}>
                          {['Catégorie','Nb','Montant','% Dép.'].map(h => (
                            <th key={h} style={{ padding:'0.5rem 0.4rem', textAlign:'left', fontSize:'0.62rem', fontWeight:'900', color:'var(--text-muted)', letterSpacing:'0.06em' }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {[
                          { label:'Ordinaires',     amt:expOrdinaire, cnt:expenses.filter(e=>e.type!=='admin').length, color:'var(--accent-warning)' },
                          { label:'Administration', amt:expAdmin,     cnt:expenses.filter(e=>e.type==='admin').length, color:'#7C3AED' },
                        ].map(row => (
                          <tr key={row.label} style={{ borderBottom:'1px solid var(--border-color)' }}>
                            <td style={{ padding:'0.65rem 0.4rem', fontWeight:'700' }}>
                              <span style={{ display:'inline-flex', alignItems:'center', gap:'0.4rem' }}>
                                <span style={{ width:'8px', height:'8px', borderRadius:'50%', background:row.color, flexShrink:0, display:'inline-block' }}/>
                                {row.label}
                              </span>
                            </td>
                            <td style={{ padding:'0.65rem 0.4rem', color:'var(--text-muted)' }}>{row.cnt}</td>
                            <td style={{ padding:'0.65rem 0.4rem', fontWeight:'900', color:row.color }}>{row.amt.toLocaleString()} F</td>
                            <td style={{ padding:'0.65rem 0.4rem', fontWeight:'800', color:'var(--accent-danger)' }}>{totalExpenses?((row.amt/totalExpenses)*100).toFixed(1):0}%</td>
                          </tr>
                        ))}
                        <tr style={{ background:'var(--bg-secondary)' }}>
                          <td style={{ padding:'0.65rem 0.4rem', fontWeight:'900' }}>TOTAL</td>
                          <td style={{ padding:'0.65rem 0.4rem', fontWeight:'900' }}>{expenses.length}</td>
                          <td style={{ padding:'0.65rem 0.4rem', fontWeight:'900', color:'var(--accent-danger)' }}>{totalExpenses.toLocaleString()} F</td>
                          <td style={{ padding:'0.65rem 0.4rem', fontWeight:'900' }}>100%</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Payment methods */}
                <div style={card}>
                  <h3 style={{ fontWeight:'900', fontSize:'0.95rem', marginBottom:'1.25rem' }}>Encaissements par Mode de Paiement</h3>
                  <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(180px,1fr))', gap:'1rem' }}>
                    {[
                      { label:'Espèces',      value:payByCash,   color:'#10B981' },
                      { label:'Wave',         value:payByWave,   color:'#7C3AED' },
                      { label:'Orange Money', value:payByOrange, color:'#EA580C' },
                      { label:'Non défini',   value:caTotal - payByCash - payByWave - payByOrange, color:'var(--text-muted)' },
                    ].map(pm => {
                      const pct = caTotal ? ((pm.value / caTotal) * 100).toFixed(0) : '0';
                      return (
                        <div key={pm.label} style={{ padding:'1rem', background:'var(--bg-secondary)', borderRadius:'12px', border:'1px solid var(--border-color)', borderLeft:`3px solid ${pm.color}` }}>
                          <p style={{ fontSize:'0.68rem', fontWeight:'900', color:pm.color, marginBottom:'0.4rem' }}>{pm.label}</p>
                          <p style={{ fontSize:'1.2rem', fontWeight:'900', marginBottom:'0.25rem' }}>{Math.max(0,pm.value).toLocaleString()} F</p>
                          <div style={{ height:'4px', background:'var(--bg-tertiary)', borderRadius:'2px' }}>
                            <div style={{ height:'100%', width:`${pct}%`, background:pm.color, borderRadius:'2px' }} />
                          </div>
                          <p style={{ fontSize:'0.63rem', color:'var(--text-muted)', marginTop:'0.3rem', fontWeight:'700' }}>{pct}% du CA</p>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Expenses history */}
                <div style={card}>
                  <h3 style={{ fontWeight:'900', fontSize:'0.95rem', marginBottom:'1.25rem' }}>Historique des Dépenses</h3>
                  <div style={{ display:'flex', flexDirection:'column', gap:'0.5rem', maxHeight:'360px', overflowY:'auto' }}>
                    {expenses.map(e => (
                      <div key={e.id} style={{ padding:'0.75rem 1rem', background:'var(--bg-secondary)', borderRadius:'10px', border:'1px solid var(--border-color)', borderLeft:`3px solid ${e.type==='admin'?'#7C3AED':'var(--accent-warning)'}`, display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                        <div>
                          <p style={{ fontWeight:'800', fontSize:'0.82rem' }}>{e.title}</p>
                          <div style={{ display:'flex', gap:'0.5rem', alignItems:'center', marginTop:'0.15rem' }}>
                            <span style={{ fontSize:'0.6rem', fontWeight:'800', color:e.type==='admin'?'#7C3AED':'var(--accent-warning)', background:e.type==='admin'?'rgba(124,58,237,0.08)':'rgba(245,158,11,0.08)', padding:'0.1rem 0.4rem', borderRadius:'4px' }}>
                              {e.type==='admin'?'ADMIN':'ORDINAIRE'}
                            </span>
                            <span style={{ fontSize:'0.62rem', color:'var(--text-muted)' }}>{new Date(e.created_at).toLocaleDateString('fr-FR',{day:'2-digit',month:'short',year:'numeric'})}</span>
                          </div>
                        </div>
                        <span style={{ fontWeight:'900', color:'var(--accent-danger)', whiteSpace:'nowrap', marginLeft:'1rem' }}>- {e.amount.toLocaleString()} F</span>
                      </div>
                    ))}
                    {expenses.length === 0 && <p style={{ textAlign:'center', color:'var(--text-muted)', padding:'2rem', fontSize:'0.82rem' }}>Aucune dépense enregistrée</p>}
                  </div>
                </div>

              </div>
            );
          })()}

        </div>
      )}
    </div>
    </RoleGuard>
  );
}

export default function AdminDashboard() {
  return (
    <Suspense fallback={<div style={{ padding:'3rem', color:'var(--text-muted)' }}>Chargement...</div>}>
      <AdminContent />
    </Suspense>
  );
}
