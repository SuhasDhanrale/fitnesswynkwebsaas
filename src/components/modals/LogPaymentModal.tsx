'use client';

import React, { useState, useEffect, useRef } from 'react';
import { format } from 'date-fns';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';
import { FilterChip } from '@/components/ui/FilterChip';
import { Stepper } from '@/components/ui/Stepper';
import { SmartInput } from '@/components/ui/SmartInput';
import { useApp } from '@/context/AppContext';
import { useToast } from '@/components/ui/Toast';
import { processPaymentAndRenewal } from '@/lib/actions';
import { calcEndDate } from '@/lib/dateUtils';
import { Settings } from 'lucide-react';

interface LogPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const LogPaymentModal: React.FC<LogPaymentModalProps> = ({ isOpen, onClose }) => {
  const { state, dispatch } = useApp();
  const { showToast } = useToast();
  const today = format(new Date(), 'yyyy-MM-dd');

  const [step, setStep] = useState(1);
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

  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setStep(1);
      setMemberSearch(''); setSelectedMemberId(''); setAmount('');
      setPayMode('Cash'); setNotes(''); setErrors({});
      setPlan(state.settings.availablePlans[0]);
      setBatch(state.settings.batches[0]);
      setDuration(state.settings.durations[0]);
      setStartDate(today);
      setTimeout(() => searchInputRef.current?.focus(), 100);
    }
  }, [isOpen, state.settings.availablePlans, state.settings.batches, state.settings.durations, today]);

  useEffect(() => {
    const ms = calcEndDate(new Date(startDate).getTime(), duration);
    setEndDate(format(ms, 'yyyy-MM-dd'));
  }, [startDate, duration]);

  const memberResults = memberSearch.length >= 2
    ? state.members.filter(m => m.name.toLowerCase().includes(memberSearch.toLowerCase())).slice(0, 5)
    : [];

  const isDirty = !!selectedMemberId || amount.trim().length > 0;

  const selectMember = (id: string) => {
    const m = state.members.find(x => x.id === id);
    if (!m) return;
    setSelectedMemberId(id);
    setMemberSearch(m.name);
    
    // Auto-fill defaults in background (in case they don't edit)
    setPlan(m.planName);
    setBatch(m.batch);
    setDuration(m.durationLabel);
    
    const newStartMs = Math.max(new Date(today).getTime(), m.expiryDate);
    setStartDate(format(newStartMs, 'yyyy-MM-dd'));
    
    setShowDropdown(false);
    
    // Drop focus straight to Amount
    setTimeout(() => {
      document.getElementById('amount-₹')?.focus();
    }, 100);
  };

  const handleConfirm = () => {
    const errs: Record<string, string> = {};
    if (!selectedMemberId) errs.member = 'Please select a valid member.';
    if (!amount || Number(amount) <= 0) errs.amount = 'Amount is required.';
    
    if (Object.keys(errs).length) {
      setErrors(errs);
      if (step === 2) setStep(1); // kick back if trying to submit from step 2 with no amount
      return;
    }

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

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !showDropdown) {
      e.preventDefault();
      handleConfirm(); // Enter always submits the payment instantly
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Log Payment"
      isDirty={isDirty}
      dirtyMessage="Payment is not saved yet. Discard and close?"
      footer={
        <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
          <Button variant="ghost" onClick={step === 1 ? onClose : () => setStep(1)}>
            {step === 1 ? 'Cancel' : 'Back'}
          </Button>
          
          <div style={{ display: 'flex', gap: '12px' }}>
            {step === 1 && (
              <Button 
                variant="ghost" 
                onClick={() => {
                  if (!selectedMemberId) setErrors({ member: 'Select a member first.' });
                  else setStep(2);
                }}
              >
                <Settings size={16} style={{ marginRight: '6px' }} />
                Edit Plan
              </Button>
            )}
            <Button variant="primary" onClick={handleConfirm}>
              Log Payment
            </Button>
          </div>
        </div>
      }
    >
      <div onKeyDown={onKeyDown} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <Stepper currentStep={step} totalSteps={2} />

        {/* STEP 1: Fast Checkout */}
        {step === 1 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', animation: 'pageFadeIn 200ms ease' }}>
            <SmartInput 
              type="payment" 
              onParsed={(data) => {
                if (data.name) {
                  setMemberSearch(data.name);
                  setShowDropdown(true);
                }
                if (data.amount) setAmount(data.amount);
                if (data.paymentMode) setPayMode(data.paymentMode as 'Cash' | 'UPI');
              }}
            />
            
            <div style={{ position: 'relative' }}>
              <Input
                ref={searchInputRef}
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
            
            <div>
              <p className="text-label" style={{ color: 'var(--color-text-secondary)', marginBottom: '8px' }}>Payment Mode</p>
              <div style={{ display: 'flex', gap: '8px' }}>
                <FilterChip label="Cash" selected={payMode === 'Cash'} onClick={() => setPayMode('Cash')} />
                <FilterChip label="UPI" selected={payMode === 'UPI'} onClick={() => setPayMode('UPI')} />
              </div>
            </div>

            <textarea
              rows={2}
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Notes (optional)"
              style={{ width: '100%', padding: '12px', border: '1.5px solid var(--color-border)', borderRadius: 'var(--radius-md)', fontFamily: 'var(--font-body)', fontSize: '14px', resize: 'vertical' }}
            />
          </div>
        )}

        {/* STEP 2: Optional Plan Editing */}
        {step === 2 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', animation: 'pageFadeIn 200ms ease' }}>
            <p className="text-label" style={{ color: 'var(--color-text-secondary)', marginBottom: '4px' }}>
              Membership Renewal Details (Optional)
            </p>
            <Select label="Plan" options={state.settings.availablePlans} value={plan} onChange={e => setPlan(e.target.value)} />
            <Select label="Batch" options={state.settings.batches} value={batch} onChange={e => setBatch(e.target.value)} />
            <Select label="Duration" options={state.settings.durations} value={duration} onChange={e => setDuration(e.target.value)} />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
              <Input label="Start Date" type="date" value={startDate} onChange={e => setStartDate(e.target.value)} />
              <Input label="End Date (Auto)" value={endDate} readOnly disabled />
            </div>
            <p style={{ fontSize: '12px', color: 'var(--color-text-secondary)', marginTop: '8px' }}>
              Dates are automatically chained so the user doesn&apos;t lose any existing valid days.
            </p>
          </div>
        )}
      </div>
    </Modal>
  );
};
