'use client';

import React, { useEffect, useState, useRef } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/context/AuthContext';
import styles from './ProfilePicker.module.css';

interface StaffProfile {
  id: number;
  name: string;
  avatar_color: string;
}

type Screen = 'profiles' | 'pin' | 'add-profile-pin' | 'add-profile-name';

export function ProfilePicker() {
  const { login } = useAuth();
  const [profiles, setProfiles] = useState<StaffProfile[]>([]);
  const [screen, setScreen] = useState<Screen>('profiles');
  const [selectedProfile, setSelectedProfile] = useState<StaffProfile | null>(null);
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [shake, setShake] = useState(false);
  const [newName, setNewName] = useState('');
  const [loading, setLoading] = useState(true);
  const nameInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchProfiles();
  }, []);

  useEffect(() => {
    if (screen === 'add-profile-name') {
      setTimeout(() => nameInputRef.current?.focus(), 100);
    }
  }, [screen]);

  // Global physical keyboard support for numbers and backspace during PIN screens
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (screen !== 'pin' && screen !== 'add-profile-pin') return;

      if (/^[0-9]$/.test(e.key)) {
        handlePinDigit(e.key);
      } else if (e.key === 'Backspace') {
        handleBackspace();
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [screen, pin, selectedProfile]);

  async function fetchProfiles() {
    const { data } = await supabase.from('staff_profiles').select('*').order('id');
    setProfiles(data ?? []);
    setLoading(false);
  }

  async function verifyPin(enteredPin: string): Promise<boolean> {
    const res = await fetch('/api/verify-pin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pin: enteredPin }),
    });
    const json = await res.json();
    return json.ok === true;
  }

  function handleProfileClick(profile: StaffProfile) {
    setSelectedProfile(profile);
    setPin('');
    setError('');
    setScreen('pin');
  }

  function handleAddProfileClick() {
    if (profiles.length >= 4) return;
    setPin('');
    setError('');
    setScreen('add-profile-pin');
  }

  async function handlePinDigit(digit: string) {
    if (pin.length >= 4) return;
    const newPin = pin + digit;
    setPin(newPin);
    setError('');

    if (newPin.length === 4) {
      const correct = await verifyPin(newPin);
      if (correct) {
        if (screen === 'pin' && selectedProfile) {
          login(selectedProfile.name);
        } else if (screen === 'add-profile-pin') {
          setPin('');
          setScreen('add-profile-name');
        }
      } else {
        triggerShake();
        setPin('');
        setError('Incorrect PIN');
      }
    }
  }

  function handleBackspace() {
    setPin(p => p.slice(0, -1));
    setError('');
  }

  function triggerShake() {
    setShake(true);
    setTimeout(() => setShake(false), 500);
  }

  async function handleAddProfile() {
    const trimmed = newName.trim();
    if (!trimmed) return;
    const colors = ['#FFDE21', '#333333', '#4CAF50', '#7C3AED'];
    const color = colors[profiles.length % colors.length];
    await supabase.from('staff_profiles').insert({ name: trimmed, avatar_color: color });
    await fetchProfiles();
    setNewName('');
    setScreen('profiles');
  }

  function goBack() {
    setScreen('profiles');
    setPin('');
    setError('');
    setSelectedProfile(null);
  }

  const NUMPAD = ['1','2','3','4','5','6','7','8','9','','0','⌫'];

  if (loading) {
    return (
      <div className={styles.overlay}>
        <div className={styles.loadingDots}>
          <span /><span /><span />
        </div>
      </div>
    );
  }

  return (
    <div className={styles.overlay}>

      {screen === 'profiles' && (
        <div className={styles.profilesScreen}>
          <h2 className={styles.heading}>Who&apos;s working today?</h2>
          <div className={styles.profileGrid}>
            {profiles.map(profile => (
              <button
                key={profile.id}
                className={styles.profileCard}
                onClick={() => handleProfileClick(profile)}
              >
                <div
                  className={styles.avatar}
                  style={{ background: profile.avatar_color, color: profile.avatar_color === '#FFDE21' ? '#000' : '#fff' }}
                >
                  {profile.name[0].toUpperCase()}
                </div>
                <span className={styles.profileName}>{profile.name}</span>
              </button>
            ))}
            {profiles.length < 4 && (
              <button className={styles.profileCard} onClick={handleAddProfileClick}>
                <div className={`${styles.avatar} ${styles.avatarAdd}`}>+</div>
                <span className={styles.profileName}>Add Profile</span>
              </button>
            )}
          </div>
        </div>
      )}

      {(screen === 'pin' || screen === 'add-profile-pin') && (
        <div className={styles.pinScreen}>
          <button className={styles.backBtn} onClick={goBack}>← Back</button>

          {screen === 'pin' && selectedProfile && (
            <div className={styles.pinAvatar}
              style={{ background: selectedProfile.avatar_color, color: selectedProfile.avatar_color === '#FFDE21' ? '#000' : '#fff' }}>
              {selectedProfile.name[0].toUpperCase()}
            </div>
          )}
          <h2 className={styles.heading}>
            {screen === 'pin' ? `Hi, ${selectedProfile?.name}` : 'Enter PIN to add profile'}
          </h2>
          <p className={styles.subheading}>Enter your 4-digit PIN</p>

          <div className={`${styles.dotRow} ${shake ? styles.shake : ''}`}>
            {[0,1,2,3].map(i => (
              <div key={i} className={`${styles.dot} ${i < pin.length ? styles.dotFilled : ''}`} />
            ))}
          </div>

          {error && <p className={styles.errorText}>{error}</p>}

          <div className={styles.numpad}>
            {NUMPAD.map((digit, i) => (
              digit === '' ? (
                <div key={i} />
              ) : digit === '⌫' ? (
                <button key={i} className={styles.numKey} onClick={handleBackspace}>⌫</button>
              ) : (
                <button key={i} className={styles.numKey} onClick={() => handlePinDigit(digit)}>
                  {digit}
                </button>
              )
            ))}
          </div>
        </div>
      )}

      {screen === 'add-profile-name' && (
        <div className={styles.addNameScreen}>
          <button className={styles.backBtn} onClick={goBack}>← Back</button>
          <h2 className={styles.heading}>New Profile</h2>
          <p className={styles.subheading}>Enter the staff member&apos;s name</p>
          <input
            ref={nameInputRef}
            className={styles.nameInput}
            type="text"
            placeholder="e.g. Rahul"
            value={newName}
            onChange={e => setNewName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleAddProfile()}
            maxLength={20}
          />
          <button
            className={styles.confirmBtn}
            onClick={handleAddProfile}
            disabled={!newName.trim()}
          >
            Add Profile
          </button>
        </div>
      )}
    </div>
  );
}
