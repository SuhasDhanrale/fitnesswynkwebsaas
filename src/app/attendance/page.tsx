'use client';

import React from 'react';
import { format } from 'date-fns';
import { CheckSquare } from 'lucide-react';
import { Skeleton } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { useMembers } from '@/hooks/useMembers';
import { useTodayAttendance } from '@/hooks/useAttendance';
import { supabase } from '@/lib/supabaseClient';
import { queryClient } from '@/lib/queryClient';
import { getTodayMidnight } from '@/lib/dateUtils';
import { v4 as uuidv4 } from 'uuid';
import styles from './page.module.css';

export default function Attendance() {
  const todayMidnight = getTodayMidnight();

  // Active members from Supabase
  const { data: membersData, isLoading: membersLoading } = useMembers({ status: 'Active' });
  const activeMembers = (membersData?.data ?? []).sort((a, b) => a.name.localeCompare(b.name));

  // Today's attendance from Supabase (now persisted!)
  const { data: todayAttendance = [], isLoading: attendanceLoading } = useTodayAttendance();

  const presentCount = todayAttendance.length;
  const progressPct = activeMembers.length > 0 ? (presentCount / activeMembers.length) * 100 : 0;
  const isPresent = (memberId: string) => todayAttendance.some(a => a.memberId === memberId);

  const toggleAttendance = async (memberId: string) => {
    if (isPresent(memberId)) {
      // Remove from Supabase
      await supabase
        .from('attendance')
        .delete()
        .eq('member_id', memberId)
        .eq('date', todayMidnight);
    } else {
      // Insert into Supabase
      await supabase
        .from('attendance')
        .insert({ id: uuidv4(), member_id: memberId, date: todayMidnight });
    }
    // Invalidate so the list refreshes immediately
    queryClient.invalidateQueries({ queryKey: ['attendance_today'] });
    queryClient.invalidateQueries({ queryKey: ['dashboard_stats'] });
  };

  const isLoading = membersLoading || attendanceLoading;

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
      {isLoading ? (
        <div className={styles.memberList}>
          {[1, 2, 3, 4, 5].map(i => (
            <Skeleton key={i} height="64px" borderRadius="8px" style={{ marginBottom: '8px' }} />
          ))}
        </div>
      ) : activeMembers.length === 0 ? (
        <EmptyState
          icon={CheckSquare}
          title="No active members"
          description="All members have expired plans."
        />
      ) : (
        <div className={styles.memberList}>
          {activeMembers.map(member => {
            const present = isPresent(member.id);
            return (
              <div
                key={member.id}
                className={`${styles.memberRow} ${present ? styles.present : ''}`}
                onClick={() => toggleAttendance(member.id)}
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
