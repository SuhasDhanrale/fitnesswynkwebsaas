'use server';

import { v4 as uuidv4 } from 'uuid';
import { sql } from './db';
import { assertAppSession } from './session';
import { Member, Payment } from '../types';

type ActionResult = { error?: string };

function err(error: unknown): ActionResult {
  const message = error instanceof Error ? error.message : String(error);
  console.error('[server_action] Failed:', message);
  return { error: 'Something went wrong. Please try again.' };
}

function ok(): ActionResult {
  return {};
}

function requireSession(): ActionResult | null {
  try {
    assertAppSession();
    return null;
  } catch {
    return { error: 'Unauthorized' };
  }
}

export async function addMember(
  data: Omit<Member, 'id'> & { initialPayments: { amount: number; mode: 'Cash' | 'UPI' }[] }
): Promise<ActionResult> {
  const auth = requireSession();
  if (auth) return auth;

  const { initialPayments, ...memberData } = data;
  const member: Member = { id: uuidv4(), ...memberData };
  const payable = initialPayments.filter((p) => p.amount > 0);
  const timestamp = Date.now();

  try {
    const statements = [
      sql`
        insert into public.members (
          id, name, phone_number, plan_name, batch, start_date, expiry_date,
          duration_label, notes, due_amount
        ) values (
          ${member.id}::uuid, ${member.name}, ${member.phoneNumber}, ${member.planName},
          ${member.batch}, ${member.startDate}, ${member.expiryDate}, ${member.durationLabel},
          ${member.notes}, ${member.dueAmount}
        )
      `,
      ...payable.map((p) => sql`
        insert into public.payments (
          id, member_id, member_name, amount, payment_mode, plan_name, batch,
          start_date, end_date, notes, timestamp
        ) values (
          ${uuidv4()}::uuid, ${member.id}::uuid, ${member.name}, ${p.amount}, ${p.mode},
          ${member.planName}, ${member.batch}, ${member.startDate}, ${member.expiryDate},
          ${'Initial payment'}, ${timestamp}
        )
      `),
    ];

    await sql.transaction(statements);
    return ok();
  } catch (error) {
    return err(error);
  }
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
): Promise<ActionResult> {
  const auth = requireSession();
  if (auth) return auth;

  try {
    await sql`
      update public.members
      set
        name = ${data.name},
        phone_number = ${data.phone_number},
        plan_name = ${data.plan_name},
        batch = ${data.batch},
        duration_label = ${data.duration_label},
        start_date = ${data.start_date},
        expiry_date = ${data.expiry_date},
        notes = ${data.notes},
        due_amount = ${data.due_amount}
      where id = ${memberId}::uuid
    `;
    return ok();
  } catch (error) {
    return err(error);
  }
}

export async function deleteMember(memberId: string): Promise<ActionResult> {
  const auth = requireSession();
  if (auth) return auth;

  try {
    await sql`delete from public.members where id = ${memberId}::uuid`;
    return ok();
  } catch (error) {
    return err(error);
  }
}

export async function processPaymentAndRenewal(
  data: Omit<Payment, 'id' | 'memberName' | 'timestamp'> & { memberName?: string }
): Promise<ActionResult> {
  const auth = requireSession();
  if (auth) return auth;

  const memberName = data.memberName || 'Manual Entry';
  const paymentId = uuidv4();
  const timestamp = Date.now();

  try {
    await sql.transaction([
      sql`
        insert into public.payments (
          id, member_id, member_name, amount, payment_mode, plan_name, batch,
          start_date, end_date, notes, timestamp
        ) values (
          ${paymentId}::uuid, ${data.memberId}::uuid, ${memberName}, ${data.amount},
          ${data.paymentMode}, ${data.planName}, ${data.batch}, ${data.startDate},
          ${data.endDate}, ${data.notes}, ${timestamp}
        )
      `,
      sql`
        update public.members
        set
          plan_name = ${data.planName},
          batch = ${data.batch},
          start_date = ${data.startDate},
          expiry_date = ${data.endDate},
          due_amount = 0
        where id = ${data.memberId}::uuid
      `,
    ]);
    return ok();
  } catch (error) {
    return err(error);
  }
}

export async function logPaymentAndUpdateMember(data: {
  memberId: string;
  memberName: string;
  planName: string;
  batch: string;
  durationLabel: string;
  startDate: number;
  endDate: number;
  dueAmount: number;
  notes: string;
  payments: { amount: number; paymentMode: 'Cash' | 'UPI' }[];
}): Promise<ActionResult> {
  const auth = requireSession();
  if (auth) return auth;

  const timestamp = Date.now();
  const payable = data.payments.filter((payment) => payment.amount > 0);

  try {
    await sql.transaction([
      ...payable.map((payment) => sql`
        insert into public.payments (
          id, member_id, member_name, amount, payment_mode, plan_name, batch,
          start_date, end_date, notes, timestamp
        ) values (
          ${uuidv4()}::uuid, ${data.memberId}::uuid, ${data.memberName}, ${payment.amount},
          ${payment.paymentMode}, ${data.planName}, ${data.batch}, ${data.startDate},
          ${data.endDate}, ${data.notes}, ${timestamp}
        )
      `),
      sql`
        update public.members
        set
          plan_name = ${data.planName},
          batch = ${data.batch},
          duration_label = ${data.durationLabel},
          start_date = ${data.startDate},
          expiry_date = ${data.endDate},
          due_amount = ${data.dueAmount}
        where id = ${data.memberId}::uuid
      `,
    ]);
    return ok();
  } catch (error) {
    return err(error);
  }
}

export async function correctPaymentAmount(
  paymentId: string,
  oldAmount: number,
  newAmount: number,
  reason: string
): Promise<ActionResult> {
  const auth = requireSession();
  if (auth) return auth;

  try {
    await sql.transaction([
      sql`
        insert into public.payment_corrections (
          id, payment_id, old_amount, new_amount, reason, corrected_at
        ) values (
          ${uuidv4()}::uuid, ${paymentId}::uuid, ${oldAmount}, ${newAmount},
          ${reason.trim()}, ${Date.now()}
        )
      `,
      sql`
        update public.payments
        set amount = ${newAmount}, is_edited = true
        where id = ${paymentId}::uuid
      `,
    ]);
    return ok();
  } catch (error) {
    return err(error);
  }
}

export async function markAttendance(memberId: string, todayMidnight: number): Promise<ActionResult> {
  const auth = requireSession();
  if (auth) return auth;

  try {
    await sql`
      insert into public.attendance (id, member_id, date)
      values (${uuidv4()}::uuid, ${memberId}::uuid, ${todayMidnight})
      on conflict (member_id, date) do nothing
    `;
    return ok();
  } catch (error) {
    return err(error);
  }
}

export async function unmarkAttendance(memberId: string, todayMidnight: number): Promise<ActionResult> {
  const auth = requireSession();
  if (auth) return auth;

  try {
    await sql`
      delete from public.attendance
      where member_id = ${memberId}::uuid and date = ${todayMidnight}
    `;
    return ok();
  } catch (error) {
    return err(error);
  }
}

export async function addEnquiry(data: {
  name: string;
  phone_number: string;
  location: string | null;
  source: string | null;
  plan_of_interest: string;
  notes: string;
}): Promise<ActionResult> {
  const auth = requireSession();
  if (auth) return auth;

  try {
    await sql`
      insert into public.enquiries (
        id, name, phone_number, location, source, plan_of_interest,
        notes, is_converted, timestamp
      ) values (
        ${uuidv4()}::uuid, ${data.name}, ${data.phone_number}, ${data.location},
        ${data.source}, ${data.plan_of_interest}, ${data.notes}, false, ${Date.now()}
      )
    `;
    return ok();
  } catch (error) {
    return err(error);
  }
}

export async function toggleEnquiryConverted(id: string, isConverted: boolean): Promise<ActionResult> {
  const auth = requireSession();
  if (auth) return auth;

  try {
    await sql`
      update public.enquiries
      set is_converted = ${isConverted}
      where id = ${id}::uuid
    `;
    return ok();
  } catch (error) {
    return err(error);
  }
}

export async function deleteEnquiry(id: string): Promise<ActionResult> {
  const auth = requireSession();
  if (auth) return auth;

  try {
    await sql`delete from public.enquiries where id = ${id}::uuid`;
    return ok();
  } catch (error) {
    return err(error);
  }
}

export async function addExpense(data: {
  title: string;
  amount: number;
  notes: string;
}): Promise<ActionResult> {
  const auth = requireSession();
  if (auth) return auth;

  try {
    await sql`
      insert into public.expenses (id, title, amount, date, notes, category)
      values (${uuidv4()}::uuid, ${data.title}, ${data.amount}, ${Date.now()}, ${data.notes}, ${'General'})
    `;
    return ok();
  } catch (error) {
    return err(error);
  }
}

export async function deleteExpense(id: string): Promise<ActionResult> {
  const auth = requireSession();
  if (auth) return auth;

  try {
    await sql`delete from public.expenses where id = ${id}::uuid`;
    return ok();
  } catch (error) {
    return err(error);
  }
}

export async function addScheduledExpense(data: {
  title: string;
  amount: number;
  category: string;
  frequency: string;
  notes: string;
  next_due_date: number;
}): Promise<ActionResult> {
  const auth = requireSession();
  if (auth) return auth;

  try {
    await sql`
      insert into public.scheduled_expenses (
        id, title, amount, category, frequency, notes, next_due_date, active
      ) values (
        ${uuidv4()}::uuid, ${data.title}, ${data.amount}, ${data.category},
        ${data.frequency}, ${data.notes}, ${data.next_due_date}, true
      )
    `;
    return ok();
  } catch (error) {
    return err(error);
  }
}

export async function deleteScheduledExpense(id: string): Promise<ActionResult> {
  const auth = requireSession();
  if (auth) return auth;

  try {
    await sql`delete from public.scheduled_expenses where id = ${id}::uuid`;
    return ok();
  } catch (error) {
    return err(error);
  }
}

export async function createTask(data: {
  title: string;
  description: string;
  assignee: string;
  status: string;
  priority: string;
  due_date: number | null;
}): Promise<ActionResult> {
  const auth = requireSession();
  if (auth) return auth;

  try {
    await sql`
      insert into public.tasks (
        id, title, description, assignee, status, priority, due_date, timestamp
      ) values (
        ${uuidv4()}::uuid, ${data.title}, ${data.description}, ${data.assignee},
        ${data.status}, ${data.priority}, ${data.due_date}, ${Date.now()}
      )
    `;
    return ok();
  } catch (error) {
    return err(error);
  }
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
): Promise<ActionResult> {
  const auth = requireSession();
  if (auth) return auth;

  const assignments: string[] = [];
  const params: unknown[] = [];

  ([
    ['title', data.title],
    ['description', data.description],
    ['assignee', data.assignee],
    ['status', data.status],
    ['priority', data.priority],
    ['due_date', data.due_date],
  ] as const).forEach(([column, value]) => {
    if (value !== undefined) {
      params.push(value);
      assignments.push(`${column} = $${params.length}`);
    }
  });

  if (assignments.length === 0) return ok();

  params.push(taskId);

  try {
    await sql.query(
      `update public.tasks set ${assignments.join(', ')} where id = $${params.length}::uuid`,
      params
    );
    return ok();
  } catch (error) {
    return err(error);
  }
}

export async function addStaffProfile(name: string, avatarColor: string): Promise<ActionResult> {
  const auth = requireSession();
  if (auth) return auth;

  try {
    await sql`
      insert into public.staff_profiles (name, avatar_color)
      values (${name}, ${avatarColor})
    `;
    return ok();
  } catch (error) {
    return err(error);
  }
}

export async function saveGymSettings(settings: {
  gym_name: string;
  upi_id: string;
  qr_code_url: string;
  enable_smart_entry: boolean;
  available_plans: string[];
  batches: string[];
  durations: string[];
}): Promise<ActionResult> {
  const auth = requireSession();
  if (auth) return auth;

  try {
    await sql`
      insert into public.gym_settings (
        id, gym_name, upi_id, qr_code_url, enable_smart_entry,
        available_plans, batches, durations, updated_at
      ) values (
        1, ${settings.gym_name}, ${settings.upi_id}, ${settings.qr_code_url},
        ${settings.enable_smart_entry}, ${settings.available_plans},
        ${settings.batches}, ${settings.durations}, now()
      )
      on conflict (id) do update set
        gym_name = excluded.gym_name,
        upi_id = excluded.upi_id,
        qr_code_url = excluded.qr_code_url,
        enable_smart_entry = excluded.enable_smart_entry,
        available_plans = excluded.available_plans,
        batches = excluded.batches,
        durations = excluded.durations,
        updated_at = now()
    `;
    return ok();
  } catch (error) {
    return err(error);
  }
}

export async function logAuditAction(
  staffName: string,
  action: string,
  details?: Record<string, unknown>
): Promise<void> {
  assertAppSession();

  try {
    await sql`
      insert into public.audit_log (staff_name, action, details)
      values (${staffName}, ${action}, ${details ? JSON.stringify(details) : null}::jsonb)
    `;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('[audit_log] Failed to write:', message);
  }
}
