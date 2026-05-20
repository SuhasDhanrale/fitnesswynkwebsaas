'use client';

import React, { createContext, useContext, useReducer, ReactNode, useEffect } from 'react';
import { Member, Payment, Attendance, Expense, Enquiry, Announcement, GymSettings } from '../types';
import { supabase } from '../lib/supabaseClient';

export interface AppState {
  members: Member[];
  attendance: Attendance[];
  payments: Payment[];
  expenses: Expense[];
  enquiries: Enquiry[];
  announcements: Announcement[];
  settings: GymSettings;
  isLoading: boolean;
}

export type AppAction =
  | { type: 'SET_INITIAL_DATA'; payload: Partial<AppState> }
  | { type: 'ADD_MEMBER'; payload: Member }
  | { type: 'UPDATE_MEMBER'; payload: Member }
  | { type: 'DELETE_MEMBER'; payload: string }
  | { type: 'ADD_ATTENDANCE'; payload: Attendance }
  | { type: 'REMOVE_ATTENDANCE'; payload: { memberId: string; date: number } }
  | { type: 'ADD_PAYMENT'; payload: Payment }
  | { type: 'ADD_EXPENSE'; payload: Expense }
  | { type: 'DELETE_EXPENSE'; payload: string }
  | { type: 'ADD_ENQUIRY'; payload: Enquiry }
  | { type: 'UPDATE_ENQUIRY'; payload: Enquiry }
  | { type: 'DELETE_ENQUIRY'; payload: string }
  | { type: 'UPDATE_SETTINGS'; payload: Partial<GymSettings> };

const initialState: AppState = {
  members: [],
  attendance: [],
  payments: [],
  expenses: [],
  enquiries: [],
  announcements: [],
  settings: {
    gymName: 'FitnessWynk Gym',
    upiId: '',
    qrCodeUrl: '',
    availablePlans: [],
    batches: [],
    durations: [],
  },
  isLoading: true,
};

function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case 'SET_INITIAL_DATA':
      return { ...state, ...action.payload, isLoading: false };
    case 'ADD_MEMBER':
      return { ...state, members: [...state.members, action.payload] };
    case 'UPDATE_MEMBER':
      return {
        ...state,
        members: state.members.map((m) => (m.id === action.payload.id ? action.payload : m)),
      };
    case 'DELETE_MEMBER':
      return { ...state, members: state.members.filter((m) => m.id !== action.payload) };
    case 'ADD_ATTENDANCE':
      return { ...state, attendance: [...state.attendance, action.payload] };
    case 'REMOVE_ATTENDANCE':
      return {
        ...state,
        attendance: state.attendance.filter(
          (a) => !(a.memberId === action.payload.memberId && a.date === action.payload.date)
        ),
      };
    case 'ADD_PAYMENT':
      return { ...state, payments: [...state.payments, action.payload] };
    case 'ADD_EXPENSE':
      return { ...state, expenses: [...state.expenses, action.payload] };
    case 'DELETE_EXPENSE':
      return { ...state, expenses: state.expenses.filter((e) => e.id !== action.payload) };
    case 'ADD_ENQUIRY':
      return { ...state, enquiries: [...state.enquiries, action.payload] };
    case 'UPDATE_ENQUIRY':
      return {
        ...state,
        enquiries: state.enquiries.map((e) => (e.id === action.payload.id ? action.payload : e)),
      };
    case 'DELETE_ENQUIRY':
      return { ...state, enquiries: state.enquiries.filter((e) => e.id !== action.payload) };
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
    async function loadDataFromSupabase() {
      try {
        // 1. Fetch Members
        const { data: dbMembers } = await supabase.from('members').select('*');
        const mappedMembers: Member[] = (dbMembers || []).map((m: any) => ({
          id: m.id,
          name: m.name,
          phoneNumber: m.phone_number,
          planName: m.plan_name,
          batch: m.batch,
          startDate: Number(m.start_date),
          expiryDate: Number(m.expiry_date),
          durationLabel: m.duration_label,
          notes: m.notes || '',
          dueAmount: Number(m.due_amount || 0),
        }));

        // 2. Fetch Payments
        const { data: dbPayments } = await supabase.from('payments').select('*');
        const mappedPayments: Payment[] = (dbPayments || []).map((p: any) => ({
          id: p.id,
          memberId: p.member_id,
          memberName: p.member_name,
          amount: Number(p.amount),
          paymentMode: p.payment_mode as 'Cash' | 'UPI',
          planName: p.plan_name,
          batch: p.batch,
          startDate: Number(p.start_date),
          endDate: Number(p.end_date),
          notes: p.notes || '',
          timestamp: Number(p.timestamp),
        }));

        // 3. Fetch Expenses
        const { data: dbExpenses } = await supabase.from('expenses').select('*');
        const mappedExpenses: Expense[] = (dbExpenses || []).map((e: any) => ({
          id: e.id,
          title: e.title,
          amount: Number(e.amount),
          date: Number(e.date),
          notes: e.notes || '',
          category: e.category || 'General',
        }));

        // 4. Fetch Enquiries
        const { data: dbEnquiries } = await supabase.from('enquiries').select('*');
        const mappedEnquiries: Enquiry[] = (dbEnquiries || []).map((e: any) => ({
          id: e.id,
          name: e.name,
          phoneNumber: e.phone_number,
          planOfInterest: e.plan_of_interest,
          notes: e.notes || '',
          isConverted: e.is_converted,
          timestamp: Number(e.timestamp),
        }));

        // 5. Fetch Settings
        const { data: dbSettings } = await supabase.from('gym_settings').select('*').eq('id', 1).maybeSingle();
        let mappedSettings: GymSettings = initialState.settings;
        if (dbSettings) {
          mappedSettings = {
            gymName: dbSettings.gym_name,
            upiId: dbSettings.upi_id || '',
            qrCodeUrl: dbSettings.qr_code_url || '',
            availablePlans: dbSettings.available_plans || [],
            batches: dbSettings.batches || [],
            durations: dbSettings.durations || [],
          };
        }

        dispatch({
          type: 'SET_INITIAL_DATA',
          payload: {
            members: mappedMembers,
            payments: mappedPayments,
            expenses: mappedExpenses,
            enquiries: mappedEnquiries,
            settings: mappedSettings,
          },
        });
      } catch (err) {
        console.error('Error fetching initial data from Supabase:', err);
      }
    }

    loadDataFromSupabase();
  }, []);

  return <AppContext.Provider value={{ state, dispatch }}>{children}</AppContext.Provider>;
}

export const useApp = () => {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
};
