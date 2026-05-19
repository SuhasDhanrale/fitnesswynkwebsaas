'use client';

import React, { useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';
import { FilterChip } from '@/components/ui/FilterChip';
import { useApp } from '@/context/AppContext';
import { useToast } from '@/components/ui/Toast';
import { addMember } from '@/lib/actions';
import { calcEndDate } from '@/lib/dateUtils';
import { format } from 'date-fns';

interface AddMemberModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type PaymentStatus = 'Fully Paid' | 'Partial' | 'Unpaid';

export const AddMemberModal: React.FC<AddMemberModalProps> = ({ isOpen, onClose }) => {
  const { state, dispatch } = useApp();
  const { showToast } = useToast();
  const today = format(new Date(), 'yyyy-MM-dd');

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [plan, setPlan] = useState(state.settings.availablePlans[0]);
  const [duration, setDuration] = useState(state.settings.durations[0]);
  const [batch, setBatch] = useState(state.settings.batches[0]);
  const [startDate, setStartDate] = useState(today);
  const [payStatus, setPayStatus] = useState<PaymentStatus>('Fully Paid');
  const [totalFee, setTotalFee] = useState('');
  const [payingNow, setPayingNow] = useState('');
  const [notes, setNotes] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const startMs = new Date(startDate).getTime();
  const expiryMs = calcEndDate(startMs, duration);
  const expiryDisplay = format(expiryMs, 'dd MMM yyyy');

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!name.trim()) errs.name = 'Name is required.';
    if (!/^\d{10}$/.test(phone)) errs.phone = 'Must be exactly 10 digits.';
    return errs;
  };

  const handleSubmit = () => {
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }

    const dueAmount =
      payStatus === 'Partial' ? (Number(totalFee) - Number(payingNow)) :
      payStatus === 'Unpaid'  ? Number(totalFee) : 0;

    const initialPayment =
      payStatus === 'Fully Paid' ? Number(payingNow) :
      payStatus === 'Partial'    ? Number(payingNow) : 0;

    addMember(dispatch, {
      name: name.trim(),
      phoneNumber: phone.trim(),
      planName: plan,
      batch,
      startDate: startMs,
      expiryDate: expiryMs,
      durationLabel: duration,
      notes: notes.trim(),
      dueAmount,
      initialPayment,
    });

    showToast(`${name.trim()} added successfully! 🎉`);
    handleClose();
  };

  const handleClose = () => {
    setName(''); setPhone(''); setNotes(''); setErrors({});
    setPayingNow(''); setTotalFee('');
    setPayStatus('Fully Paid');
    setPlan(state.settings.availablePlans[0]);
    setDuration(state.settings.durations[0]);
    setBatch(state.settings.batches[0]);
    setStartDate(today);
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Add New Member"
      footer={
        <>
          <Button variant="ghost" onClick={handleClose}>Cancel</Button>
          <Button variant="primary" onClick={handleSubmit}>Add Member</Button>
        </>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
        <p className="text-label" style={{ color: 'var(--color-text-secondary)', marginBottom: '4px' }}>Personal Details</p>
        <Input label="Name" value={name} onChange={e => setName(e.target.value)} error={errors.name} />
        <Input label="Phone Number" type="tel" maxLength={10} value={phone} onChange={e => setPhone(e.target.value)} error={errors.phone} />

        <p className="text-label" style={{ color: 'var(--color-text-secondary)', marginTop: '16px', marginBottom: '4px' }}>Membership Details</p>
        <Select label="Plan" options={state.settings.availablePlans} value={plan} onChange={e => setPlan(e.target.value)} />
        <Select label="Duration" options={state.settings.durations} value={duration} onChange={e => setDuration(e.target.value)} />
        <Select label="Batch" options={state.settings.batches} value={batch} onChange={e => setBatch(e.target.value)} />
        <Input label="Starts On" type="date" value={startDate} onChange={e => setStartDate(e.target.value)} />
        <Input label="Ends On (Auto)" value={expiryDisplay} readOnly disabled />

        <p className="text-label" style={{ color: 'var(--color-text-secondary)', marginTop: '16px', marginBottom: '8px' }}>Payment Status</p>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {(['Fully Paid', 'Partial', 'Unpaid'] as PaymentStatus[]).map(s => (
            <FilterChip key={s} label={s} selected={payStatus === s} onClick={() => setPayStatus(s)} />
          ))}
        </div>
        {payStatus === 'Fully Paid' && <Input label="Amount Paying Now (₹)" type="number" value={payingNow} onChange={e => setPayingNow(e.target.value)} />}
        {payStatus === 'Partial' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
            <Input label="Total Fee (₹)" type="number" value={totalFee} onChange={e => setTotalFee(e.target.value)} />
            <Input label="Paying Now (₹)" type="number" value={payingNow} onChange={e => setPayingNow(e.target.value)} />
          </div>
        )}
        {payStatus === 'Unpaid' && <Input label="Total Due Amount (₹)" type="number" value={totalFee} onChange={e => setTotalFee(e.target.value)} />}

        <p className="text-label" style={{ color: 'var(--color-text-secondary)', marginTop: '16px', marginBottom: '4px' }}>Notes</p>
        <textarea
          rows={3}
          value={notes}
          onChange={e => setNotes(e.target.value)}
          placeholder="Comments / Notes (optional)"
          style={{ width: '100%', padding: '12px', border: '1.5px solid var(--color-border)', borderRadius: 'var(--radius-md)', fontFamily: 'var(--font-body)', fontSize: '14px', resize: 'vertical' }}
        />
      </div>
    </Modal>
  );
};
