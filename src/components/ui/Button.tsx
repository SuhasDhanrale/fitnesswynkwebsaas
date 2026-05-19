'use client';

import React, { ButtonHTMLAttributes } from 'react';
import * as Icons from 'lucide-react';
import styles from './Button.module.css';

type Variant = 'primary' | 'dark' | 'ghost' | 'danger' | 'whatsapp';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  icon?: keyof typeof Icons;
  fullWidth?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  icon,
  fullWidth,
  className = '',
  children,
  ...props
}) => {
  const IconComponent = icon ? (Icons[icon] as React.ElementType) : null;
  const classes = [
    styles.button,
    styles[variant],
    fullWidth ? styles.fullWidth : '',
    className,
  ].filter(Boolean).join(' ');

  return (
    <button className={classes} {...props}>
      {IconComponent && <IconComponent size={20} />}
      {children && <span>{children}</span>}
    </button>
  );
};
