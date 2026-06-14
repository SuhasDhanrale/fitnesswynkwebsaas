'use client';

import React, { useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { addExpense } from '@/lib/actions';
import { queryClient } from '@/lib/queryClient';
import { useToast } from '@/components/ui/Toast';

interface AddExpenseModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AddExpenseModal: React.FC<AddExpenseModalProps> = ({ isOpen, onClose }) => {
  const { showToast } = useToast();
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [notes, setNotes] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleConfirm = async () => {
    const errs: Record<string, string> = {};
    if (!title.trim()) errs.title = 'Title is required.';
    if (!amount || Number(amount) <= 0) errs.amount = 'Amount is required.';
    if (Object.keys(errs).length) { setErrors(errs); return; }

    const result = await addExpense({
      title: title.trim(),
      amount: Number(amount),
      notes: notes.trim(),
    });

    if (result.error) {
      showToast(`Failed to add expense: ${result.error}`, 'error');
      return;
    }

    queryClient.invalidateQueries({ queryKey: ['expenses'] });
    queryClient.invalidateQueries({ queryKey: ['finance_stats'] });
    queryClient.invalidateQueries({ queryKey: ['finance_summary'] });

    showToast(`Expense "${title.trim()}" added! ✓`);
    setTitle(''); setAmount(''); setNotes(''); setErrors({});
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Add Expense"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button variant="primary" onClick={handleConfirm}>Add Expense</Button>
        </>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
        <Input label='Title (e.g. "Rent")' value={title} onChange={e => setTitle(e.target.value)} error={errors.title} />
        <Input label="Amount (₹)" type="number" value={amount} onChange={e => setAmount(e.target.value)} error={errors.amount} />
        <Input label="Notes (optional)" value={notes} onChange={e => setNotes(e.target.value)} />
      </div>
    </Modal>
  );
};
