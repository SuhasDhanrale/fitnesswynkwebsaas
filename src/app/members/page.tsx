'use client';

import React, { useState } from 'react';
import { UserX, Search } from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { Button } from '@/components/ui/Button';
import { FilterChip } from '@/components/ui/FilterChip';
import { Badge } from '@/components/ui/Badge';
import { Input } from '@/components/ui/Input';
import { MemberDetailDrawer } from '@/components/modals/MemberDetailDrawer';
import { isExpired, daysRemaining } from '@/lib/dateUtils';
import styles from './page.module.css';

export default function MembersDirectory() {
  const { state } = useApp();

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'All' | 'Active' | 'Expired'>('All');
  const [planFilter, setPlanFilter] = useState('All');
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);

  // Filter logic
  const filteredMembers = state.members.filter(m => {
    const matchesSearch = m.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          m.phoneNumber.includes(searchQuery);
    const expired = isExpired(m);
    const matchesStatus = statusFilter === 'All' ? true :
                          statusFilter === 'Active' ? !expired : expired;
    const matchesPlan = planFilter === 'All' ? true : m.planName === planFilter;

    return matchesSearch && matchesStatus && matchesPlan;
  });

  // Plan Stats logic
  const planStats = state.settings.availablePlans.map(plan => ({
    name: plan,
    count: state.members.filter(m => m.planName === plan).length
  }));

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
          <Button variant="primary" icon="UserPlus" onClick={() => { /* Open AddMemberModal */ }}>Add Member</Button>
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

          {filteredMembers.length === 0 ? (
            <div className={styles.emptyState}>
              <UserX size={64} style={{ opacity: 0.3 }} />
              <div>
                <p className="text-body-lg">No members found</p>
                <p className="text-body">Try adjusting your filters or search query.</p>
              </div>
            </div>
          ) : (
            filteredMembers.map(member => {
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

      <MemberDetailDrawer 
        memberId={selectedMemberId} 
        onClose={() => setSelectedMemberId(null)} 
      />
    </>
  );
}
