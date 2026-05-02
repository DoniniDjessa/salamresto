"use client";
import { useState } from 'react';
import { Settings, Store, Bell, Shield, Palette, Save, Globe, Phone, Mail, MapPin, QrCode } from 'lucide-react';

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState('general');
  const [selectedQrTable, setSelectedQrTable] = useState(1);

  const tabs = [
    { id: 'general', label: 'Général', icon: Store },
    { id: 'qr', label: 'QR Codes Tables', icon: QrCode },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'security', label: 'Sécurité', icon: Shield },
    { id: 'design', label: 'Design UI', icon: Palette },
  ];

  return (
    <div style={{ padding: '2.5rem', background: 'var(--bg-primary)', minHeight: '100vh', display: 'flex', gap: '3rem' }} className="animate-fade-in">
      <aside style={{ width: '280px', display: 'flex', flexDirection: 'column', gap: '2.5rem' }}>
         <div>
            <h1 style={{ fontSize: '2.2rem', fontWeight: '900', color: 'white', marginBottom: '0.5rem' }}>Paramètres</h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Configurez votre établissement</p>
         </div>

         <nav style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
            {tabs.map(tab => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                    <button 
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        style={{ 
                            padding: '1.2rem 1.5rem', 
                            borderRadius: '18px', 
                            background: isActive ? 'var(--accent-primary)' : 'var(--bg-secondary)', 
                            color: isActive ? 'white' : 'var(--text-secondary)', 
                            border: 'none', 
                            display: 'flex', 
                            alignItems: 'center', 
                            gap: '1rem', 
                            fontWeight: '800', 
                            cursor: 'pointer',
                            transition: 'all 0.2s',
                            boxShadow: isActive ? 'var(--shadow-glow)' : 'none'
                        }}
                    >
                        <Icon size={20} /> {tab.label}
                    </button>
                );
            })}
         </nav>
      </aside>

      <main style={{ flex: 1 }}>
        <div className="glass-panel" style={{ padding: '3rem', background: 'var(--bg-secondary)', borderRadius: '32px' }}>
            {activeTab === 'general' && (
                <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '2.5rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <h2 style={{ fontSize: '1.5rem', fontWeight: '900' }}>Informations de l'Établissement</h2>
                        <button className="hover-scale" style={{ padding: '0.8rem 1.5rem', background: 'var(--accent-primary)', color: 'white', border: 'none', borderRadius: '12px', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
                            <Save size={18} /> ENREGISTRER
                        </button>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                            <label style={{ fontSize: '0.8rem', fontWeight: '900', color: 'var(--text-muted)' }}>NOM DU RESTAURANT</label>
                            <div className="glass-panel" style={{ padding: '1rem', background: 'var(--bg-tertiary)', borderRadius: '14px', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                <Store size={18} color="var(--accent-primary)" />
                                <input defaultValue="SalamResto Premium" style={{ background: 'transparent', border: 'none', color: 'white', width: '100%', outline: 'none', fontWeight: '700' }} />
                            </div>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                            <label style={{ fontSize: '0.8rem', fontWeight: '900', color: 'var(--text-muted)' }}>SITE WEB / MENU QR</label>
                            <div className="glass-panel" style={{ padding: '1rem', background: 'var(--bg-tertiary)', borderRadius: '14px', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                <Globe size={18} color="var(--accent-primary)" />
                                <input defaultValue="salamresto.com/menu" style={{ background: 'transparent', border: 'none', color: 'white', width: '100%', outline: 'none', fontWeight: '700' }} />
                            </div>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                            <label style={{ fontSize: '0.8rem', fontWeight: '900', color: 'var(--text-muted)' }}>TÉLÉPHONE</label>
                            <div className="glass-panel" style={{ padding: '1rem', background: 'var(--bg-tertiary)', borderRadius: '14px', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                <Phone size={18} color="var(--accent-primary)" />
                                <input defaultValue="+225 07 00 00 00 00" style={{ background: 'transparent', border: 'none', color: 'white', width: '100%', outline: 'none', fontWeight: '700' }} />
                            </div>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                            <label style={{ fontSize: '0.8rem', fontWeight: '900', color: 'var(--text-muted)' }}>EMAIL</label>
                            <div className="glass-panel" style={{ padding: '1rem', background: 'var(--bg-tertiary)', borderRadius: '14px', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                <Mail size={18} color="var(--accent-primary)" />
                                <input defaultValue="contact@salamresto.com" style={{ background: 'transparent', border: 'none', color: 'white', width: '100%', outline: 'none', fontWeight: '700' }} />
                            </div>
                        </div>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                        <label style={{ fontSize: '0.8rem', fontWeight: '900', color: 'var(--text-muted)' }}>ADRESSE PHYSIQUE</label>
                        <div className="glass-panel" style={{ padding: '1rem', background: 'var(--bg-tertiary)', borderRadius: '14px', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                            <MapPin size={18} color="var(--accent-primary)" />
                            <textarea defaultValue="Abidjan, Cocody Angré 7ème Tranche" style={{ background: 'transparent', border: 'none', color: 'white', width: '100%', outline: 'none', fontWeight: '700', resize: 'none' }} rows={2} />
                        </div>
                    </div>
                </div>
            )}

            {activeTab === 'qr' && (
                <div className="animate-fade-in" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '3rem' }}>
                    <div>
                        <h2 style={{ fontSize: '1.5rem', fontWeight: '900', marginBottom: '1rem' }}>Générateur de QR Codes</h2>
                        <p style={{ color: 'var(--text-muted)', marginBottom: '2.5rem', fontSize: '0.9rem' }}>Sélectionnez une table pour générer le lien de commande client.</p>
                        
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem' }}>
                            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(t => (
                                <button 
                                    key={t}
                                    onClick={() => setSelectedQrTable(t)}
                                    style={{ 
                                        padding: '1.2rem', 
                                        borderRadius: '16px', 
                                        background: selectedQrTable === t ? 'var(--accent-primary)' : 'var(--bg-tertiary)', 
                                        color: 'white', 
                                        border: 'none', 
                                        fontWeight: '900', 
                                        cursor: 'pointer',
                                        transition: 'all 0.2s'
                                    }}
                                >
                                    {t}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '3rem', background: 'var(--bg-tertiary)', borderRadius: '24px', border: '2px dashed var(--border-color)' }}>
                        <div style={{ background: 'white', padding: '1.5rem', borderRadius: '20px', marginBottom: '2rem' }}>
                            <QrCode size={180} color="black" />
                        </div>
                        <h3 style={{ fontSize: '1.2rem', fontWeight: '900' }}>Table {selectedQrTable}</h3>
                        <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.5rem', wordBreak: 'break-all', textAlign: 'center' }}>
                            http://localhost:3000/table/{selectedQrTable}
                        </p>
                        <button style={{ marginTop: '2rem', width: '100%', padding: '1rem', background: 'white', color: 'black', border: 'none', borderRadius: '12px', fontWeight: '900', cursor: 'pointer' }}>
                            IMPRIMER LE QR CODE
                        </button>
                    </div>
                </div>
            )}

            {activeTab === 'design' && (
                <div className="animate-fade-in" style={{ textAlign: 'center', padding: '5rem 0' }}>
                    <Palette size={48} color="var(--accent-primary)" style={{ marginBottom: '1.5rem' }} />
                    <h3 style={{ fontSize: '1.5rem', fontWeight: '900', marginBottom: '1rem' }}>Personnalisation visuelle</h3>
                    <p style={{ color: 'var(--text-muted)', maxWidth: '400px', margin: '0 auto' }}>Modifiez vos couleurs primaires, vos polices et vos logos pour correspondre à votre identité de marque.</p>
                </div>
            )}
        </div>
      </main>
    </div>
  );
}
