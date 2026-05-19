'use client';

import React, { useState } from 'react';
import { format } from 'date-fns';
import { PhoneOff } from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { AddEnquiryModal } from '@/components/modals/AddEnquiryModal';
import { buildEnquiryWhatsApp, buildCallLink } from '@/lib/whatsapp';
import styles from './page.module.css';

export default function Enquiries() {
  const { state, dispatch } = useApp();
  const [addOpen, setAddOpen] = useState(false);

  const toggleConverted = (id: string) => {
    const enquiry = state.enquiries.find(e => e.id === id);
    if (enquiry) dispatch({ type: 'UPDATE_ENQUIRY', payload: { ...enquiry, isConverted: !enquiry.isConverted } });
  };

  const handleDelete = (id: string) => {
    dispatch({ type: 'DELETE_ENQUIRY', payload: id });
  };

  return (
    <>
      <div className={styles.container}>
        <div className={styles.header}>
          <Button variant="primary" icon="UserPlus" onClick={() => setAddOpen(true)}>Add Enquiry</Button>
        </div>

        {state.enquiries.length === 0 ? (
          <div className={styles.emptyState}>
            <PhoneOff size={64} style={{ opacity: 0.3 }} />
            <p className="text-body-lg">No enquiries yet</p>
            <p className="text-body" style={{ color: 'var(--color-text-secondary)' }}>Add your first lead using the button above.</p>
          </div>
        ) : (
          <div className={styles.cardList}>
            {[...state.enquiries].sort((a, b) => b.timestamp - a.timestamp).map(enquiry => (
              <div key={enquiry.id} className={`${styles.enquiryCard} ${enquiry.isConverted ? styles.converted : ''}`}>
                <div className={styles.cardTop}>
                  <label className={styles.convertLabel}>
                    <input
                      type="checkbox"
                      checked={enquiry.isConverted}
                      onChange={() => toggleConverted(enquiry.id)}
                      className={styles.convertCheckbox}
                    />
                    <div>
                      <div className={styles.memberName}>{enquiry.name}</div>
                      <div className={styles.memberPhone}>{enquiry.phoneNumber}</div>
                      {enquiry.isConverted && <Badge status="converted" />}
                    </div>
                  </label>
                  <button className={styles.deleteBtn} onClick={() => handleDelete(enquiry.id)} title="Delete">✕</button>
                </div>

                {enquiry.planOfInterest && (
                  <div className={styles.planRow}>
                    Interested in: <strong style={{ color: 'var(--color-primary)' }}>{enquiry.planOfInterest}</strong>
                  </div>
                )}
                {enquiry.notes && <div className={styles.notesText}>{enquiry.notes}</div>}
                <div className={styles.timestamp}>{format(enquiry.timestamp, 'dd MMM, hh:mm a')}</div>

                <div className={styles.actions}>
                  <Button variant="ghost" icon="Phone" onClick={() => window.open(buildCallLink(enquiry.phoneNumber), '_blank')}>Call</Button>
                  <Button variant="whatsapp" icon="MessageCircle" onClick={() => window.open(buildEnquiryWhatsApp(enquiry.phoneNumber, enquiry.name), '_blank')}>WhatsApp</Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <AddEnquiryModal isOpen={addOpen} onClose={() => setAddOpen(false)} />
    </>
  );
}
