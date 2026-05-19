import React from 'react';
import * as Icons from 'lucide-react';
import styles from './StatCard.module.css';

interface StatCardProps {
  label: string;
  value: string | number;
  icon?: keyof typeof Icons;
  bgColor?: string;
  onClick?: () => void;
  trend?: string;
}

export const StatCard: React.FC<StatCardProps> = ({
  label,
  value,
  icon,
  bgColor = 'var(--color-surface)',
  onClick,
  trend,
}) => {
  const IconComponent = icon ? (Icons[icon] as React.ElementType) : null;
  const cardClasses = [styles.card, onClick ? styles.clickable : ''].filter(Boolean).join(' ');

  return (
    <div className={cardClasses} onClick={onClick} style={{ background: bgColor }}>
      <div className={styles.content}>
        <span className="text-stat">{value}</span>
        <span className="text-label" style={{ color: 'var(--color-text-secondary)' }}>
          {label}
        </span>
        {trend && <span className="text-sm">{trend}</span>}
      </div>
      {IconComponent && (
        <div className={styles.icon}>
          <IconComponent size={24} />
        </div>
      )}
    </div>
  );
};
