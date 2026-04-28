"use client";
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { Product } from '@/types';

export default function POSPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedTable, setSelectedTable] = useState<number | null>(null);
  const [cart, setCart] = useState<{ id: string; name: string; price: number; quantity: number }[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOptionProduct, setSelectedOptionProduct] = useState<Product | null>(null);

  useEffect(() => {
    fetchProducts();
  }, []);

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
    
    setSelectedOptionProduct(null); // Close modal if open
  };

  const removeFromCart = (id: string) => {
    setCart((prev) => prev.filter(item => item.id !== id));
  };

  const dispatchOrder = async () => {
    if (!selectedTable) return alert("Veuillez sélectionner une table !");
    if (cart.length === 0) return alert("Le panier est vide.");
    
    const { error } = await supabase.from('resto-orders').insert([{
      type: 'salle',
      tablenumber: selectedTable,
      items: cart,
      status: 'en_attente',
      total: total,
      created_at: new Date().toISOString()
    }]);

    if (!error) {
      alert(`Commande Table ${selectedTable} envoyée !`);
      setCart([]);
      setSelectedTable(null);
    } else {
      alert("Erreur: " + error.message);
    }
  };

  const total = cart.reduce((acc, item) => acc + (item.price * item.quantity), 0);

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden' }} className="animate-fade-in">
      {/* Tables Selection sidebar */}
      <aside style={{ width: '280px', borderRight: '1px solid var(--border-color)', padding: '1.5rem', background: 'var(--bg-secondary)', display: 'flex', flexDirection: 'column' }}>
        <Link href="/" style={{ color: 'var(--accent-secondary)', fontWeight: '600', marginBottom: '2rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span>←</span> Accueil
        </Link>
        <h2 style={{ marginBottom: '1.5rem', fontSize: '1.2rem' }}>Tables <span style={{ color: 'var(--text-muted)' }}>Salles</span></h2>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.8rem' }}>
          {[1, 2, 3, 4, 5, 6, 7, 8].map(table => (
            <button
              key={table}
              onClick={() => setSelectedTable(table)}
              style={{
                padding: '1.2rem',
                borderRadius: 'var(--border-radius-md)',
                background: selectedTable === table ? 'var(--accent-secondary)' : 'var(--bg-tertiary)',
                color: selectedTable === table ? 'white' : 'var(--text-primary)',
                border: '1px solid var(--border-color)',
                fontWeight: '700',
                transition: 'all 0.2s'
              }}
            >
              T{table}
            </button>
          ))}
        </div>
      </aside>

      {/* Main Menu Area */}
      <main style={{ flex: 1, padding: '2rem', display: 'flex', flexDirection: 'column', background: 'var(--bg-primary)' }}>
        <header style={{ marginBottom: '2rem' }}>
             <h1 style={{ fontSize: '2rem' }}>Menu Resto {selectedTable && <span style={{ color: 'var(--accent-secondary)' }}>— Table {selectedTable}</span>}</h1>
        </header>

        {loading ? <p>Chargement du menu...</p> : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '1.5rem', overflowY: 'auto', paddingBottom: '2rem' }}>
            {products.map(p => (
              <div 
                key={p.id} 
                className="glass-panel"
                style={{ padding: '1.2rem', cursor: 'pointer', textAlign: 'center' }}
                onClick={() => addToCart(p)}
              >
                <div style={{ background: p.image ? `url(${p.image}) center/cover` : 'var(--bg-tertiary)', padding: '1rem', borderRadius: '12px', marginBottom: '0.8rem', fontSize: '1.5rem', height: '100px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {!p.image && '🥘'}
                </div>
                <h3 style={{ fontSize: '0.95rem', marginBottom: '0.4rem' }}>{p.name}</h3>
                <p style={{ color: 'var(--accent-primary)', fontWeight: '800' }}>
                    {p.options && p.options.length > 0 ? `Dès ${Math.min(...p.options.map(o => o.price)).toLocaleString()}` : p.price.toLocaleString()} F
                </p>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Product Options Modal */}
      {selectedOptionProduct && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div className="glass-panel animate-fade-in" style={{ padding: '2rem', background: '#fff', width: '90%', maxWidth: '400px', borderRadius: '16px' }}>
                <h3 style={{ marginBottom: '1rem', fontSize: '1.5rem' }}>Choisir une option</h3>
                <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem' }}>{selectedOptionProduct.name}</p>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {selectedOptionProduct.options?.map((opt, i) => (
                        <button 
                            key={i} 
                            style={{ display: 'flex', justifyContent: 'space-between', padding: '1rem', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '8px', cursor: 'pointer', transition: 'all 0.2s', fontWeight: 'bold' }}
                            onMouseOver={(e) => e.currentTarget.style.borderColor = 'var(--accent-primary)'}
                            onMouseOut={(e) => e.currentTarget.style.borderColor = 'var(--border-color)'}
                            onClick={() => addToCart(selectedOptionProduct, opt.name, opt.price)}
                        >
                            <span>{opt.name}</span>
                            <span style={{ color: 'var(--accent-primary)' }}>{opt.price.toLocaleString()} F</span>
                        </button>
                    ))}
                </div>
                
                <button 
                    className="btn-secondary" 
                    style={{ marginTop: '2rem', width: '100%' }}
                    onClick={() => setSelectedOptionProduct(null)}
                >
                    Annuler
                </button>
            </div>
        </div>
      )}

      {/* Cart Drawer */}
      <aside style={{ width: '350px', borderLeft: '1px solid var(--border-color)', padding: '1.5rem', display: 'flex', flexDirection: 'column', background: 'var(--bg-secondary)', boxShadow: '-10px 0 30px rgba(0,0,0,0.02)' }}>
        <h2 style={{ marginBottom: '1.5rem' }}>Ticket Actuel</h2>
        <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
          {cart.map(item => (
            <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem', background: 'var(--bg-tertiary)', borderRadius: '12px' }}>
              <div>
                <span style={{ fontWeight: '600', fontSize: '0.9rem' }}>{item.quantity}x {item.name}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
                <span style={{ fontWeight: '700' }}>{(item.price * item.quantity).toLocaleString()} F</span>
                <button 
                  onClick={() => removeFromCart(item.id)}
                  style={{ background: 'transparent', border: 'none', color: 'var(--accent-danger)', cursor: 'pointer', fontSize: '1rem' }}
                  title="Retirer"
                >
                  ✖
                </button>
              </div>
            </div>
          ))}
          {cart.length === 0 && <p style={{ textAlign: 'center', color: 'var(--text-muted)', marginTop: '2rem' }}>Sélectionnez des articles</p>}
        </div>

        <div style={{ paddingTop: '1.5rem', borderTop: '1px solid var(--border-color)', marginTop: 'auto' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem', fontSize: '1.5rem', fontWeight: '800' }}>
            <span>Total</span>
            <span style={{ color: 'var(--accent-primary)' }}>{total.toLocaleString()} F</span>
          </div>
          <button className="btn-primary" style={{ width: '100%', padding: '1.2rem', fontSize: '1rem' }} onClick={dispatchOrder}>
            Envoyer en Cuisine
          </button>
        </div>
      </aside>
    </div>
  );
}
