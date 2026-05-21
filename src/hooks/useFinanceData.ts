import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabaseClient';
import { Payment, Expense } from '@/types';

// Monthly summary from RPC for Insights charts
export interface FinanceSummaryMonth {
  month_label: string;
  month_start: number;
  income: number;
  expenses: number;
}

async function fetchFinanceSummary(daysBack: number): Promise<FinanceSummaryMonth[]> {
  const { data, error } = await supabase.rpc('get_finance_summary', { days_back: daysBack });
  if (error) throw error;
  return (data as FinanceSummaryMonth[]) || [];
}

export function useFinanceSummary(daysBack: number) {
  return useQuery({
    queryKey: ['finance_summary', daysBack],
    queryFn: () => fetchFinanceSummary(daysBack),
  });
}

// Paginated payments list
async function fetchPayments(page: number, pageSize: number, search: string): Promise<{ data: Payment[]; count: number }> {
  let query = supabase
    .from('payments')
    .select('*', { count: 'exact' })
    .order('timestamp', { ascending: false })
    .range(page * pageSize, (page + 1) * pageSize - 1);

  if (search) {
    query = query.ilike('member_name', `%${search}%`);
  }

  const { data, error, count } = await query;
  if (error) throw error;

  const mapped: Payment[] = (data || []).map((p: Record<string, unknown>) => ({
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
  }));

  return { data: mapped, count: count ?? 0 };
}

export function usePayments(page = 0, pageSize = 50, search = '') {
  return useQuery({
    queryKey: ['payments', page, pageSize, search],
    queryFn: () => fetchPayments(page, pageSize, search),
    placeholderData: (prev) => prev,
  });
}

// Finance stats (totals computed server-side via RPC for dashboard/finances page)
export interface FinanceStats {
  this_month_income: number;
  last_month_income: number;
  all_time_income: number;
  this_month_expenses: number;
  last_month_expenses: number;
  all_time_expenses: number;
}

async function fetchFinanceStats(): Promise<FinanceStats> {
  const { data, error } = await supabase.rpc('get_finance_stats');
  if (error) throw error;
  return data as FinanceStats;
}

export function useFinanceStats() {
  return useQuery({
    queryKey: ['finance_stats'],
    queryFn: fetchFinanceStats,
  });
}

// Paginated expenses
async function fetchExpenses(page: number, pageSize: number, search: string): Promise<{ data: Expense[]; count: number }> {
  let query = supabase
    .from('expenses')
    .select('*', { count: 'exact' })
    .order('date', { ascending: false })
    .range(page * pageSize, (page + 1) * pageSize - 1);

  if (search) {
    query = query.or(`title.ilike.%${search}%,notes.ilike.%${search}%`);
  }

  const { data, error, count } = await query;
  if (error) throw error;

  const mapped: Expense[] = (data || []).map((e: Record<string, unknown>) => ({
    id: e.id as string,
    title: e.title as string,
    amount: Number(e.amount),
    date: Number(e.date),
    notes: (e.notes as string) || '',
    category: (e.category as string) || 'General',
  }));

  return { data: mapped, count: count ?? 0 };
}

export function useExpenses(page = 0, pageSize = 50, search = '') {
  return useQuery({
    queryKey: ['expenses', page, pageSize, search],
    queryFn: () => fetchExpenses(page, pageSize, search),
    placeholderData: (prev) => prev,
  });
}
