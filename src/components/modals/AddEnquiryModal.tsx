'use client';

import React, { useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';
import { useApp } from '@/context/AppContext';
import { useToast } from '@/components/ui/Toast';
import { addEnquiry } from '@/lib/actions';
import { queryClient } from '@/lib/queryClient';

interface AddEnquiryModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AddEnquiryModal: React.FC<AddEnquiryModalProps> = ({ isOpen, onClose }) => {
  const { state } = useApp();
  const { showToast } = useToast();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [location, setLocation] = useState('');
  const [source, setSource] = useState('Select Source (Optional)');
  const [planOfInterest, setPlanOfInterest] = useState(state.settings.availablePlans[0] || '');
  const [notes, setNotes] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const SOURCE_OPTIONS = [
    'Select Source (Optional)',
    'Online',
    'Local Advertisement',
    'Walk-in',
    'Friend / Family Referral',
    'Old Member / Renewal',
    'Social Media (Instagram/Facebook)',
  ];

  const handleConfirm = async () => {
    const errs: Record<string, string> = {};
    if (!name.trim()) errs.name = 'Name is required.';
    if (!/^\d{10}$/.test(phone)) errs.phone = 'Must be exactly 10 digits.';
    if (Object.keys(errs).length) { setErrors(errs); return; }

    const result = await addEnquiry({
      name: name.trim(),
      phone_number: phone.trim(),
      location: location.trim() || null,
      source: source === 'Select Source (Optional)' ? null : source,
      plan_of_interest: planOfInterest,
      notes: notes.trim(),
    });

    if (result.error) {
      showToast('Failed to save enquiry. Please try again.');
      return;
    }

    queryClient.invalidateQueries({ queryKey: ['enquiries'] });
    showToast(`Enquiry for ${name.trim()} added! ✓`);
    setName(''); setPhone(''); setLocation(''); setSource('Select Source (Optional)'); setNotes(''); setErrors({});
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
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <Input label="Name" value={name} onChange={e => setName(e.target.value)} error={errors.name} />
        <Input label="Phone Number" type="tel" maxLength={10} value={phone} onChange={e => setPhone(e.target.value)} error={errors.phone} />
        <Input label="Location (Optional)" value={location} onChange={e => setLocation(e.target.value)} />
        <Select label="How did you hear about us?" options={SOURCE_OPTIONS} value={source} onChange={e => setSource(e.target.value)} />
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
