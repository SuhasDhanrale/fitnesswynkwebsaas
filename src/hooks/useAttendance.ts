import { useQuery } from '@tanstack/react-query';
import { fetchAttendanceTrend, fetchTodayAttendance } from '@/lib/queries';

export function useTodayAttendance() {
  return useQuery({
    queryKey: ['attendance_today'],
    queryFn: () => fetchTodayAttendance(),
    staleTime: 10 * 1000,
    refetchInterval: 30 * 1000,
  });
}

export function useAttendanceTrend(daysBack: number) {
  return useQuery({
    queryKey: ['attendance_trend', daysBack],
    queryFn: () => fetchAttendanceTrend(daysBack),
  });
}
