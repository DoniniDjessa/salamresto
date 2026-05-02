"use client";
import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  LayoutDashboard, 
  ShoppingBag, 
  Heart, 
  MessageSquare, 
  History, 
  Receipt, 
  Settings,
  ChevronLeft,
  ChevronRight,
  LogOut,
  Monitor,
  Smartphone,
  ChefHat,
  Truck,
  CreditCard,
  BarChart3,
  Bell,
  Wallet
} from 'lucide-react';
import { useSidebar } from '@/context/SidebarContext';

const Sidebar = () => {
  const pathname = usePathname();
  const { isExpanded, toggleSidebar } = useSidebar();

  const navItems = [
    { name: 'Tableau de bord', icon: LayoutDashboard, path: '/' },
    { name: 'Tables', icon: Monitor, path: '/tables' },
    // { name: 'Alertes', icon: Bell, path: '/alerts' },
    { name: 'Vente Salle', icon: Monitor, path: '/pos' },
    { name: 'Commande Web', icon: Smartphone, path: '/client/order' },
    { name: 'Écran Cuisine', icon: ChefHat, path: '/kitchen' },
    { name: 'Logistique', icon: Truck, path: '/delivery' },
    { name: 'Dépenses', icon: CreditCard, path: '/expenses' },
    { name: 'Revenus', icon: BarChart3, path: '/revenues' },
    { name: 'Historique', icon: History, path: '/history' },
    { name: 'Administration', icon: Settings, path: '/admin' },
    { name: 'Paramètres', icon: Settings, path: '/settings' },
  ];

  return (
    <div 
      className="sidebar-container"
      style={{ 
        width: isExpanded ? 'var(--sidebar-width-expanded)' : 'var(--sidebar-width-collapsed)', 
        height: '100vh', 
        position: 'fixed', 
        left: 0, 
        top: 0, 
        zIndex: 100,
        background: 'var(--bg-secondary)',
        borderRight: '1px solid var(--border-color)',
        display: 'flex',
        flexDirection: 'column',
        transition: 'width 0.3s ease'
      }}
    >
      {/* Sidebar Header */}
      <div style={{ padding: '1.5rem 1rem', display: 'flex', alignItems: 'center', justifyContent: isExpanded ? 'space-between' : 'center', marginBottom: '1rem' }}>
        {isExpanded && (
            <h1 style={{ fontSize: '1.5rem', fontWeight: '900', color: 'white', margin: 0 }}>
                FoodMeal<span style={{ color: 'var(--accent-primary)' }}>.</span>
            </h1>
        )}
        <button 
            onClick={toggleSidebar}
            style={{ 
                background: 'var(--bg-tertiary)', 
                border: 'none', 
                color: 'white', 
                width: '32px', 
                height: '32px', 
                borderRadius: '8px', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center',
                cursor: 'pointer'
            }}
        >
            {isExpanded ? <ChevronLeft size={18} /> : <ChevronRight size={18} />}
        </button>
      </div>

      {/* Navigation */}
      <nav style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', padding: '0 1rem' }}>
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.path;
          
          return (
            <Link 
              key={item.path} 
              href={item.path}
              className={`sidebar-item ${isActive ? 'sidebar-active-item' : ''}`}
              title={!isExpanded ? item.name : ''}
              style={{ 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: isExpanded ? 'flex-start' : 'center',
                gap: isExpanded ? '1rem' : '0', 
                padding: isExpanded ? '0.8rem 1.2rem' : '0.8rem', 
                margin: isExpanded ? '0' : '0 0.5rem',
                borderRadius: '12px',
                color: isActive ? 'white' : 'var(--text-secondary)',
                textDecoration: 'none',
                fontWeight: '600',
                transition: 'all 0.2s',
                whiteSpace: 'nowrap',
              }}
            >
              <Icon size={22} style={{ minWidth: '22px' }} />
              {isExpanded && <span>{item.name}</span>}
            </Link>
          );
        })}
      </nav>

      {/* Footer / Logout */}
      <div style={{ marginTop: 'auto', padding: '1rem' }}>
        {isExpanded ? (
            <div className="glass-panel" style={{ padding: '1.2rem', background: 'var(--accent-primary)', borderRadius: '20px', textAlign: 'center', color: 'white' }}>
                <p style={{ fontSize: '0.8rem', fontWeight: '600', marginBottom: '0.8rem' }}>Besoin de quitter ?</p>
                <button style={{ background: 'black', color: 'white', border: 'none', padding: '0.8rem 1.2rem', borderRadius: '12px', fontWeight: '700', fontSize: '0.8rem', cursor: 'pointer', width: '100%' }}>Déconnexion</button>
            </div>
        ) : (
            <button style={{ 
                width: '100%', 
                background: 'transparent', 
                border: 'none', 
                color: 'var(--text-muted)', 
                display: 'flex', 
                justifyContent: 'center',
                cursor: 'pointer'
            }}>
                <LogOut size={22} />
            </button>
        )}
      </div>
    </div>
  );
};

export default Sidebar;
