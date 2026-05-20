'use client';

import React, { ReactNode, useEffect, useRef, useCallback } from 'react';
import { X } from 'lucide-react';
import styles from './Drawer.module.css';

interface DrawerProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  footer?: ReactNode;
  width?: string;
}

export const Drawer: React.FC<DrawerProps> = ({
  isOpen, onClose, title, children, footer, width = '500px'
}) => {
  const drawerRef = useRef<HTMLDivElement>(null);

  const requestClose = useCallback(() => {
    onClose();
  }, [onClose]);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        requestClose();
      }

      // Focus trap
      if (e.key === 'Tab' && drawerRef.current) {
        const focusableElements = drawerRef.current.querySelectorAll(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        const firstElement = focusableElements[0] as HTMLElement;
        const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;

        if (e.shiftKey) {
          if (document.activeElement === firstElement) {
            lastElement?.focus();
            e.preventDefault();
          }
        } else {
          if (document.activeElement === lastElement) {
            firstElement?.focus();
            e.preventDefault();
          }
        }
      }
    };

    if (isOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKey);
    } else {
      document.body.style.overflow = 'auto';
    }
    return () => {
      document.body.style.overflow = 'auto';
      window.removeEventListener('keydown', handleKey);
    };
  }, [isOpen, requestClose]);

  if (!isOpen) return null;

  return (
    <>
      <div className={styles.overlay} onClick={requestClose} />
      <div
        className={styles.drawer}
        style={{ maxWidth: width }}
        role="dialog"
        aria-modal="true"
        ref={drawerRef}
        tabIndex={-1}
      >
        {title && (
          <div className={styles.header}>
            <h2 id="drawer-title" className={`text-h2 ${styles.title}`}>{title}</h2>
            <button className={styles.closeButton} onClick={requestClose} aria-label="Close">
              <X size={24} />
            </button>
          </div>
        )}
        {!title && (
          <button 
            className={styles.closeButton} 
            onClick={requestClose} 
            aria-label="Close" 
            style={{ position: 'absolute', top: '16px', right: '16px', zIndex: 10 }}
          >
            <X size={24} />
          </button>
        )}
        <div className={styles.body}>{children}</div>
        {footer && <div className={styles.footer}>{footer}</div>}
      </div>
    </>
  );
};
