import React from 'react';
import styles from './Badge.module.css';

type Status = 'active' | 'expired' | 'warning' | 'converted' | 'due' | 'on_hold' | 'cancelled' | 'inactive';

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
  on_hold: 'ON HOLD',
  cancelled: 'CANCELLED',
  inactive: 'INACTIVE',
};

export const Badge: React.FC<BadgeProps> = ({ status, value }) => {
  const classes = `${styles.badge} ${styles[status] || styles[status.replace('_', '')] || ''}`;
  const label = status === 'due' && value ? `DUE ₹${value}` : statusLabels[status];

  return <span className={classes}>{label}</span>;
};
