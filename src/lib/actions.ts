'use server';

/**
 * Server Actions — All database writes go through here.
 *
 * This file runs exclusively on the server (Next.js Server Actions).
 * It uses the service_role key via supabaseServer, which bypasses RLS.
 * Client components call these functions directly — Next.js serialises
 * the call over a secure POST request automatically.
 *
 * NEVER import supabaseServer from a client component. All writes must
 * come through these exported async functions.
 */

import { v4 as uuidv4 } from 'uuid';
import { supabaseServer } from './supabaseServer';
import { Member, Payment } from '../types';

// ─── UTILITY ────────────────────────────────────────────────────────────────

type ActionResult = { error?: string };

function err(msg: string): ActionResult {
  return { error: msg };
}

function ok(): ActionResult {
  return {};
}

// ─── MEMBERS ────────────────────────────────────────────────────────────────

export async function addMember(
  data: Omit<Member, 'id'> & { initialPayments: { amount: number; mode: 'Cash' | 'UPI' }[] }
) {
  const { initialPayments, ...memberData } = data;
  const member: Member = { id: uuidv4(), ...memberData };

  const { error: memberError } = await supabaseServer.from('members').insert({
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

  if (memberError) return err(memberError.message);

  // Log initial payments
  const payable = initialPayments.filter(p => p.amount > 0);
  if (payable.length > 0) {
    const timestamp = Date.now();
    const rows = payable.map(p => ({
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

    const { error: paymentError } = await supabaseServer.from('payments').insert(rows);
    if (paymentError) return err(paymentError.message);
  }

  return ok();
}

export async function updateMember(
  memberId: string,
  data: {
    name: string;
    phone_number: string;
    plan_name: string;
    batch: string;
    duration_label: string;
    start_date: number;
    expiry_date: number;
    notes: string;
    due_amount: number;
  }
) {
  const { error } = await supabaseServer
    .from('members')
    .update(data)
    .eq('id', memberId);

  if (error) return err(error.message);
  return ok();
}

// ─── PAYMENTS ───────────────────────────────────────────────────────────────

export async function processPaymentAndRenewal(
  data: Omit<Payment, 'id' | 'memberName' | 'timestamp'> & { memberName?: string }
) {
  const memberName = data.memberName || 'Manual Entry';
  const payment: Payment = {
    ...data,
    id: uuidv4(),
    memberName,
    timestamp: Date.now(),
  };

  const { error: payError } = await supabaseServer.from('payments').insert({
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

  if (payError) return err(payError.message);

  const { error: memberError } = await supabaseServer
    .from('members')
    .update({
      plan_name: data.planName,
      batch: data.batch,
      start_date: data.startDate,
      expiry_date: data.endDate,
      due_amount: 0,
    })
    .eq('id', data.memberId);

  if (memberError) return err(memberError.message);
  return ok();
}

export async function correctPaymentAmount(
  paymentId: string,
  oldAmount: number,
  newAmount: number,
  reason: string
) {
  const { error: logError } = await supabaseServer.from('payment_corrections').insert({
    id: uuidv4(),
    payment_id: paymentId,
    old_amount: oldAmount,
    new_amount: newAmount,
    reason: reason.trim(),
    corrected_at: Date.now(),
  });
  if (logError) return err(logError.message);

  const { error: updateError } = await supabaseServer
    .from('payments')
    .update({ amount: newAmount, is_edited: true })
    .eq('id', paymentId);

  if (updateError) return err(updateError.message);
  return ok();
}

// ─── ATTENDANCE ──────────────────────────────────────────────────────────────

export async function markAttendance(memberId: string, todayMidnight: number) {
  const { error } = await supabaseServer
    .from('attendance')
    .insert({ id: uuidv4(), member_id: memberId, date: todayMidnight });

  if (error) return err(error.message);
  return ok();
}

export async function unmarkAttendance(memberId: string, todayMidnight: number) {
  const { error } = await supabaseServer
    .from('attendance')
    .delete()
    .eq('member_id', memberId)
    .eq('date', todayMidnight);

  if (error) return err(error.message);
  return ok();
}

// ─── ENQUIRIES ───────────────────────────────────────────────────────────────

export async function addEnquiry(data: {
  name: string;
  phone_number: string;
  location: string | null;
  source: string | null;
  plan_of_interest: string;
  notes: string;
}) {
  const { error } = await supabaseServer.from('enquiries').insert({
    id: uuidv4(),
    ...data,
    is_converted: false,
    timestamp: Date.now(),
  });

  if (error) return err(error.message);
  return ok();
}

export async function toggleEnquiryConverted(id: string, isConverted: boolean) {
  const { error } = await supabaseServer
    .from('enquiries')
    .update({ is_converted: isConverted })
    .eq('id', id);

  if (error) return err(error.message);
  return ok();
}

export async function deleteEnquiry(id: string) {
  const { error } = await supabaseServer.from('enquiries').delete().eq('id', id);
  if (error) return err(error.message);
  return ok();
}

// ─── EXPENSES ────────────────────────────────────────────────────────────────

export async function addExpense(data: {
  title: string;
  amount: number;
  notes: string;
}) {
  const { error } = await supabaseServer.from('expenses').insert({
    id: uuidv4(),
    title: data.title,
    amount: data.amount,
    date: Date.now(),
    notes: data.notes,
    category: 'General',
  });

  if (error) return err(error.message);
  return ok();
}

export async function deleteExpense(id: string) {
  const { error } = await supabaseServer.from('expenses').delete().eq('id', id);
  if (error) return err(error.message);
  return ok();
}

// ─── SCHEDULED EXPENSES ──────────────────────────────────────────────────────

export async function addScheduledExpense(data: {
  title: string;
  amount: number;
  category: string;
  frequency: string;
  notes: string;
  next_due_date: number;
}) {
  const { error } = await supabaseServer.from('scheduled_expenses').insert({
    id: uuidv4(),
    title: data.title,
    amount: data.amount,
    category: data.category,
    frequency: data.frequency,
    notes: data.notes,
    next_due_date: data.next_due_date,
    active: true
  });

  if (error) return err(error.message);
  return ok();
}

export async function deleteScheduledExpense(id: string) {
  const { error } = await supabaseServer.from('scheduled_expenses').delete().eq('id', id);
  if (error) return err(error.message);
  return ok();
}

// ─── TASKS ───────────────────────────────────────────────────────────────────

export async function createTask(data: {
  title: string;
  description: string;
  assignee: string;
  status: string;
  priority: string;
  due_date: number | null;
}) {
  const { error } = await supabaseServer.from('tasks').insert({
    id: uuidv4(),
    ...data,
    timestamp: Date.now(),
  });

  if (error) return err(error.message);
  return ok();
}

export async function updateTask(
  taskId: string,
  data: {
    title?: string;
    description?: string;
    assignee?: string;
    status?: string;
    priority?: string;
    due_date?: number | null;
  }
) {
  const { error } = await supabaseServer.from('tasks').update(data).eq('id', taskId);
  if (error) return err(error.message);
  return ok();
}

// ─── STAFF PROFILES ──────────────────────────────────────────────────────────

export async function addStaffProfile(name: string, avatarColor: string) {
  const { error } = await supabaseServer
    .from('staff_profiles')
    .insert({ name, avatar_color: avatarColor });

  if (error) return err(error.message);
  return ok();
}

// ─── GYM SETTINGS ────────────────────────────────────────────────────────────

export async function saveGymSettings(settings: {
  gym_name: string;
  upi_id: string;
  qr_code_url: string;
  enable_smart_entry: boolean;
  available_plans: string[];
  batches: string[];
  durations: string[];
}) {
  const { error } = await supabaseServer
    .from('gym_settings')
    .update(settings)
    .eq('id', 1);

  if (error) return err(error.message);
  return ok();
}

// ─── AUDIT LOG ───────────────────────────────────────────────────────────────

export async function logAuditAction(
  staffName: string,
  action: string,
  details?: Record<string, unknown>
) {
  const { error } = await supabaseServer.from('audit_log').insert({
    staff_name: staffName,
    action,
    details: details ?? null,
  });

  // Silent fail — audit logging should never break the app
  if (error) {
    console.error('[audit_log] Failed to write:', error.message);
  }
}
