'use client';

import React, { useState } from 'react';
import { useApp } from '@/context/AppContext';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { RenewMemberModal } from '@/components/modals/RenewMemberModal';
import { isExpired, daysRemaining } from '@/lib/dateUtils';
import { buildRenewalWhatsApp } from '@/lib/whatsapp';
import { Member } from '@/types';
import styles from './page.module.css';

export default function Renewals() {
  const { state } = useApp();
  const [renewMember, setRenewMember] = useState<Member | null>(null);

  const expiringMembers = state.members
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
            <div className={styles.statValue}>{expiredCount}</div>
            <div className={styles.statLabel}>Expired</div>
          </div>
          <div className={`${styles.statBox} ${styles.orange}`}>
            <div className={styles.statValue}>{expiringSoonCount}</div>
            <div className={styles.statLabel}>Expiring Soon</div>
          </div>
        </div>

        {expiringMembers.length === 0 ? (
          <div className={styles.emptyState}>
            <p className="text-h3" style={{ color: 'var(--color-active-text)' }}>🎉 All memberships are healthy!</p>
            <p className="text-body" style={{ color: 'var(--color-text-secondary)' }}>No renewals needed right now.</p>
          </div>
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
