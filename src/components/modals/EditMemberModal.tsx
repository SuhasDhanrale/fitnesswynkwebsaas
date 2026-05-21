'use client';

import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';
import { ConfirmPinModal } from './ConfirmPinModal';
import { useApp } from '@/context/AppContext';
import { supabase } from '@/lib/supabaseClient';
import { queryClient } from '@/lib/queryClient';
import { useToast } from '@/components/ui/Toast';
import { calcEndDate } from '@/lib/dateUtils';
import { Member } from '@/types';

interface EditMemberModalProps {
  isOpen: boolean;
  onClose: () => void;
  member: Member;
}

export const EditMemberModal: React.FC<EditMemberModalProps> = ({ isOpen, onClose, member }) => {
  const { state } = useApp();
  const { showToast } = useToast();
  const [pinModalOpen, setPinModalOpen] = useState(false);
  const [name, setName] = useState(member.name);
  const [phone, setPhone] = useState(member.phoneNumber);
  const [plan, setPlan] = useState(member.planName);
  const [batch, setBatch] = useState(member.batch);
  const [duration, setDuration] = useState(member.durationLabel);
  const [startDate, setStartDate] = useState(format(member.startDate, 'yyyy-MM-dd'));
  const [expiryDate, setExpiryDate] = useState(format(member.expiryDate, 'yyyy-MM-dd'));
  const [notes, setNotes] = useState(member.notes);
  const [markFullyPaid, setMarkFullyPaid] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (isOpen) {
      setName(member.name); setPhone(member.phoneNumber);
      setPlan(member.planName); setBatch(member.batch);
      setDuration(member.durationLabel);
      setStartDate(format(member.startDate, 'yyyy-MM-dd'));
      setExpiryDate(format(member.expiryDate, 'yyyy-MM-dd'));
      setNotes(member.notes); setMarkFullyPaid(false); setErrors({});
    }
  }, [isOpen, member]);

  // Auto-recalc expiry when start date or duration changes
  useEffect(() => {
    const ms = calcEndDate(new Date(startDate).getTime(), duration);
    setExpiryDate(format(ms, 'yyyy-MM-dd'));
  }, [startDate, duration]);

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!name.trim()) errs.name = 'Name is required.';
    if (!/^\d{10}$/.test(phone)) errs.phone = 'Must be exactly 10 digits.';
    return errs;
  };

  const handleSaveClick = () => {
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setPinModalOpen(true);
  };

  const handleConfirmedSave = async () => {
    const { error } = await supabase
      .from('members')
      .update({
        name: name.trim(),
        phone_number: phone.trim(),
        plan_name: plan,
        batch,
        duration_label: duration,
        start_date: new Date(startDate).getTime(),
        expiry_date: new Date(expiryDate).getTime(),
        notes: notes.trim(),
        due_amount: markFullyPaid ? 0 : member.dueAmount,
      })
      .eq('id', member.id);

    if (error) {
      showToast(`Failed to update member: ${error.message}`, 'error');
      return;
    }

    queryClient.invalidateQueries({ queryKey: ['members'] });
    queryClient.invalidateQueries({ queryKey: ['members_list'] });
    queryClient.invalidateQueries({ queryKey: ['member', member.id] });

    showToast('Member updated successfully!');
    setPinModalOpen(false);
    onClose();
  };

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title="Edit Member"
        footer={
          <>
            <Button variant="ghost" onClick={onClose}>Cancel</Button>
            <Button variant="dark" onClick={handleSaveClick}>Save Changes</Button>
          </>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <Input label="Name" value={name} onChange={e => setName(e.target.value)} error={errors.name} />
          <Input label="Phone Number" type="tel" maxLength={10} value={phone} onChange={e => setPhone(e.target.value)} error={errors.phone} />
          <Select label="Plan" options={state.settings.availablePlans} value={plan} onChange={e => setPlan(e.target.value)} />
          <Select label="Batch" options={state.settings.batches} value={batch} onChange={e => setBatch(e.target.value)} />
          <Select label="Duration" options={state.settings.durations} value={duration} onChange={e => setDuration(e.target.value)} />
          <Input label="Start Date" type="date" value={startDate} onChange={e => setStartDate(e.target.value)} />
          <Input label="Expiry Date" type="date" value={expiryDate} onChange={e => setExpiryDate(e.target.value)} />
          <textarea
            rows={3}
            value={notes}
            onChange={e => setNotes(e.target.value)}
            placeholder="Notes (optional)"
            style={{ width: '100%', padding: '12px', border: '1.5px solid var(--color-border)', borderRadius: 'var(--radius-md)', fontFamily: 'var(--font-body)', fontSize: '14px', resize: 'vertical', marginTop: '8px' }}
          />
          {member.dueAmount > 0 && (
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '8px', cursor: 'pointer' }}>
              <input type="checkbox" checked={markFullyPaid} onChange={e => setMarkFullyPaid(e.target.checked)} />
              <span className="text-body">Mark as Fully Paid (clear ₹{member.dueAmount} due)</span>
            </label>
          )}
        </div>
      </Modal>

      <ConfirmPinModal
        isOpen={pinModalOpen}
        onClose={() => setPinModalOpen(false)}
        onConfirm={handleConfirmedSave}
        title="Confirm Edit"
        description="Enter admin PIN to save changes."
      />
    </>
  );
};
