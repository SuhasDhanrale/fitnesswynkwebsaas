'use client';

import React, { useState, useEffect } from 'react';
import styles from './ChangePinModal.module.css';

interface ChangePinModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type Step = 'current' | 'new' | 'confirm';

export function ChangePinModal({ isOpen, onClose }: ChangePinModalProps) {
  const [step, setStep] = useState<Step>('current');
  const [currentPin, setCurrentPin] = useState('');
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [error, setError] = useState('');
  const [shake, setShake] = useState(false);
  const [success, setSuccess] = useState(false);

  const activePin = step === 'current' ? currentPin : step === 'new' ? newPin : confirmPin;
  const setActivePin = step === 'current' ? setCurrentPin : step === 'new' ? setNewPin : setConfirmPin;

  function triggerShake(msg: string) {
    setError(msg);
    setShake(true);
    setTimeout(() => setShake(false), 500);
    setActivePin('');
  }

  async function handleDigit(digit: string) {
    if (activePin.length >= 4) return;
    const updated = activePin + digit;
    setActivePin(updated);
    setError('');

    if (updated.length === 4) {
      if (step === 'current') {
        // Verify against server — never expose the stored hash to the client
        const res = await fetch('/api/verify-pin', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ pin: updated }),
        });
        const json = await res.json();
        if (json.ok) {
          setStep('new');
        } else {
          triggerShake('Incorrect PIN');
        }
      } else if (step === 'new') {
        setStep('confirm');
      } else {
        // confirm step
        if (updated === newPin) {
          // Change PIN via server route — hash is computed server-side
          const res = await fetch('/api/change-pin', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ currentPin, newPin }),
          });
          const json = await res.json();
          if (json.ok) {
            setSuccess(true);
            setTimeout(() => { handleClose(); }, 1500);
          } else {
            triggerShake(json.error ?? 'Failed to update PIN');
          }
        } else {
          triggerShake('PINs do not match');
          setNewPin('');
          setStep('new');
        }
      }
    }
  }

  function handleBackspace() {
    setActivePin(p => p.slice(0, -1));
    setError('');
  }

  function handleClose() {
    setStep('current');
    setCurrentPin('');
    setNewPin('');
    setConfirmPin('');
    setError('');
    setSuccess(false);
    onClose();
  }

  useEffect(() => {
    if (!isOpen) return;

    function handleKeyDown(e: KeyboardEvent) {
      if (/^[0-9]$/.test(e.key)) {
        handleDigit(e.key);
      } else if (e.key === 'Backspace') {
        handleBackspace();
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, activePin, step, currentPin, newPin, confirmPin]);

  if (!isOpen) return null;

  const stepLabels: Record<Step, string> = {
    current: 'Enter current PIN',
    new: 'Enter new PIN',
    confirm: 'Confirm new PIN',
  };

  const NUMPAD = ['1','2','3','4','5','6','7','8','9','','0','⌫'];

  return (
    <div className={styles.backdrop} onClick={handleClose}>
      <div className={styles.modal} onClick={e => e.stopPropagation()}>
        <button className={styles.closeBtn} onClick={handleClose}>✕</button>

        {success ? (
          <div className={styles.successState}>
            <div className={styles.successIcon}>✓</div>
            <p className={styles.successText}>PIN updated!</p>
          </div>
        ) : (
          <>
            <h2 className={styles.title}>Change PIN</h2>

            <div className={styles.steps}>
              {(['current','new','confirm'] as Step[]).map((s, i) => (
                <div
                  key={s}
                  className={`${styles.stepDot} ${s === step ? styles.stepActive : ((['current','new','confirm'] as Step[]).indexOf(step) > i ? styles.stepDone : '')}`}
                />
              ))}
            </div>

            <p className={styles.label}>{stepLabels[step]}</p>

            <div className={`${styles.dotRow} ${shake ? styles.shake : ''}`}>
              {[0,1,2,3].map(i => (
                <div key={i} className={`${styles.dot} ${i < activePin.length ? styles.dotFilled : ''}`} />
              ))}
            </div>

            {error && <p className={styles.error}>{error}</p>}

            <div className={styles.numpad}>
              {NUMPAD.map((digit, i) => (
                digit === '' ? (
                  <div key={i} />
                ) : digit === '⌫' ? (
                  <button key={i} className={styles.numKey} onClick={handleBackspace}>⌫</button>
                ) : (
                  <button key={i} className={styles.numKey} onClick={() => handleDigit(digit)}>{digit}</button>
                )
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
