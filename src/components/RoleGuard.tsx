"use client";
import { useAuth } from '@/context/AuthContext';
import { ShieldOff } from 'lucide-react';

interface Props {
  allowedRoles: string[];
  children: React.ReactNode;
}

export default function RoleGuard({ allowedRoles, children }: Props) {
  const { profile, loading } = useAuth();

  if (loading) return null;

  if (!profile || !allowedRoles.includes(profile.role)) {
    return (
      <div style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        justifyContent: 'center', minHeight: '80vh', gap: '1rem',
      }}>
        <div style={{ width: '72px', height: '72px', borderRadius: '20px', background: 'rgba(239,68,68,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <ShieldOff size={32} color="var(--accent-danger)" />
        </div>
        <h2 style={{ fontSize: '1.3rem', fontWeight: '900', color: 'var(--text-primary)' }}>Accès refusé</h2>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', textAlign: 'center' }}>
          Vous n'avez pas les permissions nécessaires pour accéder à cette page.
        </p>
        <span style={{ padding: '0.3rem 0.875rem', borderRadius: '100px', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', fontSize: '0.72rem', fontWeight: '800', color: 'var(--text-muted)', letterSpacing: '0.06em' }}>
          {profile?.role?.toUpperCase() || 'NON CONNECTÉ'}
        </span>
      </div>
    );
  }

  return <>{children}</>;
}
