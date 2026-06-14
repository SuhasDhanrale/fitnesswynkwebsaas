'use client';

import React, { useState } from 'react';
import { User, UserMinus } from 'lucide-react';
import { format } from 'date-fns';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabaseClient';
import { queryClient } from '@/lib/queryClient';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Drawer } from '@/components/ui/Drawer';
import { Skeleton } from '@/components/ui/Skeleton';
import { EditMemberModal } from '@/components/modals/EditMemberModal';
import { RenewMemberModal } from '@/components/modals/RenewMemberModal';
import { ConfirmPinModal } from '@/components/modals/ConfirmPinModal';
import { PaymentDetailModal } from '@/components/modals/PaymentDetailModal';
import { isExpired, daysRemaining } from '@/lib/dateUtils';
import { buildMemberWhatsApp, buildCallLink } from '@/lib/whatsapp';
import { Member, Payment } from '@/types';
import styles from './MemberDetailDrawer.module.css';

interface MemberDetailDrawerProps {
  memberId: string | null;
  onClose: () => void;
}

export const MemberDetailDrawer: React.FC<MemberDetailDrawerProps> = ({ memberId, onClose }) => {
  const { logAction } = useAuth();
  const [activeTab, setActiveTab] = useState<'payments' | 'attendance'>('payments');
  const [editOpen, setEditOpen] = useState(false);
  const [renewOpen, setRenewOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null);

  // Fetch member by id
  const { data: member, isLoading: memberLoading } = useQuery({
    queryKey: ['member', memberId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('members')
        .select('*')
        .eq('id', memberId)
        .single();
      if (error) throw error;
      const m = data;
      return {
        id: m.id,
        name: m.name,
        phoneNumber: m.phone_number,
        planName: m.plan_name,
        batch: m.batch,
        startDate: Number(m.start_date),
        expiryDate: Number(m.expiry_date),
        durationLabel: m.duration_label,
        notes: m.notes || '',
        dueAmount: Number(m.due_amount || 0),
      } as Member;
    },
    enabled: !!memberId,
  });

  // Fetch member's payments
  const { data: memberPayments = [], isLoading: paymentsLoading } = useQuery({
    queryKey: ['payments', memberId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('payments')
        .select('*')
        .eq('member_id', memberId)
        .order('timestamp', { ascending: false });
      if (error) throw error;
      return (data || []).map((p: Record<string, unknown>): Payment => ({
        id: p.id as string,
        memberId: p.member_id as string,
        memberName: p.member_name as string,
        amount: Number(p.amount),
        paymentMode: p.payment_mode as 'Cash' | 'UPI',
        planName: p.plan_name as string,
        batch: p.batch as string,
        startDate: Number(p.start_date),
        endDate: Number(p.end_date),
        notes: (p.notes as string) || '',
        timestamp: Number(p.timestamp),
        isEdited: (p.is_edited as boolean) ?? false,
      }));
    },
    enabled: !!memberId,
  });

  // Fetch member's attendance
  const { data: memberAttendance = [], isLoading: attendanceLoading } = useQuery({
    queryKey: ['attendance', memberId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('attendance')
        .select('*')
        .eq('member_id', memberId)
        .order('date', { ascending: false });
      if (error) throw error;
      return (data || []).map((a: Record<string, unknown>) => ({
        id: a.id as string,
        memberId: a.member_id as string,
        memberName: a.member_name as string,
        date: Number(a.date),
      }));
    },
    enabled: !!memberId,
  });

  if (!memberId) return null;

  const handleDelete = async () => {
    if (!member) return;
    await supabase.from('members').delete().eq('id', member.id);
    
    logAction('Deleted Member', { memberName: member.name });
    
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['members'] }),
      queryClient.invalidateQueries({ queryKey: ['members_list'] })
    ]);
    queryClient.removeQueries({ queryKey: ['member', memberId] });
    onClose();
  };

  if (memberLoading) {
    return (
      <Drawer isOpen={!!memberId} onClose={onClose} width="500px">
        <div className={styles.container} style={{ display: 'flex', flexDirection: 'column', gap: '16px', padding: '24px' }}>
          <Skeleton height="80px" borderRadius="50%" width="80px" style={{ alignSelf: 'center' }} />
          <Skeleton height="24px" width="60%" style={{ alignSelf: 'center' }} />
          <Skeleton height="16px" width="40%" style={{ alignSelf: 'center' }} />
          <Skeleton height="120px" borderRadius="12px" />
          <Skeleton height="200px" borderRadius="12px" />
        </div>
      </Drawer>
    );
  }

  if (!member) {
    return (
      <Drawer isOpen={!!memberId} onClose={onClose} title="Member Details">
        <div className={styles.notFound}>
          <UserMinus size={64} style={{ opacity: 0.3 }} />
          <h2 className="text-h2">Member Not Found</h2>
          <Button variant="primary" onClick={onClose}>Close</Button>
        </div>
      </Drawer>
    );
  }

  const expired = isExpired(member);
  const daysLeft = daysRemaining(member);

  return (
    <>
      <Drawer isOpen={!!memberId} onClose={onClose} width="500px">
        <div className={styles.container}>
          
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
              paymentsLoading
                ? <div style={{ padding: '16px 0', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <Skeleton height="48px" borderRadius="8px" />
                    <Skeleton height="48px" borderRadius="8px" />
                    <Skeleton height="48px" borderRadius="8px" />
                  </div>
                : memberPayments.length === 0
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
              attendanceLoading
                ? <div style={{ padding: '16px 0', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <Skeleton height="40px" borderRadius="8px" />
                    <Skeleton height="40px" borderRadius="8px" />
                  </div>
                : memberAttendance.length === 0
                  ? <div style={{ padding: '24px 0', textAlign: 'center', color: 'var(--color-text-secondary)' }}>No attendance records found.</div>
                  : memberAttendance.map((record: Record<string, unknown>) => (
                    <div key={record.id as string} className={styles.historyRow}>
                      <div className={styles.historyMain}>{format(record.date as number, 'dd MMM yyyy')}</div>
                    </div>
                  ))
            )}
          </div>

          <Button variant="danger" icon="Trash2" fullWidth onClick={() => setDeleteConfirmOpen(true)}>Delete Member</Button>

        </div>
      </Drawer>

      <EditMemberModal isOpen={editOpen} onClose={() => setEditOpen(false)} member={member} />
      <RenewMemberModal isOpen={renewOpen} onClose={() => setRenewOpen(false)} member={member} />
      <ConfirmPinModal isOpen={deleteConfirmOpen} onClose={() => setDeleteConfirmOpen(false)} onConfirm={handleDelete} title="Delete Member" description={`Permanently delete ${member.name}? This cannot be undone.`} />
      <PaymentDetailModal isOpen={!!selectedPayment} onClose={() => setSelectedPayment(null)} payment={selectedPayment} />
    </>
  );
};
