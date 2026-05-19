'use client';

import React, { ReactNode } from 'react';
import { Menu } from 'lucide-react';
import styles from './TopBar.module.css';

interface TopBarProps {
  title: string;
  actions?: ReactNode;
  onMenuClick: () => void;
}

export const TopBar: React.FC<TopBarProps> = ({ title, actions, onMenuClick }) => {
  return (
    <header className={styles.topBar}>
      <div className={styles.left}>
        <button className={styles.hamburger} onClick={onMenuClick} aria-label="Open menu">
          <Menu size={24} />
        </button>
        <h1 className={styles.title}>{title}</h1>
      </div>
      {actions && <div className={styles.right}>{actions}</div>}
    </header>
  );
};
