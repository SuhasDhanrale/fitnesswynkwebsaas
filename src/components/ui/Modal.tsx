'use client';

import React, { ReactNode, useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import styles from './Modal.module.css';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  footer?: ReactNode;
  /** When true, overlay click & Escape are blocked. Show a confirm before closing. */
  isDirty?: boolean;
  /** Custom message for dirty-close confirm dialog */
  dirtyMessage?: string;
}

export const Modal: React.FC<ModalProps> = ({
  isOpen, onClose, title, children, footer,
  isDirty = false,
  dirtyMessage = 'You have unsaved changes. Discard and close?',
}) => {
  const modalRef = useRef<HTMLDivElement>(null);

  const requestClose = () => {
    if (isDirty) {
      if (!window.confirm(dirtyMessage)) return; // user hit Cancel → stay open
    }
    onClose();
  };

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        requestClose();
      }

      // Focus trap
      if (e.key === 'Tab' && modalRef.current) {
        const focusableElements = modalRef.current.querySelectorAll(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        const firstElement = focusableElements[0] as HTMLElement;
        const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;

        if (e.shiftKey) {
          if (document.activeElement === firstElement) {
            lastElement.focus();
            e.preventDefault();
          }
        } else {
          if (document.activeElement === lastElement) {
            firstElement.focus();
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
  }, [isOpen, isDirty, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className={styles.overlay}
      onClick={requestClose}
    >
      <div
        className={styles.modal}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        ref={modalRef}
        tabIndex={-1}
      >
        <div className={styles.header}>
          <h2 id="modal-title" className={`text-h2 ${styles.title}`}>{title}</h2>
          <button className={styles.closeButton} onClick={requestClose} aria-label="Close">
            <X size={24} />
          </button>
        </div>
        <div className={styles.body}>{children}</div>
        {footer && <div className={styles.footer}>{footer}</div>}
      </div>
    </div>
  );
};

