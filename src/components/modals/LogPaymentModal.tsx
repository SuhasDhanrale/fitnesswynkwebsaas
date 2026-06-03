'use client';

import React, { useState, useEffect, useRef } from 'react';
import { format, differenceInDays } from 'date-fns';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';
import { FilterChip } from '@/components/ui/FilterChip';
import { Stepper } from '@/components/ui/Stepper';
import { SmartInput } from '@/components/ui/SmartInput';
import { useApp } from '@/context/AppContext';
import { useMembersList } from '@/hooks/useMembers';
import { useToast } from '@/components/ui/Toast';
import { supabase } from '@/lib/supabaseClient';
import { queryClient } from '@/lib/queryClient';
import { calcEndDate } from '@/lib/dateUtils';
import { v4 as uuidv4 } from 'uuid';

interface LogPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type PaymentStatus = 'Fully Paid' | 'Partial' | 'Not Paid Yet';

// Which date to start the new plan from
type StartDateMode = 'chain' | 'today' | 'custom';

export const LogPaymentModal: React.FC<LogPaymentModalProps> = ({ isOpen, onClose }) => {
  const { state } = useApp();
  const { showToast } = useToast();
  const { data: membersList = [] } = useMembersList();
  const today = format(new Date(), 'yyyy-MM-dd');

  // ── Stepper ──────────────────────────────────────────────────────────────
  const [step, setStep] = useState(1);

  // ── Step 1: Member selection ──────────────────────────────────────────────
  const [memberSearch, setMemberSearch] = useState('');
  const [selectedMemberId, setSelectedMemberId] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);

  // Fetched member details (set after selecting)
  const [memberCurrentPlan, setMemberCurrentPlan] = useState('');
  const [memberExpiryMs, setMemberExpiryMs] = useState<number | null>(null);

  // ── Step 2: Plan details ──────────────────────────────────────────────────
  const [plan, setPlan] = useState(state.settings.availablePlans[0]);
  const [batch, setBatch] = useState(state.settings.batches[0]);
  const [duration, setDuration] = useState(state.settings.durations[0]);
  const [startDateMode, setStartDateMode] = useState<StartDateMode>('chain');
  const [customStartDate, setCustomStartDate] = useState(today);

  // ── Step 3: Payment ───────────────────────────────────────────────────────
  const [payStatus, setPayStatus] = useState<PaymentStatus>('Fully Paid');
  const [totalFee, setTotalFee] = useState('');
  const [payingNow, setPayingNow] = useState('');
  const [payMode, setPayMode] = useState<'Cash' | 'UPI'>('Cash');
  const [notes, setNotes] = useState('');

  const [errors, setErrors] = useState<Record<string, string>>({});
  const searchInputRef = useRef<HTMLInputElement>(null);

  // ── Derived ───────────────────────────────────────────────────────────────
  // Determine whether member is active, expired, or has a gap
  const nowMs = Date.now();
  const isActive = memberExpiryMs !== null && memberExpiryMs > nowMs;
  const gapDays = memberExpiryMs !== null && !isActive
    ? differenceInDays(new Date(), new Date(memberExpiryMs))
    : 0;

  // Resolve actual start date based on mode
  const resolvedStartDate = (() => {
    if (startDateMode === 'today') return today;
    if (startDateMode === 'custom') return customStartDate;
    // 'chain': if active, start from expiry; if expired, start from today
    if (memberExpiryMs !== null && isActive) return format(memberExpiryMs, 'yyyy-MM-dd');
    return today;
  })();

  const startMs = new Date(resolvedStartDate).getTime();
  const endMs = calcEndDate(startMs, duration);
  const endDateDisplay = format(endMs, 'dd MMM yyyy');

  // ── Reset on open ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (isOpen) {
      setStep(1);
      setMemberSearch(''); setSelectedMemberId('');
      setMemberCurrentPlan(''); setMemberExpiryMs(null);
      setPlan(state.settings.availablePlans[0]);
      setBatch(state.settings.batches[0]);
      setDuration(state.settings.durations[0]);
      setStartDateMode('chain');
      setCustomStartDate(today);
      setPayStatus('Fully Paid');
      setTotalFee(''); setPayingNow('');
      setPayMode('Cash'); setNotes('');
      setErrors({});
      setShowDropdown(false);
      setTimeout(() => searchInputRef.current?.focus(), 100);
    }
  }, [isOpen, state.settings.availablePlans, state.settings.batches, state.settings.durations, today]);

  // ── Member search & select ────────────────────────────────────────────────
  const memberResults = memberSearch.length >= 2
    ? membersList.filter(m => m.name.toLowerCase().includes(memberSearch.toLowerCase())).slice(0, 5)
    : [];

  const selectMember = async (id: string) => {
    const m = membersList.find(x => x.id === id);
    if (!m) return;
    setSelectedMemberId(id);
    setMemberSearch(m.name);
    setShowDropdown(false);

    // Fetch full member for auto-fill
    const { data: full } = await supabase
      .from('members')
      .select('plan_name, batch, duration_label, expiry_date')
      .eq('id', id)
      .single();

    if (full) {
      setPlan(full.plan_name ?? state.settings.availablePlans[0]);
      setBatch(full.batch ?? state.settings.batches[0]);
      setDuration(full.duration_label ?? state.settings.durations[0]);
      setMemberCurrentPlan(full.plan_name ?? '');
      setMemberExpiryMs(Number(full.expiry_date));
    }
  };

  // ── Navigation ────────────────────────────────────────────────────────────
  const goNext = () => {
    if (step === 1) {
      if (!selectedMemberId) { setErrors({ member: 'Please select a valid member.' }); return; }
      setErrors({});
      setStep(2);
    } else if (step === 2) {
      setErrors({});
      setStep(3);
    }
  };

  const goBack = () => {
    if (step > 1) setStep(s => s - 1);
  };

  // ── Submit ────────────────────────────────────────────────────────────────
  const handleConfirm = async () => {
    const errs: Record<string, string> = {};
    if (!selectedMemberId) { errs.member = 'Please select a valid member.'; }
    if (payStatus !== 'Not Paid Yet' && (!payingNow || Number(payingNow) <= 0)) {
      errs.amount = 'Enter the amount being paid.';
    }
    if (payStatus === 'Partial' && (!totalFee || Number(totalFee) <= 0)) {
      errs.totalFee = 'Enter the total plan fee.';
    }
    if (Object.keys(errs).length) { setErrors(errs); return; }

    const amountPaid = payStatus === 'Not Paid Yet' ? 0 : Number(payingNow);
    const planFee = payStatus === 'Partial' ? Number(totalFee) : payStatus === 'Not Paid Yet' ? Number(totalFee) : amountPaid;
    const dueAmount = payStatus === 'Partial' ? planFee - amountPaid
      : payStatus === 'Not Paid Yet' ? planFee
      : 0;

    const selectedMember = membersList.find(m => m.id === selectedMemberId);
    const memberName = selectedMember?.name ?? 'Unknown';
    const paymentId = uuidv4();
    const timestamp = Date.now();

    // Insert payment record
    const { error: payError } = await supabase.from('payments').insert({
      id: paymentId,
      member_id: selectedMemberId,
      member_name: memberName,
      amount: amountPaid,
      payment_mode: payMode,
      plan_name: plan,
      batch,
      start_date: startMs,
      end_date: endMs,
      notes: notes.trim(),
      timestamp,
    });

    if (payError) {
      showToast('Failed to save payment. Please try again.');
      return;
    }

    // Update member record
    await supabase.from('members').update({
      plan_name: plan,
      batch,
      duration_label: duration,
      start_date: startMs,
      expiry_date: endMs,
      due_amount: dueAmount,
    }).eq('id', selectedMemberId);

    // Invalidate caches
    queryClient.invalidateQueries({ queryKey: ['members'] });
    queryClient.invalidateQueries({ queryKey: ['members_list'] });
    queryClient.invalidateQueries({ queryKey: ['member', selectedMemberId] });
    queryClient.invalidateQueries({ queryKey: ['payments', selectedMemberId] });
    queryClient.invalidateQueries({ queryKey: ['payments'] });
    queryClient.invalidateQueries({ queryKey: ['dashboard_stats'] });

    const msg = payStatus === 'Not Paid Yet'
      ? `Plan started for ${memberName}. Due: ₹${dueAmount}. ✓`
      : `₹${amountPaid} logged for ${memberName}. ✓`;
    showToast(msg);
    onClose();
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !showDropdown) {
      e.preventDefault();
      if (step < 3) goNext(); else handleConfirm();
    }
  };

  const isDirty = !!selectedMemberId;

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Log Payment"
      isDirty={isDirty}
      dirtyMessage="Payment is not saved yet. Discard and close?"
      footer={
        <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
          <Button variant="ghost" onClick={step === 1 ? onClose : goBack}>
            {step === 1 ? 'Cancel' : 'Back'}
          </Button>
          {step < 3
            ? <Button variant="primary" onClick={goNext}>Next</Button>
            : <Button variant="primary" onClick={handleConfirm}>Log Payment</Button>
          }
        </div>
      }
    >
      <div onKeyDown={onKeyDown} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <Stepper currentStep={step} totalSteps={3} />

        {/* ── STEP 1: Select Member ── */}
        {step === 1 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', animation: 'pageFadeIn 200ms ease' }}>
            {state.settings.enableSmartEntry !== false && (
              <SmartInput
                type="payment"
                onParsed={(data) => {
                  if (data.name) { setMemberSearch(data.name); setShowDropdown(true); }
                  if (data.amount) setPayingNow(data.amount);
                  if (data.paymentMode) setPayMode(data.paymentMode as 'Cash' | 'UPI');
                }}
              />
            )}

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
                      <span style={{ color: 'var(--color-text-secondary)', marginLeft: '8px' }}>{m.phoneNumber}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Show member's current plan status after selection */}
            {selectedMemberId && memberExpiryMs !== null && (
              <div style={{
                background: isActive ? 'rgba(16,185,129,0.08)' : 'rgba(239,68,68,0.08)',
                border: `1px solid ${isActive ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.3)'}`,
                borderRadius: 'var(--radius-md)',
                padding: '12px 16px',
                fontSize: '13px',
              }}>
                {isActive ? (
                  <span style={{ color: '#059669' }}>
                    ✅ <strong>{memberCurrentPlan}</strong> — active until <strong>{format(memberExpiryMs, 'dd MMM yyyy')}</strong>
                  </span>
                ) : (
                  <span style={{ color: '#dc2626' }}>
                    ❌ <strong>{memberCurrentPlan}</strong> — expired <strong>{gapDays} day{gapDays !== 1 ? 's' : ''} ago</strong> ({format(memberExpiryMs, 'dd MMM yyyy')})
                  </span>
                )}
              </div>
            )}
          </div>
        )}

        {/* ── STEP 2: Plan & Start Date ── */}
        {step === 2 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', animation: 'pageFadeIn 200ms ease' }}>
            <Select label="Plan" options={state.settings.availablePlans} value={plan} onChange={e => setPlan(e.target.value)} />
            <Select label="Batch" options={state.settings.batches} value={batch} onChange={e => setBatch(e.target.value)} />
            <Select label="Duration" options={state.settings.durations} value={duration} onChange={e => setDuration(e.target.value)} />

            {/* Start date options — smart based on member status */}
            <div>
              <p style={{ fontSize: '12px', color: 'var(--color-text-secondary)', marginBottom: '8px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                When does the new plan start?
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>

                {/* Option A: Chain from current expiry (only relevant if active or recently expired) */}
                {memberExpiryMs !== null && (
                  <label style={{
                    display: 'flex', alignItems: 'flex-start', gap: '10px', padding: '10px 14px',
                    border: `1.5px solid ${startDateMode === 'chain' ? 'var(--color-primary)' : 'var(--color-border)'}`,
                    borderRadius: 'var(--radius-md)', cursor: 'pointer',
                    background: startDateMode === 'chain' ? 'rgba(37,99,235,0.05)' : 'transparent',
                    transition: 'all 0.15s ease',
                  }}>
                    <input type="radio" name="startMode" checked={startDateMode === 'chain'} onChange={() => setStartDateMode('chain')} style={{ marginTop: '2px', accentColor: 'var(--color-primary)' }} />
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '14px' }}>
                        {isActive
                          ? `Continue from expiry — ${format(memberExpiryMs, 'dd MMM yyyy')}`
                          : `Backdate from last expiry — ${format(memberExpiryMs, 'dd MMM yyyy')}`
                        }
                      </div>
                      <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)', marginTop: '2px' }}>
                        {isActive
                          ? 'New plan chains onto the current one without any gap.'
                          : `Covers the ${gapDays}-day gap. New plan runs from last expiry.`
                        }
                      </div>
                    </div>
                  </label>
                )}

                {/* Option B: Start from today */}
                <label style={{
                  display: 'flex', alignItems: 'flex-start', gap: '10px', padding: '10px 14px',
                  border: `1.5px solid ${startDateMode === 'today' ? 'var(--color-primary)' : 'var(--color-border)'}`,
                  borderRadius: 'var(--radius-md)', cursor: 'pointer',
                  background: startDateMode === 'today' ? 'rgba(37,99,235,0.05)' : 'transparent',
                  transition: 'all 0.15s ease',
                }}>
                  <input type="radio" name="startMode" checked={startDateMode === 'today'} onChange={() => setStartDateMode('today')} style={{ marginTop: '2px', accentColor: 'var(--color-primary)' }} />
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '14px' }}>
                      Start from today — {format(new Date(), 'dd MMM yyyy')}
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)', marginTop: '2px' }}>
                      {isActive
                        ? 'Overlaps with current active plan — remaining days are lost.'
                        : gapDays > 0
                          ? `${gapDays}-day gap is not covered. Fresh plan starts today.`
                          : 'Plan starts from today.'
                      }
                    </div>
                  </div>
                </label>

                {/* Option C: Custom date */}
                <label style={{
                  display: 'flex', alignItems: 'flex-start', gap: '10px', padding: '10px 14px',
                  border: `1.5px solid ${startDateMode === 'custom' ? 'var(--color-primary)' : 'var(--color-border)'}`,
                  borderRadius: 'var(--radius-md)', cursor: 'pointer',
                  background: startDateMode === 'custom' ? 'rgba(37,99,235,0.05)' : 'transparent',
                  transition: 'all 0.15s ease',
                }}>
                  <input type="radio" name="startMode" checked={startDateMode === 'custom'} onChange={() => setStartDateMode('custom')} style={{ marginTop: '2px', accentColor: 'var(--color-primary)' }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, fontSize: '14px', marginBottom: '6px' }}>Custom start date</div>
                    {startDateMode === 'custom' && (
                      <input
                        type="date"
                        value={customStartDate}
                        onChange={e => setCustomStartDate(e.target.value)}
                        style={{ padding: '6px 10px', border: '1.5px solid var(--color-border)', borderRadius: 'var(--radius-sm)', fontFamily: 'var(--font-body)', fontSize: '14px' }}
                      />
                    )}
                  </div>
                </label>
              </div>
            </div>

            {/* End date summary */}
            <div style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              background: 'var(--color-surface-variant)', borderRadius: 'var(--radius-md)', padding: '10px 14px',
              fontSize: '13px',
            }}>
              <span style={{ color: 'var(--color-text-secondary)' }}>Plan period</span>
              <span style={{ fontWeight: 700 }}>
                {format(new Date(resolvedStartDate), 'dd MMM yyyy')} → {endDateDisplay}
              </span>
            </div>
          </div>
        )}

        {/* ── STEP 3: Payment ── */}
        {step === 3 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', animation: 'pageFadeIn 200ms ease' }}>

            {/* Plan summary banner */}
            <div style={{
              background: 'var(--color-surface-variant)', borderRadius: 'var(--radius-md)',
              padding: '10px 14px', fontSize: '13px', display: 'flex', justifyContent: 'space-between',
            }}>
              <span style={{ color: 'var(--color-text-secondary)' }}>{plan} · {duration} · {batch}</span>
              <span style={{ fontWeight: 700 }}>{format(new Date(resolvedStartDate), 'dd MMM')} → {endDateDisplay}</span>
            </div>

            {/* Payment status */}
            <div>
              <p style={{ fontSize: '12px', color: 'var(--color-text-secondary)', marginBottom: '8px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Payment Status
              </p>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {(['Fully Paid', 'Partial', 'Not Paid Yet'] as PaymentStatus[]).map(s => (
                  <FilterChip key={s} label={s} selected={payStatus === s} onClick={() => setPayStatus(s)} />
                ))}
              </div>
            </div>

            {payStatus === 'Fully Paid' && (
              <Input label="Amount Received (₹)" type="number" value={payingNow} onChange={e => setPayingNow(e.target.value)} error={errors.amount} />
            )}

            {payStatus === 'Partial' && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                <Input label="Total Plan Fee (₹)" type="number" value={totalFee} onChange={e => setTotalFee(e.target.value)} error={errors.totalFee} />
                <Input label="Paying Now (₹)" type="number" value={payingNow} onChange={e => setPayingNow(e.target.value)} error={errors.amount} />
              </div>
            )}

            {payStatus === 'Partial' && totalFee && payingNow && Number(totalFee) > Number(payingNow) && (
              <div style={{ fontSize: '13px', color: '#dc2626', background: 'rgba(239,68,68,0.08)', borderRadius: 'var(--radius-sm)', padding: '8px 12px' }}>
                Due after this payment: <strong>₹{Number(totalFee) - Number(payingNow)}</strong>
              </div>
            )}

            {payStatus === 'Not Paid Yet' && (
              <Input label="Total Plan Fee / Due Amount (₹)" type="number" value={totalFee} onChange={e => setTotalFee(e.target.value)} />
            )}

            {/* Payment mode — only show if money is being collected */}
            {payStatus !== 'Not Paid Yet' && (
              <div>
                <p style={{ fontSize: '12px', color: 'var(--color-text-secondary)', marginBottom: '8px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Payment Mode
                </p>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <FilterChip label="Cash" selected={payMode === 'Cash'} onClick={() => setPayMode('Cash')} />
                  <FilterChip label="UPI" selected={payMode === 'UPI'} onClick={() => setPayMode('UPI')} />
                </div>
              </div>
            )}

            <textarea
              rows={2}
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Notes (optional)"
              style={{ width: '100%', padding: '12px', border: '1.5px solid var(--color-border)', borderRadius: 'var(--radius-md)', fontFamily: 'var(--font-body)', fontSize: '14px', resize: 'vertical', boxSizing: 'border-box' }}
            />
          </div>
        )}
      </div>
    </Modal>
  );
};
