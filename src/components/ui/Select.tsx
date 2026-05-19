'use client';

import React, { SelectHTMLAttributes } from 'react';
import { ChevronDown } from 'lucide-react';
import styles from './Select.module.css';

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label: string;
  options: { value: string; label: string }[] | string[];
  error?: string;
  helperText?: string;
}

export const Select: React.FC<SelectProps> = ({
  label,
  options,
  error,
  helperText,
  className = '',
  id,
  ...props
}) => {
  const selectId = id || label.replace(/\s+/g, '-').toLowerCase();
  const hasError = !!error;

  return (
    <div className={`${styles.container} ${hasError ? styles.error : ''} ${className}`}>
      <select id={selectId} className={styles.select} {...props}>
        {options.map((opt, idx) => {
          const val = typeof opt === 'string' ? opt : opt.value;
          const lbl = typeof opt === 'string' ? opt : opt.label;
          return (
            <option key={idx} value={val}>
              {lbl}
            </option>
          );
        })}
      </select>
      <label htmlFor={selectId} className={styles.label}>
        {label}
      </label>
      <div className={styles.icon}>
        <ChevronDown size={20} />
      </div>
      {(error || helperText) && (
        <span className={styles.helperText}>{error || helperText}</span>
      )}
    </div>
  );
};
