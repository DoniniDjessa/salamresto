"use client";
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Product, ProductVariant } from '@/types';
import { ShoppingBag, Truck, CreditCard, Plus, X, ChevronRight } from 'lucide-react';

const inp: React.CSSProperties = {
  width: '100%',
  padding: '0.875rem 1rem',
  background: 'var(--bg-tertiary)',
  border: '1.5px solid var(--border-color)',
  color: 'var(--text-primary)',
  borderRadius: '12px',
  outline: 'none',
  fontFamily: 'var(--font-body)',
  fontSize: '0.875rem',
};

interface CartItem { id: string; name: string; price: number; quantity: number; }

export default function ExternalOrderPage() {
  const [products,      setProducts]      = useState<Product[]>([]);
  const [cart,          setCart]          = useState<CartItem[]>([]);
  const [customer,      setCustomer]      = useState({ name: '', phone: '', address: '' });
  const [paymentMethod, setPaymentMethod] = useState<'online'|'delivery'>('delivery');
  const [loading,       setLoading]       = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('all');

  // 3-level selection (same flow as POS)
  const [variantProduct,   setVariantProduct]   = useState<Product|null>(null);
  const [pendingVariant,   setPendingVariant]   = useState<{product:Product; variant:ProductVariant}|null>(null);
  const [optionProduct,    setOptionProduct]    = useState<Product|null>(null);

  useEffect(() => { fetchProducts(); }, []);

  async function fetchProducts() {
    const { data } = await supabase.from('resto-products').select('*');
    if (data) setProducts(data.filter((p: any) => p.available !== false));
    setLoading(false);
  }

  const addToCart = (id: string, name: string, price: number) => {
    setCart(prev => {
      const ex = prev.find(i => i.id === id);
      if (ex) return prev.map(i => i.id === id ? { ...i, quantity: i.quantity + 1 } : i);
      return [...prev, { id, name, price, quantity: 1 }];
    });
  };

  const handleProductClick = (p: Product) => {
    if (p.variants && p.variants.length > 0) setVariantProduct(p);
    else if (p.options && p.options.length > 0) setOptionProduct(p);
    else addToCart(p.id, p.name, p.price);
  };

  const handleVariantClick = (v: ProductVariant) => {
    if (!variantProduct) return;
    if (v.options && v.options.length > 0) {
      setPendingVariant({ product: variantProduct, variant: v });
      setVariantProduct(null);
    } else {
      addToCart(`${variantProduct.id}__${v.id}`, `${variantProduct.name} — ${v.name}`, v.price ?? variantProduct.price);
      setVariantProduct(null);
    }
  };

  const dispatchOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (cart.length === 0) return alert('Le panier est vide.');
    const { error } = await supabase.from('resto-orders').insert([{
      type: 'external', customername: customer.name, contactphone: customer.phone,
      deliveryaddress: customer.address,
      items: cart, status: 'en_attente',
      total, payment_method: paymentMethod, created_at: new Date().toISOString(),
    }]);
    if (!error) {
      alert('Commande envoyée !');
      setCart([]); setCustomer({ name: '', phone: '', address: '' });
    } else alert('Erreur: ' + error.message);
  };

  const total = cart.reduce((a, i) => a + i.price * i.quantity, 0);
  const cats  = ['all','plat principal','boissons','dessert','collation','garnitures','cave','thé/café','autres'];
  const shown = products.filter(p => selectedCategory === 'all' || p.category === selectedCategory);

  const modalBase: React.CSSProperties = {
    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.35)', backdropFilter: 'blur(6px)',
    zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center',
  };
  const modalCard: React.CSSProperties = {
    background: 'white', borderRadius: '24px', padding: '2rem', width: '400px', maxWidth: '90vw',
    boxShadow: 'var(--shadow-lg)', border: '1px solid var(--border-color)',
  };
  const optBtn = (active = false): React.CSSProperties => ({
    padding: '1rem 1.1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    background: active ? 'rgba(249,115,22,0.06)' : 'var(--bg-secondary)',
    border: `1.5px solid ${active ? 'var(--accent-primary)' : 'var(--border-color)'}`,
    borderRadius: '12px', cursor: 'pointer', transition: 'all 0.15s', color: 'var(--text-primary)',
  });

  return (
    <div className="page-wrap animate-fade-in" style={{ display: 'flex', gap: '2rem' }}>

      {/* Product Catalog */}
      <div style={{ flex: 1.7 }}>
        <header style={{ marginBottom: '1.5rem' }}>
          <h1 style={{ fontSize: '1.75rem', fontWeight: '900', marginBottom: '0.2rem', display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <ShoppingBag size={26} color="var(--accent-primary)" /> Commander en Ligne
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Faites-vous livrer vos plats préférés en quelques clics</p>
        </header>

        {/* Category filter */}
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1.25rem' }}>
          {cats.map(cat => (
            <button key={cat} onClick={() => setSelectedCategory(cat)}
              style={{ padding: '0.45rem 0.875rem', borderRadius: '8px', background: selectedCategory === cat ? 'var(--accent-primary)' : 'transparent', color: selectedCategory === cat ? 'white' : 'var(--text-secondary)', border: selectedCategory === cat ? 'none' : '1.5px solid var(--border-color)', fontWeight: '700', fontSize: '0.72rem', cursor: 'pointer', transition: 'all 0.15s', textTransform: 'uppercase' }}>
              {cat === 'all' ? 'TOUS' : cat}
            </button>
          ))}
        </div>

        {loading ? <p style={{ color: 'var(--text-muted)' }}>Chargement du menu...</p> : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(190px,1fr))', gap: '1rem' }}>
            {shown.map(p => (
              <div key={p.id} className="glass-panel hover-scale"
                style={{ padding: '1rem', cursor: 'pointer', textAlign: 'center', display: 'flex', flexDirection: 'column' }}
                onClick={() => handleProductClick(p)}
              >
                <div style={{ background: p.image ? `url(${p.image}) center/cover` : 'var(--bg-secondary)', height: '130px', borderRadius: '14px', marginBottom: '0.875rem', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2rem', overflow: 'hidden' }}>
                  {!p.image && '🥘'}
                </div>
                <h3 style={{ fontSize: '0.875rem', fontWeight: '800', marginBottom: '0.2rem', lineHeight: 1.3 }}>{p.name}</h3>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.62rem', marginBottom: '0.75rem', fontWeight: '700', letterSpacing: '0.05em', textTransform: 'uppercase' }}>{p.category}</p>
                <div style={{ marginTop: 'auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-secondary)', padding: '0.5rem 0.75rem', borderRadius: '10px', border: '1px solid var(--border-color)' }}>
                  {p.variants && p.variants.length > 0
                    ? <span style={{ color: 'var(--accent-primary)', fontWeight: '800', fontSize: '0.78rem' }}>{p.variants.length} option(s)</span>
                    : <span style={{ color: 'var(--accent-primary)', fontWeight: '900', fontSize: '0.9rem' }}>{p.price.toLocaleString()} F</span>
                  }
                  <Plus size={15} color="var(--accent-primary)" />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Cart / Checkout */}
      <div style={{ width: '320px', flexShrink: 0 }}>
        <div className="glass-panel" style={{ padding: '1.5rem', position: 'sticky', top: '2rem' }}>
          <h2 style={{ fontSize: '1rem', fontWeight: '900', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            Votre Panier
            <span style={{ background: 'var(--accent-primary)', color: 'white', padding: '0.15rem 0.5rem', borderRadius: '100px', fontSize: '0.7rem', fontWeight: '900' }}>{cart.length}</span>
          </h2>

          {cart.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '2.5rem 0', color: 'var(--text-muted)' }}>
              <ShoppingBag size={36} style={{ opacity: 0.3, marginBottom: '0.5rem' }} />
              <p style={{ fontSize: '0.8rem' }}>Panier vide</p>
            </div>
          ) : (
            <div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', marginBottom: '1.25rem', maxHeight: '200px', overflowY: 'auto' }}>
                {cart.map(item => (
                  <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <p style={{ fontWeight: '800', fontSize: '0.82rem', lineHeight: 1.3 }}>{item.quantity}× {item.name}</p>
                      <p style={{ color: 'var(--text-muted)', fontSize: '0.68rem' }}>{item.price.toLocaleString()} F/u</p>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span style={{ fontWeight: '900', color: 'var(--accent-primary)', fontSize: '0.875rem' }}>{(item.price * item.quantity).toLocaleString()} F</span>
                      <button onClick={() => setCart(c => c.filter(i => i.id !== item.id))} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '2px' }}><X size={13}/></button>
                    </div>
                  </div>
                ))}
              </div>

              <div style={{ padding: '0.875rem 0', borderTop: '1.5px dashed var(--border-color)', borderBottom: '1.5px dashed var(--border-color)', marginBottom: '1.25rem', display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontWeight: '800', fontSize: '0.95rem' }}>Total</span>
                <span style={{ fontWeight: '900', fontSize: '1.25rem', color: 'var(--accent-primary)' }}>{total.toLocaleString()} F</span>
              </div>

              <form onSubmit={dispatchOrder} style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
                {/* Payment */}
                <div>
                  <label style={{ fontSize: '0.65rem', fontWeight: '900', color: 'var(--text-muted)', letterSpacing: '0.08em', display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.5rem' }}>
                    <CreditCard size={12}/> MODE DE PAIEMENT
                  </label>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                    <button type="button" onClick={() => setPaymentMethod('online')}
                      style={{ padding: '0.65rem', borderRadius: '10px', background: paymentMethod === 'online' ? 'var(--accent-primary)' : 'var(--bg-tertiary)', color: paymentMethod === 'online' ? 'white' : 'var(--text-secondary)', border: paymentMethod === 'online' ? 'none' : '1.5px solid var(--border-color)', fontSize: '0.7rem', fontWeight: '800', cursor: 'pointer', transition: 'all 0.15s' }}>
                      Payer en ligne
                    </button>
                    <button type="button" onClick={() => setPaymentMethod('delivery')}
                      style={{ padding: '0.65rem', borderRadius: '10px', background: paymentMethod === 'delivery' ? 'var(--accent-primary)' : 'var(--bg-tertiary)', color: paymentMethod === 'delivery' ? 'white' : 'var(--text-secondary)', border: paymentMethod === 'delivery' ? 'none' : '1.5px solid var(--border-color)', cursor: 'pointer', transition: 'all 0.15s', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.15rem' }}>
                      <span style={{ fontSize: '0.7rem', fontWeight: '800' }}>Retrait en boutique</span>
                      <span style={{ fontSize: '0.58rem', fontWeight: '600', opacity: 0.8 }}>Riviera CIAD Rue F44, 1099</span>
                    </button>
                  </div>
                </div>

                {/* Customer info */}
                <div>
                  <label style={{ fontSize: '0.65rem', fontWeight: '900', color: 'var(--text-muted)', letterSpacing: '0.08em', display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.5rem' }}>
                    <Truck size={12}/> INFOS DE LIVRAISON
                  </label>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    <input required style={inp} placeholder="Nom complet" value={customer.name} onChange={e => setCustomer({...customer, name: e.target.value})} />
                    <input required type="tel" style={inp} placeholder="Téléphone" value={customer.phone} onChange={e => setCustomer({...customer, phone: e.target.value})} />
                    <textarea required rows={2} style={{ ...inp, resize: 'none' }} placeholder="Adresse de livraison" value={customer.address} onChange={e => setCustomer({...customer, address: e.target.value})} />
                  </div>
                </div>

                <button type="submit" className="btn-primary" style={{ justifyContent: 'center', padding: '1rem' }}>
                  COMMANDER MAINTENANT
                </button>
              </form>
            </div>
          )}
        </div>
      </div>

      {/* Variant modal */}
      {variantProduct && (
        <div style={modalBase}>
          <div style={modalCard}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: '900' }}>{variantProduct.name}</h3>
              <button onClick={() => setVariantProduct(null)} style={{ background: 'var(--bg-tertiary)', border: 'none', borderRadius: '8px', padding: '0.4rem', cursor: 'pointer' }}><X size={16} color="var(--text-secondary)"/></button>
            </div>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.78rem', marginBottom: '1rem' }}>Choisissez un sous-plat :</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
              {variantProduct.variants?.map(v => (
                <button key={v.id} style={optBtn()} onClick={() => handleVariantClick(v)}>
                  <span style={{ fontWeight: '800', fontSize: '0.875rem' }}>{v.name}</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    {v.options?.length ? <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{v.options.length} taille(s)</span> : v.price ? <span style={{ color: 'var(--accent-primary)', fontWeight: '900' }}>{v.price.toLocaleString()} F</span> : null}
                    <ChevronRight size={14} color="var(--text-muted)"/>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Size modal */}
      {pendingVariant && (
        <div style={modalBase}>
          <div style={modalCard}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <div>
                <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: '700' }}>{pendingVariant.product.name}</p>
                <h3 style={{ fontSize: '1.1rem', fontWeight: '900' }}>{pendingVariant.variant.name}</h3>
              </div>
              <button onClick={() => setPendingVariant(null)} style={{ background: 'var(--bg-tertiary)', border: 'none', borderRadius: '8px', padding: '0.4rem', cursor: 'pointer' }}><X size={16} color="var(--text-secondary)"/></button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
              {pendingVariant.variant.options?.map((o, i) => (
                <button key={i} style={optBtn()} onClick={() => {
                  const { product: p, variant: v } = pendingVariant;
                  addToCart(`${p.id}__${v.id}__${o.name}`, `${p.name} — ${v.name} (${o.name})`, o.price);
                  setPendingVariant(null);
                }}>
                  <span style={{ fontWeight: '800', fontSize: '0.875rem' }}>{o.name}</span>
                  <span style={{ color: 'var(--accent-primary)', fontWeight: '900', fontSize: '0.95rem' }}>{o.price.toLocaleString()} F</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Simple option modal */}
      {optionProduct && (
        <div style={modalBase}>
          <div style={modalCard}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: '900' }}>{optionProduct.name}</h3>
              <button onClick={() => setOptionProduct(null)} style={{ background: 'var(--bg-tertiary)', border: 'none', borderRadius: '8px', padding: '0.4rem', cursor: 'pointer' }}><X size={16} color="var(--text-secondary)"/></button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
              {optionProduct.options?.map((o, i) => (
                <button key={i} style={optBtn()} onClick={() => {
                  addToCart(`${optionProduct.id}__${o.name}`, `${optionProduct.name} (${o.name})`, o.price);
                  setOptionProduct(null);
                }}>
                  <span style={{ fontWeight: '800', fontSize: '0.875rem' }}>{o.name}</span>
                  <span style={{ color: 'var(--accent-primary)', fontWeight: '900' }}>{o.price.toLocaleString()} F</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
