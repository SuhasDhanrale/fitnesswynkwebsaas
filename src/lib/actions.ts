import { v4 as uuidv4 } from 'uuid';
import { Member, Payment } from '../types';
import { supabase } from './supabaseClient';
import { queryClient } from './queryClient';

// ─── Add Member ─────────────────────────────────────────────────────────────

export const addMember = async (
  data: Omit<Member, 'id'> & { initialPayments: { amount: number; mode: 'Cash' | 'UPI' }[] }
) => {
  const { initialPayments, ...memberData } = data;
  const member: Member = { id: uuidv4(), ...memberData };

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
    return { error: memberError.message };
  }

  // Invalidate members cache
  queryClient.invalidateQueries({ queryKey: ['members'] });
  queryClient.invalidateQueries({ queryKey: ['members_list'] });

  // Log initial payments if provided (supports split: one Cash row + one UPI row)
  const payableEntries = initialPayments.filter(p => p.amount > 0);
  if (payableEntries.length > 0) {
    const timestamp = Date.now();
    const rows = payableEntries.map(p => ({
      id: uuidv4(),
      member_id: member.id,
      member_name: member.name,
      amount: p.amount,
      payment_mode: p.mode,
      plan_name: member.planName,
      batch: member.batch,
      start_date: member.startDate,
      end_date: member.expiryDate,
      notes: 'Initial payment',
      timestamp,
    }));

    const { error: paymentError } = await supabase.from('payments').insert(rows);

    if (paymentError) {
      console.error('Error saving initial payment:', paymentError.message);
      return { error: paymentError.message };
    }

    queryClient.invalidateQueries({ queryKey: ['payments'] });
    queryClient.invalidateQueries({ queryKey: ['payments', member.id] });
  }

  return { success: true };
};

// ─── Process Payment & Renewal ───────────────────────────────────────────────

export const processPaymentAndRenewal = async (
  data: Omit<Payment, 'id' | 'memberName' | 'timestamp'> & { memberName?: string }
) => {
  const memberName = data.memberName || 'Manual Entry';

  const payment: Payment = {
    ...data,
    id: uuidv4(),
    memberName,
    timestamp: Date.now(),
  };

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
  await supabase.from('members').update({
    plan_name: data.planName,
    batch: data.batch,
    start_date: data.startDate,
    expiry_date: data.endDate,
    due_amount: 0,
  }).eq('id', data.memberId);

  // Invalidate relevant caches
  queryClient.invalidateQueries({ queryKey: ['members'] });
  queryClient.invalidateQueries({ queryKey: ['members_list'] });
  queryClient.invalidateQueries({ queryKey: ['member', data.memberId] });
  queryClient.invalidateQueries({ queryKey: ['payments'] });
  queryClient.invalidateQueries({ queryKey: ['payments', data.memberId] });
  queryClient.invalidateQueries({ queryKey: ['finance_stats'] });
  queryClient.invalidateQueries({ queryKey: ['finance_summary'] });
  queryClient.invalidateQueries({ queryKey: ['dashboard_stats'] });
};
