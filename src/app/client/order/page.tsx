"use client";
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { Product } from '@/types';

export default function ExternalOrderPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [cart, setCart] = useState<{ id: string; name: string; price: number; quantity: number }[]>([]);
  const [customer, setCustomer] = useState({ name: '', phone: '', address: '' });
  const [paymentMethod, setPaymentMethod] = useState<'online' | 'delivery'>('delivery');
  const [loading, setLoading] = useState(true);
  const [selectedOptionProduct, setSelectedOptionProduct] = useState<Product | null>(null);

  useEffect(() => {
    fetchProducts();
  }, []);

  async function fetchProducts() {
    const { data, error } = await supabase.from('resto-products').select('*');
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

  const dispatchOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (cart.length === 0) return alert("Le panier est vide.");

    const { error } = await supabase.from('resto-orders').insert([{
      type: 'external',
      customername: customer.name,
      contactphone: customer.phone,
      deliveryaddress: customer.address,
      items: cart,
      status: 'en_attente',
      total: total,
      payment_method: paymentMethod,
      created_at: new Date().toISOString()
    }]);

    if (!error) {
      alert(`Commande envoyée avec succès ! Méthode: ${paymentMethod === 'online' ? 'Payer' : 'Payer à la livraison'}`);
      setCart([]);
      setCustomer({ name: '', phone: '', address: '' });
    } else {
      alert("Erreur lors de l'envoi : " + error.message);
    }
  };

  const total = cart.reduce((acc, item) => acc + (item.price * item.quantity), 0);

  return (
    <div style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto', display: 'flex', gap: '2rem' }} className="animate-fade-in">
      
      {/* Menu selection */}
      <div style={{ flex: 2 }}>
        <header style={{ marginBottom: '2rem' }}>
          <Link href="/" style={{ color: 'var(--accent-secondary)', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
            <span>←</span> Retour Accueil
          </Link>
          <h1 style={{ fontSize: '2.5rem' }}>Commander <span style={{ color: 'var(--accent-primary)' }}>en ligne</span></h1>
        </header>
        
        {loading ? <p>Chargement des délices...</p> : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '1.5rem' }}>
            {products.map(p => (
              <div 
                key={p.id} 
                className="glass-panel"
                style={{ padding: '1.5rem', cursor: 'pointer', textAlign: 'center' }}
                onClick={() => addToCart(p)}
              >
                <div style={{ background: p.image ? `url(${p.image}) center/cover` : 'var(--bg-tertiary)', height: '120px', borderRadius: '12px', marginBottom: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2rem' }}>
                    {!p.image && '🍽️'}
                </div>
                <h3 style={{ fontSize: '1.1rem', marginBottom: '0.2rem' }}>{p.name}</h3>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '1rem' }}>{p.category}</p>
                <p style={{ color: 'var(--accent-primary)', fontWeight: '800', fontSize: '1.2rem' }}>
                    {p.options && p.options.length > 0 ? `Dès ${Math.min(...p.options.map(o => o.price)).toLocaleString()}` : p.price.toLocaleString()} F
                </p>
              </div>
            ))}
          </div>
        )}
      </div>

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

      {/* Checkout Sidebar */}
      <div className="glass-panel" style={{ flex: 1, padding: '2rem', height: 'fit-content' }}>
        <h2 style={{ marginBottom: '1.5rem', fontSize: '1.5rem' }}>Votre Panier</h2>
        
        {cart.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '2rem 0', color: 'var(--text-muted)' }}>
             <p>Votre panier est vide</p>
          </div>
        ) : (
          <div style={{ marginBottom: '2rem' }}>
            {cart.map(item => (
              <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.8rem', fontSize: '0.95rem' }}>
                <span style={{ fontWeight: '500' }}>{item.quantity}x {item.name}</span>
                <span style={{ color: 'var(--text-secondary)' }}>{(item.price * item.quantity).toLocaleString()} F</span>
              </div>
            ))}
            <div style={{ margin: '1.5rem 0', padding: '1.5rem 0', borderTop: '1px solid var(--border-color)', borderBottom: '1px solid var(--border-color)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: '800', fontSize: '1.4rem' }}>
                <span>Total</span>
                <span style={{ color: 'var(--accent-primary)' }}>{total.toLocaleString()} F</span>
              </div>
            </div>

            <form onSubmit={dispatchOrder} style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <label style={{ fontSize: '0.9rem', fontWeight: '600', color: 'var(--text-secondary)' }}>Options de paiement</label>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                   <button 
                     type="button"
                     onClick={() => setPaymentMethod('online')}
                     className={paymentMethod === 'online' ? 'btn-primary' : 'btn-secondary'}
                     style={{ flex: 1, fontSize: '0.8rem', padding: '0.6rem' }}
                   >Payer</button>
                   <button 
                     type="button"
                     onClick={() => setPaymentMethod('delivery')}
                     className={paymentMethod === 'delivery' ? 'btn-primary' : 'btn-secondary'}
                     style={{ flex: 1, fontSize: '0.8rem', padding: '0.6rem' }}
                   >À la livraison</button>
                </div>
              </div>

              <h3>Livraison</h3>
              <input 
                required
                className="input-field" 
                placeholder="Nom complet" 
                value={customer.name}
                onChange={e => setCustomer({...customer, name: e.target.value})}
              />
              <input 
                required
                type="tel"
                className="input-field" 
                placeholder="Numéro de téléphone" 
                value={customer.phone}
                onChange={e => setCustomer({...customer, phone: e.target.value})}
              />
              <textarea 
                required
                className="input-field" 
                placeholder="Adresse exacte" 
                rows={3}
                value={customer.address}
                onChange={e => setCustomer({...customer, address: e.target.value})}
              />
              <button type="submit" className="btn-primary" style={{ marginTop: '0.5rem', width: '100%', padding: '1.2rem' }}>
                Confirmer la Commande
              </button>
            </form>
          </div>
        )}
      </div>

    </div>
  );
}
