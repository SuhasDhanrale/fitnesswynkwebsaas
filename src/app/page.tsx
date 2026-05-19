'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import { useApp } from '@/context/AppContext';
import { StatCard } from '@/components/ui/StatCard';
import { Button } from '@/components/ui/Button';
import { AddMemberModal } from '@/components/modals/AddMemberModal';
import { LogPaymentModal } from '@/components/modals/LogPaymentModal';
import { isExpired, isExpiringSoon, isSameMonth, getTodayMidnight, daysRemaining } from '@/lib/dateUtils';
import styles from './page.module.css';

export default function Dashboard() {
  const { state } = useApp();
  const router = useRouter();
  const [addMemberOpen, setAddMemberOpen] = useState(false);
  const [logPaymentOpen, setLogPaymentOpen] = useState(false);

  const todayMidnight = getTodayMidnight();
  const activeMembersCount = state.members.filter(m => !isExpired(m)).length;
  const presentTodayCount = state.attendance.filter(a => a.date === todayMidnight).length;
  const expiringSoonCount = state.members.filter(m => isExpiringSoon(m)).length;
  const monthlyCollection = state.payments
    .filter(p => isSameMonth(p.timestamp, Date.now()))
    .reduce((sum, p) => sum + p.amount, 0);

  const recentPayments = [...state.payments].sort((a, b) => b.timestamp - a.timestamp).slice(0, 5);
  const actionRequiredMembers = [...state.members]
    .filter(m => isExpiringSoon(m) || isExpired(m))
    .sort((a, b) => a.expiryDate - b.expiryDate)
    .slice(0, 5);

  return (
    <>
      <div className={styles.container}>
        <div className={styles.statsGrid}>
          <StatCard label="Active Members" value={activeMembersCount} icon="Users" onClick={() => router.push('/members')} />
          <StatCard label="Present Today" value={presentTodayCount} icon="CheckSquare" bgColor="var(--color-active-bg)" onClick={() => router.push('/attendance')} />
          <StatCard label="Expiring (7 Days)" value={expiringSoonCount} icon="AlertTriangle" bgColor="var(--color-warning-bg)" onClick={() => router.push('/renewals')} />
          <StatCard label="This Month Collection" value={`₹${monthlyCollection.toLocaleString('en-IN')}`} icon="Wallet" bgColor="var(--color-primary-light)" onClick={() => router.push('/finances')} />
        </div>

        <div className={styles.quickActions}>
          <Button variant="primary" icon="CheckSquare" onClick={() => router.push('/attendance')}>Attendance</Button>
          <Button variant="dark" icon="UserPlus" onClick={() => setAddMemberOpen(true)}>Add Member</Button>
          <Button variant="dark" icon="CreditCard" onClick={() => setLogPaymentOpen(true)}>Log Payment</Button>
          <Button variant="ghost" icon="PhoneCall" onClick={() => router.push('/enquiries')}>Enquiries</Button>
        </div>

        {expiringSoonCount > 0 && (
          <div className={styles.alertBanner}>
            <span className={styles.alertText}>⚠ {expiringSoonCount} memberships expiring soon</span>
            <Button variant="ghost" onClick={() => router.push('/renewals')}>Check Now →</Button>
          </div>
        )}

        <div className={styles.columns}>
          <div className={styles.sectionCard}>
            <h3 className={styles.sectionTitle}>Recent Payments</h3>
            {recentPayments.length === 0 ? (
              <p className="text-body" style={{ color: 'var(--color-text-secondary)' }}>No recent payments.</p>
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
            {actionRequiredMembers.length === 0 ? (
              <p className="text-body" style={{ color: 'var(--color-text-secondary)' }}>All memberships are healthy! 🎉</p>
            ) : (
              actionRequiredMembers.map(member => {
                const expired = isExpired(member);
                const days = daysRemaining(member);
                return (
                  <div key={member.id} className={`${styles.expiryCard} ${expired ? styles.expired : ''}`}>
                    <div>
                      <div className={styles.expiryName}>{member.name}</div>
                      <div className={styles.expiryDays}>
                        {expired ? `Expired ${Math.abs(days)} days ago` : `Expires in ${days} days`}
                      </div>
                    </div>
                    <Button variant="ghost" onClick={() => router.push(`/members/${member.id}`)}>View</Button>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      <AddMemberModal isOpen={addMemberOpen} onClose={() => setAddMemberOpen(false)} />
      <LogPaymentModal isOpen={logPaymentOpen} onClose={() => setLogPaymentOpen(false)} />
    </>
  );
}
