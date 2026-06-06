"use client";
import { useState } from 'react';
import { Settings, Store, Bell, Shield, Palette, Save, Globe, Phone, Mail, MapPin, QrCode, User, Lock, CheckCircle } from 'lucide-react';
import RoleGuard from '@/components/RoleGuard';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';

const ALL_ROLES = ['superAdmin', 'admin', 'manager', 'caisse', 'serveur', 'livreur'];
const ADMIN_ROLES = ['superAdmin', 'admin'];

const inputStyle: React.CSSProperties = {
  background: 'var(--bg-tertiary)',
  border: '1.5px solid var(--border-color)',
  color: 'var(--text-primary)',
  padding: '0.875rem 1rem',
  borderRadius: '12px',
  outline: 'none',
  width: '100%',
  fontFamily: 'var(--font-body)',
  fontSize: '0.9rem',
};

const ROLE_LABELS: Record<string, string> = {
  superAdmin: 'Super Admin',
  admin: 'Administrateur',
  manager: 'Manager',
  caisse: 'Caissier(e)',
  serveur: 'Serveur',
  livreur: 'Livreur',
};

export default function SettingsPage() {
  const { profile } = useAuth();
  const isAdmin = ADMIN_ROLES.includes(profile?.role || '');

  const [activeTab, setActiveTab] = useState('account');
  const [selectedQrTable, setSelectedQrTable] = useState(1);

  // Password change state
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [pwLoading, setPwLoading] = useState(false);
  const [pwError, setPwError] = useState('');
  const [pwSuccess, setPwSuccess] = useState(false);

  async function changePassword() {
    setPwError('');
    setPwSuccess(false);
    if (!newPassword || newPassword.length < 6) {
      setPwError('Le mot de passe doit contenir au moins 6 caractères.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPwError('Les mots de passe ne correspondent pas.');
      return;
    }
    setPwLoading(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) {
      setPwError(error.message);
    } else {
      setPwSuccess(true);
      setNewPassword('');
      setConfirmPassword('');
    }
    setPwLoading(false);
  }

  const allTabs = [
    { id: 'account', label: 'Mon Compte', icon: User, adminOnly: false },
    { id: 'general', label: 'Général', icon: Store, adminOnly: true },
    { id: 'qr', label: 'QR Codes Tables', icon: QrCode, adminOnly: true },
    { id: 'notifications', label: 'Notifications', icon: Bell, adminOnly: true },
    { id: 'security', label: 'Sécurité', icon: Shield, adminOnly: true },
    { id: 'design', label: 'Design UI', icon: Palette, adminOnly: true },
  ];

  const tabs = allTabs.filter(t => !t.adminOnly || isAdmin);

  return (
    <RoleGuard allowedRoles={ALL_ROLES}>
    <div style={{ padding: '2.5rem', background: 'var(--bg-primary)', minHeight: '100vh' }} className="animate-fade-in">

      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '2rem', fontWeight: '900', marginBottom: '0.3rem' }}>Paramètres</h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Configurez votre compte et votre établissement</p>
      </div>

      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '2rem', borderBottom: '1.5px solid var(--border-color)', paddingBottom: '1rem' }}>
        {tabs.map(tab => {
          const Icon = tab.icon;
          const active = activeTab === tab.id;
          return (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              style={{ padding: '0.55rem 1.1rem', borderRadius: '10px', background: active ? 'var(--accent-primary)' : 'transparent', color: active ? 'white' : 'var(--text-secondary)', border: active ? 'none' : '1.5px solid var(--border-color)', display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: '700', fontSize: '0.85rem', cursor: 'pointer', whiteSpace: 'nowrap', transition: 'all 0.2s', boxShadow: active ? 'var(--shadow-glow)' : 'none' }}>
              <Icon size={15} /> {tab.label}
            </button>
          );
        })}
      </div>

      <div style={{ background: '#FFFFFF', border: '1px solid var(--border-color)', borderRadius: '24px', boxShadow: 'var(--shadow-sm)', padding: '2.5rem' }}>

        {/* ── Mon Compte ── */}
        {activeTab === 'account' && (
          <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '2.5rem', maxWidth: '520px' }}>

            {/* User info card */}
            <div>
              <h2 style={{ fontSize: '1.3rem', fontWeight: '900', marginBottom: '1.5rem' }}>Informations du compte</h2>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', padding: '1.5rem', background: 'var(--bg-secondary)', borderRadius: '16px', border: '1px solid var(--border-color)' }}>
                <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: 'linear-gradient(135deg, var(--accent-primary), #C2410C)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <User size={24} color="white" />
                </div>
                <div>
                  <p style={{ fontWeight: '900', fontSize: '1.1rem', marginBottom: '0.2rem' }}>{profile?.name || '—'}</p>
                  <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>{profile?.email || '—'}</p>
                  <span style={{ padding: '0.2rem 0.65rem', borderRadius: '100px', background: 'rgba(249,115,22,0.1)', color: 'var(--accent-primary)', fontSize: '0.65rem', fontWeight: '900', letterSpacing: '0.08em' }}>
                    {ROLE_LABELS[profile?.role || ''] || profile?.role?.toUpperCase() || '—'}
                  </span>
                </div>
              </div>
            </div>

            {/* Change password */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '1.25rem' }}>
                <Lock size={18} color="var(--accent-primary)" />
                <h2 style={{ fontSize: '1.1rem', fontWeight: '900' }}>Changer mon mot de passe</h2>
              </div>

              {pwSuccess && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', padding: '0.875rem 1.1rem', background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.25)', borderRadius: '12px', marginBottom: '1.25rem' }}>
                  <CheckCircle size={16} color="var(--accent-success)" />
                  <p style={{ fontSize: '0.82rem', fontWeight: '700', color: 'var(--accent-success)' }}>Mot de passe mis à jour avec succès !</p>
                </div>
              )}

              {pwError && (
                <div style={{ padding: '0.875rem 1.1rem', background: 'rgba(239,68,68,0.07)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '12px', marginBottom: '1.25rem' }}>
                  <p style={{ fontSize: '0.82rem', fontWeight: '700', color: 'var(--accent-danger)' }}>{pwError}</p>
                </div>
              )}

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
                <div>
                  <label style={{ fontSize: '0.7rem', fontWeight: '900', color: 'var(--text-muted)', letterSpacing: '0.08em', display: 'block', marginBottom: '0.4rem' }}>NOUVEAU MOT DE PASSE</label>
                  <input type="password" value={newPassword} onChange={e => { setNewPassword(e.target.value); setPwError(''); setPwSuccess(false); }}
                    placeholder="Min. 6 caractères" style={inputStyle} />
                </div>
                <div>
                  <label style={{ fontSize: '0.7rem', fontWeight: '900', color: 'var(--text-muted)', letterSpacing: '0.08em', display: 'block', marginBottom: '0.4rem' }}>CONFIRMER LE MOT DE PASSE</label>
                  <input type="password" value={confirmPassword} onChange={e => { setConfirmPassword(e.target.value); setPwError(''); setPwSuccess(false); }}
                    placeholder="Répétez le mot de passe" style={inputStyle} />
                </div>
                <button onClick={changePassword} disabled={pwLoading || !newPassword}
                  className="btn-primary"
                  style={{ justifyContent: 'center', opacity: pwLoading || !newPassword ? 0.6 : 1, cursor: pwLoading || !newPassword ? 'not-allowed' : 'pointer', marginTop: '0.25rem' }}>
                  {pwLoading ? 'Mise à jour…' : 'CHANGER LE MOT DE PASSE'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── Général (admin only) ── */}
        {activeTab === 'general' && (
          <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ fontSize: '1.3rem', fontWeight: '900' }}>Informations de l'Établissement</h2>
              <button className="btn-primary" style={{ padding: '0.7rem 1.4rem', boxShadow: 'var(--shadow-glow)' }}>
                <Save size={16} /> ENREGISTRER
              </button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
              {[
                { label: 'NOM DU RESTAURANT',  icon: <Store size={17} />, defaultVal: "Marmite d'Or" },
                { label: 'SITE WEB / MENU QR', icon: <Globe size={17} />, defaultVal: 'salamresto.com/menu' },
                { label: 'TÉLÉPHONE',           icon: <Phone size={17} />, defaultVal: '+225 07 00 00 00 00' },
                { label: 'EMAIL',               icon: <Mail  size={17} />, defaultVal: 'contact@salamresto.com' },
              ].map(f => (
                <div key={f.label} style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <label style={{ fontSize: '0.7rem', fontWeight: '900', color: 'var(--text-muted)', letterSpacing: '0.08em' }}>{f.label}</label>
                  <div style={{ ...inputStyle, display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.875rem 1rem' }}>
                    <span style={{ color: 'var(--accent-primary)', flexShrink: 0 }}>{f.icon}</span>
                    <input defaultValue={f.defaultVal} style={{ background: 'transparent', border: 'none', color: 'var(--text-primary)', width: '100%', outline: 'none', fontWeight: '600', fontFamily: 'var(--font-body)' }} />
                  </div>
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <label style={{ fontSize: '0.7rem', fontWeight: '900', color: 'var(--text-muted)', letterSpacing: '0.08em' }}>ADRESSE PHYSIQUE</label>
              <div style={{ ...inputStyle, display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
                <MapPin size={17} color="var(--accent-primary)" style={{ marginTop: '0.2rem', flexShrink: 0 }} />
                <textarea defaultValue="Abidjan, Cocody Angré 7ème Tranche" style={{ background: 'transparent', border: 'none', color: 'var(--text-primary)', width: '100%', outline: 'none', fontWeight: '600', resize: 'none', fontFamily: 'var(--font-body)' }} rows={2} />
              </div>
            </div>
          </div>
        )}

        {/* ── QR Codes (admin only) ── */}
        {activeTab === 'qr' && (
          <div className="animate-fade-in" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '3rem' }}>
            <div>
              <h2 style={{ fontSize: '1.3rem', fontWeight: '900', marginBottom: '0.5rem' }}>Générateur de QR Codes</h2>
              <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem', fontSize: '0.875rem' }}>Sélectionnez une table pour générer le lien de commande client.</p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.875rem' }}>
                {[1,2,3,4,5,6,7,8,9,10,11,12].map(t => (
                  <button key={t} onClick={() => setSelectedQrTable(t)} style={{ padding: '1rem', borderRadius: '12px', background: selectedQrTable===t ? 'var(--accent-primary)' : 'var(--bg-tertiary)', color: selectedQrTable===t ? 'white' : 'var(--text-primary)', border: 'none', fontWeight: '900', cursor: 'pointer', transition: 'all 0.2s', boxShadow: selectedQrTable===t ? 'var(--shadow-glow)' : 'none' }}>
                    {t}
                  </button>
                ))}
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '2.5rem', background: 'var(--bg-secondary)', borderRadius: '20px', border: '1.5px dashed var(--border-color)' }}>
              <div style={{ background: 'white', padding: '1.25rem', borderRadius: '16px', marginBottom: '1.5rem', boxShadow: 'var(--shadow-sm)', border: '1px solid var(--border-color)' }}>
                <QrCode size={160} color="var(--text-primary)" />
              </div>
              <h3 style={{ fontWeight: '900', marginBottom: '0.4rem' }}>Table {selectedQrTable}</h3>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', wordBreak: 'break-all', textAlign: 'center' }}>
                http://localhost:3000/table/{selectedQrTable}
              </p>
              <button style={{ marginTop: '1.5rem', width: '100%', padding: '0.875rem', background: 'var(--accent-primary)', color: 'white', border: 'none', borderRadius: '10px', fontWeight: '900', cursor: 'pointer', boxShadow: 'var(--shadow-glow)' }}>
                IMPRIMER LE QR CODE
              </button>
            </div>
          </div>
        )}

        {/* ── Notifications (admin only) ── */}
        {activeTab === 'notifications' && (
          <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1rem', maxWidth: '560px' }}>
            <h2 style={{ fontSize: '1.3rem', fontWeight: '900', marginBottom: '0.5rem' }}>Notifications</h2>
            {[
              { label: 'Notifications Sonores',          desc: 'Jouer un son à chaque nouvelle commande' },
              { label: 'Impression Automatique Cuisine',  desc: 'Imprimer le ticket cuisine automatiquement' },
              { label: 'Alertes Livraison',               desc: 'Notifier quand une livraison est en retard' },
            ].map((item, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1.25rem', background: 'var(--bg-secondary)', borderRadius: '14px', border: '1px solid var(--border-color)' }}>
                <div>
                  <p style={{ fontWeight: '800', fontSize: '0.9rem' }}>{item.label}</p>
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>{item.desc}</p>
                </div>
                <div style={{ width: '42px', height: '22px', background: i===0?'var(--accent-primary)':'var(--bg-tertiary)', borderRadius: '11px', border: '1px solid var(--border-color)', cursor: 'pointer', flexShrink: 0, position: 'relative', transition: 'all 0.2s' }}>
                  <div style={{ width: '16px', height: '16px', borderRadius: '50%', background: 'white', position: 'absolute', top: '3px', left: i===0?'23px':'3px', transition: 'all 0.2s', boxShadow: '0 1px 4px rgba(0,0,0,0.15)' }} />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── Sécurité (admin only) ── */}
        {activeTab === 'security' && (
          <div className="animate-fade-in" style={{ maxWidth: '480px', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <h2 style={{ fontSize: '1.3rem', fontWeight: '900' }}>Sécurité</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <label style={{ fontSize: '0.7rem', fontWeight: '900', color: 'var(--text-muted)', letterSpacing: '0.08em' }}>CODE PIN ADMINISTRATEUR</label>
              <input type="password" style={inputStyle} placeholder="••••" maxLength={6} />
            </div>
            <button className="btn-primary" style={{ justifyContent: 'center', alignSelf: 'flex-start', padding: '0.8rem 1.5rem' }}>CHANGER LE PIN</button>
          </div>
        )}

        {/* ── Design (admin only) ── */}
        {activeTab === 'design' && (
          <div className="animate-fade-in" style={{ textAlign: 'center', padding: '4rem 0' }}>
            <div style={{ width: '72px', height: '72px', borderRadius: '24px', background: 'var(--bg-tertiary)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem' }}>
              <Palette size={36} color="var(--accent-primary)" />
            </div>
            <h3 style={{ fontSize: '1.3rem', fontWeight: '900', marginBottom: '0.75rem' }}>Personnalisation visuelle</h3>
            <p style={{ color: 'var(--text-secondary)', maxWidth: '400px', margin: '0 auto', lineHeight: 1.7 }}>Modifiez vos couleurs primaires, vos polices et vos logos pour correspondre à votre identité de marque.</p>
          </div>
        )}

      </div>
    </div>
    </RoleGuard>
  );
}
