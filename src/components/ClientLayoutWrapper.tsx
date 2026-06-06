"use client";
import React, { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useSidebar } from '@/context/SidebarContext';
import { useAuth } from '@/context/AuthContext';

const AUTH_PATHS = new Set(['/login', '/register']);

function AppLoader() {
  return (
    <div style={{
      minHeight: '100vh', display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      background: 'var(--bg-primary)', gap: '1.5rem',
    }}>
      <div style={{ position: 'relative', width: '64px', height: '64px' }}>
        <div style={{
          width: '64px', height: '64px', borderRadius: '18px',
          background: 'linear-gradient(135deg, #F97316, #EA580C)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 8px 32px rgba(249,115,22,0.35)',
          animation: 'pulse 1.8s ease-in-out infinite',
        }}>
          <span style={{ fontSize: '1.75rem' }}>🍲</span>
        </div>
        <div style={{
          position: 'absolute', inset: '-6px',
          borderRadius: '24px',
          border: '2.5px solid transparent',
          borderTopColor: '#F97316',
          borderRightColor: '#F97316',
          animation: 'spin 1s linear infinite',
        }} />
      </div>

      <div style={{ textAlign: 'center' }}>
        <h2 style={{ fontSize: '1.4rem', fontWeight: '900', color: 'var(--text-primary)', marginBottom: '0.25rem' }}>
          Marmite <span style={{ color: '#F97316' }}>d'Or</span>
        </h2>
        <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: '600', letterSpacing: '0.12em' }}>
          CHARGEMENT EN COURS…
        </p>
      </div>

      <div style={{ display: 'flex', gap: '0.4rem' }}>
        {[0, 1, 2].map(i => (
          <div key={i} style={{
            width: '6px', height: '6px', borderRadius: '50%',
            background: '#F97316',
            animation: `bounce 1.2s ease-in-out ${i * 0.2}s infinite`,
          }} />
        ))}
      </div>

      <style>{`
        @keyframes bounce {
          0%, 80%, 100% { transform: translateY(0); opacity: 0.4; }
          40% { transform: translateY(-8px); opacity: 1; }
        }
        @keyframes pulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.05); }
        }
      `}</style>
    </div>
  );
}

const ClientLayoutWrapper = ({ children }: { children: React.ReactNode }) => {
  const { isExpanded, isMobile } = useSidebar();
  const { session, loading } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const isAuth = AUTH_PATHS.has(pathname);

  useEffect(() => {
    if (!loading && !session && !isAuth) {
      router.replace('/login');
    }
  }, [loading, session, isAuth, router]);

  if (isAuth) return <>{children}</>;

  if (loading || !session) return <AppLoader />;

  return (
    <main
      className="main-content"
      style={{
        marginLeft: isMobile ? 0 : (isExpanded ? 'var(--sidebar-width-expanded)' : 'var(--sidebar-width-collapsed)'),
        minHeight: '100vh',
        transition: 'margin-left 0.3s ease',
      }}
    >
      {children}
    </main>
  );
};

export default ClientLayoutWrapper;
