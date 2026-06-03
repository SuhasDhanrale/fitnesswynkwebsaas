'use client';

import React from 'react';
import styles from './Stepper.module.css';

interface StepperProps {
  currentStep: number;
  totalSteps: number;
}

export const Stepper: React.FC<StepperProps> = ({ currentStep, totalSteps }) => {
  return (
    <div className={styles.stepperContainer}>
      <div className={styles.progressTrack}>
        <div 
          className={styles.progressFill} 
          style={{ width: `${(currentStep / totalSteps) * 100}%` }} 
        />
      </div>
    </div>
  );
};
