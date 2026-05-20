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

  const [step, setStep] = useState(1);
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
  
  const nameInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setStep(1);
      setTimeout(() => nameInputRef.current?.focus(), 100);
    }
  }, [isOpen]);

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

  const startMs = new Date(startDate).getTime();
  const expiryMs = calcEndDate(startMs, duration);
  const expiryDisplay = format(expiryMs, 'dd MMM yyyy');

  // Form is dirty if user has typed anything meaningful
  const isDirty = name.trim().length > 0 || phone.trim().length > 0;

  const validateStep1 = () => {
    const errs: Record<string, string> = {};
    if (!name.trim()) errs.name = 'Name is required.';
    if (!/^\d{10}$/.test(phone)) errs.phone = 'Must be exactly 10 digits.';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleNext = () => {
    if (step === 1 && !validateStep1()) return;
    setStep(s => Math.min(s + 1, 3));
  };

  const handleBack = () => setStep(s => Math.max(s - 1, 1));

  const handleSubmit = () => {
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
      isDirty={isDirty}
      dirtyMessage="You have started filling this form. Discard changes and close?"
      footer={
        <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
          <Button variant="ghost" onClick={step === 1 ? handleClose : handleBack}>
            {step === 1 ? 'Cancel' : 'Back'}
          </Button>
          <Button variant="primary" onClick={step === 3 ? handleSubmit : handleNext}>
            {step === 3 ? 'Complete Setup' : 'Next'}
          </Button>
        </div>
      }
    >
      <div onKeyDown={onKeyDown} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <Stepper currentStep={step} totalSteps={3} />

        {/* STEP 1: Identity */}
        {step === 1 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', animation: 'pageFadeIn 200ms ease' }}>
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
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <Input ref={nameInputRef} label="Full Name" value={name} onChange={e => setName(e.target.value)} error={errors.name} />
              <Input label="Phone Number" type="tel" maxLength={10} value={phone} onChange={e => setPhone(e.target.value)} error={errors.phone} />
              <textarea
                rows={2}
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="Internal Notes (Optional)"
                style={{ width: '100%', padding: '12px', border: '1.5px solid var(--color-border)', borderRadius: 'var(--radius-md)', fontFamily: 'var(--font-body)', fontSize: '14px', resize: 'vertical' }}
              />
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
              <Input label="Ends On (Auto)" value={expiryDisplay} readOnly disabled />
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

            {payStatus === 'Fully Paid' && (
              <Input label="Amount Received (₹)" type="number" value={payingNow} onChange={e => setPayingNow(e.target.value)} />
            )}
            
            {payStatus === 'Partial' && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                <Input label="Total Fee (₹)" type="number" value={totalFee} onChange={e => setTotalFee(e.target.value)} />
                <Input label="Paying Now (₹)" type="number" value={payingNow} onChange={e => setPayingNow(e.target.value)} />
              </div>
            )}
            
            {payStatus === 'Unpaid' && (
              <Input label="Total Due Amount (₹)" type="number" value={totalFee} onChange={e => setTotalFee(e.target.value)} />
            )}
          </div>
        )}
      </div>
    </Modal>
  );
};

