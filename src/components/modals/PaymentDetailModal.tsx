'use client';

import React from 'react';
import { format } from 'date-fns';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Payment } from '@/types';

interface PaymentDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  payment: Payment | null;
}

export const PaymentDetailModal: React.FC<PaymentDetailModalProps> = ({ isOpen, onClose, payment }) => {
  if (!payment) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Payment Details" footer={<Button variant="ghost" onClick={onClose}>Close</Button>}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
        {[
          { label: 'Member', value: payment.memberName },
          { label: 'Amount', value: `₹${payment.amount}` },
          { label: 'Mode', value: payment.paymentMode },
          { label: 'Date', value: format(payment.timestamp, 'dd MMM yyyy, hh:mm a') },
          payment.planName && { label: 'Plan', value: payment.planName },
          payment.batch && { label: 'Batch', value: payment.batch },
          payment.notes && { label: 'Notes', value: payment.notes },
        ].filter(Boolean).map((row: any) => (
          <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0', borderBottom: '1px solid var(--color-border)' }}>
            <span style={{ color: 'var(--color-text-secondary)', fontSize: '14px' }}>{row.label}</span>
            <span style={{ fontWeight: 600 }}>{row.value}</span>
          </div>
        ))}
      </div>
    </Modal>
  );
};
