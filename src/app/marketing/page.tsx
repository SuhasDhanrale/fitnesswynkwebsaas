'use client';

import React, { useState } from 'react';
import { useApp } from '@/context/AppContext';
import { useToast } from '@/components/ui/Toast';
import { Button } from '@/components/ui/Button';
import { FilterChip } from '@/components/ui/FilterChip';
import styles from './page.module.css';

type Audience = 'All Active Members' | 'Expired Members';

const templates: Record<Audience, string> = {
  'All Active Members': `📢 *Gym Update*: [Your message here]\n\nStay strong and keep training! 💪\n- FitnessWynk`,
  'Expired Members': `Hi [Name]! 👋 We miss you at FitnessWynk! Your membership has expired. Renew now and get back on track! 🏋️‍♀️\n- FitnessWynk`,
};

export default function Marketing() {
  const {} = useApp();
  const { showToast } = useToast();
  const [audience, setAudience] = useState<Audience>('All Active Members');
  const [message, setMessage] = useState(templates['All Active Members']);

  const handleAudienceChange = (a: Audience) => {
    setAudience(a);
    setMessage(templates[a]);
  };

  const handleCopyAndOpen = async () => {
    await navigator.clipboard.writeText(message);
    showToast('Message copied! Open WhatsApp and paste into your broadcast list. ✓', 'info');
    window.open('https://web.whatsapp.com', '_blank');
  };

  return (
    <div className={styles.container}>
      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>Broadcast Message</h2>

        <div className={styles.toRow}>
          <span className={styles.toLabel}>To:</span>
          <div style={{ display: 'flex', gap: '8px' }}>
            <FilterChip label="All Active Members" selected={audience === 'All Active Members'} onClick={() => handleAudienceChange('All Active Members')} />
            <FilterChip label="Expired Members" selected={audience === 'Expired Members'} onClick={() => handleAudienceChange('Expired Members')} />
          </div>
        </div>

        <textarea
          className={styles.messageArea}
          rows={8}
          value={message}
          onChange={e => setMessage(e.target.value)}
          placeholder="Type your broadcast message here..."
        />

        <div className={styles.infoBanner}>
          <span>ℹ️</span>
          <span>We cannot auto-send to multiple people. This will <strong>copy the text</strong> and open WhatsApp Web for you to paste into your broadcast list.</span>
        </div>

        <Button variant="whatsapp" icon="Share2" onClick={handleCopyAndOpen} fullWidth>
          Copy &amp; Open WhatsApp
        </Button>
      </div>
    </div>
  );
}
