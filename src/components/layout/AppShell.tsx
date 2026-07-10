'use client';

import React, { ReactNode, useEffect, useState } from 'react';
import { Sidebar } from './Sidebar';
import { TopBar } from './TopBar';
import { useApp } from '@/context/AppContext';
import { useAuth } from '@/context/AuthContext';
import { ProfilePicker } from '@/components/auth/ProfilePicker';
import { CommandPalette } from '@/components/ui/CommandPalette';
import styles from './AppShell.module.css';
import { usePathname } from 'next/navigation';

const pageTitles: Record<string, string> = {
  '/':           'Dashboard',
  '/tasks':      'Tasks',
  '/members':    'Members',
  '/attendance': 'Attendance',
  '/renewals':   'Renewals',
  '/finances':   'Finances',
  '/enquiries':  'Enquiries',
  '/marketing':  'Marketing',
  '/insights':   'Insights',
  '/settings':   'Settings',
};

interface AppShellProps {
  children: ReactNode;
  actions?: ReactNode;
}

export const AppShell: React.FC<AppShellProps> = ({ children, actions }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const pathname = usePathname();
  const [activePath, setActivePath] = useState(pathname);
  const { state } = useApp();
  const { currentUser, logout } = useAuth();

  useEffect(() => {
    setActivePath(pathname);
  }, [pathname]);

  if (!currentUser) {
    return <ProfilePicker />;
  }

  const title =
    pageTitles[activePath] ??
    (activePath.startsWith('/members/') ? 'Member Detail' : 'FitnessWynk');

  return (
    <div className={styles.shell}>
      <CommandPalette />
      <Sidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        activePath={activePath}
        onNavigate={setActivePath}
        gymName={state.settings.gymName}
      />
      <div className={styles.main}>
        <TopBar
          title={title}
          actions={actions}
          onMenuClick={() => setSidebarOpen(true)}
          currentUser={currentUser}
          onSwitchUser={logout}
        />
        <main className={styles.content}>{children}</main>
      </div>
    </div>
  );
};
