import { Dispatch } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { AppAction, AppState } from '../context/AppContext';
import { Member, Payment } from '../types';
import { supabase } from './supabaseClient';

// ─── Add Member ─────────────────────────────────────────────────────────────

export const addMember = async (
  dispatch: Dispatch<AppAction>,
  data: Omit<Member, 'id'> & { initialPayment: number }
) => {
  const { initialPayment, ...memberData } = data;
  const member: Member = { id: uuidv4(), ...memberData };

  // Optimistic local update first (UI feels instant)
  dispatch({ type: 'ADD_MEMBER', payload: member });

  // Persist to Supabase
  const { error: memberError } = await supabase.from('members').insert({
    id: member.id,
    name: member.name,
    phone_number: member.phoneNumber,
    plan_name: member.planName,
    batch: member.batch,
    start_date: member.startDate,
    expiry_date: member.expiryDate,
    duration_label: member.durationLabel,
    notes: member.notes,
    due_amount: member.dueAmount,
  });

  if (memberError) {
    console.error('Error saving member:', memberError.message);
    return;
  }

  // Log initial payment if provided
  if (initialPayment > 0) {
    const payment: Payment = {
      id: uuidv4(),
      memberId: member.id,
      memberName: member.name,
      amount: initialPayment,
      paymentMode: 'Cash',
      planName: member.planName,
      batch: member.batch,
      startDate: member.startDate,
      endDate: member.expiryDate,
      notes: 'Initial payment',
      timestamp: Date.now(),
    };
    dispatch({ type: 'ADD_PAYMENT', payload: payment });

    await supabase.from('payments').insert({
      id: payment.id,
      member_id: payment.memberId,
      member_name: payment.memberName,
      amount: payment.amount,
      payment_mode: payment.paymentMode,
      plan_name: payment.planName,
      batch: payment.batch,
      start_date: payment.startDate,
      end_date: payment.endDate,
      notes: payment.notes,
      timestamp: payment.timestamp,
    });
  }
};

// ─── Process Payment & Renewal ───────────────────────────────────────────────

export const processPaymentAndRenewal = async (
  dispatch: Dispatch<AppAction>,
  state: AppState,
  data: Omit<Payment, 'id' | 'memberName' | 'timestamp'>
) => {
  const member = state.members.find((m) => m.id === data.memberId);
  const memberName = member ? member.name : 'Manual Entry';

  const payment: Payment = {
    ...data,
    id: uuidv4(),
    memberName,
    timestamp: Date.now(),
  };

  // Optimistic local update
  dispatch({ type: 'ADD_PAYMENT', payload: payment });

  // Persist payment to Supabase
  const { error: payError } = await supabase.from('payments').insert({
    id: payment.id,
    member_id: payment.memberId,
    member_name: payment.memberName,
    amount: payment.amount,
    payment_mode: payment.paymentMode,
    plan_name: payment.planName,
    batch: payment.batch,
    start_date: payment.startDate,
    end_date: payment.endDate,
    notes: payment.notes,
    timestamp: payment.timestamp,
  });

  if (payError) {
    console.error('Error saving payment:', payError.message);
    return;
  }

  // Update member expiry and clear dues
  if (member) {
    const updatedMember: Member = {
      ...member,
      planName: data.planName || member.planName,
      batch: data.batch || member.batch,
      startDate: data.startDate,
      expiryDate: data.endDate,
      dueAmount: 0,
    };

    dispatch({ type: 'UPDATE_MEMBER', payload: updatedMember });

    await supabase.from('members').update({
      plan_name: updatedMember.planName,
      batch: updatedMember.batch,
      start_date: updatedMember.startDate,
      expiry_date: updatedMember.expiryDate,
      due_amount: 0,
    }).eq('id', member.id);
  }
};
