'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Command } from 'cmdk';
import { Search, Home, Users, CheckSquare, Wallet, LineChart, User } from 'lucide-react';
import { useMembersList } from '@/hooks/useMembers';
import { MemberDetailDrawer } from '@/components/modals/MemberDetailDrawer';
import styles from './CommandPalette.module.css';

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const { data: members = [] } = useMembersList();
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((open) => !open);
      }
    };

    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, []);

  const runCommand = (command: () => void) => {
    setOpen(false);
    command();
  };

  return (
    <>
      {open && (
        <div className={styles.overlay} onClick={() => setOpen(false)}>
          <Command 
            className={styles.command} 
            onClick={(e) => e.stopPropagation()}
            loop
          >
            <div className={styles.inputWrapper}>
              <Search className={styles.searchIcon} size={18} />
              <Command.Input 
                className={styles.input} 
                placeholder="Search members or navigation..." 
                autoFocus 
              />
            </div>

            <Command.List className={styles.list}>
              <Command.Empty className={styles.empty}>No results found.</Command.Empty>

              <Command.Group heading="Navigation" className={styles.groupHeading}>
                <Command.Item className={styles.item} onSelect={() => runCommand(() => router.push('/'))}>
                  <Home className={styles.itemIcon} size={16} /> Dashboard
                </Command.Item>
                <Command.Item className={styles.item} onSelect={() => runCommand(() => router.push('/members'))}>
                  <Users className={styles.itemIcon} size={16} /> Members
                </Command.Item>
                <Command.Item className={styles.item} onSelect={() => runCommand(() => router.push('/insights'))}>
                  <LineChart className={styles.itemIcon} size={16} /> Insights
                </Command.Item>
                <Command.Item className={styles.item} onSelect={() => runCommand(() => router.push('/finances'))}>
                  <Wallet className={styles.itemIcon} size={16} /> Finances
                </Command.Item>
                <Command.Item className={styles.item} onSelect={() => runCommand(() => router.push('/attendance'))}>
                  <CheckSquare className={styles.itemIcon} size={16} /> Attendance
                </Command.Item>
              </Command.Group>

              <Command.Group heading="Members" className={styles.groupHeading}>
                {members.map((member) => (
                  <Command.Item 
                    key={member.id} 
                    className={styles.item} 
                    onSelect={() => runCommand(() => setSelectedMemberId(member.id))}
                    value={`${member.name} ${member.phoneNumber}`}
                  >
                    <User className={styles.itemIcon} size={16} /> {member.name} - {member.phoneNumber}
                  </Command.Item>
                ))}
              </Command.Group>
            </Command.List>
          </Command>
        </div>
      )}

      <MemberDetailDrawer 
        memberId={selectedMemberId} 
        onClose={() => setSelectedMemberId(null)} 
      />
    </>
  );
}
