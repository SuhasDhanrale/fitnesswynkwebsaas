'use client';

import React, { useState } from 'react';
import { UserX, Search, ArrowRight } from 'lucide-react';
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
import { format, subDays, startOfDay, endOfDay, startOfMonth } from 'date-fns';
import { useQuery } from '@tanstack/react-query';

import styles from './page.module.css';

type StatusFilter = 'All' | 'Active' | 'Expired';

const iso = (d: Date) => format(d, 'yyyy-MM-dd');

export default function MembersDirectory() {
  const { state } = useApp();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('All');
  const [planFilter, setPlanFilter] = useState('All');
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);
  const [addMemberOpen, setAddMemberOpen] = useState(false);

  // Activity window — drives the "New Joined" / "Collected" tiles only.
  const [rangeFrom, setRangeFrom] = useState(() => iso(subDays(new Date(), 7)));
  const [rangeTo, setRangeTo] = useState(() => iso(new Date()));

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

  // Fetch all members (no filter, no pagination) for the headline counts
  const { data: allData } = useMembers({ pageSize: 9999 });

  const rangeFromMs = startOfDay(new Date(rangeFrom)).getTime();
  const rangeToMs = endOfDay(new Date(rangeTo)).getTime();
  const rangeIsValid =
    Number.isFinite(rangeFromMs) && Number.isFinite(rangeToMs) && rangeFromMs <= rangeToMs;

  const { data: activityStats } = useQuery({
    queryKey: ['activity_stats', rangeFromMs, rangeToMs],
    queryFn: () => fetchMemberActivityStats(rangeFromMs, rangeToMs),
    enabled: rangeIsValid,
    staleTime: 60 * 1000,
  });

  const applyPreset = (days: number | 'mtd') => {
    const today = new Date();
    setRangeTo(iso(today));
    setRangeFrom(iso(days === 'mtd' ? startOfMonth(today) : subDays(today, days)));
  };

  const activePreset = (() => {
    if (rangeTo !== iso(new Date())) return null;
    if (rangeFrom === iso(subDays(new Date(), 7))) return '7d';
    if (rangeFrom === iso(subDays(new Date(), 30))) return '30d';
    if (rangeFrom === iso(startOfMonth(new Date()))) return 'mtd';
    return null;
  })();

  const allMembers = allData?.data ?? [];
  const totalActive = allMembers.filter(m => getMemberDisplayStatus(m) === 'active').length;
  const totalExpired = allMembers.filter(m => getMemberDisplayStatus(m) === 'expired').length;

  const filtersApplied = statusFilter !== 'All' || planFilter !== 'All';

  if (isLoading && !data) {
    return (
      <div className={styles.container}>
        <div className={styles.header}>
          <Skeleton width="300px" height="40px" borderRadius="8px" />
          <Skeleton width="120px" height="40px" borderRadius="8px" />
        </div>
        <Skeleton height="56px" borderRadius="10px" />
        <Skeleton height="84px" borderRadius="10px" />
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

        {/* ── Compact stats strip ─────────────────────────────────────────── */}
        <div className={styles.statsBar}>
          <button
            type="button"
            className={`${styles.statTile} ${styles.statTileButton} ${statusFilter === 'Active' ? styles.statTileOn : ''}`}
            onClick={() => setStatusFilter(statusFilter === 'Active' ? 'All' : 'Active')}
            title="Show only active members"
          >
            <span className={styles.statLabel}>Active</span>
            <span className={`${styles.statValue} ${styles.valueGreen}`}>{totalActive}</span>
          </button>

          <button
            type="button"
            className={`${styles.statTile} ${styles.statTileButton} ${statusFilter === 'Expired' ? styles.statTileOn : ''}`}
            onClick={() => setStatusFilter(statusFilter === 'Expired' ? 'All' : 'Expired')}
            title="Show only expired members"
          >
            <span className={styles.statLabel}>Expired</span>
            <span className={`${styles.statValue} ${styles.valueRed}`}>{totalExpired}</span>
          </button>

          <span className={styles.statsDivider} aria-hidden />

          {/* Activity window — the date range below affects only these two tiles */}
          <div className={styles.statTile}>
            <span className={styles.statLabel}>New Joined</span>
            <span className={styles.statValue}>{rangeIsValid ? (activityStats?.newMembers ?? '—') : '—'}</span>
          </div>

          <div className={styles.statTile}>
            <span className={styles.statLabel}>Collected</span>
            <span className={styles.statValue}>
              {rangeIsValid && activityStats ? `₹${activityStats.paymentTotal.toLocaleString('en-IN')}` : '—'}
            </span>
          </div>

          <div className={styles.rangeControl}>
            <input
              type="date"
              value={rangeFrom}
              max={rangeTo}
              onChange={e => setRangeFrom(e.target.value)}
              className={styles.datePicker}
              aria-label="Activity range — from"
            />
            <ArrowRight size={14} className={styles.rangeArrow} />
            <input
              type="date"
              value={rangeTo}
              min={rangeFrom}
              onChange={e => setRangeTo(e.target.value)}
              className={styles.datePicker}
              aria-label="Activity range — to"
            />
            <div className={styles.presets}>
              <button type="button" className={`${styles.preset} ${activePreset === '7d' ? styles.presetOn : ''}`} onClick={() => applyPreset(7)}>7D</button>
              <button type="button" className={`${styles.preset} ${activePreset === '30d' ? styles.presetOn : ''}`} onClick={() => applyPreset(30)}>30D</button>
              <button type="button" className={`${styles.preset} ${activePreset === 'mtd' ? styles.presetOn : ''}`} onClick={() => applyPreset('mtd')}>This Month</button>
            </div>
          </div>
        </div>

        {/* ── Double-decked filter strip ──────────────────────────────────── */}
        <div className={styles.filterStrip}>
          <div className={styles.filterRow}>
            <span className={styles.filterRowLabel}>Status</span>
            <div className={styles.chipRow}>
              <FilterChip label="All" selected={statusFilter === 'All'} onClick={() => setStatusFilter('All')} />
              <FilterChip label="Active" selected={statusFilter === 'Active'} onClick={() => setStatusFilter('Active')} dotColor="#10B981" />
              <FilterChip label="Expired" selected={statusFilter === 'Expired'} onClick={() => setStatusFilter('Expired')} dotColor="#EF4444" />
            </div>
            <span className={styles.resultCount}>
              {members.length} {members.length === 1 ? 'member' : 'members'}
            </span>
          </div>

          <div className={styles.filterRow}>
            <span className={styles.filterRowLabel}>Plan</span>
            <div className={styles.chipRow}>
              <FilterChip label="All Plans" selected={planFilter === 'All'} onClick={() => setPlanFilter('All')} />
              {state.settings.availablePlans.map(plan => (
                <FilterChip key={plan} label={plan} selected={planFilter === plan} onClick={() => setPlanFilter(plan)} />
              ))}
            </div>
            {filtersApplied && (
              <button
                type="button"
                className={styles.clearFilters}
                onClick={() => { setStatusFilter('All'); setPlanFilter('All'); }}
              >
                Clear filters
              </button>
            )}
          </div>
        </div>

        <div className={styles.memberList}>
          <div className={styles.desktopHeader}>
            <div>Name</div>
            <div>Plan &amp; Batch</div>
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
