'use client';

import React, { InputHTMLAttributes } from 'react';
import styles from './Input.module.css';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
  helperText?: string;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(({
  label,
  error,
  helperText,
  className = '',
  id,
  ...props
}, ref) => {
  const inputId = id || label.replace(/\s+/g, '-').toLowerCase();
  const hasError = !!error;

  return (
    <div className={`${styles.container} ${hasError ? styles.error : ''} ${className}`}>
      <input
        ref={ref}
        id={inputId}
        className={styles.input}
        placeholder=" "
        aria-invalid={hasError}
        aria-describedby={(error || helperText) ? `${inputId}-help` : undefined}
        {...props}
      />
      <label htmlFor={inputId} className={styles.label}>
        {label}
      </label>
      {(error || helperText) && (
        <span id={`${inputId}-help`} className={styles.helperText}>
          {error || helperText}
        </span>
      )}
    </div>
  );
});

Input.displayName = 'Input';
