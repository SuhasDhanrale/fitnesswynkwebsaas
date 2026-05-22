'use client';

import React, { ReactNode, useState } from 'react';
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
  const { state } = useApp();
  const { currentUser, logout } = useAuth();

  if (!currentUser) {
    return <ProfilePicker />;
  }

  const title =
    pageTitles[pathname] ??
    (pathname.startsWith('/members/') ? 'Member Detail' : 'FitnessWynk');

  return (
    <div className={styles.shell}>
      <CommandPalette />
      <Sidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
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
        <main key={pathname} className={styles.content}>{children}</main>
      </div>
    </div>
  );
};
