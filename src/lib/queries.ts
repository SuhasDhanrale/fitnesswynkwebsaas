'use server';

import { sql } from './db';
import { assertAppSession } from './session';
import {
  Attendance,
  Enquiry,
  Expense,
  GymSettings,
  Member,
  Payment,
  ScheduledExpense,
  Task,
} from '@/types';

type Row = Record<string, unknown>;

export interface DashboardStats {
  active_members: number;
  present_today: number;
  expiring_soon: number;
  expired_members: number;
  monthly_collection: number;
}

export interface FinanceStats {
  this_month_income: number;
  last_month_income: number;
  all_time_income: number;
  this_month_expenses: number;
  last_month_expenses: number;
  all_time_expenses: number;
}

export interface FinanceSummaryMonth {
  month_label: string;
  month_start: number;
  income: number;
  expenses: number;
}

export interface StaffProfile {
  id: number;
  name: string;
  avatar_color: string;
}

export interface MemberRenewalDetails {
  plan_name: string;
  batch: string;
  duration_label: string;
  expiry_date: number;
}

interface UseMembersOptions {
  search?: string;
  status?: 'All' | 'Active' | 'OnHold' | 'Expired' | 'Cancelled' | 'Inactive';
  plan?: string;
  page?: number;
  pageSize?: number;
}

function requireSession(): void {
  assertAppSession();
}

function mapMember(m: Row): Member {
  return {
    id: m.id as string,
    name: m.name as string,
    phoneNumber: m.phone_number as string,
    planName: m.plan_name as string,
    batch: m.batch as string,
    startDate: Number(m.start_date),
    expiryDate: Number(m.expiry_date),
    durationLabel: m.duration_label as string,
    notes: (m.notes as string) || '',
    dueAmount: Number(m.due_amount || 0),
    status: (m.status as Member['status']) || 'active',
    cancellationNote: (m.cancellation_note as string) || null,
    cancellationDate: m.cancellation_date ? Number(m.cancellation_date) : null,
  };
}

function mapPayment(p: Row): Payment {
  return {
    id: p.id as string,
    memberId: p.member_id as string,
    memberName: p.member_name as string,
    amount: Number(p.amount),
    paymentMode: p.payment_mode as 'Cash' | 'UPI',
    planName: p.plan_name as string,
    batch: p.batch as string,
    startDate: Number(p.start_date),
    endDate: Number(p.end_date),
    notes: (p.notes as string) || '',
    timestamp: Number(p.timestamp),
    isEdited: (p.is_edited as boolean) ?? false,
  };
}

function mapExpense(e: Row): Expense {
  return {
    id: e.id as string,
    title: e.title as string,
    amount: Number(e.amount),
    date: Number(e.date),
    notes: (e.notes as string) || '',
    category: (e.category as string) || 'General',
  };
}

function mapEnquiry(e: Row): Enquiry {
  return {
    id: e.id as string,
    name: e.name as string,
    phoneNumber: e.phone_number as string,
    planOfInterest: (e.plan_of_interest as string) || '',
    notes: (e.notes as string) || '',
    isConverted: (e.is_converted as boolean) ?? false,
    timestamp: Number(e.timestamp),
    location: (e.location as string) || undefined,
    source: (e.source as string) || undefined,
  };
}

function mapTask(t: Row): Task {
  return {
    id: t.id as string,
    title: t.title as string,
    description: (t.description as string) || '',
    assignee: (t.assignee as string) || 'Admin',
    status: t.status as Task['status'],
    priority: t.priority as Task['priority'],
    dueDate: t.due_date ? Number(t.due_date) : null,
    timestamp: Number(t.timestamp),
  };
}

export async function fetchMembers(opts: UseMembersOptions = {}): Promise<{ data: Member[]; count: number }> {
  requireSession();

  const { search = '', status = 'All', plan = 'All', page = 0, pageSize = 50 } = opts;
  const where: string[] = [];
  const params: unknown[] = [];

  if (search) {
    params.push(`%${search}%`);
    where.push(`(name ilike $${params.length} or phone_number ilike $${params.length})`);
  }

  if (status === 'Active') {
    params.push(Date.now());
    where.push(`status = 'active' AND expiry_date > $${params.length}`);
  } else if (status === 'Expired') {
    params.push(Date.now());
    where.push(`status = 'active' AND expiry_date <= $${params.length}`);
  } else if (status === 'OnHold') {
    where.push(`status = 'on_hold'`);
  } else if (status === 'Cancelled') {
    where.push(`status = 'cancelled'`);
  } else if (status === 'Inactive') {
    where.push(`status = 'inactive'`);
  } else {
    // 'All' means the live roster: active + expired. Ended memberships
    // (on hold / cancelled / inactive) surface only under their own filter.
    where.push(`status = 'active'`);
  }

  if (plan !== 'All') {
    params.push(plan);
    where.push(`plan_name = $${params.length}`);
  }

  const whereSql = where.length ? `where ${where.join(' and ')}` : '';
  const countRows = await sql.query(
    `select count(*)::int as count from public.members ${whereSql}`,
    params
  ) as Row[];

  const dataRows = await sql.query(
    `select * from public.members ${whereSql} order by created_at desc limit $${params.length + 1} offset $${params.length + 2}`,
    [...params, pageSize, page * pageSize]
  ) as Row[];

  return { data: dataRows.map(mapMember), count: Number(countRows[0]?.count ?? 0) };
}

export async function fetchMembersList(): Promise<Pick<Member, 'id' | 'name' | 'phoneNumber'>[]> {
  requireSession();

  const rows = await sql`select id, name, phone_number from public.members order by name` as Row[];
  return rows.map((m) => ({
    id: m.id as string,
    name: m.name as string,
    phoneNumber: m.phone_number as string,
  }));
}

export async function fetchMemberById(memberId: string | null): Promise<Member | null> {
  requireSession();

  if (!memberId) return null;
  const rows = await sql`select * from public.members where id = ${memberId}::uuid limit 1` as Row[];
  return rows[0] ? mapMember(rows[0]) : null;
}

export async function fetchMemberRenewalDetails(memberId: string): Promise<MemberRenewalDetails | null> {
  requireSession();

  const rows = await sql`
    select plan_name, batch, duration_label, expiry_date
    from public.members
    where id = ${memberId}::uuid
    limit 1
  ` as Row[];

  if (!rows[0]) return null;
  return {
    plan_name: rows[0].plan_name as string,
    batch: rows[0].batch as string,
    duration_label: rows[0].duration_label as string,
    expiry_date: Number(rows[0].expiry_date),
  };
}

export async function fetchPayments(
  page = 0,
  pageSize = 50,
  search = ''
): Promise<{ data: Payment[]; count: number }> {
  requireSession();

  const params: unknown[] = [];
  const where = search ? 'where member_name ilike $1' : '';
  if (search) params.push(`%${search}%`);

  const countRows = await sql.query(
    `select count(*)::int as count from public.payments ${where}`,
    params
  ) as Row[];

  const rows = await sql.query(
    `select * from public.payments ${where} order by timestamp desc limit $${params.length + 1} offset $${params.length + 2}`,
    [...params, pageSize, page * pageSize]
  ) as Row[];

  return { data: rows.map(mapPayment), count: Number(countRows[0]?.count ?? 0) };
}

export async function fetchMemberPayments(memberId: string | null): Promise<Payment[]> {
  requireSession();

  if (!memberId) return [];
  const rows = await sql`
    select * from public.payments
    where member_id = ${memberId}::uuid
    order by timestamp desc
  ` as Row[];
  return rows.map(mapPayment);
}

export async function fetchExpenses(
  page = 0,
  pageSize = 50,
  search = ''
): Promise<{ data: Expense[]; count: number }> {
  requireSession();

  const params: unknown[] = [];
  const where = search ? 'where title ilike $1 or notes ilike $1' : '';
  if (search) params.push(`%${search}%`);

  const countRows = await sql.query(
    `select count(*)::int as count from public.expenses ${where}`,
    params
  ) as Row[];

  const rows = await sql.query(
    `select * from public.expenses ${where} order by date desc limit $${params.length + 1} offset $${params.length + 2}`,
    [...params, pageSize, page * pageSize]
  ) as Row[];

  return { data: rows.map(mapExpense), count: Number(countRows[0]?.count ?? 0) };
}

export async function fetchScheduledExpenses(): Promise<ScheduledExpense[]> {
  requireSession();

  const rows = await sql`
    select * from public.scheduled_expenses
    order by next_due_date asc
  ` as Row[];
  return rows.map((e) => ({
    id: e.id as string,
    title: e.title as string,
    amount: Number(e.amount),
    category: e.category as string,
    frequency: e.frequency as string,
    notes: e.notes as string,
    next_due_date: Number(e.next_due_date),
    active: e.active as boolean,
  }));
}

export async function fetchEnquiries(): Promise<Enquiry[]> {
  requireSession();

  const rows = await sql`select * from public.enquiries order by timestamp desc` as Row[];
  return rows.map(mapEnquiry);
}

export async function fetchTodayAttendance(): Promise<Attendance[]> {
  requireSession();

  const todayMidnight = new Date();
  todayMidnight.setHours(0, 0, 0, 0);
  const todayMs = todayMidnight.getTime();

  const rows = await sql`
    select a.id, a.member_id, a.date, m.name as member_name
    from public.attendance a
    join public.members m on m.id = a.member_id
    where a.date = ${todayMs}
  ` as Row[];

  return rows.map((a) => ({
    id: a.id as string,
    memberId: a.member_id as string,
    memberName: (a.member_name as string) || '',
    date: Number(a.date),
    isPresent: true,
  }));
}

export async function fetchMemberAttendance(memberId: string | null): Promise<Attendance[]> {
  requireSession();

  if (!memberId) return [];
  const rows = await sql`
    select a.id, a.member_id, a.date, m.name as member_name
    from public.attendance a
    left join public.members m on m.id = a.member_id
    where a.member_id = ${memberId}::uuid
    order by a.date desc
  ` as Row[];

  return rows.map((a) => ({
    id: a.id as string,
    memberId: a.member_id as string,
    memberName: (a.member_name as string) || '',
    date: Number(a.date),
    isPresent: true,
  }));
}

export async function fetchAttendanceTrend(daysBack: number): Promise<{ date: number; count: number }[]> {
  requireSession();

  const since = Date.now() - daysBack * 24 * 60 * 60 * 1000;
  const rows = await sql`
    select date, count(*)::int as count
    from public.attendance
    where date >= ${since}
    group by date
    order by date asc
  ` as Row[];

  return rows.map((row) => ({ date: Number(row.date), count: Number(row.count) }));
}

export async function fetchDashboardStats(): Promise<DashboardStats> {
  requireSession();

  const rows = await sql`select public.get_dashboard_stats() as stats` as Row[];
  const stats = (rows[0]?.stats || {}) as Row;
  return {
    active_members: Number(stats.active_members || 0),
    present_today: Number(stats.present_today || 0),
    expiring_soon: Number(stats.expiring_soon || 0),
    expired_members: Number(stats.expired_members || 0),
    monthly_collection: Number(stats.monthly_collection || 0),
  };
}

export async function fetchFinanceStats(): Promise<FinanceStats> {
  requireSession();

  const rows = await sql`select public.get_finance_stats() as stats` as Row[];
  const stats = (rows[0]?.stats || {}) as Row;
  return {
    this_month_income: Number(stats.this_month_income || 0),
    last_month_income: Number(stats.last_month_income || 0),
    all_time_income: Number(stats.all_time_income || 0),
    this_month_expenses: Number(stats.this_month_expenses || 0),
    last_month_expenses: Number(stats.last_month_expenses || 0),
    all_time_expenses: Number(stats.all_time_expenses || 0),
  };
}

export async function fetchFinanceSummary(daysBack: number): Promise<FinanceSummaryMonth[]> {
  requireSession();

  const rows = await sql`select public.get_finance_summary(${daysBack}) as summary` as Row[];
  const summary = Array.isArray(rows[0]?.summary) ? rows[0].summary as Row[] : [];
  return summary.map((month) => ({
    month_label: month.month_label as string,
    month_start: Number(month.month_start),
    income: Number(month.income || 0),
    expenses: Number(month.expenses || 0),
  }));
}

export async function fetchMemberRetention(): Promise<{ active: number; expired: number }> {
  requireSession();

  const rows = await sql`select public.get_member_retention() as retention` as Row[];
  const retention = (rows[0]?.retention || {}) as Row;
  return {
    active: Number(retention.active || 0),
    expired: Number(retention.expired || 0),
  };
}

export async function fetchPlanDistribution(): Promise<{ name: string; value: number }[]> {
  requireSession();

  const rows = await sql`
    select plan_name as name, count(*)::int as value
    from public.members
    where btrim(plan_name) <> ''
    group by plan_name
    order by value desc
  ` as Row[];
  return rows.map((row) => ({ name: row.name as string, value: Number(row.value) }));
}

export async function fetchGymSettings(): Promise<GymSettings | null> {
  const rows = await sql`select * from public.gym_settings where id = 1 limit 1` as Row[];
  const settings = rows[0];
  if (!settings) return null;

  return {
    gymName: settings.gym_name as string,
    upiId: (settings.upi_id as string) || '',
    qrCodeUrl: (settings.qr_code_url as string) || '',
    availablePlans: (settings.available_plans as string[]) || [],
    batches: (settings.batches as string[]) || [],
    durations: (settings.durations as string[]) || [],
    enableSmartEntry: (settings.enable_smart_entry as boolean) ?? false,
  };
}

export async function fetchStaffProfiles(): Promise<StaffProfile[]> {
  const rows = await sql`
    select id, name, avatar_color
    from public.staff_profiles
    order by id
  ` as Row[];
  return rows.map((row) => ({
    id: Number(row.id),
    name: row.name as string,
    avatar_color: row.avatar_color as string,
  }));
}

export async function fetchTasks(): Promise<Task[]> {
  requireSession();

  const rows = await sql`select * from public.tasks order by timestamp desc` as Row[];
  return rows.map(mapTask);
}

/**
 * Activity inside a window. `untilMs` is the inclusive end of the range
 * (pass an end-of-day timestamp); omit it to count everything up to now.
 */
export async function fetchMemberActivityStats(sinceMs: number, untilMs?: number): Promise<{ newMembers: number; paymentCount: number; paymentTotal: number }> {
  requireSession();

  const endMs = untilMs ?? Date.now();

  const memberRows = await sql`
    select count(*)::int as count
    from public.members
    where created_at >= to_timestamp(${sinceMs}::bigint / 1000.0)
      and created_at <= to_timestamp(${endMs}::bigint / 1000.0)
  ` as Row[];

  const paymentRows = await sql`
    select count(*)::int as count, coalesce(sum(amount), 0)::int as total
    from public.payments
    where timestamp >= ${sinceMs} and timestamp <= ${endMs}
  ` as Row[];

  return {
    newMembers: Number(memberRows[0]?.count ?? 0),
    paymentCount: Number(paymentRows[0]?.count ?? 0),
    paymentTotal: Number(paymentRows[0]?.total ?? 0),
  };
}

export async function fetchMemberReminders(memberId?: string): Promise<{ id: string; memberId: string; reminderDate: number; reminderNote: string; isCompleted: boolean }[]> {
  requireSession();

  const rows = memberId
    ? await sql`
        select * from public.member_reminders
        where member_id = ${memberId}::uuid
        order by reminder_date asc
      ` as Row[]
    : await sql`
        select * from public.member_reminders
        where is_completed = false
        order by reminder_date asc
      ` as Row[];

  return rows.map((r) => ({
    id: r.id as string,
    memberId: r.member_id as string,
    reminderDate: Number(r.reminder_date),
    reminderNote: (r.reminder_note as string) || '',
    isCompleted: (r.is_completed as boolean) ?? false,
  }));
}

export async function fetchPendingRemindersCount(): Promise<number> {
  requireSession();

  const rows = await sql`
    select count(*)::int as count
    from public.member_reminders
    where is_completed = false
      and reminder_date <= ${Date.now()}
  ` as Row[];

  return Number(rows[0]?.count ?? 0);
}
