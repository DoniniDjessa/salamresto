"use client";
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { Product } from '@/types';

import { ShoppingBag, Truck, CreditCard, User, Phone, MapPin, ChevronRight, Plus, Info } from 'lucide-react';

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
    
    setSelectedOptionProduct(null);
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
    <div style={{ padding: '2.5rem', background: 'var(--bg-primary)', minHeight: '100vh', display: 'flex', gap: '3rem' }} className="animate-fade-in">
      
      {/* Menu selection */}
      <div style={{ flex: 1.8 }}>
        <header style={{ marginBottom: '3rem' }}>
          <h1 style={{ fontSize: '2.5rem', fontWeight: '900', display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <ShoppingBag size={40} color="var(--accent-primary)" /> Commander <span style={{ color: 'var(--accent-primary)' }}>en Ligne</span>
          </h1>
          <p style={{ color: 'var(--text-secondary)' }}>Faites-vous livrer vos plats préférés en quelques clics</p>
        </header>
        
        {loading ? <p>Préparation de la carte...</p> : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '1.5rem' }}>
            {products.map(p => (
              <div 
                key={p.id} 
                className="glass-panel hover-scale"
                style={{ padding: '1.2rem', cursor: 'pointer', textAlign: 'center', background: 'var(--bg-secondary)', borderRadius: '28px', display: 'flex', flexDirection: 'column' }}
                onClick={() => addToCart(p)}
              >
                <div style={{ 
                    background: p.image ? `url(${p.image}) center/cover` : 'var(--bg-tertiary)', 
                    height: '160px', 
                    borderRadius: '20px', 
                    marginBottom: '1.2rem', 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center', 
                    fontSize: '2.5rem',
                    overflow: 'hidden'
                }}>
                    {!p.image && '🥘'}
                </div>
                <h3 style={{ fontSize: '1.1rem', fontWeight: '800', marginBottom: '0.4rem' }}>{p.name}</h3>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginBottom: '1rem', fontWeight: '600', letterSpacing: '0.05em' }}>{p.category?.toUpperCase()}</p>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'auto', background: 'var(--bg-tertiary)', padding: '0.6rem 1rem', borderRadius: '14px' }}>
                    <span style={{ color: 'var(--accent-primary)', fontWeight: '900', fontSize: '1.1rem' }}>{p.price.toLocaleString()} F</span>
                    <Plus size={18} color="var(--accent-primary)" />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Options Modal */}
        {selectedOptionProduct && (
            <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(10px)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div className="glass-panel" style={{ padding: '2.5rem', width: '400px', background: 'var(--bg-secondary)', borderRadius: '32px' }}>
                    <h3 style={{ marginBottom: '1.5rem', fontSize: '1.4rem', fontWeight: '900' }}>{selectedOptionProduct.name}</h3>
                    <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem', fontSize: '0.9rem' }}>Veuillez choisir une option :</p>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '2rem' }}>
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
      </div>

      {/* Checkout Sidebar */}
      <div style={{ flex: 1 }}>
        <div className="glass-panel" style={{ padding: '2.5rem', background: 'var(--bg-secondary)', borderRadius: '32px', position: 'sticky', top: '2.5rem' }}>
            <h2 style={{ fontSize: '1.6rem', fontWeight: '900', marginBottom: '2rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                Votre Panier <div style={{ background: 'var(--accent-primary)', color: 'white', padding: '0.2rem 0.6rem', borderRadius: '8px', fontSize: '0.8rem' }}>{cart.length}</div>
            </h2>
            
            {cart.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '4rem 0', color: 'var(--text-muted)', opacity: 0.5 }}>
                <ShoppingBag size={48} style={{ marginBottom: '1rem' }} />
                <p>Votre panier est vide</p>
            </div>
            ) : (
            <div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem', marginBottom: '2.5rem', maxHeight: '300px', overflowY: 'auto', paddingRight: '0.5rem' }}>
                    {cart.map(item => (
                    <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                            <p style={{ fontWeight: '800', fontSize: '1rem' }}>{item.quantity}x {item.name}</p>
                            <p style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>{item.price.toLocaleString()} F / unité</p>
                        </div>
                        <span style={{ fontWeight: '900', color: 'var(--accent-primary)' }}>{(item.price * item.quantity).toLocaleString()} F</span>
                    </div>
                    ))}
                </div>

                <div style={{ margin: '2rem 0', padding: '2rem 0', borderTop: '1px dashed var(--border-color)', borderBottom: '1px dashed var(--border-color)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: '900', fontSize: '1.8rem' }}>
                        <span>Total</span>
                        <span style={{ color: 'var(--accent-primary)' }}>{total.toLocaleString()} F</span>
                    </div>
                </div>

                <form onSubmit={dispatchOrder} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                        <label style={{ fontSize: '0.8rem', fontWeight: '800', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <CreditCard size={14} /> MODE DE PAIEMENT
                        </label>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.8rem' }}>
                        <button 
                            type="button"
                            onClick={() => setPaymentMethod('online')}
                            style={{ padding: '1rem', borderRadius: '12px', background: paymentMethod === 'online' ? 'var(--accent-primary)' : 'var(--bg-tertiary)', color: 'white', border: 'none', fontSize: '0.75rem', fontWeight: '800', cursor: 'pointer' }}
                        >Payer</button>
                        <button 
                            type="button"
                            onClick={() => setPaymentMethod('delivery')}
                            style={{ padding: '1rem', borderRadius: '12px', background: paymentMethod === 'delivery' ? 'var(--accent-primary)' : 'var(--bg-tertiary)', color: 'white', border: 'none', fontSize: '0.75rem', fontWeight: '800', cursor: 'pointer' }}
                        >Livraison</button>
                        </div>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '0.5rem' }}>
                        <label style={{ fontSize: '0.8rem', fontWeight: '800', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <Truck size={14} /> INFORMATIONS DE LIVRAISON
                        </label>
                        <input 
                            required
                            className="glass-panel" 
                            style={{ padding: '1rem', background: 'var(--bg-tertiary)', border: 'none', color: 'white', borderRadius: '12px', outline: 'none' }}
                            placeholder="Nom complet" 
                            value={customer.name}
                            onChange={e => setCustomer({...customer, name: e.target.value})}
                        />
                        <input 
                            required
                            type="tel"
                            className="glass-panel" 
                            style={{ padding: '1rem', background: 'var(--bg-tertiary)', border: 'none', color: 'white', borderRadius: '12px', outline: 'none' }}
                            placeholder="Numéro de téléphone" 
                            value={customer.phone}
                            onChange={e => setCustomer({...customer, phone: e.target.value})}
                        />
                        <textarea 
                            required
                            className="glass-panel" 
                            style={{ padding: '1rem', background: 'var(--bg-tertiary)', border: 'none', color: 'white', borderRadius: '12px', outline: 'none', resize: 'none' }}
                            placeholder="Adresse exacte de livraison" 
                            rows={3}
                            value={customer.address}
                            onChange={e => setCustomer({...customer, address: e.target.value})}
                        />
                    </div>

                    <button type="submit" className="hover-scale" style={{ width: '100%', padding: '1.4rem', borderRadius: '20px', background: 'var(--accent-primary)', color: 'white', border: 'none', fontWeight: '900', fontSize: '1.1rem', cursor: 'pointer', boxShadow: 'var(--shadow-glow)', marginTop: '1rem' }}>
                        COMMANDER MAINTENANT
                    </button>
                </form>
            </div>
            )}
        </div>
      </div>
    </div>
  );
}
