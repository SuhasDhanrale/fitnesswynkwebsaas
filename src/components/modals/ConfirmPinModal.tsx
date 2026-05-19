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

const ADMIN_PIN = '913291';

export const ConfirmPinModal: React.FC<ConfirmPinModalProps> = ({
  isOpen, onClose, onConfirm,
  title = 'Confirm Action',
  description = 'Enter the admin PIN to continue.',
}) => {
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');

  const handleConfirm = () => {
    if (pin === ADMIN_PIN) {
      setPin('');
      setError('');
      onConfirm();
      onClose();
    } else {
      setError('Incorrect PIN. Please try again.');
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
          <Button variant="ghost" onClick={handleClose}>Cancel</Button>
          <Button variant="danger" onClick={handleConfirm}>Confirm</Button>
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
