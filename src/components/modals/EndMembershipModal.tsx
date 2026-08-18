'use client';

import React, { useState, useEffect } from 'react';
import { format, addMonths } from 'date-fns';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/ui/Toast';
import { useAuth } from '@/context/AuthContext';
import { endMembership } from '@/lib/actions';
import { Member } from '@/types';
import { useQueryClient } from '@tanstack/react-query';

interface EndMembershipModalProps {
  isOpen: boolean;
  onClose: () => void;
  member: Member;
}

type EndStatus = 'cancelled' | 'inactive' | 'on_hold';

const statusOptions: { value: EndStatus; label: string; description: string; color: string }[] = [
  { value: 'cancelled', label: '⚫ Cancelled', description: 'Member intentionally stopped their membership', color: '#374151' },
  { value: 'inactive', label: '⚪ Inactive', description: 'Member is not currently using the gym', color: '#9CA3AF' },
  { value: 'on_hold', label: '🟡 On Hold', description: 'Member will return after a break', color: '#F59E0B' },
];

export const EndMembershipModal: React.FC<EndMembershipModalProps> = ({ isOpen, onClose, member }) => {
  const { showToast } = useToast();
  const { logAction } = useAuth();
  const queryClient = useQueryClient();

  const [selectedStatus, setSelectedStatus] = useState<EndStatus>('cancelled');
  const [note, setNote] = useState('');
  const [noteError, setNoteError] = useState('');
  const [hasReminder, setHasReminder] = useState(false);
  const [reminderDate, setReminderDate] = useState('');
  const [reminderNote, setReminderNote] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setSelectedStatus('cancelled');
      setNote('');
      setNoteError('');
      setHasReminder(false);
      const defaultDate = format(addMonths(new Date(), 1), 'yyyy-MM-dd');
      setReminderDate(defaultDate);
      setReminderNote('');
      setSubmitting(false);
    }
  }, [isOpen]);

  const handleSubmit = async () => {
    if (!note.trim()) {
      setNoteError('Please provide a reason for ending the membership.');
      return;
    }

    setSubmitting(true);

    const result = await endMembership({
      memberId: member.id,
      status: selectedStatus,
      note: note.trim(),
      reminderDate: hasReminder && reminderDate ? new Date(reminderDate).getTime() : undefined,
      reminderNote: hasReminder && reminderNote ? reminderNote.trim() : undefined,
    });

    if (result?.error) {
      showToast(`Failed: ${result.error}`, 'error');
      setSubmitting(false);
      return;
    }

    const statusLabel = statusOptions.find(s => s.value === selectedStatus)?.label ?? selectedStatus;
    logAction('Ended Membership', { memberName: member.name, status: statusLabel });

    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['members'] }),
      queryClient.invalidateQueries({ queryKey: ['members_list'] }),
      queryClient.invalidateQueries({ queryKey: ['member', member.id] }),
      queryClient.invalidateQueries({ queryKey: ['dashboard_stats'] }),
    ]);

    showToast(`${member.name}'s membership has been ended.`);
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`End Membership — ${member.name}`}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button
            variant="danger"
            onClick={handleSubmit}
            disabled={submitting}
          >
            {submitting ? 'Ending...' : 'End Membership'}
          </Button>
        </>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        {/* Status Selection */}
        <div>
          <div style={{ fontSize: '14px', fontWeight: 600, marginBottom: '10px', color: 'var(--color-text-secondary)' }}>
            End As
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {statusOptions.map(option => (
              <button
                key={option.value}
                onClick={() => setSelectedStatus(option.value)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '12px 16px',
                  border: `2px solid ${selectedStatus === option.value ? option.color : 'var(--color-border)'}`,
                  borderRadius: 'var(--radius-md)',
                  background: selectedStatus === option.value ? `${option.color}08` : 'var(--color-surface)',
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'all var(--transition-fast)',
                  width: '100%',
                }}
              >
                <span
                  style={{
                    width: '12px',
                    height: '12px',
                    borderRadius: '50%',
                    backgroundColor: option.color,
                    flexShrink: 0,
                    border: selectedStatus === option.value ? '3px solid white' : 'none',
                    boxShadow: selectedStatus === option.value ? `0 0 0 2px ${option.color}` : 'none',
                  }}
                />
                <div>
                  <div style={{ fontWeight: 600, fontSize: '14px' }}>{option.label}</div>
                  <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)', marginTop: '2px' }}>
                    {option.description}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Reason / Note */}
        <div>
          <label style={{ fontSize: '14px', fontWeight: 600, display: 'block', marginBottom: '6px', color: 'var(--color-text-secondary)' }}>
            Reason / Note *
          </label>
          <textarea
            value={note}
            onChange={e => { setNote(e.target.value); setNoteError(''); }}
            placeholder="Why is this membership being ended?"
            rows={3}
            style={{
              width: '100%',
              padding: '12px',
              border: `1px solid ${noteError ? 'var(--color-error)' : 'var(--color-border)'}`,
              borderRadius: 'var(--radius-sm)',
              fontFamily: 'var(--font-body)',
              fontSize: '14px',
              resize: 'vertical',
              background: 'var(--color-surface)',
              color: 'var(--color-text-primary)',
              outline: 'none',
              transition: 'border-color var(--transition-fast)',
            }}
            onFocus={e => e.target.style.borderColor = 'var(--color-primary)'}
            onBlur={e => { if (!noteError) e.target.style.borderColor = 'var(--color-border)'; }}
          />
          {noteError && (
            <div style={{ fontSize: '12px', color: 'var(--color-error)', marginTop: '4px' }}>
              {noteError}
            </div>
          )}
        </div>

        {/* Reminder Toggle */}
        <div>
          <label
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: 600,
              color: 'var(--color-text-secondary)',
            }}
          >
            <input
              type="checkbox"
              checked={hasReminder}
              onChange={e => setHasReminder(e.target.checked)}
              style={{ width: '18px', height: '18px', accentColor: 'var(--color-primary)' }}
            />
            Set a follow-up reminder
          </label>

          {hasReminder && (
            <div style={{ marginTop: '12px', display: 'flex', flexDirection: 'column', gap: '8px', paddingLeft: '28px' }}>
              <Input
                label="Reminder Date"
                type="date"
                value={reminderDate}
                onChange={e => setReminderDate(e.target.value)}
              />
              <Input
                label="Reminder Note"
                value={reminderNote}
                onChange={e => setReminderNote(e.target.value)}
                placeholder="e.g. Check if they want to rejoin"
              />
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
};
