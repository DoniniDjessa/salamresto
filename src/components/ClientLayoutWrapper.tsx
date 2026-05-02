"use client";
import React from 'react';
import { useSidebar } from '@/context/SidebarContext';

const ClientLayoutWrapper = ({ children }: { children: React.ReactNode }) => {
  const { isExpanded } = useSidebar();

  return (
    <main 
      className="main-content" 
      style={{ 
        marginLeft: isExpanded ? 'var(--sidebar-width-expanded)' : 'var(--sidebar-width-collapsed)',
        minHeight: '100vh',
        transition: 'margin-left 0.3s ease'
      }}
    >
      {children}
    </main>
  );
};

export default ClientLayoutWrapper;
