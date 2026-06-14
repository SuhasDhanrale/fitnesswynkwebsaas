'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';
import { FilterChip } from '@/components/ui/FilterChip';
import { Stepper } from '@/components/ui/Stepper';
import { SmartInput } from '@/components/ui/SmartInput';
import { useApp } from '@/context/AppContext';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/components/ui/Toast';
import { useMembersList } from '@/hooks/useMembers';
import { addMember } from '@/lib/actions';
import { calcEndDate } from '@/lib/dateUtils';
import { format } from 'date-fns';

interface AddMemberModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type PaymentStatus = 'Fully Paid' | 'Partial' | 'Unpaid';

export const AddMemberModal: React.FC<AddMemberModalProps> = ({ isOpen, onClose }) => {
  const { state } = useApp();
  const { logAction } = useAuth();
  const { showToast } = useToast();
  const { data: membersList = [] } = useMembersList();
  const today = format(new Date(), 'yyyy-MM-dd');

  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [plan, setPlan] = useState(state.settings.availablePlans[0]);
  const [duration, setDuration] = useState(state.settings.durations[0]);
  const [batch, setBatch] = useState(state.settings.batches[0]);
  const [startDate, setStartDate] = useState(today);
  const [endDate, setEndDate] = useState('');
  const [payStatus, setPayStatus] = useState<PaymentStatus>('Fully Paid');
  const [totalFee, setTotalFee] = useState('');
  const [payingNow, setPayingNow] = useState('');
  const [payMode, setPayMode] = useState<'Cash' | 'UPI' | 'Split'>('Cash');
  const [cashAmount, setCashAmount] = useState('');
  const [upiAmount, setUpiAmount] = useState('');
  const [notes, setNotes] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [allowDuplicatePhone, setAllowDuplicatePhone] = useState(false);
  
  const nameInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setStep(1);
      setTimeout(() => nameInputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  useEffect(() => {
    setAllowDuplicatePhone(false);
  }, [phone]);

  // Move focus to first visible input when step changes
  useEffect(() => {
    if (isOpen && step > 1) {
      setTimeout(() => {
        const modal = document.querySelector('[role="dialog"]');
        const firstInput = modal?.querySelector('input:not([disabled]), select') as HTMLElement | null;
        firstInput?.focus();
      }, 50);
    }
  }, [step, isOpen]);

  useEffect(() => {
    if (startDate && duration) {
      const ms = calcEndDate(new Date(startDate).getTime(), duration);
      setEndDate(format(ms, 'yyyy-MM-dd'));
    }
  }, [startDate, duration]);

  const startMs = new Date(startDate).getTime();
  const expiryMs = endDate ? new Date(endDate).getTime() : calcEndDate(startMs, duration);

  // Form is dirty if user has typed anything meaningful
  const isDirty = name.trim().length > 0 || phone.trim().length > 0;

  const validateStep1 = () => {
    const errs: Record<string, string> = {};
    if (!name.trim()) errs.name = 'Name is required.';
    if (!/^\d{10}$/.test(phone)) errs.phone = 'Must be exactly 10 digits.';
    else if (!allowDuplicatePhone && membersList.some(m => m.phoneNumber === phone)) {
      errs.phone = 'This mobile number already exists.';
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleNext = () => {
    if (step === 1 && !validateStep1()) return;
    setStep(s => Math.min(s + 1, 3));
  };

  const handleBack = () => setStep(s => Math.max(s - 1, 1));

  const handleSubmit = async () => {
    // Compute total received based on mode
    const totalReceived =
      payMode === 'Split'
        ? Number(cashAmount) + Number(upiAmount)
        : payStatus === 'Fully Paid' || payStatus === 'Partial'
          ? Number(payingNow)
          : 0;

    const dueAmount =
      payStatus === 'Partial' ? (Number(totalFee) - totalReceived) :
      payStatus === 'Unpaid'  ? Number(totalFee) : 0;

    // Build payments array
    let initialPayments: { amount: number; mode: 'Cash' | 'UPI' }[] = [];
    if (payStatus !== 'Unpaid') {
      if (payMode === 'Split') {
        if (Number(cashAmount) > 0) initialPayments.push({ amount: Number(cashAmount), mode: 'Cash' });
        if (Number(upiAmount) > 0) initialPayments.push({ amount: Number(upiAmount), mode: 'UPI' });
      } else if (totalReceived > 0) {
        initialPayments = [{ amount: totalReceived, mode: payMode }];
      }
    }

    setIsSubmitting(true);
    try {
      const result = await addMember({
        name: name.trim(),
        phoneNumber: phone.trim(),
        planName: plan,
        batch,
        startDate: startMs,
        expiryDate: expiryMs,
        durationLabel: duration,
        notes: notes.trim(),
        dueAmount,
        initialPayments,
      });

      if (result && result.error) {
        showToast(`Failed to save: ${result.error}`);
      } else {
        logAction('Added Member', { memberName: name.trim(), totalReceived });
        showToast(`${name.trim()} added successfully! 🎉`);
        handleClose();
      }
    } catch (err) {
      console.error('Submit error:', err);
      showToast('An unexpected error occurred. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setName(''); setPhone(''); setNotes(''); setErrors({});
    setPayingNow(''); setTotalFee('');
    setCashAmount(''); setUpiAmount('');
    setAllowDuplicatePhone(false);
    setPayMode('Cash');
    setPayStatus('Fully Paid');
    setPlan(state.settings.availablePlans[0]);
    setDuration(state.settings.durations[0]);
    setBatch(state.settings.batches[0]);
    setStartDate(today);
    setStep(1);
    onClose();
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (step < 3) handleNext();
      else handleSubmit();
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Add New Member"
      titleExtra={<div style={{ width: '100px', marginLeft: 'auto', marginRight: '8px', display: 'flex', alignItems: 'center' }}><Stepper currentStep={step} totalSteps={3} /></div>}
      isDirty={isDirty}
      dirtyMessage="You have started filling this form. Discard changes and close?"
      footer={
        <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
          <Button variant="ghost" onClick={step === 1 ? handleClose : handleBack} disabled={isSubmitting}>
            {step === 1 ? 'Cancel' : 'Back'}
          </Button>
          <Button variant="primary" onClick={step === 3 ? handleSubmit : handleNext} disabled={isSubmitting}>
            {step === 3 ? (isSubmitting ? 'Saving...' : 'Complete Setup') : 'Next'}
          </Button>
        </div>
      }
    >
      <div onKeyDown={onKeyDown} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

        {/* STEP 1: Identity */}
        {step === 1 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', animation: 'pageFadeIn 200ms ease' }}>
            {state.settings.enableSmartEntry !== false && (
              <SmartInput 
                type="member" 
                onParsed={(data) => {
                  if (data.name) setName(data.name);
                  if (data.phone) setPhone(data.phone);
                  if (data.amount) {
                     setPayingNow(data.amount);
                     setTotalFee(data.amount);
                     setPayStatus('Fully Paid');
                  }
                  if (data.duration && state.settings.durations.includes(data.duration)) {
                     setDuration(data.duration);
                  }
                }} 
              />
            )}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <Input ref={nameInputRef} label="Full Name" value={name} onChange={e => setName(e.target.value)} error={errors.name} />
              <div>
                <Input label="Phone Number" type="tel" maxLength={10} value={phone} onChange={e => setPhone(e.target.value)} error={errors.phone} />
                {membersList.some(m => m.phoneNumber === phone) && /^\d{10}$/.test(phone) && (
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: 'var(--color-text-secondary)', marginTop: '8px', cursor: 'pointer' }}>
                    <input 
                      type="checkbox" 
                      checked={allowDuplicatePhone} 
                      onChange={(e) => {
                        setAllowDuplicatePhone(e.target.checked);
                        if (e.target.checked && errors.phone) {
                          setErrors(prev => ({ ...prev, phone: '' }));
                        }
                      }} 
                      style={{ width: '16px', height: '16px', accentColor: 'var(--color-primary)' }}
                    />
                    Proceed with existing number
                  </label>
                )}
              </div>
            </div>
          </div>
        )}

        {/* STEP 2: Subscription */}
        {step === 2 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', animation: 'pageFadeIn 200ms ease' }}>
            <Select label="Plan" options={state.settings.availablePlans} value={plan} onChange={e => setPlan(e.target.value)} />
            <Select label="Duration" options={state.settings.durations} value={duration} onChange={e => setDuration(e.target.value)} />
            <Select label="Batch" options={state.settings.batches} value={batch} onChange={e => setBatch(e.target.value)} />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
              <Input label="Starts On" type="date" value={startDate} onChange={e => setStartDate(e.target.value)} />
              <Input label="Ends On" type="date" value={endDate} onChange={e => setEndDate(e.target.value)} />
            </div>
          </div>
        )}

        {/* STEP 3: Checkout */}
        {step === 3 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', animation: 'pageFadeIn 200ms ease' }}>
            <div>
              <p className="text-label" style={{ color: 'var(--color-text-secondary)', marginBottom: '8px' }}>Payment Status</p>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {(['Fully Paid', 'Partial', 'Unpaid'] as PaymentStatus[]).map(s => (
                  <FilterChip key={s} label={s} selected={payStatus === s} onClick={() => setPayStatus(s)} />
                ))}
              </div>
            </div>

            {/* Payment mode — only shown when money is being collected */}
            {payStatus !== 'Unpaid' && (
              <div>
                <p className="text-label" style={{ color: 'var(--color-text-secondary)', marginBottom: '8px' }}>Payment Mode</p>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <FilterChip label="Cash" selected={payMode === 'Cash'} onClick={() => setPayMode('Cash')} />
                  <FilterChip label="UPI" selected={payMode === 'UPI'} onClick={() => setPayMode('UPI')} />
                  <FilterChip label="Split" selected={payMode === 'Split'} onClick={() => setPayMode('Split')} />
                </div>
              </div>
            )}

            <div style={{ background: 'var(--color-background-alt, #f9fafb)', padding: '16px', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {payStatus === 'Fully Paid' && (
                payMode === 'Split' ? (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                    <Input label="Cash Amount (₹)" type="number" value={cashAmount} onChange={e => setCashAmount(e.target.value)} />
                    <Input label="UPI Amount (₹)" type="number" value={upiAmount} onChange={e => setUpiAmount(e.target.value)} />
                  </div>
                ) : (
                  <Input label="Amount Received (₹)" type="number" value={payingNow} onChange={e => setPayingNow(e.target.value)} />
                )
              )}

              {payStatus === 'Partial' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <Input label="Total Fee (₹)" type="number" value={totalFee} onChange={e => setTotalFee(e.target.value)} />
                  {payMode === 'Split' ? (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                      <Input label="Cash Amount (₹)" type="number" value={cashAmount} onChange={e => setCashAmount(e.target.value)} />
                      <Input label="UPI Amount (₹)" type="number" value={upiAmount} onChange={e => setUpiAmount(e.target.value)} />
                    </div>
                  ) : (
                    <Input label="Paying Now (₹)" type="number" value={payingNow} onChange={e => setPayingNow(e.target.value)} />
                  )}
                </div>
              )}

              {payStatus === 'Unpaid' && (
                <Input label="Total Due Amount (₹)" type="number" value={totalFee} onChange={e => setTotalFee(e.target.value)} />
              )}

              {payStatus !== 'Unpaid' && payMode === 'Split' && (
                <p style={{ fontSize: '13px', color: 'var(--color-text-secondary)', fontWeight: 500 }}>
                  Total Received: <strong style={{ color: 'var(--color-text)' }}>₹{(Number(cashAmount) || 0) + (Number(upiAmount) || 0)}</strong>
                </p>
              )}
            </div>

            <textarea
              rows={2}
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Internal Notes (Optional)"
              style={{ width: '100%', padding: '12px', border: '1.5px solid var(--color-border)', borderRadius: 'var(--radius-md)', fontFamily: 'var(--font-body)', fontSize: '14px', resize: 'vertical' }}
            />
          </div>
        )}
      </div>
    </Modal>
  );
};

