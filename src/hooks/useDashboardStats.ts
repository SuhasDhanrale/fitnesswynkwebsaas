import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabaseClient';

export interface DashboardStats {
  active_members: number;
  present_today: number;
  expiring_soon: number;
  monthly_collection: number;
}

async function fetchDashboardStats(): Promise<DashboardStats> {
  const { data, error } = await supabase.rpc('get_dashboard_stats');
  if (error) throw error;
  return data as DashboardStats;
}

export function useDashboardStats() {
  return useQuery({
    queryKey: ['dashboard_stats'],
    queryFn: fetchDashboardStats,
    staleTime: 30 * 1000, // Refresh every 30 seconds for live feel
    refetchInterval: 60 * 1000,
  });
}
