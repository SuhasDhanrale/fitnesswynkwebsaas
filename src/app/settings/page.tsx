'use client';

import React, { useState, useRef } from 'react';
import { useApp } from '@/context/AppContext';
import { useToast } from '@/components/ui/Toast';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import styles from './page.module.css';

const DEFAULT_PLANS = ['Monthly Cardio', 'Weight Training', 'CrossFit', 'Yearly Pro'];
const DEFAULT_BATCHES = ['6-7 AM', '7-8 AM', '5-6 PM', '6-7 PM', '7-8 PM'];
const DEFAULT_DURATIONS = ['1 Month', '3 Months', '6 Months', '1 Year'];

export default function Settings() {
  const { state, dispatch } = useApp();
  const { showToast } = useToast();
  const [gymName, setGymName] = useState(state.settings.gymName);
  const [upiId, setUpiId] = useState(state.settings.upiId);
  const [qrPreview, setQrPreview] = useState(state.settings.qrCodeUrl);
  const [newPlan, setNewPlan] = useState('');
  const [newBatch, setNewBatch] = useState('');
  const [newDuration, setNewDuration] = useState('');
  const [enableSmartEntry, setEnableSmartEntry] = useState(state.settings.enableSmartEntry);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const saveProfile = async () => {
    dispatch({ type: 'UPDATE_SETTINGS', payload: { gymName: gymName.trim(), upiId: upiId.trim(), qrCodeUrl: qrPreview, enableSmartEntry } });
    
    // Attempt to persist to Supabase
    try {
      const { supabase } = await import('@/lib/supabaseClient');
      await supabase.from('gym_settings').update({
        gym_name: gymName.trim(),
        upi_id: upiId.trim(),
        qr_code_url: qrPreview,
        enable_smart_entry: enableSmartEntry
      }).eq('id', 1);
    } catch (e) {
      console.error('Failed to save settings to DB', e);
    }

    showToast('Gym profile & settings saved! ✓');
  };

  const addItem = (field: 'availablePlans' | 'batches' | 'durations', value: string, setter: (v: string) => void) => {
    if (!value.trim()) return;
    dispatch({ type: 'UPDATE_SETTINGS', payload: { [field]: [...state.settings[field], value.trim()] } });
    setter('');
  };

  const removeItem = (field: 'availablePlans' | 'batches' | 'durations', value: string) => {
    dispatch({ type: 'UPDATE_SETTINGS', payload: { [field]: state.settings[field].filter(v => v !== value) } });
  };

  const handleQrChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = ev => setQrPreview(ev.target?.result as string);
      reader.readAsDataURL(file);
    }
  };

  const resetToDefaults = () => {
    dispatch({ type: 'UPDATE_SETTINGS', payload: { availablePlans: DEFAULT_PLANS, batches: DEFAULT_BATCHES, durations: DEFAULT_DURATIONS } });
  };

  return (
    <div className={styles.container}>
      {/* Gym Profile */}
      <div className={styles.card}>
        <h2 className={styles.cardTitle}>Gym Profile</h2>
        <Input label="Gym Name" value={gymName} onChange={e => setGymName(e.target.value)} />
        <Input label="UPI ID" value={upiId} onChange={e => setUpiId(e.target.value)} />

        <div className={styles.qrSection}>
          <p className="text-label" style={{ color: 'var(--color-text-secondary)' }}>Payment QR Code</p>
          {qrPreview ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img src={qrPreview} alt="QR Code" className={styles.qrPreview} />
          ) : (
            <div className={styles.qrPlaceholder}>No QR uploaded</div>
          )}
          <input type="file" accept="image/*" ref={fileInputRef} onChange={handleQrChange} style={{ display: 'none' }} />
          <Button variant="ghost" onClick={() => fileInputRef.current?.click()}>
            {qrPreview ? 'Change QR Image' : 'Upload QR Screenshot'}
          </Button>
        </div>

        <div style={{ marginTop: '16px' }}>
          <p className="text-label" style={{ color: 'var(--color-text-secondary)', marginBottom: '8px' }}>Smart Entry (AI Form Filler)</p>
          <div style={{ display: 'flex', gap: '8px' }}>
            <Button 
              variant={enableSmartEntry ? "primary" : "ghost"} 
              onClick={() => setEnableSmartEntry(true)}
            >
              Enabled
            </Button>
            <Button 
              variant={!enableSmartEntry ? "primary" : "ghost"} 
              onClick={() => setEnableSmartEntry(false)}
            >
              Disabled
            </Button>
          </div>
          <p style={{ fontSize: '12px', color: 'var(--color-text-secondary)', marginTop: '8px' }}>
            Allow AI-powered copy-pasting of WhatsApp forwards and voice notes when adding members or logging payments.
          </p>
        </div>

        <Button variant="primary" fullWidth onClick={saveProfile} style={{ marginTop: '16px' }}>Save Profile & Settings</Button>
      </div>

      {/* Manage Plans */}
      <div className={styles.card}>
        <h2 className={styles.cardTitle}>Manage Plans</h2>
        <div className={styles.addRow}>
          <Input label="New Plan Name" value={newPlan} onChange={e => setNewPlan(e.target.value)} onKeyDown={e => e.key === 'Enter' && addItem('availablePlans', newPlan, setNewPlan)} />
          <Button variant="dark" onClick={() => addItem('availablePlans', newPlan, setNewPlan)}>Add</Button>
        </div>
        <div className={styles.tagList}>
          {state.settings.availablePlans.map(p => (
            <div key={p} className={styles.tag}>
              <span>{p}</span>
              <button onClick={() => removeItem('availablePlans', p)} className={styles.removeBtn}>×</button>
            </div>
          ))}
        </div>
      </div>

      {/* Manage Batches */}
      <div className={styles.card}>
        <h2 className={styles.cardTitle}>Manage Batches</h2>
        <div className={styles.addRow}>
          <Input label='New Batch (e.g. "6-7 AM")' value={newBatch} onChange={e => setNewBatch(e.target.value)} onKeyDown={e => e.key === 'Enter' && addItem('batches', newBatch, setNewBatch)} />
          <Button variant="dark" onClick={() => addItem('batches', newBatch, setNewBatch)}>Add</Button>
        </div>
        <div className={styles.tagList}>
          {state.settings.batches.map(b => (
            <div key={b} className={styles.tag}>
              <span>{b}</span>
              <button onClick={() => removeItem('batches', b)} className={styles.removeBtn}>×</button>
            </div>
          ))}
        </div>
      </div>

      {/* Manage Durations */}
      <div className={styles.card}>
        <h2 className={styles.cardTitle}>Manage Durations</h2>
        <div className={styles.addRow}>
          <Input label='New Duration (e.g. "45 Days")' value={newDuration} onChange={e => setNewDuration(e.target.value)} onKeyDown={e => e.key === 'Enter' && addItem('durations', newDuration, setNewDuration)} />
          <Button variant="dark" onClick={() => addItem('durations', newDuration, setNewDuration)}>Add</Button>
        </div>
        <div className={styles.tagList}>
          {state.settings.durations.map(d => (
            <div key={d} className={styles.tag}>
              <span>{d}</span>
              <button onClick={() => removeItem('durations', d)} className={styles.removeBtn}>×</button>
            </div>
          ))}
        </div>
      </div>

      {/* Danger Zone */}
      <div className={`${styles.card} ${styles.dangerCard}`}>
        <h2 className={styles.cardTitle} style={{ color: 'var(--color-error)' }}>Danger Zone</h2>
        <p className="text-body" style={{ color: 'var(--color-text-secondary)' }}>Reset all plans, batches, and durations back to default values.</p>
        <Button variant="danger" onClick={resetToDefaults}>Reset Plans & Batches to Default</Button>
      </div>

      {/* Version Footer */}
      <p className={styles.version}>FitnessWynk Admin v1.0.0</p>
    </div>
  );
}
