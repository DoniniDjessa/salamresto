"use client";
import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { Product, ProductVariant, OrderStatus } from '@/types';
import { LayoutGrid, Plus, X, Send, ChevronRight, CreditCard, ShoppingBag, Search, Truck, MapPin, CheckCircle2, Clock, Flame } from 'lucide-react';
import RoleGuard from '@/components/RoleGuard';

const TABLES_KEY = 'salamresto-tables-count';
const CAVE_CATS_TABLE = new Set(['boissons', 'cave', 'thé/café', 'the/cafe']);

interface CartItem { id: string; name: string; price: number; quantity: number; }

const overlay: React.CSSProperties = {
  position: 'fixed', inset: 0,
  background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(6px)',
  zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center',
};

const miniBtn = (active = false): React.CSSProperties => ({
  padding: '0.3rem 0.65rem', borderRadius: '7px',
  background: active ? 'var(--accent-primary)' : 'transparent',
  color: active ? 'white' : 'var(--text-secondary)',
  border: active ? 'none' : '1px solid var(--border-color)',
  fontWeight: '700', fontSize: '0.65rem', cursor: 'pointer',
  textTransform: 'uppercase', transition: 'all 0.15s',
});

/* ─── Shared: product selection modals ──────────────────── */
function VariantModal({ product, onSelect, onClose }: { product: Product; onSelect: (v: ProductVariant) => void; onClose: () => void }) {
  return (
    <div style={overlay}>
      <div style={{ background: 'white', borderRadius: '20px', padding: '1.75rem', width: '420px', maxWidth: '90vw', boxShadow: 'var(--shadow-lg)', border: '1px solid var(--border-color)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
          <h3 style={{ fontWeight: '900', fontSize: '1.05rem' }}>{product.name}</h3>
          <button onClick={onClose} style={{ background: 'var(--bg-tertiary)', border: 'none', borderRadius: '7px', padding: '0.35rem', cursor: 'pointer' }}><X size={16} color="var(--text-secondary)"/></button>
        </div>
        <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>Choisissez un sous-plat</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
          {product.variants?.map(v => (
            <button key={v.id} onClick={() => onSelect(v)}
              style={{ padding: '0.875rem 1rem', display: 'flex', alignItems: 'center', gap: '0.875rem', background: 'var(--bg-secondary)', border: '1.5px solid var(--border-color)', borderRadius: '12px', cursor: 'pointer', textAlign: 'left' }}
              onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--accent-primary)')}
              onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border-color)')}
            >
              {v.image && <div style={{ width: '40px', height: '40px', borderRadius: '9px', background: `url(${v.image}) center/cover`, flexShrink: 0 }} />}
              <span style={{ flex: 1, fontWeight: '800', fontSize: '0.9rem' }}>{v.name}</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexShrink: 0 }}>
                {v.options?.length ? <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>{v.options.length} choix</span> : v.price ? <span style={{ color: 'var(--accent-primary)', fontWeight: '900' }}>{v.price.toLocaleString()} F</span> : null}
                <ChevronRight size={14} color="var(--text-muted)"/>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function DeclModal({ product, variant, onSelect, onClose }: { product: Product; variant: ProductVariant; onSelect: (name: string, price: number) => void; onClose: () => void }) {
  return (
    <div style={overlay}>
      <div style={{ background: 'white', borderRadius: '20px', padding: '1.75rem', width: '380px', maxWidth: '90vw', boxShadow: 'var(--shadow-lg)', border: '1px solid var(--border-color)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
          <div>
            <p style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontWeight: '700' }}>{product.name}</p>
            <h3 style={{ fontWeight: '900', fontSize: '1.05rem' }}>{variant.name}</h3>
          </div>
          <button onClick={onClose} style={{ background: 'var(--bg-tertiary)', border: 'none', borderRadius: '7px', padding: '0.35rem', cursor: 'pointer' }}><X size={16} color="var(--text-secondary)"/></button>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
          {variant.options?.map((o, i) => (
            <button key={i} onClick={() => onSelect(o.name || '', o.price)}
              style={{ padding: '0.875rem 1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-secondary)', border: '1.5px solid var(--border-color)', borderRadius: '12px', cursor: 'pointer' }}
              onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--accent-primary)')}
              onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border-color)')}
            >
              <span style={{ fontWeight: '800', fontSize: '0.9rem', color: 'var(--text-primary)' }}>{o.name || `Option ${i + 1}`}</span>
              <span style={{ color: 'var(--accent-primary)', fontWeight: '900' }}>{o.price.toLocaleString()} F</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function SimpleOptModal({ product, onSelect, onClose }: { product: Product; onSelect: (name: string, price: number) => void; onClose: () => void }) {
  return (
    <div style={overlay}>
      <div style={{ background: 'white', borderRadius: '20px', padding: '1.75rem', width: '360px', maxWidth: '90vw', boxShadow: 'var(--shadow-lg)', border: '1px solid var(--border-color)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
          <h3 style={{ fontWeight: '900', fontSize: '1.05rem' }}>{product.name}</h3>
          <button onClick={onClose} style={{ background: 'var(--bg-tertiary)', border: 'none', borderRadius: '7px', padding: '0.35rem', cursor: 'pointer' }}><X size={16} color="var(--text-secondary)"/></button>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
          {product.options?.map((o, i) => (
            <button key={i} onClick={() => onSelect(o.name || '', o.price)}
              style={{ padding: '0.875rem 1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-secondary)', border: '1.5px solid var(--border-color)', borderRadius: '12px', cursor: 'pointer' }}
              onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--accent-primary)')}
              onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border-color)')}
            >
              <span style={{ fontWeight: '800', color: 'var(--text-primary)' }}>{o.name || `Option ${i + 1}`}</span>
              <span style={{ color: 'var(--accent-primary)', fontWeight: '900' }}>{o.price.toLocaleString()} F</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ─── Order Modal (shared by Salle & Externe) ───────────── */
function OrderModal({
  title, onClose, menuProducts, onSubmit, submitting,
}: {
  title: string;
  onClose: () => void;
  menuProducts: Product[];
  onSubmit: (cart: CartItem[]) => Promise<void>;
  submitting: boolean;
}) {
  const [noteCart,         setNoteCart]         = useState<CartItem[]>([]);
  const [menuCategory,     setMenuCategory]     = useState('all');
  const [variantProd,      setVariantProd]      = useState<Product | null>(null);
  const [pendingVar,       setPendingVar]       = useState<{ product: Product; variant: ProductVariant } | null>(null);
  const [optionProd,       setOptionProd]       = useState<Product | null>(null);
  const [customPriceProd,  setCustomPriceProd]  = useState<Product | null>(null);
  const [customPrice,      setCustomPrice]      = useState('');

  const addToCart = (id: string, name: string, price: number) =>
    setNoteCart(prev => {
      const ex = prev.find(i => i.id === id);
      if (ex) return prev.map(i => i.id === id ? { ...i, quantity: i.quantity + 1 } : i);
      return [...prev, { id, name, price, quantity: 1 }];
    });

  const handleProductClick = (p: Product) => {
    if (p.variants?.length)     { setVariantProd(p); return; }
    if (p.options?.length)      { setOptionProd(p);  return; }
    // No children and price not set → ask for manual price
    if (!p.price || p.price === 0) { setCustomPriceProd(p); setCustomPrice(''); return; }
    addToCart(p.id, p.name, p.price);
  };

  const [menuSearch, setMenuSearch] = useState('');

  const noteTotal = noteCart.reduce((a, i) => a + i.price * i.quantity, 0);
  const cats = ['all','plat principal','boissons','cave','thé/café','dessert','collation','garnitures','autres'];
  const normalize = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  const shown = menuProducts.filter(p => {
    const matchCat  = menuCategory === 'all' || p.category === menuCategory;
    const matchText = !menuSearch.trim() || normalize(p.name).includes(normalize(menuSearch));
    return matchCat && matchText;
  });

  return (
    <>
      <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(8px)', zIndex: 1500, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.25rem' }}>
        <div style={{ background: 'white', borderRadius: '24px', width: '100%', maxWidth: '960px', height: '82vh', display: 'flex', flexDirection: 'column', boxShadow: 'var(--shadow-lg)', border: '1px solid var(--border-color)', overflow: 'hidden' }}>
          <div style={{ padding: '0.875rem 1.25rem', borderBottom: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', gap: '1rem', flexShrink: 0 }}>
            <h2 style={{ fontSize: '0.95rem', fontWeight: '900', flexShrink: 0 }}>{title}</h2>
            {/* Search input */}
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'var(--bg-secondary)', border: '1.5px solid var(--border-color)', borderRadius: '10px', padding: '0.45rem 0.875rem' }}>
              <Search size={14} color="var(--text-muted)" style={{ flexShrink: 0 }} />
              <input
                value={menuSearch}
                onChange={e => setMenuSearch(e.target.value)}
                placeholder="Rechercher un plat…"
                autoFocus
                style={{ border: 'none', outline: 'none', background: 'transparent', color: 'var(--text-primary)', fontSize: '0.82rem', width: '100%', fontFamily: 'var(--font-body)' }}
              />
              {menuSearch && (
                <button onClick={() => setMenuSearch('')} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 0, display: 'flex' }}><X size={13}/></button>
              )}
            </div>
            <button onClick={onClose} style={{ background: 'var(--bg-tertiary)', border: 'none', borderRadius: '8px', padding: '0.4rem', cursor: 'pointer', flexShrink: 0 }}><X size={18} color="var(--text-secondary)"/></button>
          </div>
          <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
            {/* Products */}
            <div style={{ flex: 1, padding: '1.1rem 1.25rem', overflowY: 'auto', borderRight: '1px solid var(--border-color)' }}>
              <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
                {cats.map(cat => (
                  <button key={cat} onClick={() => setMenuCategory(cat)} style={miniBtn(menuCategory === cat)}>
                    {cat === 'all' ? 'TOUS' : cat}
                  </button>
                ))}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(115px, 1fr))', gap: '0.75rem' }}>
                {shown.map(p => (
                  <div key={p.id} onClick={() => handleProductClick(p)}
                    style={{ padding: '0.75rem', border: '1px solid var(--border-color)', borderRadius: '12px', cursor: 'pointer', textAlign: 'center', background: 'white', transition: 'all 0.15s' }}
                    onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.borderColor = 'var(--accent-primary)'; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.borderColor = 'var(--border-color)'; }}
                  >
                    <div style={{ background: p.image ? `url(${p.image}) center/cover` : 'var(--bg-secondary)', height: '60px', borderRadius: '8px', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.3rem', overflow: 'hidden' }}>
                      {!p.image && '🥘'}
                    </div>
                    <p style={{ fontSize: '0.7rem', fontWeight: '800', lineHeight: 1.2, marginBottom: '0.2rem' }}>{p.name}</p>
                    {(() => {
                      if (p.variants?.length) {
                        const prices = [...new Set(
                          p.variants.flatMap(v => v.options?.length ? v.options.map(o => o.price) : v.price ? [v.price] : [])
                        )].sort((a, b) => a - b);
                        return prices.length
                          ? <p style={{ fontSize: '0.6rem', color: 'var(--accent-primary)', fontWeight: '800', lineHeight: 1.4 }}>{prices.map(pr => pr.toLocaleString()).join(' · ')} F</p>
                          : <p style={{ fontSize: '0.6rem', color: 'var(--text-muted)', fontWeight: '700' }}>{p.variants.length} choix</p>;
                      }
                      if (p.options?.length) {
                        const prices = [...new Set(p.options.map(o => o.price))].sort((a, b) => a - b);
                        return <p style={{ fontSize: '0.6rem', color: 'var(--accent-primary)', fontWeight: '800', lineHeight: 1.4 }}>{prices.map(pr => pr.toLocaleString()).join(' · ')} F</p>;
                      }
                      return <p style={{ fontSize: '0.75rem', fontWeight: '900', color: 'var(--accent-primary)' }}>{p.price.toLocaleString()} F</p>;
                    })()}
                  </div>
                ))}
              </div>
            </div>
            {/* Cart */}
            <div style={{ width: '265px', padding: '1.1rem 1.25rem', display: 'flex', flexDirection: 'column', flexShrink: 0 }}>
              <p style={{ fontSize: '0.6rem', fontWeight: '900', color: 'var(--text-muted)', letterSpacing: '0.1em', marginBottom: '0.875rem' }}>ARTICLES</p>
              <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {noteCart.map(item => (
                  <div key={item.id} style={{ padding: '0.55rem 0.75rem', background: 'var(--bg-secondary)', borderRadius: '9px', border: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.5rem' }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontWeight: '800', fontSize: '0.7rem', lineHeight: 1.2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.quantity}× {item.name}</p>
                      <p style={{ color: 'var(--accent-primary)', fontSize: '0.62rem', fontWeight: '900' }}>{(item.price * item.quantity).toLocaleString()} F</p>
                    </div>
                    <button onClick={() => setNoteCart(c => c.filter(i => i.id !== item.id))} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', flexShrink: 0 }}><X size={13}/></button>
                  </div>
                ))}
                {!noteCart.length && <div style={{ textAlign: 'center', padding: '2rem 0', color: 'var(--text-muted)', fontSize: '0.75rem' }}>Sélectionnez des plats</div>}
              </div>
              <div style={{ paddingTop: '0.875rem', borderTop: '1px solid var(--border-color)', marginTop: '0.875rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.875rem' }}>
                  <span style={{ fontWeight: '800', fontSize: '0.9rem' }}>Total</span>
                  <span style={{ fontWeight: '900', fontSize: '1.05rem', color: 'var(--accent-primary)' }}>{noteTotal.toLocaleString()} F</span>
                </div>
                <button onClick={() => onSubmit(noteCart)} disabled={!noteCart.length || submitting}
                  style={{ width: '100%', padding: '0.875rem', borderRadius: '12px', background: noteCart.length ? 'var(--accent-primary)' : 'var(--bg-tertiary)', color: noteCart.length ? 'white' : 'var(--text-muted)', border: 'none', fontWeight: '800', fontSize: '0.8rem', cursor: noteCart.length ? 'pointer' : 'not-allowed', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', boxShadow: noteCart.length ? 'var(--shadow-glow)' : 'none' }}>
                  <Send size={15}/> {submitting ? 'ENVOI...' : 'ENVOYER EN CUISINE'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Custom price modal ── */}
      {customPriceProd && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.45)', backdropFilter:'blur(6px)', zIndex:2100, display:'flex', alignItems:'center', justifyContent:'center' }}>
          <div style={{ background:'white', borderRadius:'20px', padding:'1.75rem', width:'320px', maxWidth:'90vw', boxShadow:'var(--shadow-lg)', border:'1px solid var(--border-color)' }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'1.1rem' }}>
              <h3 style={{ fontWeight:'900', fontSize:'1rem' }}>{customPriceProd.name}</h3>
              <button onClick={()=>setCustomPriceProd(null)} style={{ background:'var(--bg-tertiary)', border:'none', borderRadius:'7px', padding:'0.35rem', cursor:'pointer' }}><X size={16} color="var(--text-secondary)"/></button>
            </div>
            <p style={{ fontSize:'0.78rem', color:'var(--text-muted)', marginBottom:'1rem' }}>Ce plat n'a pas de prix défini. Entrez le prix manuellement.</p>
            <input
              type="number"
              value={customPrice}
              onChange={e => setCustomPrice(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter' && parseFloat(customPrice) > 0) {
                  addToCart(customPriceProd.id, customPriceProd.name, parseFloat(customPrice));
                  setCustomPriceProd(null); setCustomPrice('');
                }
              }}
              placeholder="Prix en F (ex: 2500)"
              autoFocus
              style={{ width:'100%', padding:'0.875rem 1rem', background:'var(--bg-tertiary)', border:'1.5px solid var(--border-color)', color:'var(--text-primary)', borderRadius:'12px', outline:'none', fontSize:'1.1rem', fontFamily:'var(--font-body)', marginBottom:'1rem', textAlign:'center', fontWeight:'800' }}
            />
            <button
              onClick={() => {
                const price = parseFloat(customPrice);
                if (!price || price <= 0) return;
                addToCart(customPriceProd.id, customPriceProd.name, price);
                setCustomPriceProd(null); setCustomPrice('');
              }}
              disabled={!customPrice || parseFloat(customPrice) <= 0}
              style={{ width:'100%', padding:'0.875rem', borderRadius:'12px', background: customPrice && parseFloat(customPrice) > 0 ? 'var(--accent-primary)' : 'var(--bg-tertiary)', color: customPrice && parseFloat(customPrice) > 0 ? 'white' : 'var(--text-muted)', border:'none', fontWeight:'800', fontSize:'0.875rem', cursor: customPrice && parseFloat(customPrice) > 0 ? 'pointer' : 'not-allowed', boxShadow: customPrice && parseFloat(customPrice) > 0 ? 'var(--shadow-glow)' : 'none', transition:'all 0.15s' }}
            >
              AJOUTER AU PANIER
            </button>
          </div>
        </div>
      )}

      {/* Sub-modals */}
      {variantProd && (
        <VariantModal product={variantProd} onClose={() => setVariantProd(null)} onSelect={v => {
          if (v.options?.length) { setPendingVar({ product: variantProd, variant: v }); setVariantProd(null); }
          else { addToCart(`${variantProd.id}__${v.id}`, `${variantProd.name} — ${v.name}`, v.price ?? variantProd.price); setVariantProd(null); }
        }} />
      )}
      {pendingVar && (
        <DeclModal product={pendingVar.product} variant={pendingVar.variant} onClose={() => setPendingVar(null)} onSelect={(name, price) => {
          const { product: p, variant: v } = pendingVar;
          addToCart(`${p.id}__${v.id}__${name}`, `${p.name} — ${v.name}${name ? ` (${name})` : ''}`, price);
          setPendingVar(null);
        }} />
      )}
      {optionProd && (
        <SimpleOptModal product={optionProd} onClose={() => setOptionProd(null)} onSelect={(name, price) => {
          addToCart(`${optionProd.id}__${name}`, `${optionProd.name}${name ? ` (${name})` : ''}`, price);
          setOptionProd(null);
        }} />
      )}
    </>
  );
}

/* ══════════════════════════════════════════════════════════
   MAIN PAGE
   ══════════════════════════════════════════════════════════ */
export default function TablesPage() {
  // Default 8; localStorage is read in useEffect (SSR-safe — lazy initialisers
  // don't run on the client during hydration in the Next.js App Router).
  const [tablesCount, setTablesCount] = useState(15);

  // Read persisted count after mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(TABLES_KEY);
      if (saved) {
        const n = parseInt(saved, 10);
        if (!isNaN(n) && n >= 15 && n <= 100) setTablesCount(n);
      }
    } catch { /* localStorage unavailable */ }
  }, []);

  // Persist whenever count changes
  useEffect(() => {
    try { localStorage.setItem(TABLES_KEY, String(tablesCount)); } catch { /* ignore */ }
  }, [tablesCount]);

  const [pageTab,      setPageTab]      = useState<'salle' | 'externe'>('salle');
  const [orders,       setOrders]       = useState<any[]>([]);
  const [menuProducts, setMenuProducts] = useState<Product[]>([]);
  const [openTable,    setOpenTable]    = useState<number | null>(null);
  const [externeStep,      setExterneStep]      = useState<null | 'naming' | 'ordering'>(null);
  const [extClientName,    setExtClientName]    = useState('');
  const [extHasLivraison,  setExtHasLivraison]  = useState(false);
  const [extClientPhone,   setExtClientPhone]   = useState('');
  const [extClientAddress, setExtClientAddress] = useState('');
  const [submitting,   setSubmitting]   = useState(false);
  const [movingOrder,  setMovingOrder]  = useState<{ orderId: string; fromTable: number } | null>(null);
  const [showDeliveryModal, setShowDeliveryModal] = useState(false);
  const [deliveryOrder,     setDeliveryOrder]     = useState<any | null>(null);
  const [deliveryForm,      setDeliveryForm]      = useState({ customername: '', contactphone: '', deliveryaddress: '' });

  const [extHistory,   setExtHistory]   = useState<any[]>([]);
  const [showPayModal, setShowPayModal] = useState(false);
  const [payOrder,     setPayOrder]     = useState<any | null>(null);
  const [payMethod,    setPayMethod]    = useState<'cash' | 'wave' | 'orange' | null>(null);
  const [payPhone,     setPayPhone]     = useState('');

  useEffect(() => {
    fetchOrders();
    fetchExtHistory();
    loadProducts();
    const ch = supabase.channel('tables-live')
      .on('postgres_changes', { event: '*', table: 'resto-orders', schema: 'public' }, () => { fetchOrders(); fetchExtHistory(); })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  const productCatMap = useMemo(() => {
    const m: Record<string, string> = {};
    menuProducts.forEach(p => { m[p.id] = p.category || ''; });
    return m;
  }, [menuProducts]);

  const isCaveItem = (item: CartItem) =>
    CAVE_CATS_TABLE.has(productCatMap[item.id.split('__')[0]] || '');

  async function fetchOrders() {
    const { data } = await supabase.from('resto-orders').select('*').neq('status', 'paye');
    if (data) setOrders(data);
  }

  async function fetchExtHistory() {
    const todayStart = new Date(); todayStart.setHours(0,0,0,0);
    const { data } = await supabase.from('resto-orders').select('*')
      .eq('status', 'paye')
      .in('type', ['comptoir', 'external'])
      .gte('created_at', todayStart.toISOString())
      .order('created_at', { ascending: false });
    if (data) setExtHistory(data);
  }

  async function loadProducts() {
    if (menuProducts.length) return;
    const { data } = await supabase.from('resto-products').select('*');
    if (data) setMenuProducts(data);
  }

  // ── Salle order submit — auto-splits cave items from food items ──
  async function submitSalleOrder(cart: CartItem[]) {
    if (!openTable) return;
    setSubmitting(true);

    const caveItems = cart.filter(isCaveItem);
    const foodItems = cart.filter(i => !isCaveItem(i));

    // processSubCart: merge with matching existing order or create new
    const processSubCart = async (items: CartItem[], isCave: boolean) => {
      if (!items.length) return;
      const total = items.reduce((a, i) => a + i.price * i.quantity, 0);
      const now = new Date().toISOString();

      // Find an in-kitchen order for this table of the same type (cave vs food)
      const activeTableOrders = orders.filter(o =>
        o.tablenumber === openTable && ['en_attente', 'en_preparation'].includes(o.status)
      );
      const match = activeTableOrders.find(o => {
        const allCave = o.items?.every((it: any) =>
          CAVE_CATS_TABLE.has(productCatMap[it.id?.split('__')[0]] || '')
        );
        return isCave ? allCave : !allCave;
      });

      if (match) {
        const merged = [...match.items];
        items.forEach(ci => {
          const idx = merged.findIndex((m: any) => m.id === ci.id);
          if (idx > -1) merged[idx].quantity += ci.quantity; else merged.push(ci);
        });
        await supabase.from('resto-orders').update({ items: merged, total: match.total + total }).eq('id', match.id);
      } else {
        await supabase.from('resto-orders').insert([{ type: 'salle', tablenumber: openTable, items, status: 'en_attente', total, created_at: now }]);
      }
    };

    await processSubCart(foodItems, false);
    await processSubCart(caveItems, true);

    setSubmitting(false);
    setOpenTable(null);
    fetchOrders();
  }

  // ── Externe (comptoir) order submit ──
  async function submitExterneOrder(cart: CartItem[]) {
    setSubmitting(true);
    const total = cart.reduce((a, i) => a + i.price * i.quantity, 0);
    const { error } = await supabase.from('resto-orders').insert([{
      type: extHasLivraison ? 'external' : 'comptoir',
      customername: extClientName.trim() || (extHasLivraison ? 'Client' : 'Comptoir'),
      contactphone: extHasLivraison ? extClientPhone : null,
      deliveryaddress: extHasLivraison ? extClientAddress : null,
      items: cart, status: 'en_attente', total,
      created_at: new Date().toISOString(),
    }]);
    setSubmitting(false);
    if (!error) {
      setExterneStep(null);
      setExtClientName(''); setExtHasLivraison(false);
      setExtClientPhone(''); setExtClientAddress('');
      fetchOrders();
    } else alert('Erreur: ' + error.message);
  }

  // ── Status updates ──
  async function encaisser(orderId: string) {
    await supabase.from('resto-orders').update({ status: 'termine' as OrderStatus }).eq('id', orderId);
    fetchOrders();
  }

  async function viderTable(orderId: string) {
    await supabase.from('resto-orders').update({ status: 'paye' as OrderStatus }).eq('id', orderId);
    fetchOrders();
  }

  // Settles ALL orders for a given table number at once (handles split cave/food orders)
  async function clearTable(tableNum: number) {
    const tableOrderIds = orders.filter(o => o.tablenumber === tableNum).map(o => o.id);
    if (!tableOrderIds.length) return;
    await supabase.from('resto-orders').update({ status: 'paye' as OrderStatus }).in('id', tableOrderIds);
    fetchOrders();
  }

  async function liberateTable(orderId: string) {
    if (!confirm('Libérer cette table sans encaisser ? (La commande sera annulée)')) return;
    await supabase.from('resto-orders').update({ status: 'paye' as OrderStatus }).eq('id', orderId);
    fetchOrders();
  }

  const openPayModal = (o: any) => {
    setPayOrder(o);
    setPayMethod(null);
    setPayPhone('');
    setShowPayModal(true);
  };

  const confirmPay = async () => {
    if (!payOrder || !payMethod) return;
    const updates: any = { status: 'paye' as OrderStatus, payment_method: payMethod };
    if (payPhone) updates.contactphone = payPhone;
    await supabase.from('resto-orders').update(updates).eq('id', payOrder.id);
    setShowPayModal(false);
    setPayOrder(null);
    fetchOrders();
    fetchExtHistory();
  };

  const openDeliveryModal = (o: any) => {
    setDeliveryOrder(o);
    setDeliveryForm({ customername: o.customername || '', contactphone: o.contactphone || '', deliveryaddress: o.deliveryaddress || '' });
    setShowDeliveryModal(true);
  };

  const saveDelivery = async (e?: any) => {
    if (e && e.preventDefault) e.preventDefault();
    if (!deliveryOrder) return;
    await supabase.from('resto-orders').update({
      type: 'external',
      customername: deliveryForm.customername,
      contactphone: deliveryForm.contactphone,
      deliveryaddress: deliveryForm.deliveryaddress,
    }).eq('id', deliveryOrder.id);
    setShowDeliveryModal(false);
    setDeliveryOrder(null);
    fetchOrders();
  };

  const sendToDelivery = async (orderId: string) => {
    await supabase.from('resto-orders').update({ status: 'en_livraison' as OrderStatus }).eq('id', orderId);
    fetchOrders();
  };

  async function moveOrder(targetTable: number) {
    if (!movingOrder) return;
    // Check if target already has an active order → merge items
    const targetOrder = orders.find(o => o.tablenumber === targetTable && o.type === 'salle');
    const srcOrder    = orders.find(o => o.id === movingOrder.orderId);
    if (targetOrder && srcOrder) {
      const merged = [...targetOrder.items];
      srcOrder.items.forEach((ci: any) => {
        const idx = merged.findIndex((m: any) => m.id === ci.id);
        if (idx > -1) merged[idx].quantity += ci.quantity;
        else merged.push(ci);
      });
      await supabase.from('resto-orders').update({ items: merged, total: targetOrder.total + srcOrder.total }).eq('id', targetOrder.id);
      await supabase.from('resto-orders').update({ status: 'paye' as OrderStatus }).eq('id', movingOrder.orderId);
    } else {
      await supabase.from('resto-orders').update({ tablenumber: targetTable }).eq('id', movingOrder.orderId);
    }
    setMovingOrder(null);
    fetchOrders();
  }

  // Effective table count = max of user-set count AND highest tablenumber in Supabase orders
  // This ensures tables that have ever had an order always appear, even after localStorage is cleared
  const maxOrderTable  = orders.reduce((m, o) => Math.max(m, o.tablenumber || 0), 0);
  const effectiveCount = Math.max(tablesCount, maxOrderTable);
  const tables = Array.from({ length: effectiveCount }, (_, i) => ({ id: i + 1 }));

  const occupied      = tables.filter(t => orders.some(o => o.tablenumber === t.id)).length;
  const externeOrders    = orders.filter(o => (o.type === 'comptoir' || o.type === 'external') && o.status !== 'en_livraison');
  const extPendingCount  = externeOrders.filter(o => o.status === 'en_attente').length;

  return (
    <RoleGuard allowedRoles={['superAdmin', 'admin', 'manager', 'caisse', 'serveur']}>
    <div className="page-wrap animate-fade-in">

      {/* ── Header ── */}
      <header className="page-header">
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: '900' }}>Tables & Commandes</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginTop: '0.2rem' }}>
            {occupied} table(s) occupée(s) · {tables.length - occupied} libre(s)
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.875rem', alignItems: 'center' }}>
          {pageTab === 'salle' && (
            <button className="btn-primary" onClick={() => { setTablesCount(n => n + 1); }}>
              <Plus size={15} /> TABLE
            </button>
          )}
          {pageTab === 'externe' && (
            <button className="btn-primary" onClick={() => { loadProducts(); setExterneStep('naming'); }}>
              <Plus size={15} /> NOUVELLE COMMANDE
            </button>
          )}
        </div>
      </header>

      {/* ── Page tabs ── */}
      <div style={{ display: 'flex', gap: '0', marginBottom: '1.75rem', background: 'var(--bg-secondary)', borderRadius: '12px', padding: '4px', width: 'fit-content', border: '1px solid var(--border-color)' }}>
        {(['salle', 'externe'] as const).map(id => (
          <button key={id} onClick={() => setPageTab(id)}
            style={{ padding: '0.55rem 1.4rem', borderRadius: '9px', background: pageTab===id?'white':'transparent', color: pageTab===id?'var(--text-primary)':'var(--text-secondary)', border: 'none', fontWeight: '700', fontSize: '0.85rem', cursor: 'pointer', transition: 'all 0.15s', boxShadow: pageTab===id?'var(--shadow-sm)':'none', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            {id === 'salle' ? 'Salle' : 'Externe'}
            {id === 'externe' && extPendingCount > 0 && (
              <span style={{ background: 'var(--accent-primary)', color: 'white', padding: '0.1rem 0.45rem', borderRadius: '100px', fontSize: '0.62rem', fontWeight: '900', lineHeight: 1 }}>
                {extPendingCount}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ══ SALLE TAB ══ */}
      {pageTab === 'salle' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(275px, 1fr))', gap: '1.25rem' }}>
          {tables.map(t => {
            // Prioritise the order that needs the most attention:
            // 1. pret/livre (awaiting payment)  2. en_attente/en_preparation (in kitchen)  3. termine
            const tableOrders = orders.filter(o => o.tablenumber === t.id);
            const activeOrder =
              tableOrders.find(o => ['pret','livre'].includes(o.status)) ||
              tableOrders.find(o => ['en_attente','en_preparation'].includes(o.status)) ||
              tableOrders.find(o => o.status === 'termine') ||
              tableOrders[0];
            const isOccupied  = tableOrders.length > 0;
            const isReady     = ['pret','livre'].includes(activeOrder?.status);  // Kitchen served → Encaisser
            const isSettled   = activeOrder?.status === 'termine';               // Paid → Vider
            const hasNewOrder = tableOrders.some(o => ['en_attente','en_preparation'].includes(o.status))
                             && tableOrders.some(o => ['pret','livre'].includes(o.status));
            // Combined total across all non-paye orders for this table
            const tableTotal  = tableOrders.reduce((sum, o) => sum + (o.total || 0), 0);

            // Total item quantity pending in kitchen for this table
            const pendingItems = orders
              .filter(o => o.tablenumber === t.id && ['en_attente', 'en_preparation'].includes(o.status))
              .reduce((sum, o) => sum + (o.items?.reduce((a: number, i: any) => a + (i.quantity || 1), 0) || 0), 0);

            return (
              <div key={t.id} className="table-card" style={{
                borderTop: `3px solid ${isSettled ? 'var(--accent-success)' : isReady ? 'var(--accent-warning)' : isOccupied ? 'var(--accent-warning)' : 'var(--accent-success)'}`,
                minHeight: '300px', display: 'flex', flexDirection: 'column',
              }}>
                {/* Card header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.875rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                    <div style={{ width: '32px', height: '32px', borderRadius: '9px', background: isOccupied?'rgba(245,158,11,0.10)':'rgba(16,185,129,0.10)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <LayoutGrid size={16} color={isOccupied?'var(--accent-warning)':'var(--accent-success)'} />
                    </div>
                    <h3 style={{ fontSize: '0.95rem', fontWeight: '900' }}>Table {t.id}</h3>
                    {isOccupied && (
                      <span style={{ background: 'rgba(249,115,22,0.10)', color: 'var(--accent-primary)', border: '1px solid rgba(249,115,22,0.20)', padding: '0.12rem 0.55rem', borderRadius: '6px', fontSize: '0.65rem', fontWeight: '900' }}>
                        {tableTotal.toLocaleString()} F
                      </span>
                    )}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    {/* Kitchen pending counter */}
                    {pendingItems > 0 && (
                      <span title="Plats en attente / en préparation" style={{ minWidth: '22px', height: '22px', borderRadius: '50%', background: 'var(--accent-danger)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.62rem', fontWeight: '900', padding: '0 4px' }}>
                        {pendingItems}
                      </span>
                    )}
                    <span className={`badge badge-${isSettled?'success':isReady?'success':isOccupied?'warning':'success'}`}>
                      {isSettled ? 'RÉGLÉE' : isReady ? 'PRÊTE ✓' : isOccupied ? 'OCCUPÉE' : 'LIBRE'}
                    </span>
                  </div>
                </div>

                {isOccupied ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', flex: 1 }}>
                    <div style={{ padding: '0.875rem', background: isSettled?'rgba(16,185,129,0.04)':'var(--bg-secondary)', borderRadius: '12px', border: `1px solid ${isSettled?'rgba(16,185,129,0.15)':'var(--border-color)'}`, flex: 1, display: 'flex', flexDirection: 'column' }}>
                      {/* Header: status icon inline before client name */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem', flexShrink: 0 }}>
                        <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: '0.35rem' }}>
                          {activeOrder.status === 'en_preparation'
                            ? <Flame size={11} color="#F59E0B" />
                            : ['pret','livre','termine'].includes(activeOrder.status)
                            ? <CheckCircle2 size={11} color="#10B981" />
                            : <Clock size={11} color="#9CA3AF" />}
                          <p style={{ fontSize: '0.62rem', fontWeight: '900', color: 'var(--text-muted)', margin: 0 }}>
                            {activeOrder.customername || 'Invité'}
                          </p>
                        </div>
                      </div>

                      {/* Items — each sub-order has its own traffic light header */}
                      <div style={{ overflowY: 'auto', maxHeight: '130px', display: 'flex', flexDirection: 'column', gap: '0.15rem', flex: 1 }}>
                        {tableOrders.map((order, oi) => (
                          <div key={order.id} style={{ marginTop: oi > 0 ? '0.35rem' : 0 }}>
                            {(order.items || []).map((item: any, i: number) => (
                              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.75rem' }}>
                                <span style={{ color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                                  {tableOrders.length > 1 && i === 0 && (
                                    order.status === 'en_preparation'
                                      ? <Flame size={10} color="#F59E0B" style={{ flexShrink: 0 }} />
                                      : ['pret','livre','termine'].includes(order.status)
                                      ? <CheckCircle2 size={10} color="#10B981" style={{ flexShrink: 0 }} />
                                      : <Clock size={10} color="#9CA3AF" style={{ flexShrink: 0 }} />
                                  )}
                                  {tableOrders.length > 1 && i > 0 && <span style={{ display: 'inline-block', width: '10px', flexShrink: 0 }} />}
                                  {item.quantity}× {item.name}
                                </span>
                                <span style={{ fontWeight: '700', flexShrink: 0, marginLeft: '0.5rem' }}>{(item.price * item.quantity).toLocaleString()} F</span>
                              </div>
                            ))}
                          </div>
                        ))}
                      </div>

                      {/* Footer: total + action button(s) on same row */}
                      <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '0.6rem', marginTop: '0.6rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
                        <p style={{ fontSize: '1rem', fontWeight: '900' }}>{tableTotal.toLocaleString()} F</p>
                        <div style={{ display: 'flex', gap: '0.35rem', alignItems: 'center' }}>
                          {isSettled ? (
                            <span style={{ fontSize: '0.68rem', color: 'var(--accent-success)', fontWeight: '800' }}>Règlement OK ✓</span>
                          ) : isReady ? (
                            <>
                              <button onClick={() => encaisser(activeOrder.id)}
                                style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', padding: '0.45rem 0.875rem', background: 'var(--accent-primary)', border: 'none', borderRadius: '8px', color: 'white', fontSize: '0.68rem', fontWeight: '800', cursor: 'pointer', boxShadow: 'var(--shadow-glow)' }}>
                                <CreditCard size={13} /> ENCAISSER
                              </button>
                              <button onClick={() => { loadProducts(); setOpenTable(t.id); }} title="Nouvelle commande"
                                style={{ padding: '0.45rem 0.5rem', background: 'var(--bg-secondary)', border: '1px solid rgba(249,115,22,0.25)', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', color: 'var(--accent-primary)' }}>
                                <Plus size={13} />
                              </button>
                            </>
                          ) : (
                            <button onClick={() => { loadProducts(); setOpenTable(t.id); }} title="Ajouter des articles"
                              style={{ display: 'flex', alignItems: 'center', padding: '0.45rem 0.6rem', background: 'var(--accent-primary)', border: 'none', borderRadius: '8px', color: 'white', cursor: 'pointer', boxShadow: 'var(--shadow-glow)' }}>
                              <Plus size={14} />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* VIDER only when settled */}
                    {isSettled && (
                      <button onClick={() => clearTable(t.id)}
                        style={{ padding: '0.6rem', background: 'rgba(239,68,68,0.07)', color: 'var(--accent-danger)', border: '1px solid rgba(239,68,68,0.18)', borderRadius: '9px', fontSize: '0.7rem', fontWeight: '800', cursor: 'pointer' }}>
                        🗑 VIDER LA TABLE
                      </button>
                    )}

                    {/* ── Secondary actions: move + liberate ── */}
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button
                        onClick={() => setMovingOrder({ orderId: activeOrder.id, fromTable: t.id })}
                        style={{ flex: 1, padding: '0.45rem 0', background: 'transparent', color: 'var(--text-muted)', border: '1px solid var(--border-color)', borderRadius: '8px', fontSize: '0.65rem', fontWeight: '700', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.3rem' }}
                        title="Déplacer la commande vers une autre table"
                      >
                        ↔ Déplacer
                      </button>
                      <button
                        onClick={() => liberateTable(activeOrder.id)}
                        style={{ flex: 1, padding: '0.45rem 0', background: 'transparent', color: 'var(--accent-danger)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '8px', fontSize: '0.65rem', fontWeight: '700', cursor: 'pointer' }}
                        title="Libérer sans encaisser"
                      >
                        ✕ Libérer
                      </button>
                    </div>
                  </div>
                ) : (
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '1.5rem', background: 'rgba(16,185,129,0.04)', borderRadius: '12px', border: '1px dashed rgba(16,185,129,0.18)', gap: '0.75rem' }}>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>Table disponible</p>
                    <button onClick={() => { loadProducts(); setOpenTable(t.id); }}
                      style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', padding: '0.5rem 1.1rem', background: 'var(--accent-primary)', borderRadius: '8px', color: 'white', fontSize: '0.72rem', fontWeight: '800', border: 'none', cursor: 'pointer', boxShadow: 'var(--shadow-glow)' }}>
                      <Plus size={13} /> OUVRIR NOTE
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ══ EXTERNE TAB ══ */}
      {pageTab === 'externe' && (
        <>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
          {/* Active comptoir orders */}
          <div>
            <p style={{ fontSize: '0.65rem', fontWeight: '900', color: 'var(--text-muted)', letterSpacing: '0.1em', marginBottom: '0.875rem' }}>COMMANDES EN COURS</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
              {externeOrders.map(o => {
                const isReady   = o.status === 'pret';
                const isLivre   = o.status === 'livre';
                const isSettled = o.status === 'termine';
                const accentColor = isSettled ? 'var(--text-muted)' : isLivre ? 'var(--accent-success)' : isReady ? 'var(--accent-success)' : 'var(--accent-primary)';
                return (
                  <div key={o.id} style={{ background: 'white', border: '1px solid var(--border-color)', borderRadius: '16px', padding: '1.25rem', boxShadow: 'var(--shadow-sm)', borderTop: `3px solid ${accentColor}` }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                      <div style={{ flex: 1 }}>
                        <p style={{ fontWeight: '900', fontSize: '0.9rem' }}>{o.customername || 'Comptoir'}</p>
                        <p style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>{new Date(o.created_at).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'})} · {o.items?.length} article(s)</p>
                        {o.deliveryaddress && (
                          <div style={{ marginTop: '0.45rem', display: 'flex', gap: '0.5rem', alignItems: 'flex-start' }}>
                            <MapPin size={12} color="var(--accent-primary)" style={{ marginTop: '0.1rem', flexShrink: 0 }} />
                            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', lineHeight: 1.3 }}>
                              <div>{o.deliveryaddress}</div>
                              {o.contactphone && <div style={{ fontWeight: 800, color: 'var(--text-primary)' }}>{o.contactphone}</div>}
                            </div>
                          </div>
                        )}
                      </div>
                      <span className={`badge badge-${isSettled ? 'neutral' : (isReady || isLivre) ? 'success' : 'primary'}`}>
                        {isSettled ? 'Réglé ✓' : isLivre ? (o.deliveryaddress ? 'Livré · Paiement livraison' : 'Livré · À encaisser') : isReady ? (o.deliveryaddress ? 'Prêt · Livraison' : 'Prêt · À régler') : o.status}
                      </span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <p style={{ fontWeight: '900', fontSize: '1rem' }}>{o.total?.toLocaleString()} F</p>
                      <div style={{ display: 'flex', gap: '0.5rem', flexShrink: 0 }}>
                        {/* Truck button — only when not yet dispatched */}
                        {!isLivre && !isSettled && (
                          <button title="Ajouter / modifier livraison" onClick={() => openDeliveryModal(o)}
                            style={{ width: '36px', height: '36px', borderRadius: '8px', background: o.deliveryaddress ? 'rgba(249,115,22,0.08)' : 'var(--bg-secondary)', border: `1px solid ${o.deliveryaddress ? 'rgba(249,115,22,0.25)' : 'var(--border-color)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                            <Truck size={16} color={o.deliveryaddress ? 'var(--accent-primary)' : 'var(--text-secondary)'} />
                          </button>
                        )}
                        {/* pret: send to delivery OR pay at counter */}
                        {isReady && (
                          o.deliveryaddress ? (
                            <button onClick={() => sendToDelivery(o.id)}
                              style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', padding: '0.45rem 0.875rem', background: 'var(--accent-warning)', color: 'white', border: 'none', borderRadius: '8px', fontWeight: '800', fontSize: '0.72rem', cursor: 'pointer' }}>
                              <Truck size={13}/> ENVOYER EN LIVRAISON
                            </button>
                          ) : (
                            <button onClick={() => openPayModal(o)}
                              style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', padding: '0.45rem 0.875rem', background: 'var(--accent-primary)', color: 'white', border: 'none', borderRadius: '8px', fontWeight: '800', fontSize: '0.72rem', cursor: 'pointer', boxShadow: 'var(--shadow-glow)' }}>
                              <CreditCard size={13}/> PAYER
                            </button>
                          )
                        )}
                        {/* livre sans livraison: encaissement ici */}
                        {isLivre && !o.deliveryaddress && (
                          <button onClick={() => openPayModal(o)}
                            style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', padding: '0.45rem 0.875rem', background: 'var(--accent-primary)', color: 'white', border: 'none', borderRadius: '8px', fontWeight: '800', fontSize: '0.72rem', cursor: 'pointer', boxShadow: 'var(--shadow-glow)' }}>
                            <CreditCard size={13}/> PAYER
                          </button>
                        )}
                        {isSettled && (
                          <button onClick={() => viderTable(o.id)}
                            style={{ padding: '0.45rem 0.875rem', background: 'rgba(239,68,68,0.07)', color: 'var(--accent-danger)', border: '1px solid rgba(239,68,68,0.15)', borderRadius: '8px', fontWeight: '800', fontSize: '0.72rem', cursor: 'pointer' }}>
                            Clôturer
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
              {!externeOrders.length && (
                <div style={{ textAlign: 'center', padding: '3rem', background: 'var(--bg-secondary)', borderRadius: '16px', border: '1px dashed var(--border-color)' }}>
                  <ShoppingBag size={32} style={{ opacity: 0.3, marginBottom: '0.5rem' }} />
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Aucune commande externe</p>
                  <button onClick={() => { loadProducts(); setExterneStep('naming'); }}
                    style={{ marginTop: '1rem', padding: '0.5rem 1rem', background: 'var(--accent-primary)', color: 'white', border: 'none', borderRadius: '8px', fontWeight: '800', fontSize: '0.75rem', cursor: 'pointer' }}>
                    + Nouvelle commande
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Quick info panel */}
          <div style={{ background: 'white', border: '1px solid var(--border-color)', borderRadius: '20px', padding: '1.75rem', boxShadow: 'var(--shadow-sm)', height: 'fit-content' }}>
            <h3 style={{ fontWeight: '900', fontSize: '1rem', marginBottom: '0.5rem' }}>Commandes Externes</h3>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.7, marginBottom: '1.5rem' }}>
              Utilisez cet onglet pour les commandes <strong>à emporter</strong>, réseaux sociaux, ou clients ne souhaitant pas s'asseoir. La commande part directement en cuisine et revient ici pour encaissement.
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '1.5rem' }}>
              {[
                { label: 'En cours', value: externeOrders.filter(o=>!['pret','termine'].includes(o.status)).length, color: 'var(--accent-primary)' },
                { label: 'À encaisser', value: externeOrders.filter(o=>o.status==='pret').length, color: 'var(--accent-success)' },
              ].map(s => (
                <div key={s.label} style={{ textAlign: 'center', padding: '1rem', background: 'var(--bg-secondary)', borderRadius: '12px' }}>
                  <p style={{ fontSize: '1.5rem', fontWeight: '900', color: s.color }}>{s.value}</p>
                  <p style={{ fontSize: '0.62rem', color: 'var(--text-muted)', fontWeight: '900', letterSpacing: '0.08em' }}>{s.label.toUpperCase()}</p>
                </div>
              ))}
            </div>
            <button className="btn-primary" style={{ width: '100%', justifyContent: 'center' }} onClick={() => { loadProducts(); setExterneStep('naming'); }}>
              <Plus size={16}/> NOUVELLE COMMANDE EXTERNE
            </button>
          </div>
        </div>

        {/* ── Historique du jour ── */}
        {extHistory.length > 0 && (
          <div className="glass-panel" style={{ overflow: 'hidden', marginTop: '2rem' }}>
            <div style={{ padding: '0.875rem 1.25rem', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <p style={{ fontWeight: '800', fontSize: '0.9rem' }}>
                Commandes clôturées aujourd'hui
                <span style={{ marginLeft: '0.5rem', background: 'var(--bg-tertiary)', color: 'var(--text-secondary)', padding: '0.1rem 0.5rem', borderRadius: '100px', fontSize: '0.7rem', fontWeight: '700' }}>
                  {extHistory.length}
                </span>
              </p>
              <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                CA: <strong style={{ color: 'var(--accent-success)' }}>
                  {extHistory.reduce((a, o) => a + (o.total || 0), 0).toLocaleString()} F
                </strong>
              </span>
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    {['Heure','Client','Type','Articles','Total','Paiement'].map(h => (
                      <th key={h} style={{ padding: '0.6rem 1rem', textAlign: h === 'Total' ? 'right' : 'left', fontWeight: '800', fontSize: '0.62rem', color: 'var(--text-muted)', letterSpacing: '0.08em', textTransform: 'uppercase', borderBottom: '1px solid var(--border-color)', background: 'var(--bg-secondary)', whiteSpace: 'nowrap' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {extHistory.map((o, idx) => (
                    <tr key={o.id}
                      style={{ background: idx % 2 === 0 ? 'white' : 'var(--bg-secondary)' }}
                      onMouseEnter={e => (e.currentTarget.style.background = 'rgba(249,115,22,0.04)')}
                      onMouseLeave={e => (e.currentTarget.style.background = idx % 2 === 0 ? 'white' : 'var(--bg-secondary)')}
                    >
                      <td style={{ padding: '0.7rem 1rem', borderBottom: '1px solid var(--border-color)', fontSize: '0.78rem', fontWeight: '700' }}>
                        {new Date(o.created_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                      </td>
                      <td style={{ padding: '0.7rem 1rem', borderBottom: '1px solid var(--border-color)', fontSize: '0.82rem', fontWeight: '800' }}>
                        {o.customername || '—'}
                        {o.contactphone && <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontWeight: '600' }}>{o.contactphone}</div>}
                      </td>
                      <td style={{ padding: '0.7rem 1rem', borderBottom: '1px solid var(--border-color)' }}>
                        <span style={{ fontSize: '0.65rem', fontWeight: '800', padding: '0.2rem 0.5rem', borderRadius: '6px', background: o.deliveryaddress ? 'rgba(245,158,11,0.1)' : 'rgba(249,115,22,0.08)', color: o.deliveryaddress ? 'var(--accent-warning)' : 'var(--accent-primary)' }}>
                          {o.deliveryaddress ? 'Livraison' : 'Comptoir'}
                        </span>
                      </td>
                      <td style={{ padding: '0.7rem 1rem', borderBottom: '1px solid var(--border-color)', fontSize: '0.78rem', color: 'var(--text-secondary)', maxWidth: '180px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {o.items?.map((i: any) => `${i.quantity}× ${i.name}`).join(', ') || '—'}
                      </td>
                      <td style={{ padding: '0.7rem 1rem', borderBottom: '1px solid var(--border-color)', textAlign: 'right', fontWeight: '900', color: 'var(--accent-success)', whiteSpace: 'nowrap' }}>
                        {(o.total || 0).toLocaleString()} F
                      </td>
                      <td style={{ padding: '0.7rem 1rem', borderBottom: '1px solid var(--border-color)', fontSize: '0.72rem', fontWeight: '800', color: 'var(--text-secondary)' }}>
                        {o.payment_method === 'cash' ? '💵 Espèces' : o.payment_method === 'wave' ? '🌊 Wave' : o.payment_method === 'orange' ? '🟠 OM' : o.payment_method || '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
        </>
      )}

      {/* ── Order modals ── */}
      {openTable !== null && (
        <OrderModal
          title={`Note — Table ${openTable}`}
          onClose={() => setOpenTable(null)}
          menuProducts={menuProducts}
          onSubmit={submitSalleOrder}
          submitting={submitting}
        />
      )}

      {/* ── Externe: step 1 — client name + livraison ── */}
      {externeStep === 'naming' && (
        <div style={overlay}>
          <div style={{ background: 'white', borderRadius: '20px', padding: '1.75rem', width: '420px', maxWidth: '90vw', boxShadow: 'var(--shadow-lg)', border: '1px solid var(--border-color)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <h3 style={{ fontWeight: '900', fontSize: '1rem' }}>Nouvelle commande externe</h3>
              <button onClick={() => { setExterneStep(null); setExtClientName(''); setExtHasLivraison(false); setExtClientPhone(''); setExtClientAddress(''); }}
                style={{ background: 'var(--bg-tertiary)', border: 'none', borderRadius: '7px', padding: '0.35rem', cursor: 'pointer' }}><X size={16} color="var(--text-secondary)"/></button>
            </div>

            {/* Client name */}
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', fontSize: '0.62rem', fontWeight: '900', color: 'var(--text-muted)', letterSpacing: '0.08em', marginBottom: '0.4rem' }}>NOM DU CLIENT</label>
              <input
                value={extClientName} onChange={e => setExtClientName(e.target.value)}
                placeholder="Ex: Mme Koffi, Commande WhatsApp…"
                style={{ width: '100%', padding: '0.75rem 1rem', background: 'var(--bg-tertiary)', border: '1.5px solid var(--border-color)', color: 'var(--text-primary)', borderRadius: '10px', outline: 'none', fontSize: '0.875rem', fontFamily: 'var(--font-body)' }}
                autoFocus
              />
            </div>

            {/* Livraison toggle */}
            <div style={{ marginBottom: extHasLivraison ? '0.875rem' : '1.25rem' }}>
              <button type="button" onClick={() => setExtHasLivraison(h => !h)}
                style={{ width: '100%', padding: '0.75rem 1rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderRadius: '10px', background: extHasLivraison ? 'rgba(249,115,22,0.07)' : 'var(--bg-secondary)', border: `1.5px solid ${extHasLivraison ? 'var(--accent-primary)' : 'var(--border-color)'}`, cursor: 'pointer', transition: 'all 0.15s' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                  <Truck size={16} color={extHasLivraison ? 'var(--accent-primary)' : 'var(--text-muted)'} />
                  <span style={{ fontSize: '0.85rem', fontWeight: '800', color: extHasLivraison ? 'var(--accent-primary)' : 'var(--text-secondary)' }}>
                    {extHasLivraison ? 'Avec livraison' : 'À emporter (sans livraison)'}
                  </span>
                </div>
                {extHasLivraison
                  ? <CheckCircle2 size={18} color="var(--accent-primary)" />
                  : <div style={{ width: '18px', height: '18px', borderRadius: '50%', border: '2px solid var(--border-color)' }} />
                }
              </button>
            </div>

            {/* Livraison fields */}
            {extHasLivraison && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', marginBottom: '1.25rem', padding: '0.875rem', background: 'var(--bg-secondary)', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
                <input
                  value={extClientPhone} onChange={e => setExtClientPhone(e.target.value)}
                  placeholder="Téléphone du client"
                  style={{ width: '100%', padding: '0.7rem 0.875rem', background: 'white', border: '1.5px solid var(--border-color)', color: 'var(--text-primary)', borderRadius: '9px', outline: 'none', fontSize: '0.85rem', fontFamily: 'var(--font-body)' }}
                />
                <textarea
                  value={extClientAddress} onChange={e => setExtClientAddress(e.target.value)}
                  placeholder="Adresse de livraison"
                  rows={2}
                  style={{ width: '100%', padding: '0.7rem 0.875rem', background: 'white', border: '1.5px solid var(--border-color)', color: 'var(--text-primary)', borderRadius: '9px', outline: 'none', fontSize: '0.85rem', fontFamily: 'var(--font-body)', resize: 'none' }}
                />
              </div>
            )}

            <button className="btn-primary" style={{ width: '100%', justifyContent: 'center' }}
              onClick={() => setExterneStep('ordering')}>
              Choisir les plats →
            </button>
          </div>
        </div>
      )}

      {/* ── Externe: step 2 — order modal ── */}
      {externeStep === 'ordering' && (
        <OrderModal
          title={`Commande externe · ${extClientName.trim() || 'Comptoir'}`}
          onClose={() => setExterneStep(null)}
          menuProducts={menuProducts}
          onSubmit={submitExterneOrder}
          submitting={submitting}
        />
      )}

      {/* ── Payment modal ── */}
      {showPayModal && payOrder && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(6px)', zIndex: 2200, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: 'white', borderRadius: '20px', padding: '1.75rem', width: '360px', maxWidth: '90vw', boxShadow: 'var(--shadow-lg)', border: '1px solid var(--border-color)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <div>
                <h3 style={{ fontWeight: '900', fontSize: '1rem' }}>Encaissement</h3>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.1rem' }}>
                  {payOrder.customername || 'Comptoir'} · <strong>{(payOrder.total || 0).toLocaleString()} F</strong>
                </p>
              </div>
              <button onClick={() => setShowPayModal(false)} style={{ background: 'var(--bg-tertiary)', border: 'none', borderRadius: '7px', padding: '0.35rem', cursor: 'pointer' }}>
                <X size={16} color="var(--text-secondary)" />
              </button>
            </div>

            <p style={{ fontSize: '0.62rem', fontWeight: '900', color: 'var(--text-muted)', letterSpacing: '0.08em', marginBottom: '0.6rem' }}>MODE DE PAIEMENT</p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.6rem', marginBottom: '1rem' }}>
              {[
                { id: 'cash',   label: 'Espèces',      emoji: '💵' },
                { id: 'wave',   label: 'Wave',          emoji: '🌊' },
                { id: 'orange', label: 'Orange Money',  emoji: '🟠' },
              ].map(m => (
                <button key={m.id} onClick={() => setPayMethod(m.id as any)}
                  style={{ padding: '0.75rem 0.5rem', borderRadius: '10px', background: payMethod === m.id ? 'rgba(249,115,22,0.1)' : 'var(--bg-secondary)', border: `1.5px solid ${payMethod === m.id ? 'var(--accent-primary)' : 'var(--border-color)'}`, cursor: 'pointer', textAlign: 'center', transition: 'all 0.15s' }}>
                  <div style={{ fontSize: '1.1rem', marginBottom: '0.25rem' }}>{m.emoji}</div>
                  <div style={{ fontSize: '0.6rem', fontWeight: '800', color: payMethod === m.id ? 'var(--accent-primary)' : 'var(--text-secondary)' }}>{m.label}</div>
                </button>
              ))}
            </div>

            {(payMethod === 'wave' || payMethod === 'orange') && (
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '0.62rem', fontWeight: '900', color: 'var(--text-muted)', letterSpacing: '0.08em', marginBottom: '0.4rem' }}>
                  N° DE TÉLÉPHONE <span style={{ fontWeight: '600' }}>(optionnel)</span>
                </label>
                <input value={payPhone} onChange={e => setPayPhone(e.target.value)}
                  placeholder="Ex: 07 00 00 00 00" autoFocus
                  style={{ width: '100%', padding: '0.75rem 1rem', background: 'var(--bg-tertiary)', border: '1.5px solid var(--border-color)', color: 'var(--text-primary)', borderRadius: '10px', outline: 'none', fontSize: '0.875rem', fontFamily: 'var(--font-body)' }} />
              </div>
            )}

            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button onClick={confirmPay} disabled={!payMethod}
                style={{ flex: 1, padding: '0.875rem', background: payMethod ? 'var(--accent-primary)' : 'var(--bg-tertiary)', color: payMethod ? 'white' : 'var(--text-muted)', border: 'none', borderRadius: '10px', fontWeight: '800', fontSize: '0.875rem', cursor: payMethod ? 'pointer' : 'not-allowed', boxShadow: payMethod ? 'var(--shadow-glow)' : 'none', transition: 'all 0.15s' }}>
                CONFIRMER
              </button>
              <button onClick={() => setShowPayModal(false)}
                style={{ padding: '0.875rem 1.1rem', background: 'var(--bg-secondary)', color: 'var(--text-secondary)', border: '1px solid var(--border-color)', borderRadius: '10px', fontWeight: '700', cursor: 'pointer' }}>
                Annuler
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Delivery modal (Externe) ── */}
      {showDeliveryModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 1200, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <form onSubmit={saveDelivery} style={{ background: 'white', borderRadius: '16px', padding: '1.25rem', width: '420px', boxShadow: 'var(--shadow-lg)', border: '1px solid var(--border-color)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: '900' }}><Truck size={18} /> Détails Livraison</h3>
              <button type="button" onClick={() => setShowDeliveryModal(false)} style={{ background: 'transparent', border: 'none', cursor: 'pointer' }}><X size={18} /></button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
              <input placeholder="Nom du client" value={deliveryForm.customername} onChange={e => setDeliveryForm(f => ({ ...f, customername: e.target.value }))} style={{ padding: '0.7rem', borderRadius: '10px', border: '1.5px solid var(--border-color)', background: 'var(--bg-tertiary)' }} required />
              <input placeholder="Téléphone" value={deliveryForm.contactphone} onChange={e => setDeliveryForm(f => ({ ...f, contactphone: e.target.value }))} style={{ padding: '0.7rem', borderRadius: '10px', border: '1.5px solid var(--border-color)', background: 'var(--bg-tertiary)' }} />
              <textarea placeholder="Adresse de livraison" value={deliveryForm.deliveryaddress} onChange={e => setDeliveryForm(f => ({ ...f, deliveryaddress: e.target.value }))} style={{ padding: '0.7rem', borderRadius: '10px', border: '1.5px solid var(--border-color)', background: 'var(--bg-tertiary)' }} rows={3} />
              <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.25rem' }}>
                <button type="submit" style={{ flex: 1, padding: '0.75rem', background: 'var(--accent-primary)', color: 'white', border: 'none', borderRadius: '10px', fontWeight: '800', fontSize: '0.9rem', cursor: 'pointer' }}>Enregistrer</button>
                <button type="button" onClick={() => setShowDeliveryModal(false)} style={{ flex: 1, padding: '0.75rem', background: 'var(--bg-secondary)', color: 'var(--text-secondary)', border: '1px solid var(--border-color)', borderRadius: '10px', fontWeight: '800', fontSize: '0.9rem', cursor: 'pointer' }}>Annuler</button>
              </div>
            </div>
          </form>
        </div>
      )}

      {/* ── Move order modal ── */}
      {movingOrder && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(6px)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: 'white', borderRadius: '20px', padding: '1.75rem', width: '380px', maxWidth: '90vw', boxShadow: 'var(--shadow-lg)', border: '1px solid var(--border-color)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <div>
                <h3 style={{ fontWeight: '900', fontSize: '1rem' }}>Déplacer la commande</h3>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>Table {movingOrder.fromTable} → choisissez la destination</p>
              </div>
              <button onClick={() => setMovingOrder(null)} style={{ background: 'var(--bg-tertiary)', border: 'none', borderRadius: '8px', padding: '0.4rem', cursor: 'pointer' }}>
                <X size={16} color="var(--text-secondary)" />
              </button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.6rem' }}>
              {tables
                .filter(t => t.id !== movingOrder.fromTable)
                .map(t => {
                  const hasOrder = orders.some(o => o.tablenumber === t.id);
                  return (
                    <button key={t.id} onClick={() => moveOrder(t.id)}
                      style={{ padding: '0.875rem 0', borderRadius: '10px', fontWeight: '800', fontSize: '0.9rem', cursor: 'pointer', border: `1.5px solid ${hasOrder ? 'var(--accent-warning)' : 'var(--border-color)'}`, background: hasOrder ? 'rgba(245,158,11,0.06)' : 'var(--bg-secondary)', color: hasOrder ? 'var(--accent-warning)' : 'var(--text-primary)', transition: 'all 0.15s' }}
                      title={hasOrder ? 'Occupée — la commande sera fusionnée' : `Table ${t.id} libre`}
                    >
                      {t.id}
                      {hasOrder && <div style={{ fontSize: '0.5rem', marginTop: '0.1rem', opacity: 0.8 }}>occupée</div>}
                    </button>
                  );
                })}
            </div>
            <p style={{ marginTop: '1rem', fontSize: '0.68rem', color: 'var(--text-muted)', textAlign: 'center' }}>
              Les tables en orange sont déjà occupées — les commandes seront fusionnées.
            </p>
          </div>
        </div>
      )}
    </div>
    </RoleGuard>
  );
}
