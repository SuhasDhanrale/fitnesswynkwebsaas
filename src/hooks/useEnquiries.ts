import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabaseClient';
import { Enquiry } from '@/types';

async function fetchEnquiries(): Promise<Enquiry[]> {
  const { data, error } = await supabase
    .from('enquiries')
    .select('*')
    .order('timestamp', { ascending: false });

  if (error) throw error;

  return (data || []).map((e: Record<string, unknown>): Enquiry => ({
    id: e.id as string,
    name: e.name as string,
    phoneNumber: e.phone_number as string,
    planOfInterest: (e.plan_of_interest as string) || '',
    notes: (e.notes as string) || '',
    isConverted: (e.is_converted as boolean) ?? false,
    timestamp: Number(e.timestamp),
  }));
}

export function useEnquiries() {
  return useQuery({
    queryKey: ['enquiries'],
    queryFn: fetchEnquiries,
  });
}
