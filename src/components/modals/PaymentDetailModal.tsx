'use client';

import React from 'react';
import { format } from 'date-fns';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Payment } from '@/types';
import { useState } from 'react';
import { useToast } from '@/components/ui/Toast';
import { correctPaymentAmount } from '@/lib/actions';
import { queryClient } from '@/lib/queryClient';

interface PaymentDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  payment: Payment | null;
}

export const PaymentDetailModal: React.FC<PaymentDetailModalProps> = ({ isOpen, onClose, payment }) => {
  const { showToast } = useToast();
  const [mode, setMode] = useState<'VIEW' | 'PIN' | 'EDIT'>('VIEW');
  const [pin, setPin] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [newAmount, setNewAmount] = useState('');
  const [reason, setReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Reset state when modal opens/closes
  React.useEffect(() => {
    if (isOpen) {
      setMode('VIEW');
      setPin('');
      setNewAmount(payment?.amount.toString() || '');
      setReason('');
    }
  }, [isOpen, payment]);

  if (!payment) return null;

  const handleVerifyPin = async () => {
    if (pin.length !== 4) {
      showToast('PIN must be 4 digits');
      return;
    }
    setIsVerifying(true);
    try {
      const res = await fetch('/api/verify-pin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin }),
      });
      if (res.ok) {
        setMode('EDIT');
      } else {
        showToast('Incorrect PIN');
      }
    } catch (error) {
      console.error(error);
      showToast('Error verifying PIN');
    } finally {
      setIsVerifying(false);
    }
  };

  const handleSubmitCorrection = async () => {
    if (!newAmount || isNaN(Number(newAmount))) {
      showToast('Please enter a valid amount');
      return;
    }
    if (!reason.trim()) {
      showToast('Reason is required for auditing');
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await correctPaymentAmount(
        payment.id,
        payment.amount,
        Number(newAmount),
        reason.trim()
      );

      if (result.error) throw new Error(result.error);

      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['finances'] }),
        queryClient.invalidateQueries({ queryKey: ['members'] }),
        queryClient.invalidateQueries({ queryKey: ['member-payments'] })
      ]);
      
      showToast('Payment amount corrected successfully');
      onClose();
    } catch (e) {
      console.error(e);
      showToast('Failed to correct payment');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal 
      isOpen={isOpen} 
      onClose={onClose} 
      title={mode === 'VIEW' ? "Payment Details" : mode === 'PIN' ? "Admin Verification" : "Correct Amount"} 
      footer={
        <>
          <Button variant="ghost" onClick={() => mode === 'VIEW' ? onClose() : setMode('VIEW')}>
            {mode === 'VIEW' ? 'Close' : 'Cancel'}
          </Button>
          {mode === 'VIEW' && (
            <Button variant="danger" onClick={() => setMode('PIN')}>Correct Amount</Button>
          )}
          {mode === 'PIN' && (
            <Button variant="primary" onClick={handleVerifyPin} disabled={isVerifying}>
              {isVerifying ? 'Verifying...' : 'Verify PIN'}
            </Button>
          )}
          {mode === 'EDIT' && (
            <Button variant="primary" onClick={handleSubmitCorrection} disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : 'Save Correction'}
            </Button>
          )}
        </>
      }
    >
      {mode === 'VIEW' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
          {[
            { label: 'Member', value: payment.memberName },
            { label: 'Amount', value: `₹${payment.amount}` + (payment.isEdited ? ' (✏️ Edited)' : '') },
            { label: 'Mode', value: payment.paymentMode },
            { label: 'Date', value: format(payment.timestamp, 'dd MMM yyyy, hh:mm a') },
            payment.planName && { label: 'Plan', value: payment.planName },
            payment.batch && { label: 'Batch', value: payment.batch },
            payment.notes && { label: 'Notes', value: payment.notes },
          ].filter(Boolean).map((row: { label: string; value: string } | false | "" | undefined) => {
            if (!row) return null;
            return (
            <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0', borderBottom: '1px solid var(--color-border)' }}>
              <span style={{ color: 'var(--color-text-secondary)', fontSize: '14px' }}>{row.label}</span>
              <span style={{ fontWeight: 600 }}>{row.value}</span>
            </div>
            );
          })}
        </div>
      )}

      {mode === 'PIN' && (
        <div style={{ padding: '20px 0', display: 'flex', flexDirection: 'column', gap: '16px', alignItems: 'center' }}>
          <p style={{ textAlign: 'center', color: 'var(--color-text-secondary)' }}>
            Please enter the admin PIN to authorize correcting this payment amount.
          </p>
          <div style={{ maxWidth: '200px', width: '100%' }}>
            <Input 
              type="password" 
              label="Admin PIN" 
              maxLength={4} 
              value={pin} 
              onChange={e => setPin(e.target.value.replace(/\D/g, ''))} 
              placeholder="••••"
              style={{ textAlign: 'center', letterSpacing: '8px', fontSize: '24px' }}
            />
          </div>
        </div>
      )}

      {mode === 'EDIT' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', paddingTop: '10px' }}>
          <div style={{ padding: '12px', background: 'var(--color-background-alt)', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)' }}>
            <p style={{ margin: 0, fontSize: '13px', color: 'var(--color-text-secondary)' }}>Original Amount Recorded</p>
            <p style={{ margin: '4px 0 0 0', fontSize: '18px', fontWeight: 600, color: 'var(--color-text)' }}>₹{payment.amount}</p>
          </div>
          
          <Input 
            label="New Correct Amount (₹)" 
            type="number" 
            value={newAmount} 
            onChange={e => setNewAmount(e.target.value)} 
          />
          
          <div>
            <label className="text-label" style={{ marginBottom: '8px', display: 'block' }}>Reason for Correction</label>
            <textarea
              rows={3}
              value={reason}
              onChange={e => setReason(e.target.value)}
              placeholder="e.g. Added an extra zero by mistake"
              style={{ width: '100%', padding: '12px', border: '1.5px solid var(--color-border)', borderRadius: 'var(--radius-md)', fontFamily: 'var(--font-body)', fontSize: '14px', resize: 'vertical' }}
            />
          </div>
        </div>
      )}
    </Modal>
  );
};
