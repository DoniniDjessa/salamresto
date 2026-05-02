"use client";
import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Product } from '@/types';

export default function TableOrderPage() {
  const { id: tableId } = useParams();
  const [products, setProducts] = useState<Product[]>([]);
  const [cart, setCart] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [calling, setCalling] = useState(false);
  const [requestingBill, setRequestingBill] = useState(false);

  useEffect(() => {
    fetchProducts();
  }, []);

  async function fetchProducts() {
    const { data } = await supabase.from('resto-products').select('*');
    if (data) setProducts(data);
    setLoading(false);
  }

  const handleCallServer = async () => {
    setCalling(true);
    // Notification logic for Realtime
    const { error } = await supabase.from('resto-notifications').insert([{
      type: 'call',
      table: tableId,
      status: 'pending',
      created_at: new Date().toISOString()
    }]);
    if (!error) {
        alert("Un serveur arrive !");
    }
    setCalling(false);
  };

  const handleRequestBill = async () => {
    setRequestingBill(true);
    const { error } = await supabase.from('resto-notifications').insert([{
      type: 'bill',
      table: tableId,
      status: 'pending',
      created_at: new Date().toISOString()
    }]);
    if (!error) {
        alert("Demande d'addition envoyée.");
    }
    setRequestingBill(false);
  };

  const [selectedOptionProduct, setSelectedOptionProduct] = useState<Product | null>(null);

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

  const total = cart.reduce((acc, item) => acc + (item.price * item.quantity), 0);

  const placeOrder = async () => {
    if (cart.length === 0) return;
    const { error } = await supabase.from('resto-orders').insert([{
        type: 'salle',
        tablenumber: parseInt(tableId as string),
        items: cart,
        status: 'en_attente',
        total: total,
        created_at: new Date().toISOString()
    }]);
    if (!error) {
        // Notify dashboard
        await supabase.from('resto-notifications').insert([{
            type: 'order',
            table: tableId,
            status: 'pending',
            created_at: new Date().toISOString()
        }]);
        alert("Commande envoyée !");
        setCart([]);
    }
  };

  return (
    <main style={{ padding: '1rem', paddingBottom: '120px', minHeight: '100vh' }}>
      <header style={{ textAlign: 'center', marginBottom: '2rem', padding: '1rem' }}>
        <h2 style={{ fontSize: '1.8rem', fontWeight: '900' }}>Table <span style={{ color: 'var(--accent-primary)' }}>{tableId}</span></h2>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Scannez, commandez, dégustez !</p>
      </header>

      {/* Menu */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '1rem', padding: '0.5rem' }}>
        {products.map(p => (
            <div key={p.id} className="glass-panel hover-scale" onClick={() => addToCart(p)} style={{ padding: '1rem', textAlign: 'center', position: 'relative', cursor: 'pointer' }}>
                <div style={{ 
                    background: p.image ? `url(${p.image}) center/cover` : 'var(--bg-tertiary)', 
                    height: '100px', 
                    borderRadius: '12px', 
                    marginBottom: '0.5rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '2rem',
                    overflow: 'hidden'
                }}>
                    {!p.image && '🥘'}
                </div>
                <h4 style={{ fontSize: '0.9rem', fontWeight: '800', marginBottom: '0.2rem' }}>{p.name}</h4>
                <p style={{ fontWeight: '900', color: 'var(--accent-primary)', fontSize: '1rem' }}>{p.price.toLocaleString()} F</p>
                {p.options && p.options.length > 0 && (
                    <span style={{ fontSize: '0.6rem', color: 'var(--text-muted)' }}>{p.options.length} options</span>
                )}
            </div>
        ))}
      </div>

      {/* Options Modal */}
      {selectedOptionProduct && (
          <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.9)', backdropFilter: 'blur(10px)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.5rem' }}>
              <div className="glass-panel" style={{ padding: '2rem', width: '100%', maxWidth: '350px', background: 'var(--bg-secondary)', borderRadius: '24px' }}>
                  <h3 style={{ marginBottom: '1.2rem', fontSize: '1.2rem', fontWeight: '900' }}>{selectedOptionProduct.name}</h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem', marginBottom: '2rem' }}>
                      {selectedOptionProduct.options?.map((opt, i) => (
                          <button 
                              key={i}
                              className="glass-panel"
                              onClick={() => addToCart(selectedOptionProduct, opt.name, opt.price)}
                              style={{ padding: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-tertiary)', border: 'none', color: 'white', cursor: 'pointer', borderRadius: '12px' }}
                          >
                              <span style={{ fontWeight: '800' }}>{opt.name}</span>
                              <span style={{ color: 'var(--accent-primary)', fontWeight: '900' }}>{opt.price.toLocaleString()} F</span>
                          </button>
                      ))}
                  </div>
                  <button className="btn-secondary" style={{ width: '100%', padding: '0.8rem' }} onClick={() => setSelectedOptionProduct(null)}>FERMER</button>
              </div>
          </div>
      )}

      {/* Bottom Action Bar */}
      <div style={{ 
        position: 'fixed', 
        bottom: '0', 
        left: '0', 
        right: '0', 
        background: 'var(--bg-glass-heavy)', 
        backdropFilter: 'blur(20px)', 
        padding: '1.5rem', 
        borderTop: '1px solid var(--border-color)',
        display: 'flex',
        flexDirection: 'column',
        gap: '1rem',
        zIndex: 100
      }}>
        {cart.length > 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>{cart.length} articles</span>
                <span style={{ fontSize: '1.2rem', fontWeight: '900' }}>{total.toLocaleString()} F</span>
            </div>
        )}
        
        <div style={{ display: 'flex', gap: '0.8rem' }}>
            <button 
                className="btn-secondary" 
                style={{ flex: 1, padding: '1rem 0.5rem', fontSize: '0.8rem', whiteSpace: 'nowrap' }}
                onClick={handleCallServer}
                disabled={calling}
            >
                🙋‍♂️ Appeler
            </button>
            <button 
                className="btn-primary" 
                style={{ flex: 2, padding: '1rem' }}
                onClick={placeOrder}
                disabled={cart.length === 0}
            >
                {cart.length > 0 ? '🚀 Commander' : '🥘 Choisir'}
            </button>
            <button 
                className="btn-secondary" 
                style={{ flex: 1, padding: '1rem 0.5rem', fontSize: '0.8rem', whiteSpace: 'nowrap' }}
                onClick={handleRequestBill}
                disabled={requestingBill}
            >
                💳 Addition
            </button>
        </div>
      </div>
    </main>
  );
}
