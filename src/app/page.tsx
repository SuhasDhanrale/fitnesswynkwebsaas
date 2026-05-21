'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import { CheckCircle, Wallet } from 'lucide-react';
import { StatCard } from '@/components/ui/StatCard';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { AddMemberModal } from '@/components/modals/AddMemberModal';
import { LogPaymentModal } from '@/components/modals/LogPaymentModal';
import { useDashboardStats } from '@/hooks/useDashboardStats';
import { usePayments } from '@/hooks/useFinanceData';
import { queryClient } from '@/lib/queryClient';
import styles from './page.module.css';
import { useState } from 'react';

export default function Dashboard() {
  const router = useRouter();
  const [addMemberOpen, setAddMemberOpen] = useState(false);
  const [logPaymentOpen, setLogPaymentOpen] = useState(false);

  const { data: stats, isLoading: statsLoading } = useDashboardStats();
  const { data: paymentsData, isLoading: paymentsLoading } = usePayments(0, 5);

  const recentPayments = paymentsData?.data ?? [];
  const isLoading = statsLoading && paymentsLoading;

  if (isLoading) {
    return (
      <div className={styles.container}>
        <div className={styles.statsGrid}>
          {[1, 2, 3, 4].map(i => <Skeleton key={i} height="100px" borderRadius="12px" />)}
        </div>
        <div className={styles.quickActions}>
          {[1, 2, 3, 4].map(i => <Skeleton key={i} height="40px" borderRadius="8px" />)}
        </div>
        <div className={styles.columns}>
          <div className={styles.sectionCard}>
            <Skeleton height="24px" width="150px" style={{ marginBottom: '16px' }} />
            {[1, 2, 3].map(i => <Skeleton key={i} height="60px" style={{ marginBottom: '12px' }} borderRadius="8px" />)}
          </div>
          <div className={styles.sectionCard}>
            <Skeleton height="24px" width="150px" style={{ marginBottom: '16px' }} />
            {[1, 2, 3].map(i => <Skeleton key={i} height="60px" style={{ marginBottom: '12px' }} borderRadius="8px" />)}
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className={styles.container}>
        <div className={styles.statsGrid}>
          <StatCard label="Active Members" value={stats?.active_members ?? 0} icon="Users" onClick={() => router.push('/members')} />
          <StatCard label="Present Today" value={stats?.present_today ?? 0} icon="CheckSquare" bgColor="var(--color-active-bg)" onClick={() => router.push('/attendance')} />
          <StatCard label="Expiring (7 Days)" value={stats?.expiring_soon ?? 0} icon="AlertTriangle" bgColor="var(--color-warning-bg)" onClick={() => router.push('/renewals')} />
          <StatCard label="This Month Collection" value={`₹${(stats?.monthly_collection ?? 0).toLocaleString('en-IN')}`} icon="Wallet" bgColor="var(--color-primary-light)" onClick={() => router.push('/finances')} />
        </div>

        <div className={styles.quickActions}>
          <Button variant="primary" icon="CheckSquare" onClick={() => router.push('/attendance')}>Attendance</Button>
          <Button variant="dark" icon="UserPlus" onClick={() => setAddMemberOpen(true)}>Add Member</Button>
          <Button variant="dark" icon="CreditCard" onClick={() => setLogPaymentOpen(true)}>Log Payment</Button>
          <Button variant="ghost" icon="PhoneCall" onClick={() => router.push('/enquiries')}>Enquiries</Button>
        </div>

        {(stats?.expiring_soon ?? 0) > 0 && (
          <div className={styles.alertBanner}>
            <span className={styles.alertText}>⚠ {stats!.expiring_soon} memberships expiring soon</span>
            <Button variant="ghost" onClick={() => router.push('/renewals')}>Check Now →</Button>
          </div>
        )}

        <div className={styles.columns}>
          <div className={styles.sectionCard}>
            <h3 className={styles.sectionTitle}>Recent Payments</h3>
            {paymentsLoading ? (
              [1, 2, 3].map(i => <Skeleton key={i} height="56px" style={{ marginBottom: '8px' }} borderRadius="8px" />)
            ) : recentPayments.length === 0 ? (
              <EmptyState icon={Wallet} title="No recent payments" description="Payments logged today will appear here." />
            ) : (
              recentPayments.map(payment => (
                <div key={payment.id} className={styles.listItem}>
                  <div>
                    <div className={styles.itemMain}>{payment.memberName}</div>
                    <div className={styles.itemSub}>{format(payment.timestamp, 'dd MMM, hh:mm a')} · {payment.paymentMode}</div>
                  </div>
                  <div className={styles.itemRight}>₹{payment.amount.toLocaleString('en-IN')}</div>
                </div>
              ))
            )}
          </div>

          <div className={styles.sectionCard}>
            <h3 className={styles.sectionTitle}>Action Required</h3>
            {stats?.expiring_soon === 0 ? (
              <EmptyState icon={CheckCircle} title="All clear!" description="No memberships are expiring soon." />
            ) : (
              <Button variant="ghost" onClick={() => router.push('/renewals')}>
                View {stats?.expiring_soon} expiring members →
              </Button>
            )}
          </div>
        </div>
      </div>

      <AddMemberModal isOpen={addMemberOpen} onClose={() => { setAddMemberOpen(false); queryClient.invalidateQueries({ queryKey: ['dashboard_stats'] }); queryClient.invalidateQueries({ queryKey: ['members'] }); }} />
      <LogPaymentModal isOpen={logPaymentOpen} onClose={() => { setLogPaymentOpen(false); queryClient.invalidateQueries({ queryKey: ['dashboard_stats'] }); queryClient.invalidateQueries({ queryKey: ['payments'] }); }} />
    </>
  );
}
