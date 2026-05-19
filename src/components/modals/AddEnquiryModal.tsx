'use client';

import React, { useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';
import { useApp } from '@/context/AppContext';
import { useToast } from '@/components/ui/Toast';

interface AddEnquiryModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AddEnquiryModal: React.FC<AddEnquiryModalProps> = ({ isOpen, onClose }) => {
  const { state, dispatch } = useApp();
  const { showToast } = useToast();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [planOfInterest, setPlanOfInterest] = useState(state.settings.availablePlans[0]);
  const [notes, setNotes] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleConfirm = () => {
    const errs: Record<string, string> = {};
    if (!name.trim()) errs.name = 'Name is required.';
    if (!/^\d{10}$/.test(phone)) errs.phone = 'Must be exactly 10 digits.';
    if (Object.keys(errs).length) { setErrors(errs); return; }

    dispatch({
      type: 'ADD_ENQUIRY',
      payload: {
        id: uuidv4(),
        name: name.trim(),
        phoneNumber: phone.trim(),
        planOfInterest,
        notes: notes.trim(),
        isConverted: false,
        timestamp: Date.now(),
      },
    });
    showToast(`Enquiry for ${name.trim()} added! ✓`);
    setName(''); setPhone(''); setNotes(''); setErrors({});
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Add Enquiry"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button variant="primary" onClick={handleConfirm}>Add Enquiry</Button>
        </>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
        <Input label="Name" value={name} onChange={e => setName(e.target.value)} error={errors.name} />
        <Input label="Phone Number" type="tel" maxLength={10} value={phone} onChange={e => setPhone(e.target.value)} error={errors.phone} />
        <Select label="Interested Plan" options={state.settings.availablePlans} value={planOfInterest} onChange={e => setPlanOfInterest(e.target.value)} />
        <textarea
          rows={3}
          value={notes}
          onChange={e => setNotes(e.target.value)}
          placeholder="Notes (optional)"
          style={{ width: '100%', padding: '12px', border: '1.5px solid var(--color-border)', borderRadius: 'var(--radius-md)', fontFamily: 'var(--font-body)', fontSize: '14px', resize: 'vertical', marginTop: '8px' }}
        />
      </div>
    </Modal>
  );
};
