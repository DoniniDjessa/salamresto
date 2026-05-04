"use client";
import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Product } from '@/types';

import { Monitor, Trash2, Send, Plus, ChevronRight, X } from 'lucide-react';

function POSContent() {
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedTable, setSelectedTable] = useState<number | null>(null);
  const [cart, setCart] = useState<{ id: string; name: string; price: number; quantity: number }[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOptionProduct, setSelectedOptionProduct] = useState<Product | null>(null);

  const searchParams = useSearchParams();
  const tableParam = searchParams.get('table');

  useEffect(() => {
    fetchProducts();
    if (tableParam) {
        setSelectedTable(parseInt(tableParam));
    }
  }, [tableParam]);

  async function fetchProducts() {
    const { data } = await supabase.from('resto-products').select('*');
    if (data) setProducts(data);
    setLoading(false);
  }

  const addToCart = (product: Product, optionName?: string, optionPrice?: number) => {
    if (!optionName && product.options && product.options.length > 0) {
        setSelectedOptionProduct(product);
        return;
    }

    setCart((prev) => {
      const finalName = optionName ? `${product.name} (${optionName})` : product.name;
      const finalPrice = optionPrice || product.price;
      const uniqueId = optionName ? `${product.id}-${optionName}` : product.id;

      const existing = prev.find(item => item.id === uniqueId);
      if (existing) {
        return prev.map(item => item.id === uniqueId ? { ...item, quantity: item.quantity + 1 } : item);
      }
      return [...prev, { id: uniqueId, name: finalName, price: finalPrice, quantity: 1 }];
    });
    
    setSelectedOptionProduct(null);
  };

  const removeFromCart = (id: string) => {
    setCart((prev) => prev.filter(item => item.id !== id));
  };

  const dispatchOrder = async () => {
    if (!selectedTable) return alert("Veuillez sélectionner une table !");
    if (cart.length === 0) return alert("Le panier est vide.");
    
    setLoading(true);

    // Check for existing active order for this table
    const { data: existingOrders } = await supabase
      .from('resto-orders')
      .select('*')
      .eq('tablenumber', selectedTable)
      .neq('status', 'paye')
      .order('created_at', { ascending: false })
      .limit(1);

    const existingOrder = existingOrders && existingOrders.length > 0 ? existingOrders[0] : null;

    let error;
    if (existingOrder) {
      // Merge items
      const mergedItems = [...existingOrder.items];
      cart.forEach(cartItem => {
        const index = mergedItems.findIndex(item => item.id === cartItem.id);
        if (index > -1) {
          mergedItems[index].quantity += cartItem.quantity;
        } else {
          mergedItems.push(cartItem);
        }
      });

      const newTotal = (existingOrder.total || 0) + total;

      const { error: err } = await supabase
        .from('resto-orders')
        .update({ 
          items: mergedItems, 
          total: newTotal,
          status: 'en_attente'
        })
        .eq('id', existingOrder.id);
      error = err;
    } else {
      // Create new order
      const { error: err } = await supabase.from('resto-orders').insert([{
        type: 'salle',
        tablenumber: selectedTable,
        items: cart,
        status: 'en_attente',
        total: total,
        created_at: new Date().toISOString()
      }]);
      error = err;
    }

    setLoading(false);

    if (!error) {
      alert(existingOrder ? `Commande Table ${selectedTable} mise à jour !` : `Commande Table ${selectedTable} envoyée !`);
      setCart([]);
      setSelectedTable(null);
    } else {
      alert("Erreur: " + error.message);
    }
  };

  const total = cart.reduce((acc, item) => acc + (item.price * item.quantity), 0);

  return (
    <div style={{ display: 'flex', height: 'calc(100vh)', background: 'var(--bg-primary)' }} className="animate-fade-in">
      
      {/* Table Selector (Sub-sidebar) */}
      <aside style={{ width: '120px', borderRight: '1px solid var(--border-color)', padding: '1.5rem 1rem', background: 'var(--bg-secondary)', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: '800', textAlign: 'center', marginBottom: '0.5rem' }}>TABLES</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
          {[1, 2, 3, 4, 5, 6, 7, 8].map(table => (
            <button
              key={table}
              onClick={() => setSelectedTable(table)}
              style={{
                height: '50px',
                borderRadius: '12px',
                background: selectedTable === table ? 'var(--accent-primary)' : 'var(--bg-tertiary)',
                color: 'white',
                border: 'none',
                fontWeight: '800',
                fontSize: '1rem',
                cursor: 'pointer',
                boxShadow: selectedTable === table ? 'var(--shadow-glow)' : 'none',
                transition: 'all 0.2s'
              }}
            >
              {table}
            </button>
          ))}
          {selectedTable && (
            <button 
                onClick={() => setSelectedTable(null)}
                style={{ padding: '0.5rem', background: 'transparent', border: '1px solid #EF4444', color: '#EF4444', borderRadius: '10px', fontSize: '0.65rem', fontWeight: '800', cursor: 'pointer' }}
            >
                ANNULER
            </button>
          )}
        </div>
      </aside>

      {/* Product Menu */}
      <main style={{ flex: 1, padding: '2rem', overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
        <header style={{ marginBottom: '2.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
                <h1 style={{ fontSize: '1.8rem', fontWeight: '900' }}>Enregistrements</h1>
                <p style={{ color: 'var(--text-secondary)' }}>{selectedTable ? `Table ${selectedTable} - Prise de commande` : "Sélectionnez une table pour enregistrer"}</p>
            </div>
            <div className="glass-panel" style={{ padding: '0.6rem 1rem', display: 'flex', alignItems: 'center', gap: '0.8rem', background: 'var(--bg-secondary)' }}>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>RECHERCHE</span>
                <input placeholder="Code plat..." style={{ background: 'transparent', border: 'none', color: 'white', outline: 'none', width: '150px' }} />
            </div>
        </header>

        {loading && products.length === 0 ? <p>Mise à jour du menu...</p> : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '1.2rem' }}>
            {products.map(p => (
              <div 
                key={p.id} 
                className="glass-panel hover-scale"
                style={{ padding: '1rem', cursor: 'pointer', textAlign: 'center', background: 'var(--bg-secondary)', border: selectedOptionProduct?.id === p.id ? '1px solid var(--accent-primary)' : '1px solid transparent' }}
                onClick={() => addToCart(p)}
              >
                <div style={{ 
                    background: p.image ? `url(${p.image}) center/cover` : 'var(--bg-tertiary)', 
                    height: '100px', 
                    borderRadius: '16px', 
                    marginBottom: '0.8rem', 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center', 
                    fontSize: '2rem',
                    overflow: 'hidden'
                }}>
                    {!p.image && '🥘'}
                </div>
                <h3 style={{ fontSize: '0.9rem', fontWeight: '800', marginBottom: '0.3rem' }}>{p.name}</h3>
                <p style={{ color: 'var(--accent-primary)', fontWeight: '900', fontSize: '1rem' }}>
                    {p.price.toLocaleString()} F
                </p>
                {p.options && p.options.length > 0 && (
                    <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontWeight: '800' }}>{p.options.length} OPTIONS</span>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Options Modal */}
        {selectedOptionProduct && (
            <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(10px)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div className="glass-panel" style={{ padding: '2.5rem', width: '400px', background: 'var(--bg-secondary)' }}>
                    <h3 style={{ marginBottom: '1.5rem', fontSize: '1.4rem', fontWeight: '900' }}>Options : {selectedOptionProduct.name}</h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '2.5rem' }}>
                        {selectedOptionProduct.options?.map((opt, i) => (
                            <button 
                                key={i}
                                className="glass-panel hover-scale"
                                onClick={() => addToCart(selectedOptionProduct, opt.name, opt.price)}
                                style={{ padding: '1.2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-tertiary)', border: 'none', color: 'white', cursor: 'pointer', borderRadius: '16px' }}
                            >
                                <span style={{ fontWeight: '800' }}>{opt.name}</span>
                                <span style={{ color: 'var(--accent-primary)', fontWeight: '900' }}>{opt.price.toLocaleString()} F</span>
                            </button>
                        ))}
                    </div>
                    <button className="btn-secondary" style={{ width: '100%', padding: '1rem' }} onClick={() => setSelectedOptionProduct(null)}>ANNULER</button>
                </div>
            </div>
        )}
      </main>

      {/* Order Cart Drawer */}
      <aside style={{ width: '380px', borderLeft: '1px solid var(--border-color)', padding: '2rem', display: 'flex', flexDirection: 'column', background: 'var(--bg-secondary)' }}>
        <h2 style={{ fontSize: '1.4rem', fontWeight: '800', marginBottom: '2rem', display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
            <Monitor size={24} color="var(--accent-primary)" /> Ticket de Table
        </h2>
        
        <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {cart.map(item => (
            <div key={item.id} className="glass-panel" style={{ padding: '1rem', background: 'var(--bg-tertiary)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span style={{ fontWeight: '800', fontSize: '0.9rem' }}>{item.quantity}x {item.name}</span>
                <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>{item.price.toLocaleString()} F / unité</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <span style={{ fontWeight: '900', color: 'var(--accent-primary)' }}>{(item.price * item.quantity).toLocaleString()} F</span>
                <button onClick={() => removeFromCart(item.id)} style={{ background: 'transparent', border: 'none', color: '#EF4444', cursor: 'pointer' }}><Trash2 size={18} /></button>
              </div>
            </div>
          ))}
          {cart.length === 0 && (
            <div style={{ textAlign: 'center', marginTop: '4rem', opacity: 0.3 }}>
                <Plus size={48} style={{ marginBottom: '1rem' }} />
                <p>Votre panier est vide</p>
            </div>
          )}
        </div>

        <div style={{ paddingTop: '2rem', borderTop: '1px dashed var(--border-color)', marginTop: '2rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2rem' }}>
            <span style={{ fontWeight: '800', fontSize: '1.2rem' }}>Total</span>
            <span style={{ fontSize: '1.8rem', fontWeight: '900', color: 'var(--accent-primary)' }}>{total.toLocaleString()} F</span>
          </div>
          <button className="hover-scale" style={{ width: '100%', padding: '1.4rem', borderRadius: '20px', background: 'var(--accent-primary)', color: 'white', border: 'none', fontWeight: '800', fontSize: '1.1rem', boxShadow: 'var(--shadow-glow)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '1rem' }} onClick={dispatchOrder} disabled={loading}>
            <Send size={20} /> {loading ? 'TRAITEMENT...' : 'ENVOYER EN CUISINE'}
          </button>
        </div>
      </aside>
    </div>
  );
}

export default function POSPage() {
    return (
        <Suspense fallback={<div style={{ padding: '2rem', color: 'white' }}>Chargement du terminal...</div>}>
            <POSContent />
        </Suspense>
    );
}
