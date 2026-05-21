'use client';

import React, { useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { useMembers } from '@/hooks/useMembers';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Skeleton } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { RenewMemberModal } from '@/components/modals/RenewMemberModal';
import { isExpired, daysRemaining } from '@/lib/dateUtils';
import { buildRenewalWhatsApp } from '@/lib/whatsapp';
import { Member } from '@/types';
import styles from './page.module.css';

export default function Renewals() {
  const { data, isLoading } = useMembers({ pageSize: 500 });
  const [renewMember, setRenewMember] = useState<Member | null>(null);

  const members = data?.data ?? [];

  const expiringMembers = members
    .filter(m => {
      const now = Date.now();
      return m.expiryDate < now || (m.expiryDate - now < 7 * 86400000);
    })
    .sort((a, b) => a.expiryDate - b.expiryDate);

  const expiredCount = expiringMembers.filter(m => isExpired(m)).length;
  const expiringSoonCount = expiringMembers.filter(m => !isExpired(m)).length;

  return (
    <>
      <div className={styles.container}>
        {/* Header Stats */}
        <div className={styles.headerStats}>
          <div className={`${styles.statBox} ${styles.red}`}>
            <div className={styles.statValue}>
              {isLoading ? <Skeleton width="32px" height="32px" /> : expiredCount}
            </div>
            <div className={styles.statLabel}>Expired</div>
          </div>
          <div className={`${styles.statBox} ${styles.orange}`}>
            <div className={styles.statValue}>
              {isLoading ? <Skeleton width="32px" height="32px" /> : expiringSoonCount}
            </div>
            <div className={styles.statLabel}>Expiring Soon</div>
          </div>
        </div>

        {isLoading ? (
          <div className={styles.cardList}>
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className={styles.memberCard} style={{ display: 'flex', flexDirection: 'column', gap: '12px', padding: '16px' }}>
                <Skeleton height="20px" width="60%" />
                <Skeleton height="14px" width="40%" />
                <Skeleton height="14px" width="50%" />
                <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
                  <Skeleton height="36px" width="120px" borderRadius="8px" />
                  <Skeleton height="36px" width="100px" borderRadius="8px" />
                </div>
              </div>
            ))}
          </div>
        ) : expiringMembers.length === 0 ? (
          <EmptyState
            icon={RefreshCw}
            title="All memberships are healthy!"
            description="No renewals needed right now."
          />
        ) : (
          <div className={styles.cardList}>
            {expiringMembers.map(member => {
              const expired = isExpired(member);
              const days = daysRemaining(member);
              return (
                <div key={member.id} className={`${styles.memberCard} ${expired ? styles.expired : styles.warning}`}>
                  <div className={styles.cardTop}>
                    <div>
                      <div className={styles.memberName}>{member.name}</div>
                      <div className={styles.expiryStatus}>
                        {expired
                          ? `Expired ${Math.abs(days)} days ago`
                          : `Expires in ${days} days`}
                      </div>
                      <div className={styles.memberSub}>{member.planName} · {member.batch}</div>
                    </div>
                    <Badge status={expired ? 'expired' : 'warning'} />
                  </div>
                  <div className={styles.cardActions}>
                    <Button
                      variant="whatsapp"
                      icon="MessageCircle"
                      onClick={() => window.open(buildRenewalWhatsApp(member.phoneNumber, member.name, days, expired), '_blank')}
                    >
                      WhatsApp
                    </Button>
                    <Button variant="primary" onClick={() => setRenewMember(member)}>Quick Renew</Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {renewMember && (
        <RenewMemberModal isOpen={!!renewMember} onClose={() => setRenewMember(null)} member={renewMember} />
      )}
    </>
  );
}
