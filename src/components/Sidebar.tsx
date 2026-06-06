"use client";
import React, { Suspense, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import {
  LayoutDashboard, Monitor, ChefHat, Truck,
  Activity, Utensils, Users, UserCircle, UserCheck, Wallet,
  PieChart, Settings, ChevronLeft, ChevronRight, LogOut, LayoutGrid, Menu
} from 'lucide-react';
import { useSidebar } from '@/context/SidebarContext';
import { useAuth } from '@/context/AuthContext';

const opsItems = [
  { name: 'Tableau de bord', icon: LayoutDashboard, path: '/' },
  { name: 'Ventes',          icon: Monitor,         path: '/pos' },
  { name: 'Écran Cuisine',   icon: ChefHat,         path: '/kitchen' },
  { name: 'Livraisons',      icon: Truck,           path: '/delivery' },
  { name: 'Tables',          icon: LayoutGrid,      path: '/tables' },
];

const adminItems = [
  { name: 'Analyses',       icon: Activity,    path: '/admin' },
  { name: 'Gestion Menu',   icon: Utensils,    path: '/admin?tab=menu' },
  { name: 'Équipe',         icon: Users,       path: '/admin?tab=hr' },
  { name: 'Profils',        icon: UserCircle,  path: '/admin?tab=profiles' },
  { name: 'Clients',        icon: UserCheck,   path: '/admin?tab=clients' },
  { name: 'Dépenses',       icon: Wallet,      path: '/admin?tab=adminexpenses' },
  { name: 'Comptabilité',   icon: PieChart,    path: '/admin?tab=accounting' },
  { name: 'Paramètres',     icon: Settings,    path: '/settings' },
];


function SidebarContent() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { isExpanded, isMobile, toggleSidebar, closeSidebar } = useSidebar();
  const { profile, signOut } = useAuth();

  const isActive = (path: string) => {
    if (path.includes('?tab=')) {
      const [base, query] = path.split('?');
      const tab = query.replace('tab=', '');
      return pathname === base && searchParams.get('tab') === tab;
    }
    if (path === '/admin') {
      return pathname === '/admin' && !searchParams.get('tab');
    }
    return pathname === path;
  };

  const itemStyle = (active: boolean): React.CSSProperties => ({
    display: 'flex',
    alignItems: 'center',
    justifyContent: isExpanded ? 'flex-start' : 'center',
    gap: isExpanded ? '0.85rem' : '0',
    padding: isExpanded ? '0.7rem 1rem' : '0.7rem',
    borderRadius: '10px',
    color: active ? 'white' : '#A8A29E',
    background: active ? 'var(--accent-primary)' : 'transparent',
    textDecoration: 'none',
    fontWeight: '600',
    fontSize: '0.875rem',
    transition: 'all 0.2s',
    whiteSpace: 'nowrap',
    boxShadow: active ? '0 4px 14px rgba(249, 115, 22, 0.30)' : 'none',
  });

  const [externalPending, setExternalPending] = useState(0);

  useEffect(() => {
    let mounted = true;
    async function fetchCount() {
      try {
        const { count } = await supabase.from('resto-orders')
          .select('*', { count: 'exact' })
          .eq('type', 'external')
          .eq('status', 'en_attente');
        if (!mounted) return;
        setExternalPending(count || 0);
      } catch (e) { /* ignore */ }
    }
    fetchCount();
    const ch = supabase.channel('sidebar-external-count').on('postgres_changes', { event: '*', table: 'resto-orders', schema: 'public' }, fetchCount).subscribe();
    return () => { mounted = false; supabase.removeChannel(ch); };
  }, []);

  if (['/login', '/register'].includes(pathname)) return null;

  const sectionLabel = (label: string) =>
    isExpanded ? (
      <p style={{ fontSize: '0.6rem', fontWeight: '900', color: '#78716C', letterSpacing: '0.12em', paddingLeft: '0.25rem', marginBottom: '0.3rem' }}>
        {label}
      </p>
    ) : (
      <div style={{ height: '1px', background: 'rgba(255,255,255,0.07)', margin: '0.25rem 0' }} />
    );

  return (
    <>
      {/* Dark backdrop — mobile only, dismisses sidebar on tap */}
      {isMobile && isExpanded && (
        <div onClick={closeSidebar} style={{
          position: 'fixed', inset: 0, zIndex: 99,
          background: 'rgba(0,0,0,0.5)',
        }} />
      )}

      {/* Floating hamburger — mobile only, visible when sidebar is hidden */}
      {isMobile && !isExpanded && (
        <button onClick={toggleSidebar} style={{
          position: 'fixed', top: '0.875rem', left: '0.875rem', zIndex: 101,
          width: '38px', height: '38px', borderRadius: '10px',
          background: '#1C1917', border: '1px solid rgba(255,255,255,0.12)',
          color: '#A8A29E', display: 'flex', alignItems: 'center',
          justifyContent: 'center', cursor: 'pointer',
          boxShadow: '0 4px 16px rgba(0,0,0,0.35)',
        }}>
          <Menu size={18} />
        </button>
      )}

      <div style={{
        width: isExpanded ? 'var(--sidebar-width-expanded)' : 'var(--sidebar-width-collapsed)',
        height: '100vh',
        position: 'fixed',
        left: 0, top: 0, zIndex: 100,
        background: '#1C1917',
        borderRight: '1px solid rgba(255,255,255,0.06)',
        display: 'flex',
        flexDirection: 'column',
        /* On mobile: slide fully off-screen when closed, full-width when open */
        transform: isMobile && !isExpanded ? 'translateX(-100%)' : 'translateX(0)',
        transition: 'transform 0.28s ease, width 0.28s ease',
        overflow: 'hidden',
      }}
      >
      {/* Header */}
      <div style={{
        padding: '1.2rem 0.85rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: isExpanded ? 'space-between' : 'center',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
        flexShrink: 0,
      }}>
        {isExpanded && (
          <h1 style={{ fontSize: '1.25rem', fontWeight: '900', color: 'white', margin: 0 }}>
            Marmite<span style={{ color: 'var(--accent-primary)' }}> d'Or</span>
          </h1>
        )}
        <button
          onClick={toggleSidebar}
          style={{
            background: 'rgba(255,255,255,0.08)',
            border: 'none',
            color: '#A8A29E',
            width: '30px', height: '30px',
            borderRadius: '8px',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer',
            flexShrink: 0,
          }}
        >
          {isExpanded ? <ChevronLeft size={15} /> : <ChevronRight size={15} />}
        </button>
      </div>

      {/* Navigation */}
      <nav style={{ flex: 1, overflowY: 'auto', padding: '0.85rem', display: 'flex', flexDirection: 'column' }}>

        {sectionLabel('OPÉRATIONS')}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.15rem', marginBottom: '1rem' }}>
          {opsItems.map(item => {
            const Icon = item.icon;
            const active = isActive(item.path);
            return (
              <Link
                key={item.path}
                href={item.path}
                className={`sidebar-item ${active ? 'sidebar-active-item' : ''}`}
                title={!isExpanded ? item.name : ''}
                onClick={isMobile ? closeSidebar : undefined}
                style={itemStyle(active)}
              >
                <Icon size={19} style={{ minWidth: '19px', flexShrink: 0 }} />
                {isExpanded && <span>{item.name}</span>}
              </Link>
            );
          })}
        </div>

        {isExpanded
          ? <p style={{ fontSize: '0.6rem', fontWeight: '900', color: '#78716C', letterSpacing: '0.12em', paddingLeft: '0.25rem', marginBottom: '0.3rem' }}>ADMINISTRATION</p>
          : <div style={{ height: '1px', background: 'rgba(255,255,255,0.07)', margin: '0.25rem 0 0.5rem' }} />
        }
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.15rem' }}>
          {adminItems.map(item => {
            const Icon = item.icon;
            const active = isActive(item.path);
            return (
              <Link
                key={item.path}
                href={item.path}
                className={`sidebar-item ${active ? 'sidebar-active-item' : ''}`}
                title={!isExpanded ? item.name : ''}
                onClick={isMobile ? closeSidebar : undefined}
                style={itemStyle(active)}
              >
                <Icon size={19} style={{ minWidth: '19px', flexShrink: 0 }} />
                {isExpanded && <span>{item.name}</span>}
              </Link>
            );
          })}
        </div>
      </nav>

      {/* Footer */}
      <div style={{ padding: '0.85rem', borderTop: '1px solid rgba(255,255,255,0.06)', flexShrink: 0 }}>
        {isExpanded ? (
          <div style={{ padding: '0.875rem 1rem', background: 'rgba(249, 115, 22, 0.08)', borderRadius: '10px', border: '1px solid rgba(249, 115, 22, 0.14)' }}>
            {profile && (
              <div style={{ marginBottom: '0.6rem' }}>
                <p style={{ fontSize: '0.78rem', fontWeight: '800', color: '#E7E5E4', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{profile.name}</p>
                <p style={{ fontSize: '0.62rem', color: '#78716C', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{profile.role}</p>
              </div>
            )}
            <button onClick={signOut} style={{ background: 'var(--accent-primary)', color: 'white', border: 'none', padding: '0.55rem 1rem', borderRadius: '8px', fontWeight: '700', fontSize: '0.75rem', cursor: 'pointer', width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem' }}>
              <LogOut size={13} /> Déconnexion
            </button>
          </div>
        ) : (
          <button onClick={signOut} title="Déconnexion" style={{ width: '100%', background: 'transparent', border: 'none', color: '#78716C', display: 'flex', justifyContent: 'center', cursor: 'pointer', padding: '0.5rem' }}>
            <LogOut size={20} />
          </button>
        )}
      </div>
      </div>
    </>
  );
}

export default function Sidebar() {
  return (
    <Suspense fallback={
      <div style={{ width: 'var(--sidebar-width-collapsed)', height: '100vh', position: 'fixed', background: '#1C1917', borderRight: '1px solid rgba(255,255,255,0.06)' }} />
    }>
      <SidebarContent />
    </Suspense>
  );
}
