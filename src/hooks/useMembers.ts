import { useQuery } from '@tanstack/react-query';
import { fetchMembers, fetchMembersList } from '@/lib/queries';

interface UseMembersOptions {
  search?: string;
  status?: 'All' | 'Active' | 'OnHold' | 'Expired' | 'Cancelled' | 'Inactive';
  plan?: string;
  page?: number;
  pageSize?: number;
}

export function useMembers(opts: UseMembersOptions = {}) {
  return useQuery({
    queryKey: ['members', opts],
    queryFn: () => fetchMembers(opts),
    placeholderData: (prev) => prev,
  });
}

export function useMembersList() {
  return useQuery({
    queryKey: ['members_list'],
    queryFn: () => fetchMembersList(),
    staleTime: 5 * 60 * 1000,
  });
}
