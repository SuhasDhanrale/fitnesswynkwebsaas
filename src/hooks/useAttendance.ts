import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabaseClient';
import { Attendance } from '@/types';

// Fetch today's attendance from Supabase (real persistence!)
async function fetchTodayAttendance(): Promise<Attendance[]> {
  const todayMidnight = new Date();
  todayMidnight.setHours(0, 0, 0, 0);
  const todayMs = todayMidnight.getTime();

  const { data, error } = await supabase
    .from('attendance')
    .select('*, members(name)')
    .eq('date', todayMs);

  if (error) throw error;

  return (data || []).map((a: Record<string, unknown> & { members?: { name?: string } }) => ({
    id: a.id as string,
    memberId: a.member_id as string,
    memberName: (a.members?.name) || '',
    date: Number(a.date),
    isPresent: true,
  }));
}

export function useTodayAttendance() {
  return useQuery({
    queryKey: ['attendance_today'],
    queryFn: fetchTodayAttendance,
    staleTime: 10 * 1000, // Refresh every 10s — attendance changes frequently
    refetchInterval: 30 * 1000,
  });
}

// Fetch attendance trend for Insights — grouped daily
async function fetchAttendanceTrend(daysBack: number): Promise<{ date: number; count: number }[]> {
  const since = Date.now() - daysBack * 24 * 60 * 60 * 1000;

  const { data, error } = await supabase
    .from('attendance')
    .select('date')
    .gte('date', since)
    .order('date', { ascending: true });

  if (error) throw error;

  // Group by date
  const grouped: Record<number, number> = {};
  (data || []).forEach((a: Record<string, unknown>) => {
    const d = Number(a.date);
    grouped[d] = (grouped[d] || 0) + 1;
  });

  return Object.entries(grouped).map(([date, count]) => ({
    date: Number(date),
    count,
  }));
}

export function useAttendanceTrend(daysBack: number) {
  return useQuery({
    queryKey: ['attendance_trend', daysBack],
    queryFn: () => fetchAttendanceTrend(daysBack),
  });
}
