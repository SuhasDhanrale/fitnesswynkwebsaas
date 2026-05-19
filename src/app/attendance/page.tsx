'use client';

import React from 'react';
import { format } from 'date-fns';
import { CheckSquare } from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { isExpired, getTodayMidnight } from '@/lib/dateUtils';
import { v4 as uuidv4 } from 'uuid';
import styles from './page.module.css';

export default function Attendance() {
  const { state, dispatch } = useApp();
  const todayMidnight = getTodayMidnight();

  const activeMembers = state.members
    .filter(m => !isExpired(m))
    .sort((a, b) => a.name.localeCompare(b.name));

  const todayAttendance = state.attendance.filter(a => a.date === todayMidnight);
  const presentCount = todayAttendance.length;
  const progressPct = activeMembers.length > 0 ? (presentCount / activeMembers.length) * 100 : 0;

  const isPresent = (memberId: string) => todayAttendance.some(a => a.memberId === memberId);

  const toggleAttendance = (memberId: string, memberName: string) => {
    if (isPresent(memberId)) {
      dispatch({ type: 'REMOVE_ATTENDANCE', payload: { memberId, date: todayMidnight } });
    } else {
      dispatch({ type: 'ADD_ATTENDANCE', payload: { id: uuidv4(), memberId, memberName, date: todayMidnight, isPresent: true } });
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.dateSubtitle}>{format(new Date(), 'EEEE, dd MMMM yyyy')}</div>

      {/* Summary Counter */}
      <div className={styles.summaryCard}>
        <div className={styles.summaryText}>
          Present: <strong>{presentCount}</strong> / {activeMembers.length} Active Members
        </div>
        <div className={styles.progressTrack}>
          <div className={styles.progressFill} style={{ width: `${progressPct}%` }} />
        </div>
      </div>

      {/* Member List */}
      {activeMembers.length === 0 ? (
        <div className={styles.emptyState}>
          <CheckSquare size={64} style={{ opacity: 0.3 }} />
          <p className="text-body-lg">No active members</p>
          <p className="text-body" style={{ color: 'var(--color-text-secondary)' }}>All members have expired plans.</p>
        </div>
      ) : (
        <div className={styles.memberList}>
          {activeMembers.map(member => {
            const present = isPresent(member.id);
            return (
              <div
                key={member.id}
                className={`${styles.memberRow} ${present ? styles.present : ''}`}
                onClick={() => toggleAttendance(member.id, member.name)}
              >
                <div className={styles.memberInfo}>
                  <div className={styles.memberName}>{member.name}</div>
                  <div className={styles.memberSub}>{member.planName} · {member.batch}</div>
                </div>
                <div className={`${styles.checkbox} ${present ? styles.checkboxChecked : ''}`}>
                  {present && <CheckSquare size={20} color="var(--color-on-primary)" />}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
