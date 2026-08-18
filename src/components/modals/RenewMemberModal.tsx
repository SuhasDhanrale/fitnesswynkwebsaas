'use client';

import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';
import { FilterChip } from '@/components/ui/FilterChip';
import { useToast } from '@/components/ui/Toast';
import { useApp } from '@/context/AppContext';
import { useAuth } from '@/context/AuthContext';
import { logPaymentAndUpdateMember } from '@/lib/actions';
import { calcEndDate } from '@/lib/dateUtils';
import { getMaxExpectedPrice } from '@/lib/pricingUtils';
import { Member } from '@/types';
import { useQueryClient } from '@tanstack/react-query';

interface RenewMemberModalProps {
  isOpen: boolean;
  onClose: () => void;
  member: Member;
}

type PaymentStatus = 'Fully Paid' | 'Partial' | 'Unpaid';

/** Keeps the member's current value selectable even if it was removed from settings. */
const withCurrent = (options: string[], current: string) =>
  current && !options.includes(current) ? [current, ...options] : options;

export const RenewMemberModal: React.FC<RenewMemberModalProps> = ({ isOpen, onClose, member }) => {
  const { state } = useApp();
  const { showToast } = useToast();
  const { logAction } = useAuth();
  const queryClient = useQueryClient();
  const today = format(new Date(), 'yyyy-MM-dd');

  const [plan, setPlan] = useState(member.planName);
  const [duration, setDuration] = useState(member.durationLabel);
  const [batch, setBatch] = useState(member.batch);
  const [startDate, setStartDate] = useState(today);
  const [endDate, setEndDate] = useState('');

  const [payStatus, setPayStatus] = useState<PaymentStatus>('Fully Paid');
  const [payMode, setPayMode] = useState<'Cash' | 'UPI' | 'Split'>('Cash');
  const [totalFee, setTotalFee] = useState('');
  const [payingNow, setPayingNow] = useState('');
  const [cashAmount, setCashAmount] = useState('');
  const [upiAmount, setUpiAmount] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Reset to the member's current subscription each time the modal opens.
  useEffect(() => {
    if (!isOpen) return;
    setPlan(member.planName);
    setDuration(member.durationLabel);
    setBatch(member.batch);
    setStartDate(today);
    setEndDate(format(calcEndDate(new Date(today).getTime(), member.durationLabel), 'yyyy-MM-dd'));
    setPayStatus('Fully Paid');
    setPayMode('Cash');
    setTotalFee('');
    setPayingNow('');
    setCashAmount('');
    setUpiAmount('');
    setErrors({});
    setIsSubmitting(false);
  }, [isOpen, member.planName, member.durationLabel, member.batch, today]);

  // End date auto-follows start date + duration, but stays editable afterwards.
  useEffect(() => {
    if (!startDate || !duration) return;
    setEndDate(format(calcEndDate(new Date(startDate).getTime(), duration), 'yyyy-MM-dd'));
  }, [startDate, duration]);

  const totalReceived =
    payStatus === 'Unpaid' ? 0
      : payMode === 'Split' ? (Number(cashAmount) || 0) + (Number(upiAmount) || 0)
        : (Number(payingNow) || 0);

  const planFee = payStatus === 'Fully Paid' ? totalReceived : (Number(totalFee) || 0);
  const dueAmount = payStatus === 'Fully Paid' ? 0 : Math.max(planFee - totalReceived, 0);

  const handleConfirm = async () => {
    const errs: Record<string, string> = {};

    if (!endDate || new Date(endDate).getTime() <= new Date(startDate).getTime()) {
      errs.endDate = 'End date must be after the start date.';
    }
    if (payStatus !== 'Unpaid' && totalReceived <= 0) {
      errs.amount = 'Enter the amount being collected.';
    }
    if (payStatus !== 'Fully Paid' && planFee <= 0) {
      errs.totalFee = 'Enter the total plan fee.';
    }
    if (payStatus === 'Partial' && totalReceived >= planFee) {
      errs.amount = 'Paying now must be less than the total fee.';
    }
    if (Object.keys(errs).length) { setErrors(errs); return; }

    const maxEntered = Math.max(planFee, totalReceived);
    if (maxEntered > 150000) {
      showToast('❌ Amount exceeds maximum limit (₹1,50,000). Please check your entry.', 'error');
      return;
    }

    const payments: { amount: number; paymentMode: 'Cash' | 'UPI' }[] =
      payStatus === 'Unpaid' ? []
        : payMode === 'Split'
          ? [
            ...(Number(cashAmount) > 0 ? [{ amount: Number(cashAmount), paymentMode: 'Cash' as const }] : []),
            ...(Number(upiAmount) > 0 ? [{ amount: Number(upiAmount), paymentMode: 'UPI' as const }] : []),
          ]
          : [{ amount: totalReceived, paymentMode: payMode }];

    setIsSubmitting(true);
    try {
      const result = await logPaymentAndUpdateMember({
        memberId: member.id,
        memberName: member.name,
        planName: plan,
        batch,
        durationLabel: duration,
        startDate: new Date(startDate).getTime(),
        endDate: new Date(endDate).getTime(),
        dueAmount,
        notes: 'Renewal payment',
        payments,
      });

      if (result?.error) {
        showToast(`Failed to renew: ${result.error}`, 'error');
        return;
      }

      logAction('Renewed Member', { memberName: member.name, amount: totalReceived, dueAmount });

      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['members'] }),
        queryClient.invalidateQueries({ queryKey: ['members_list'] }),
        queryClient.invalidateQueries({ queryKey: ['member', member.id] }),
        queryClient.invalidateQueries({ queryKey: ['payments', member.id] }),
        queryClient.invalidateQueries({ queryKey: ['payments'] }),
        queryClient.invalidateQueries({ queryKey: ['dashboard_stats'] }),
        queryClient.invalidateQueries({ queryKey: ['finance_stats'] }),
        queryClient.invalidateQueries({ queryKey: ['finance_summary'] }),
      ]);

      showToast(
        dueAmount > 0
          ? `Renewed ${member.name} — ₹${totalReceived} collected, ₹${dueAmount} due.`
          : `Membership renewed for ${member.name}! ✓`
      );
      onClose();
    } catch (error) {
      console.error('Renewal error:', error);
      showToast('An unexpected error occurred. Please try again.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const planChanged = plan !== member.planName || duration !== member.durationLabel || batch !== member.batch;
  const maxExpected = getMaxExpectedPrice(duration);
  const maxEntered = Math.max(planFee, totalReceived);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Renew — ${member.name}`}
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={isSubmitting}>Cancel</Button>
          <Button variant="primary" onClick={handleConfirm} disabled={isSubmitting}>
            {isSubmitting ? 'Renewing...' : 'Confirm Renewal'}
          </Button>
        </>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

        {/* ── New plan ─────────────────────────────────────────────────── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <p className="text-label" style={{ color: 'var(--color-text-secondary)' }}>Renewing With</p>
          <Select
            label="Plan"
            options={withCurrent(state.settings.availablePlans, member.planName)}
            value={plan}
            onChange={e => setPlan(e.target.value)}
          />
          <Select
            label="Duration"
            options={withCurrent(state.settings.durations, member.durationLabel)}
            value={duration}
            onChange={e => setDuration(e.target.value)}
          />
          <Select
            label="Batch"
            options={withCurrent(state.settings.batches, member.batch)}
            value={batch}
            onChange={e => setBatch(e.target.value)}
          />
          {planChanged && (
            <p style={{ fontSize: '12px', color: 'var(--color-text-secondary)' }}>
              Changing from <strong>{member.planName} · {member.durationLabel} · {member.batch}</strong>
            </p>
          )}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
            <Input label="New Start Date" type="date" value={startDate} onChange={e => setStartDate(e.target.value)} />
            <Input
              label="New End Date"
              type="date"
              value={endDate}
              min={startDate}
              onChange={e => { setEndDate(e.target.value); setErrors(prev => ({ ...prev, endDate: '' })); }}
              error={errors.endDate}
              helperText={errors.endDate ? undefined : 'Auto-set from duration — edit if needed'}
            />
          </div>
        </div>

        {/* ── Payment ──────────────────────────────────────────────────── */}
        <div>
          <p className="text-label" style={{ color: 'var(--color-text-secondary)', marginBottom: '8px' }}>Payment Status</p>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {(['Fully Paid', 'Partial', 'Unpaid'] as PaymentStatus[]).map(s => (
              <FilterChip
                key={s}
                label={s}
                selected={payStatus === s}
                onClick={() => { setPayStatus(s); setErrors({}); }}
              />
            ))}
          </div>
        </div>

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
                <Input label="Cash Amount (₹)" type="number" value={cashAmount} onChange={e => { setCashAmount(e.target.value); setErrors(prev => ({ ...prev, amount: '' })); }} error={errors.amount} />
                <Input label="UPI Amount (₹)" type="number" value={upiAmount} onChange={e => setUpiAmount(e.target.value)} />
              </div>
            ) : (
              <Input label="Amount Received (₹)" type="number" value={payingNow} onChange={e => { setPayingNow(e.target.value); setErrors(prev => ({ ...prev, amount: '' })); }} error={errors.amount} />
            )
          )}

          {payStatus === 'Partial' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <Input label="Total Fee (₹)" type="number" value={totalFee} onChange={e => { setTotalFee(e.target.value); setErrors(prev => ({ ...prev, totalFee: '' })); }} error={errors.totalFee} />
              {payMode === 'Split' ? (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                  <Input label="Cash Amount (₹)" type="number" value={cashAmount} onChange={e => { setCashAmount(e.target.value); setErrors(prev => ({ ...prev, amount: '' })); }} error={errors.amount} />
                  <Input label="UPI Amount (₹)" type="number" value={upiAmount} onChange={e => setUpiAmount(e.target.value)} />
                </div>
              ) : (
                <Input label="Paying Now (₹)" type="number" value={payingNow} onChange={e => { setPayingNow(e.target.value); setErrors(prev => ({ ...prev, amount: '' })); }} error={errors.amount} />
              )}
            </div>
          )}

          {payStatus === 'Unpaid' && (
            <Input label="Total Due Amount (₹)" type="number" value={totalFee} onChange={e => { setTotalFee(e.target.value); setErrors(prev => ({ ...prev, totalFee: '' })); }} error={errors.totalFee} />
          )}

          {payStatus !== 'Unpaid' && payMode === 'Split' && (
            <p style={{ fontSize: '13px', color: 'var(--color-text-secondary)', fontWeight: 500 }}>
              Total Received: <strong style={{ color: 'var(--color-text-primary)' }}>₹{totalReceived.toLocaleString('en-IN')}</strong>
            </p>
          )}

          {dueAmount > 0 && (
            <p style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-error)' }}>
              Remaining due after renewal: ₹{dueAmount.toLocaleString('en-IN')}
            </p>
          )}

          {member.dueAmount > 0 && (
            <p style={{ fontSize: '12px', color: '#b45309', background: 'rgba(245,158,11,0.1)', padding: '10px 12px', borderRadius: 'var(--radius-md)' }}>
              ⚠️ This member already has an old due of <strong>₹{member.dueAmount.toLocaleString('en-IN')}</strong>. Renewing replaces it with the amount above — include it in the Total Fee if it is still owed.
            </p>
          )}

          {maxEntered > maxExpected && maxEntered <= 150000 && (
            <div style={{ fontSize: '13px', color: '#b45309', background: 'rgba(245,158,11,0.1)', padding: '10px 12px', borderRadius: 'var(--radius-md)', display: 'flex', gap: '8px' }}>
              <span style={{ fontSize: '16px' }}>⚠️</span>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <strong>Unusually high amount</strong>
                <span>Expected max for {duration} is roughly ₹{maxExpected.toLocaleString('en-IN')}. Please double-check for extra zeros.</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
};
