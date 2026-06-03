'use client';

import React, { useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';

interface ConfirmPinModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title?: string;
  description?: string;
}


export const ConfirmPinModal: React.FC<ConfirmPinModalProps> = ({
  isOpen, onClose, onConfirm,
  title = 'Confirm Action',
  description = 'Enter the admin PIN to continue.',
}) => {
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');

  const [isLoading, setIsLoading] = useState(false);

  const handleConfirm = async () => {
    setIsLoading(true);
    setError('');
    
    try {
      const res = await fetch('/api/verify-pin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin }),
      });
      const data = await res.json();
      
      if (data.ok) {
        setPin('');
        onConfirm();
        onClose();
      } else {
        setError(data.error || 'Incorrect PIN. Please try again.');
      }
    } catch (err) {
      setError('Error verifying PIN.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setPin('');
    setError('');
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={title}
      footer={
        <>
          <Button variant="ghost" onClick={handleClose} disabled={isLoading}>Cancel</Button>
          <Button variant="danger" onClick={handleConfirm} disabled={isLoading}>
            {isLoading ? 'Checking...' : 'Confirm'}
          </Button>
        </>
      }
    >
      <p style={{ marginBottom: '8px', color: 'var(--color-text-secondary)' }}>{description}</p>
      <Input
        label="Admin PIN"
        type="password"
        value={pin}
        onChange={e => { setPin(e.target.value); setError(''); }}
        onKeyDown={e => e.key === 'Enter' && handleConfirm()}
        error={error}
        autoFocus
      />
    </Modal>
  );
};
