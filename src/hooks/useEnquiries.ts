import { useQuery } from '@tanstack/react-query';
import { fetchEnquiries } from '@/lib/queries';

export function useEnquiries() {
  return useQuery({
    queryKey: ['enquiries'],
    queryFn: () => fetchEnquiries(),
  });
}
