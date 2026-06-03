'use client';

import React, { ReactNode } from 'react';
import { Menu } from 'lucide-react';
import styles from './TopBar.module.css';

interface TopBarProps {
  title: string;
  actions?: ReactNode;
  onMenuClick: () => void;
  currentUser?: string | null;
  onSwitchUser?: () => void;
}

export const TopBar: React.FC<TopBarProps> = ({ title, actions, onMenuClick, currentUser, onSwitchUser }) => {
  return (
    <header className={styles.topBar}>
      <div className={styles.left}>
        <button className={styles.hamburger} onClick={onMenuClick} aria-label="Open menu">
          <Menu size={24} />
        </button>
        <h1 className={styles.title}>{title}</h1>
        <div id="topbar-portal" className={styles.titlePortal} />
      </div>
      <div className={styles.right}>
        {actions}
        {currentUser && (
          <button className={styles.userChip} onClick={onSwitchUser} title="Switch user">
            <div className={styles.userAvatar}>{currentUser[0].toUpperCase()}</div>
            <span className={styles.userName}>{currentUser}</span>
          </button>
        )}
      </div>
    </header>
  );
};
