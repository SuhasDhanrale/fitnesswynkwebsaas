import React from 'react';
import styles from './Badge.module.css';

type Status = 'active' | 'expired' | 'warning' | 'converted' | 'due';

interface BadgeProps {
  status: Status;
  value?: string | number;
}

const statusLabels: Record<Status, string> = {
  active: 'ACTIVE',
  expired: 'EXPIRED',
  warning: 'EXPIRING',
  converted: 'CONVERTED ✓',
  due: 'DUE',
};

export const Badge: React.FC<BadgeProps> = ({ status, value }) => {
  const classes = `${styles.badge} ${styles[status]}`;
  const label = status === 'due' && value ? `DUE ₹${value}` : statusLabels[status];

  return <span className={classes}>{label}</span>;
};
