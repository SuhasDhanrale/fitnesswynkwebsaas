'use client';

import React from 'react';
import styles from './FilterChip.module.css';

interface FilterChipProps {
  label: string;
  selected: boolean;
  onClick: () => void;
  dotColor?: string;
}

export const FilterChip: React.FC<FilterChipProps> = ({ label, selected, onClick, dotColor }) => {
  return (
    <button
      className={`${styles.chip} ${selected ? styles.selected : ''}`}
      onClick={onClick}
    >
      {dotColor && (
        <span
          className={styles.dot}
          style={{ backgroundColor: dotColor }}
        />
      )}
      {label}
    </button>
  );
};
