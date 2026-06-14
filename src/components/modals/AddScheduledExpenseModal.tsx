'use client';

import React, { useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { addScheduledExpense } from '@/lib/actions';
import { queryClient } from '@/lib/queryClient';
import { useToast } from '@/components/ui/Toast';

interface AddScheduledExpenseModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AddScheduledExpenseModal: React.FC<AddScheduledExpenseModalProps> = ({ isOpen, onClose }) => {
  const { showToast } = useToast();
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [frequency, setFrequency] = useState('monthly');
  const [nextDueDate, setNextDueDate] = useState(
    new Date().toISOString().split('T')[0] // default today
  );
  const [notes, setNotes] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleConfirm = async () => {
    const errs: Record<string, string> = {};
    if (!title.trim()) errs.title = 'Title is required.';
    if (!amount || Number(amount) <= 0) errs.amount = 'Amount is required.';
    if (!nextDueDate) errs.nextDueDate = 'Start date is required.';
    if (Object.keys(errs).length) { setErrors(errs); return; }

    const parsedDate = new Date(nextDueDate);
    parsedDate.setHours(12, 0, 0, 0);

    const result = await addScheduledExpense({
      title: title.trim(),
      amount: Number(amount),
      category: 'Scheduled',
      frequency,
      notes: notes.trim(),
      next_due_date: parsedDate.getTime(),
    });

    if (result.error) {
      showToast(`Failed to add scheduled expense: ${result.error}`, 'error');
      return;
    }

    await queryClient.invalidateQueries({ queryKey: ['scheduled_expenses'] });

    showToast(`Scheduled expense "${title.trim()}" added! ✓`);
    setTitle(''); setAmount(''); setNotes(''); setErrors({});
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Add Scheduled Expense"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button variant="primary" onClick={handleConfirm}>Add Schedule</Button>
        </>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <Input label='Title (e.g. "Gym Rent")' value={title} onChange={e => setTitle(e.target.value)} error={errors.title} />
        <Input label="Amount per instance (₹)" type="number" value={amount} onChange={e => setAmount(e.target.value)} error={errors.amount} />
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <label style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)', fontWeight: 500 }}>Frequency</label>
          <select 
            value={frequency} 
            onChange={e => setFrequency(e.target.value)}
            style={{ 
              padding: '10px 12px', 
              borderRadius: '8px', 
              border: '1px solid var(--color-border)',
              background: 'var(--color-surface)',
              color: 'var(--color-text)',
              fontSize: '0.95rem'
            }}
          >
            <option value="monthly">Monthly</option>
            <option value="weekly">Weekly (Cron required)</option>
            <option value="yearly">Yearly (Cron required)</option>
          </select>
          <span style={{ fontSize: '0.75rem', color: 'var(--color-text-tertiary)' }}>Note: Only monthly is fully supported currently.</span>
        </div>

        <Input 
          label="Next (or First) Due Date" 
          type="date" 
          value={nextDueDate} 
          onChange={e => setNextDueDate(e.target.value)} 
          error={errors.nextDueDate} 
        />
        <Input label="Notes (optional)" value={notes} onChange={e => setNotes(e.target.value)} />
      </div>
    </Modal>
  );
};
