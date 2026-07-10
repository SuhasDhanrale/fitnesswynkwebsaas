import { useQuery } from '@tanstack/react-query';
import {
  fetchExpenses,
  fetchFinanceStats,
  fetchFinanceSummary,
  fetchPayments,
  fetchScheduledExpenses,
  FinanceStats,
  FinanceSummaryMonth,
} from '@/lib/queries';

export type { FinanceStats, FinanceSummaryMonth };

export function useFinanceSummary(daysBack: number) {
  return useQuery({
    queryKey: ['finance_summary', daysBack],
    queryFn: () => fetchFinanceSummary(daysBack),
  });
}

export function usePayments(page = 0, pageSize = 50, search = '') {
  return useQuery({
    queryKey: ['payments', page, pageSize, search],
    queryFn: () => fetchPayments(page, pageSize, search),
    placeholderData: (prev) => prev,
  });
}

export function useFinanceStats() {
  return useQuery({
    queryKey: ['finance_stats'],
    queryFn: () => fetchFinanceStats(),
  });
}

export function useExpenses(page = 0, pageSize = 50, search = '') {
  return useQuery({
    queryKey: ['expenses', page, pageSize, search],
    queryFn: () => fetchExpenses(page, pageSize, search),
    placeholderData: (prev) => prev,
  });
}

export function useScheduledExpenses() {
  return useQuery({
    queryKey: ['scheduled_expenses'],
    queryFn: () => fetchScheduledExpenses(),
  });
}
