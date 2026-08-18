'use client';

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { UserX, Search } from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { Button } from '@/components/ui/Button';
import { FilterChip } from '@/components/ui/FilterChip';
import { Badge } from '@/components/ui/Badge';
import { Input } from '@/components/ui/Input';
import { Skeleton } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { MemberDetailDrawer } from '@/components/modals/MemberDetailDrawer';
import { AddMemberModal } from '@/components/modals/AddMemberModal';
import { useMembers } from '@/hooks/useMembers';
import { isExpired, daysRemaining, getMemberDisplayStatus, statusLabel } from '@/lib/dateUtils';
import { fetchMemberActivityStats } from '@/lib/queries';
import { format, subDays, startOfDay } from 'date-fns';
import { useQuery } from '@tanstack/react-query';

import styles from './page.module.css';

export default function MembersDirectory() {
  const { state } = useApp();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'All' | 'Active' | 'OnHold' | 'Expired' | 'Cancelled' | 'Inactive'>('All');
  const [planFilter, setPlanFilter] = useState('All');
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);
  const [addMemberOpen, setAddMemberOpen] = useState(false);
  const [portalTarget, setPortalTarget] = useState<HTMLElement | null>(null);
  const [activityDate, setActivityDate] = useState(() => format(subDays(new Date(), 7), 'yyyy-MM-dd'));

  useEffect(() => {
    setPortalTarget(document.getElementById('topbar-portal'));
  }, []);

  const { data, isLoading } = useMembers({
    search: searchQuery,
    status: statusFilter,
    plan: planFilter,
  });

  const members = React.useMemo(() => {
    const list = data?.data ?? [];
    return [...list].sort((a, b) => {
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const aName = a.name.toLowerCase();
        const bName = b.name.toLowerCase();

        const aStarts = aName.startsWith(q);
        const bStarts = bName.startsWith(q);

        if (aStarts && !bStarts) return -1;
        if (!aStarts && bStarts) return 1;

        return aName.localeCompare(bName);
      }

      const aDays = daysRemaining(a);
      const bDays = daysRemaining(b);
      
      const aNeedsAttention = a.dueAmount > 0 || isExpired(a) || aDays <= 7;
      const bNeedsAttention = b.dueAmount > 0 || isExpired(b) || bDays <= 7;

      if (aNeedsAttention && !bNeedsAttention) return -1;
      if (bNeedsAttention && !aNeedsAttention) return 1;

      if (aDays !== bDays) return aDays - bDays;
      
      return a.name.localeCompare(b.name);
    });
  }, [data, searchQuery]);

  // Fetch all members (no filter, no pagination) for stats
  const { data: allData } = useMembers({ pageSize: 9999 });

  const activitySinceMs = startOfDay(new Date(activityDate)).getTime();
  const { data: activityStats } = useQuery({
    queryKey: ['activity_stats', activitySinceMs],
    queryFn: () => fetchMemberActivityStats(activitySinceMs),
    staleTime: 60 * 1000,
  });

  const allMembers = allData?.data ?? [];
  const totalActive = allMembers.filter(m => getMemberDisplayStatus(m) === 'active').length;
  const totalInactive = allMembers.filter(m => getMemberDisplayStatus(m) === 'expired').length;
  const planStats = state.settings.availablePlans.map(plan => ({
    name: plan,
    count: allMembers.filter(m => m.planName === plan).length,
  }));

  if (isLoading && !data) {
    return (
      <div className={styles.container}>
        <div className={styles.header}>
          <Skeleton width="300px" height="40px" borderRadius="8px" />
          <Skeleton width="120px" height="40px" borderRadius="8px" />
        </div>
        <div className={styles.planStatsRow}>
          {[1, 2, 3].map(i => <Skeleton key={i} width="120px" height="60px" borderRadius="8px" />)}
        </div>
        <div className={styles.memberList}>
          {[1, 2, 3, 4, 5].map(i => <Skeleton key={i} height="70px" borderRadius="8px" style={{ marginBottom: '8px' }} />)}
        </div>
      </div>
    );
  }

  return (
    <>
      <div className={styles.container}>
        <div className={styles.header}>
          <div className={styles.searchWrapper}>
            <Input
              label="Search Members..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <Search size={18} className={styles.searchIcon} />
          </div>
          <Button variant="primary" icon="UserPlus" onClick={() => setAddMemberOpen(true)}>Add Member</Button>
        </div>

        {portalTarget && createPortal(
          <>
            <FilterChip label="All Status" selected={statusFilter === 'All'} onClick={() => setStatusFilter('All')} />
            <FilterChip label="Active" selected={statusFilter === 'Active'} onClick={() => setStatusFilter('Active')} dotColor="#10B981" />
            <FilterChip label="On Hold" selected={statusFilter === 'OnHold'} onClick={() => setStatusFilter('OnHold')} dotColor="#F59E0B" />
            <FilterChip label="Expired" selected={statusFilter === 'Expired'} onClick={() => setStatusFilter('Expired')} dotColor="#EF4444" />
            <FilterChip label="Cancelled" selected={statusFilter === 'Cancelled'} onClick={() => setStatusFilter('Cancelled')} dotColor="#374151" />
            <FilterChip label="Inactive" selected={statusFilter === 'Inactive'} onClick={() => setStatusFilter('Inactive')} dotColor="#9CA3AF" />
            <div style={{ width: '1px', background: 'var(--color-border)', margin: '0 8px', alignSelf: 'stretch', flexShrink: 0 }} />
            <FilterChip label="All Plans" selected={planFilter === 'All'} onClick={() => setPlanFilter('All')} />
            {state.settings.availablePlans.map(plan => (
              <FilterChip key={plan} label={plan} selected={planFilter === plan} onClick={() => setPlanFilter(plan)} />
            ))}
          </>,
          portalTarget
        )}

        <div className={styles.planStatsRow}>
          <div className={`${styles.planStatCard} ${styles.activeCard}`}>
            <span className={styles.planStatNameDark}>Total Active</span>
            <span className={styles.planStatCountActive}>{totalActive}</span>
          </div>
          <div className={`${styles.planStatCard} ${styles.inactiveCard}`}>
            <span className={styles.planStatNameDark}>Total Inactive</span>
            <span className={styles.planStatCountInactive}>{totalInactive}</span>
          </div>
          {planStats.map(stat => (
            <div key={stat.name} className={styles.planStatCard}>
              <span className={styles.planStatName}>{stat.name}</span>
              <span className={styles.planStatCount}>{stat.count}</span>
            </div>
          ))}
          <div style={{ width: '1px', background: 'var(--color-border)', margin: '0 4px', alignSelf: 'stretch', flexShrink: 0 }} />
          <div className={styles.activitySection}>
            <div className={styles.activityDatePicker}>
              <label style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-text-secondary)' }}>Since</label>
              <input
                type="date"
                value={activityDate}
                onChange={e => setActivityDate(e.target.value)}
                className={styles.datePicker}
              />
            </div>
            <div className={styles.activityCards}>
              <div className={`${styles.planStatCard} ${styles.activityCard}`}>
                <span className={styles.planStatNameDark}>New Joined</span>
                <span className={styles.planStatCountActive}>{activityStats?.newMembers ?? '—'}</span>
              </div>
              <div className={`${styles.planStatCard} ${styles.activityCard}`}>
                <span className={styles.planStatNameDark}>Payments</span>
                <span className={styles.planStatCount}>₹{activityStats?.paymentTotal?.toLocaleString('en-IN') ?? '—'}</span>
              </div>
            </div>
          </div>
        </div>

        <div className={styles.memberList}>
          <div className={styles.desktopHeader}>
            <div>Name</div>
            <div>Plan & Batch</div>
            <div>Status</div>
            <div>Days Left</div>
            <div>Expiry Date</div>
            <div></div>
          </div>

          {members.length === 0 ? (
            <EmptyState
              icon={UserX}
              title="No members found"
              description="Try adjusting your filters or search query."
              action={searchQuery ? <Button variant="primary" onClick={() => setSearchQuery('')}>Clear Search</Button> : undefined}
            />
          ) : (
            members.map(member => {
              const daysLeft = daysRemaining(member);
              const displayStatus = getMemberDisplayStatus(member);

              return (
                <div key={member.id} className={styles.memberCard} onClick={() => setSelectedMemberId(member.id)}>
                  {/* Mobile View Top Row */}
                  <div className={`${styles.mobileRow} ${styles.mobileOnly}`}>
                    <div>
                      <div className={styles.memberName}>{member.name}</div>
                      <div className={styles.memberPhone}>{member.phoneNumber}</div>
                    </div>
                    <div className={styles.badges}>
                      <Badge status={displayStatus} />
                      {member.dueAmount > 0 && <Badge status="due" value={member.dueAmount} />}
                    </div>
                  </div>

                  {/* Desktop View Column 1 */}
                  <div className={styles.desktopOnly}>
                    <div className={styles.memberName}>{member.name}</div>
                    <div className={styles.memberPhone}>{member.phoneNumber}</div>
                  </div>

                  {/* Shared Column 2 */}
                  <div>
                    <div className={styles.memberPlan}>{member.planName}</div>
                    <div className={styles.memberBatch}>{member.batch}</div>
                  </div>

                  {/* Desktop View Column 3 (Badges) */}
                  <div className={`${styles.badges} ${styles.desktopOnly}`}>
                    <Badge status={displayStatus} />
                    {member.dueAmount > 0 && <Badge status="due" value={member.dueAmount} />}
                  </div>

                  {/* Desktop View Column 4 */}
                  <div className={styles.desktopOnly}>
                    {displayStatus === 'active' ? (
                      <span style={{ fontWeight: 600 }}>{daysLeft} days</span>
                    ) : displayStatus === 'expired' ? (
                      <span style={{ color: 'var(--color-error)', fontWeight: 600 }}>Expired</span>
                    ) : (
                      <span style={{ color: 'var(--color-text-secondary)', fontWeight: 600 }}>{statusLabel[displayStatus] || '—'}</span>
                    )}
                  </div>

                  {/* Desktop View Column 5 — Expiry Date */}
                  <div className={styles.desktopOnly}>
                    <span style={{ fontSize: '13px', color: 'var(--color-text-secondary)' }}>
                      {format(member.expiryDate, 'dd MMM yyyy')}
                    </span>
                  </div>

                  {/* Desktop View Column 6 */}
                  <div className={styles.desktopOnly}>
                    <Button variant="ghost" onClick={(e) => { e.stopPropagation(); setSelectedMemberId(member.id); }}>View</Button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      <MemberDetailDrawer memberId={selectedMemberId} onClose={() => setSelectedMemberId(null)} />
      <AddMemberModal isOpen={addMemberOpen} onClose={() => setAddMemberOpen(false)} />
    </>
  );
}
