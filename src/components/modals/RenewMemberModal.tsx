'use client';

import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { FilterChip } from '@/components/ui/FilterChip';
import { useApp } from '@/context/AppContext';
import { useToast } from '@/components/ui/Toast';
import { processPaymentAndRenewal } from '@/lib/actions';
import { calcEndDate } from '@/lib/dateUtils';
import { Member } from '@/types';

interface RenewMemberModalProps {
  isOpen: boolean;
  onClose: () => void;
  member: Member;
}

export const RenewMemberModal: React.FC<RenewMemberModalProps> = ({ isOpen, onClose, member }) => {
  const { state, dispatch } = useApp();
  const { showToast } = useToast();
  const today = format(new Date(), 'yyyy-MM-dd');
  const [amount, setAmount] = useState('');
  const [payMode, setPayMode] = useState<'Cash' | 'UPI'>('Cash');
  const [startDate, setStartDate] = useState(today);
  const [endDate, setEndDate] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      setStartDate(today);
      const ms = calcEndDate(new Date(today).getTime(), member.durationLabel);
      setEndDate(format(ms, 'yyyy-MM-dd'));
      setAmount(''); setError('');
    }
  }, [isOpen, member.durationLabel, today]);

  useEffect(() => {
    const ms = calcEndDate(new Date(startDate).getTime(), member.durationLabel);
    setEndDate(format(ms, 'yyyy-MM-dd'));
  }, [startDate, member.durationLabel]);

  const handleConfirm = () => {
    if (!amount || Number(amount) <= 0) { setError('Amount is required.'); return; }

    processPaymentAndRenewal(dispatch, state, {
      memberId: member.id,
      amount: Number(amount),
      paymentMode: payMode,
      planName: member.planName,
      batch: member.batch,
      startDate: new Date(startDate).getTime(),
      endDate: new Date(endDate).getTime(),
      notes: 'Renewal payment',
    });
    showToast(`Membership renewed for ${member.name}! ✓`);
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Renew — ${member.name}`}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button variant="primary" onClick={handleConfirm}>Confirm Renewal</Button>
        </>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
        <Input label="Amount Collecting (₹)" type="number" value={amount} onChange={e => { setAmount(e.target.value); setError(''); }} error={error} />
        <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
          <FilterChip label="Cash" selected={payMode === 'Cash'} onClick={() => setPayMode('Cash')} />
          <FilterChip label="UPI" selected={payMode === 'UPI'} onClick={() => setPayMode('UPI')} />
        </div>
        <Input label="New Start Date" type="date" value={startDate} onChange={e => setStartDate(e.target.value)} />
        <Input label="New End Date (Auto)" value={endDate} readOnly disabled />
      </div>
    </Modal>
  );
};
