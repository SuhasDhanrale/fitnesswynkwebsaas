'use client';

import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';
import { FilterChip } from '@/components/ui/FilterChip';
import { useApp } from '@/context/AppContext';
import { useToast } from '@/components/ui/Toast';
import { processPaymentAndRenewal } from '@/lib/actions';
import { calcEndDate } from '@/lib/dateUtils';

interface LogPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const LogPaymentModal: React.FC<LogPaymentModalProps> = ({ isOpen, onClose }) => {
  const { state, dispatch } = useApp();
  const { showToast } = useToast();
  const today = format(new Date(), 'yyyy-MM-dd');

  const [memberSearch, setMemberSearch] = useState('');
  const [selectedMemberId, setSelectedMemberId] = useState('');
  const [amount, setAmount] = useState('');
  const [payMode, setPayMode] = useState<'Cash' | 'UPI'>('Cash');
  const [plan, setPlan] = useState(state.settings.availablePlans[0]);
  const [batch, setBatch] = useState(state.settings.batches[0]);
  const [duration, setDuration] = useState(state.settings.durations[0]);
  const [startDate, setStartDate] = useState(today);
  const [endDate, setEndDate] = useState('');
  const [notes, setNotes] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showDropdown, setShowDropdown] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setMemberSearch(''); setSelectedMemberId(''); setAmount('');
      setPayMode('Cash'); setNotes(''); setErrors({});
      setPlan(state.settings.availablePlans[0]);
      setBatch(state.settings.batches[0]);
      setDuration(state.settings.durations[0]);
      setStartDate(today);
    }
  }, [isOpen]);

  useEffect(() => {
    const ms = calcEndDate(new Date(startDate).getTime(), duration);
    setEndDate(format(ms, 'yyyy-MM-dd'));
  }, [startDate, duration]);

  const memberResults = memberSearch.length >= 2
    ? state.members.filter(m => m.name.toLowerCase().includes(memberSearch.toLowerCase())).slice(0, 5)
    : [];

  const selectMember = (id: string) => {
    const m = state.members.find(x => x.id === id);
    if (!m) return;
    setSelectedMemberId(id);
    setMemberSearch(m.name);
    setPlan(m.planName);
    setBatch(m.batch);
    setDuration(m.durationLabel);
    setShowDropdown(false);
  };

  const handleConfirm = () => {
    const errs: Record<string, string> = {};
    if (!memberSearch.trim()) errs.member = 'Member name is required.';
    if (!amount || Number(amount) <= 0) errs.amount = 'Amount is required.';
    if (Object.keys(errs).length) { setErrors(errs); return; }

    processPaymentAndRenewal(dispatch, state, {
      memberId: selectedMemberId,
      amount: Number(amount),
      paymentMode: payMode,
      planName: plan,
      batch,
      startDate: new Date(startDate).getTime(),
      endDate: new Date(endDate).getTime(),
      notes: notes.trim(),
    });
    showToast(`Payment of ₹${amount} logged successfully! ✓`);
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Log Payment"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button variant="primary" onClick={handleConfirm}>Log Payment</Button>
        </>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
        {/* Member search with live dropdown */}
        <div style={{ position: 'relative' }}>
          <Input
            label="Search Member Name"
            value={memberSearch}
            onChange={e => { setMemberSearch(e.target.value); setSelectedMemberId(''); setShowDropdown(true); }}
            onFocus={() => setShowDropdown(true)}
            error={errors.member}
          />
          {showDropdown && memberResults.length > 0 && (
            <div style={{
              position: 'absolute', top: '100%', left: 0, right: 0,
              background: 'var(--color-surface)', boxShadow: 'var(--shadow-md)',
              borderRadius: 'var(--radius-md)', zIndex: 10, overflow: 'hidden'
            }}>
              {memberResults.map(m => (
                <div
                  key={m.id}
                  onClick={() => selectMember(m.id)}
                  style={{ padding: '12px 16px', cursor: 'pointer', borderBottom: '1px solid var(--color-border)', fontSize: '14px' }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'var(--color-surface-variant)')}
                  onMouseLeave={e => (e.currentTarget.style.background = '')}
                >
                  <strong>{m.name}</strong>
                  <span style={{ color: 'var(--color-text-secondary)', marginLeft: '8px' }}>{m.planName}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <Input label="Amount (₹)" type="number" value={amount} onChange={e => setAmount(e.target.value)} error={errors.amount} />
        <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
          <FilterChip label="Cash" selected={payMode === 'Cash'} onClick={() => setPayMode('Cash')} />
          <FilterChip label="UPI" selected={payMode === 'UPI'} onClick={() => setPayMode('UPI')} />
        </div>

        <p className="text-label" style={{ color: 'var(--color-text-secondary)', marginTop: '16px', marginBottom: '4px' }}>Membership Details (Will Update)</p>
        <Select label="Plan" options={state.settings.availablePlans} value={plan} onChange={e => setPlan(e.target.value)} />
        <Select label="Batch" options={state.settings.batches} value={batch} onChange={e => setBatch(e.target.value)} />
        <Select label="Duration" options={state.settings.durations} value={duration} onChange={e => setDuration(e.target.value)} />
        <Input label="Start Date" type="date" value={startDate} onChange={e => setStartDate(e.target.value)} />
        <Input label="End Date (Auto)" value={endDate} readOnly disabled />
        <textarea
          rows={2}
          value={notes}
          onChange={e => setNotes(e.target.value)}
          placeholder="Notes (optional)"
          style={{ width: '100%', padding: '12px', border: '1.5px solid var(--color-border)', borderRadius: 'var(--radius-md)', fontFamily: 'var(--font-body)', fontSize: '14px', resize: 'vertical', marginTop: '8px' }}
        />
      </div>
    </Modal>
  );
};
