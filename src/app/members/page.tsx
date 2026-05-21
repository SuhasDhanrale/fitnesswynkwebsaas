'use client';

import React, { useState } from 'react';
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
import { isExpired, daysRemaining } from '@/lib/dateUtils';
import { queryClient } from '@/lib/queryClient';
import styles from './page.module.css';

export default function MembersDirectory() {
  const { state } = useApp();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'All' | 'Active' | 'Expired'>('All');
  const [planFilter, setPlanFilter] = useState('All');
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);
  const [addMemberOpen, setAddMemberOpen] = useState(false);

  const { data, isLoading } = useMembers({
    search: searchQuery,
    status: statusFilter,
    plan: planFilter,
  });

  const members = React.useMemo(() => {
    const list = data?.data ?? [];
    return [...list].sort((a, b) => {
      const aDays = daysRemaining(a);
      const bDays = daysRemaining(b);
      
      const aNeedsAttention = a.dueAmount > 0 || isExpired(a) || aDays <= 7;
      const bNeedsAttention = b.dueAmount > 0 || isExpired(b) || bDays <= 7;

      if (aNeedsAttention && !bNeedsAttention) return -1;
      if (bNeedsAttention && !aNeedsAttention) return 1;

      if (aDays !== bDays) return aDays - bDays;
      
      return a.name.localeCompare(b.name);
    });
  }, [data]);

  // Plan stats from members hook (all plans, no filter)
  const { data: allData } = useMembers({});
  const planStats = state.settings.availablePlans.map(plan => ({
    name: plan,
    count: allData?.data.filter(m => m.planName === plan).length ?? 0,
  }));

  if (isLoading && !data) {
    return (
      <div className={styles.container}>
        <div className={styles.header}>
          <Skeleton width="300px" height="40px" borderRadius="8px" />
          <Skeleton width="120px" height="40px" borderRadius="8px" />
        </div>
        <div className={styles.filters}>
          {[1, 2, 3, 4].map(i => <Skeleton key={i} width="80px" height="32px" borderRadius="16px" />)}
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

        <div className={styles.filters}>
          <FilterChip label="All Status" selected={statusFilter === 'All'} onClick={() => setStatusFilter('All')} />
          <FilterChip label="Active" selected={statusFilter === 'Active'} onClick={() => setStatusFilter('Active')} />
          <FilterChip label="Expired" selected={statusFilter === 'Expired'} onClick={() => setStatusFilter('Expired')} />
          <div style={{ width: '1px', background: 'var(--color-border)', margin: '0 8px' }} />
          <FilterChip label="All Plans" selected={planFilter === 'All'} onClick={() => setPlanFilter('All')} />
          {state.settings.availablePlans.map(plan => (
            <FilterChip key={plan} label={plan} selected={planFilter === plan} onClick={() => setPlanFilter(plan)} />
          ))}
        </div>

        <div className={styles.planStatsRow}>
          {planStats.map(stat => (
            <div key={stat.name} className={styles.planStatCard}>
              <span className={styles.planStatName}>{stat.name}</span>
              <span className={styles.planStatCount}>{stat.count}</span>
            </div>
          ))}
        </div>

        <div className={styles.memberList}>
          <div className={styles.desktopHeader}>
            <div>Name</div>
            <div>Plan & Batch</div>
            <div>Status</div>
            <div>Days Left</div>
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
              const expired = isExpired(member);
              const daysLeft = daysRemaining(member);

              return (
                <div key={member.id} className={styles.memberCard} onClick={() => setSelectedMemberId(member.id)}>
                  {/* Mobile View Top Row */}
                  <div className={`${styles.mobileRow} ${styles.mobileOnly}`}>
                    <div>
                      <div className={styles.memberName}>{member.name}</div>
                      <div className={styles.memberPhone}>{member.phoneNumber}</div>
                    </div>
                    <div className={styles.badges}>
                      <Badge status={expired ? 'expired' : 'active'} />
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
                    <Badge status={expired ? 'expired' : 'active'} />
                    {member.dueAmount > 0 && <Badge status="due" value={member.dueAmount} />}
                  </div>

                  {/* Desktop View Column 4 */}
                  <div className={styles.desktopOnly}>
                    {expired ? (
                      <span style={{ color: 'var(--color-error)', fontWeight: 600 }}>Expired</span>
                    ) : (
                      <span style={{ fontWeight: 600 }}>{daysLeft} days</span>
                    )}
                  </div>

                  {/* Desktop View Column 5 */}
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
      <AddMemberModal isOpen={addMemberOpen} onClose={() => { setAddMemberOpen(false); queryClient.invalidateQueries({ queryKey: ['members'] }); queryClient.invalidateQueries({ queryKey: ['members_list'] }); queryClient.invalidateQueries({ queryKey: ['dashboard_stats'] }); }} />
    </>
  );
}
