import { v4 as uuidv4 } from 'uuid';
import { Member, Payment } from '../types';
import { supabase } from './supabaseClient';
import { queryClient } from './queryClient';

// ─── Add Member ─────────────────────────────────────────────────────────────

export const addMember = async (
  data: Omit<Member, 'id'> & { initialPayment: number }
) => {
  const { initialPayment, ...memberData } = data;
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
    return;
  }

  // Invalidate members cache
  queryClient.invalidateQueries({ queryKey: ['members'] });
  queryClient.invalidateQueries({ queryKey: ['members_list'] });

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

    queryClient.invalidateQueries({ queryKey: ['payments'] });
    queryClient.invalidateQueries({ queryKey: ['payments', member.id] });
  }
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
};
