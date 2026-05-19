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
          style={{ width: `${((currentStep - 1) / (totalSteps - 1)) * 100}%` }} 
        />
      </div>
      <div className={styles.stepsWrapper}>
        {Array.from({ length: totalSteps }).map((_, index) => {
          const stepNum = index + 1;
          const isActive = stepNum === currentStep;
          const isCompleted = stepNum < currentStep;

          return (
            <div 
              key={stepNum} 
              className={`${styles.stepDot} ${isActive ? styles.active : ''} ${isCompleted ? styles.completed : ''}`}
            >
              {isCompleted ? '✓' : stepNum}
            </div>
          );
        })}
      </div>
    </div>
  );
};
