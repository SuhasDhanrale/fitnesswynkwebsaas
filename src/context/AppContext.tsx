'use client';

import React, { createContext, useContext, useReducer, ReactNode, useEffect } from 'react';
import { GymSettings } from '../types';
import { supabase } from '../lib/supabaseClient';

// AppContext now only manages Settings (small, rarely changes)
// All member/payment/attendance/expense data is handled by React Query hooks

export interface AppState {
  settings: GymSettings;
  isLoading: boolean;
}

export type AppAction =
  | { type: 'SET_SETTINGS'; payload: GymSettings }
  | { type: 'UPDATE_SETTINGS'; payload: Partial<GymSettings> };

const initialState: AppState = {
  settings: {
    gymName: 'FitnessWynk Gym',
    upiId: '',
    qrCodeUrl: '',
    availablePlans: [],
    batches: [],
    durations: [],
    enableSmartEntry: false,
  },
  isLoading: true,
};

function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case 'SET_SETTINGS':
      return { ...state, settings: action.payload, isLoading: false };
    case 'UPDATE_SETTINGS':
      return { ...state, settings: { ...state.settings, ...action.payload } };
    default:
      return state;
  }
}

const AppContext = createContext<{ state: AppState; dispatch: React.Dispatch<AppAction> } | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(appReducer, initialState);

  useEffect(() => {
    async function loadSettings() {
      try {
        const { data: dbSettings } = await supabase
          .from('gym_settings')
          .select('*')
          .eq('id', 1)
          .maybeSingle();

        if (dbSettings) {
          dispatch({
            type: 'SET_SETTINGS',
            payload: {
              gymName: dbSettings.gym_name,
              upiId: dbSettings.upi_id || '',
              qrCodeUrl: dbSettings.qr_code_url || '',
              availablePlans: dbSettings.available_plans || [],
              batches: dbSettings.batches || [],
              durations: dbSettings.durations || [],
              enableSmartEntry: dbSettings.enable_smart_entry ?? false,
            },
          });
        } else {
          dispatch({ type: 'SET_SETTINGS', payload: initialState.settings });
        }
      } catch (err) {
        console.error('Error fetching settings from Supabase:', err);
        dispatch({ type: 'SET_SETTINGS', payload: initialState.settings });
      }
    }

    loadSettings();
  }, []);

  return <AppContext.Provider value={{ state, dispatch }}>{children}</AppContext.Provider>;
}

export const useApp = () => {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
};
