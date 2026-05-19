'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard, Users, CheckSquare, AlertTriangle,
  Wallet, PhoneCall, Megaphone, Settings,
} from 'lucide-react';
import styles from './Sidebar.module.css';

const navItems = [
  { label: 'Dashboard',  icon: LayoutDashboard, route: '/' },
  { label: 'Members',    icon: Users,            route: '/members' },
  { label: 'Attendance', icon: CheckSquare,      route: '/attendance' },
  { label: 'Renewals',   icon: AlertTriangle,    route: '/renewals' },
  { label: 'Finances',   icon: Wallet,           route: '/finances' },
  { label: 'Enquiries',  icon: PhoneCall,        route: '/enquiries' },
  { label: 'Marketing',  icon: Megaphone,        route: '/marketing' },
  { label: 'Settings',   icon: Settings,         route: '/settings' },
];

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  gymName?: string;
}

export const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose, gymName = 'FitnessWynk' }) => {
  const pathname = usePathname();

  return (
    <>
      {/* Mobile overlay */}
      <div
        className={`${styles.overlay} ${isOpen ? styles.show : ''}`}
        onClick={onClose}
      />

      <aside className={`${styles.sidebar} ${isOpen ? styles.open : ''}`}>
        {/* Logo / Gym Name */}
        <Link href="/" className={styles.logo} onClick={onClose}>
          <div className={styles.logoMark}>FW</div>
          <div>
            <div className={styles.gymName}>{gymName}</div>
            <div className={styles.gymSub}>Admin Panel</div>
          </div>
        </Link>

        {/* Navigation */}
        <nav className={styles.nav}>
          {navItems.map(({ label, icon: Icon, route }) => {
            const isActive = pathname === route;
            return (
              <Link
                key={route}
                href={route}
                prefetch={true}
                className={`${styles.navItem} ${isActive ? styles.active : ''}`}
                onClick={onClose}
                title={label}
              >
                <Icon size={20} className={styles.navIcon} />
                <span className={styles.navLabel}>{label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Footer */}
        <div className={styles.footer}>FitnessWynk Admin v1.0.0</div>
      </aside>
    </>
  );
};
