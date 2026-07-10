import { useQuery } from '@tanstack/react-query';
import { fetchDashboardStats, DashboardStats } from '@/lib/queries';

export type { DashboardStats };

export function useDashboardStats() {
  return useQuery({
    queryKey: ['dashboard_stats'],
    queryFn: () => fetchDashboardStats(),
    staleTime: 30 * 1000,
    refetchInterval: 60 * 1000,
  });
}
