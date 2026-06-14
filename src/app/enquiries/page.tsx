'use client';

import React, { useState } from 'react';
import { format } from 'date-fns';
import { PhoneOff } from 'lucide-react';
import { useEnquiries } from '@/hooks/useEnquiries';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Skeleton } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { AddEnquiryModal } from '@/components/modals/AddEnquiryModal';
import { buildEnquiryWhatsApp, buildCallLink } from '@/lib/whatsapp';
import { supabase } from '@/lib/supabaseClient';
import { queryClient } from '@/lib/queryClient';
import styles from './page.module.css';

export default function Enquiries() {
  const { data: enquiries = [], isLoading } = useEnquiries();
  const [addOpen, setAddOpen] = useState(false);

  const toggleConverted = async (id: string) => {
    const enquiry = enquiries.find(e => e.id === id);
    if (!enquiry) return;
    await supabase
      .from('enquiries')
      .update({ is_converted: !enquiry.isConverted })
      .eq('id', id);
    queryClient.invalidateQueries({ queryKey: ['enquiries'] });
  };

  const handleDelete = async (id: string) => {
    await supabase.from('enquiries').delete().eq('id', id);
    queryClient.invalidateQueries({ queryKey: ['enquiries'] });
  };

  return (
    <>
      <div className={styles.container}>
        <div className={styles.header}>
          <Button variant="primary" icon="UserPlus" onClick={() => setAddOpen(true)}>Add Enquiry</Button>
        </div>

        {isLoading ? (
          <div className={styles.cardList}>
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className={styles.enquiryCard} style={{ display: 'flex', flexDirection: 'column', gap: '10px', padding: '16px' }}>
                <Skeleton height="18px" width="50%" />
                <Skeleton height="14px" width="35%" />
                <Skeleton height="14px" width="60%" />
                <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
                  <Skeleton height="34px" width="80px" borderRadius="8px" />
                  <Skeleton height="34px" width="100px" borderRadius="8px" />
                </div>
              </div>
            ))}
          </div>
        ) : enquiries.length === 0 ? (
          <EmptyState
            icon={PhoneOff}
            title="No enquiries yet"
            description="Add your first lead using the button above."
          />
        ) : (
          <div className={styles.cardList}>
            {[...enquiries].sort((a, b) => b.timestamp - a.timestamp).map(enquiry => (
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
                {(enquiry.location || enquiry.source) && (
                  <div style={{ fontSize: '13px', color: 'var(--color-text-secondary)', marginBottom: '8px', display: 'flex', flexDirection: 'column', gap: '2px' }}>
                    {enquiry.location && <span>📍 {enquiry.location}</span>}
                    {enquiry.source && <span>📢 {enquiry.source}</span>}
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
