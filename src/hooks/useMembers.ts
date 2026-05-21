import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabaseClient';
import { Member } from '@/types';

interface UseMembersOptions {
  search?: string;
  status?: 'All' | 'Active' | 'Expired';
  plan?: string;
  page?: number;
  pageSize?: number;
}

async function fetchMembers(opts: UseMembersOptions): Promise<{ data: Member[]; count: number }> {
  const { search = '', status = 'All', plan = 'All', page = 0, pageSize = 50 } = opts;
  const now = Date.now();

  let query = supabase
    .from('members')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(page * pageSize, (page + 1) * pageSize - 1);

  if (search) {
    query = query.or(`name.ilike.%${search}%,phone_number.ilike.%${search}%`);
  }

  if (status === 'Active') {
    query = query.gt('expiry_date', now);
  } else if (status === 'Expired') {
    query = query.lte('expiry_date', now);
  }

  if (plan !== 'All') {
    query = query.eq('plan_name', plan);
  }

  const { data, error, count } = await query;
  if (error) throw error;

  const mapped: Member[] = (data || []).map((m: Record<string, unknown>) => ({
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
  }));

  return { data: mapped, count: count ?? 0 };
}

export function useMembers(opts: UseMembersOptions = {}) {
  return useQuery({
    queryKey: ['members', opts],
    queryFn: () => fetchMembers(opts),
    placeholderData: (prev) => prev, // Keep showing old data while refetching
  });
}

// Lightweight hook for command palette — just names + phones
async function fetchMembersList(): Promise<Pick<Member, 'id' | 'name' | 'phoneNumber'>[]> {
  const { data, error } = await supabase
    .from('members')
    .select('id, name, phone_number')
    .order('name');
  if (error) throw error;
  return (data || []).map((m: Record<string, unknown>) => ({
    id: m.id as string,
    name: m.name as string,
    phoneNumber: m.phone_number as string,
  }));
}

export function useMembersList() {
  return useQuery({
    queryKey: ['members_list'],
    queryFn: fetchMembersList,
    staleTime: 5 * 60 * 1000, // 5 minutes — rarely changes mid-session
  });
}
