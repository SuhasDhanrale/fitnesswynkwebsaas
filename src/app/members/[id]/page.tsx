'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { User, UserMinus } from 'lucide-react';
import { format } from 'date-fns';
import { useApp } from '@/context/AppContext';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { EditMemberModal } from '@/components/modals/EditMemberModal';
import { RenewMemberModal } from '@/components/modals/RenewMemberModal';
import { ConfirmPinModal } from '@/components/modals/ConfirmPinModal';
import { PaymentDetailModal } from '@/components/modals/PaymentDetailModal';
import { isExpired, daysRemaining } from '@/lib/dateUtils';
import { buildMemberWhatsApp, buildCallLink } from '@/lib/whatsapp';
import { Payment } from '@/types';
import styles from './page.module.css';

export default function MemberDetail({ params }: { params: { id: string } }) {
  const { state, dispatch } = useApp();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'payments' | 'attendance'>('payments');
  const [editOpen, setEditOpen] = useState(false);
  const [renewOpen, setRenewOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null);

  const member = state.members.find(m => m.id === params.id);
  const memberPayments = state.payments.filter(p => p.memberId === params.id).sort((a, b) => b.timestamp - a.timestamp);

  if (!member) {
    return (
      <div className={styles.notFound}>
        <UserMinus size={64} style={{ opacity: 0.3 }} />
        <h2 className="text-h2">Member Not Found</h2>
        <Button variant="primary" onClick={() => router.push('/members')}>Back to Members</Button>
      </div>
    );
  }

  const expired = isExpired(member);
  const daysLeft = daysRemaining(member);

  const handleDelete = () => {
    dispatch({ type: 'DELETE_MEMBER', payload: member.id });
    router.push('/members');
  };

  return (
    <>
      <div className={styles.container}>
        {/* LEFT COLUMN */}
        <div className={styles.leftColumn}>
          <div className={styles.profileCard}>
            <div className={`${styles.avatar} ${expired ? styles.expired : ''}`}>
              <User size={48} />
            </div>
            <h2 className={styles.name}>{member.name}</h2>
            <div className={styles.phone}>{member.phoneNumber}</div>
            <div className={`${styles.statusText} ${expired ? styles.expired : styles.active}`}>
              {expired ? 'EXPIRED' : `${daysLeft} Days Remaining`}
            </div>
            <div className={styles.actionsGrid}>
              <Button variant="ghost" icon="Phone" fullWidth onClick={() => window.open(buildCallLink(member.phoneNumber), '_blank')}>Call</Button>
              <Button variant="whatsapp" icon="MessageCircle" fullWidth onClick={() => window.open(buildMemberWhatsApp(member.phoneNumber, member.name, format(member.expiryDate, 'dd MMM yyyy')), '_blank')}>WhatsApp</Button>
            </div>
          </div>
          <Button variant="danger" icon="Trash2" fullWidth onClick={() => setDeleteConfirmOpen(true)}>Delete Member</Button>
        </div>

        {/* RIGHT COLUMN */}
        <div className={styles.rightColumn}>
          <div className={styles.card}>
            <div className={styles.cardHeader}>
              <h3 className={styles.cardTitle}>Subscription Details</h3>
              <Button variant="ghost" icon="Edit2" onClick={() => setEditOpen(true)}>Edit</Button>
            </div>
            {[
              { label: 'Plan', value: member.planName },
              { label: 'Batch', value: member.batch },
              { label: 'Duration', value: member.durationLabel },
              { label: 'Expires On', value: format(member.expiryDate, 'dd MMM yyyy') },
            ].map(row => (
              <div key={row.label} className={styles.dataRow}>
                <span className={styles.dataLabel}>{row.label}</span>
                <span className={styles.dataValue}>{row.value}</span>
              </div>
            ))}
            <div className={styles.dataRow}>
              <span className={styles.dataLabel}>Status</span>
              <Badge status={expired ? 'expired' : 'active'} />
            </div>
            {member.dueAmount > 0 && (
              <div className={styles.dueAmountRow}>
                <span className={styles.dueAmountText}>Due Amount</span>
                <span className={styles.dueAmountText}>₹{member.dueAmount}</span>
              </div>
            )}
            {member.notes && (
              <div className={styles.notesSection}>
                <div style={{ fontWeight: 600, marginBottom: '4px' }}>Notes:</div>
                <div>{member.notes}</div>
              </div>
            )}
            <div style={{ marginTop: '16px' }}>
              <Button variant="primary" fullWidth onClick={() => setRenewOpen(true)}>Renew Membership</Button>
            </div>
          </div>

          <div className={styles.card}>
            <div className={styles.tabs}>
              <button className={`${styles.tab} ${activeTab === 'payments' ? styles.active : ''}`} onClick={() => setActiveTab('payments')}>Payment History</button>
              <button className={`${styles.tab} ${activeTab === 'attendance' ? styles.active : ''}`} onClick={() => setActiveTab('attendance')}>Attendance History</button>
            </div>
            {activeTab === 'payments' && (
              memberPayments.length === 0
                ? <div style={{ padding: '24px 0', textAlign: 'center', color: 'var(--color-text-secondary)' }}>No payments found.</div>
                : memberPayments.map(payment => (
                  <div key={payment.id} className={styles.historyRow} style={{ cursor: 'pointer' }} onClick={() => setSelectedPayment(payment)}>
                    <div>
                      <div className={styles.historyMain}>{payment.memberName}</div>
                      <div className={styles.historySub}>{format(payment.timestamp, 'dd MMM yyyy hh:mm a')}</div>
                    </div>
                    <div>
                      <div className={styles.historyAmount}>₹{payment.amount}</div>
                      <div className={styles.historyMode}>{payment.paymentMode}</div>
                    </div>
                  </div>
                ))
            )}
            {activeTab === 'attendance' && (
              <div style={{ padding: '24px 0', textAlign: 'center', color: 'var(--color-text-secondary)' }}>Attendance history coming soon.</div>
            )}
          </div>
        </div>
      </div>

      <EditMemberModal isOpen={editOpen} onClose={() => setEditOpen(false)} member={member} />
      <RenewMemberModal isOpen={renewOpen} onClose={() => setRenewOpen(false)} member={member} />
      <ConfirmPinModal isOpen={deleteConfirmOpen} onClose={() => setDeleteConfirmOpen(false)} onConfirm={handleDelete} title="Delete Member" description={`Permanently delete ${member.name}? This cannot be undone.`} />
      <PaymentDetailModal isOpen={!!selectedPayment} onClose={() => setSelectedPayment(null)} payment={selectedPayment} />
    </>
  );
}
