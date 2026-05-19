'use client';

import React, { createContext, useContext, useReducer, ReactNode } from 'react';
import { Member, Payment, Attendance, Expense, Enquiry, Announcement, GymSettings } from '../types';
import { mockMembers, mockPayments, mockAttendance, mockExpenses, mockEnquiries, mockAnnouncements, mockSettings } from '../data/mockData';

export interface AppState {
  members: Member[];
  attendance: Attendance[];
  payments: Payment[];
  expenses: Expense[];
  enquiries: Enquiry[];
  announcements: Announcement[];
  settings: GymSettings;
}

export type AppAction =
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
  members: mockMembers,
  attendance: mockAttendance,
  payments: mockPayments,
  expenses: mockExpenses,
  enquiries: mockEnquiries,
  announcements: mockAnnouncements,
  settings: mockSettings,
};

function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
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
  return <AppContext.Provider value={{ state, dispatch }}>{children}</AppContext.Provider>;
}

export const useApp = () => {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
};
