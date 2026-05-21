import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60 * 1000,       // Data is fresh for 1 minute
      gcTime: 5 * 60 * 1000,      // Keep unused data in cache for 5 minutes
      retry: 2,
      refetchOnWindowFocus: true, // Refresh when user returns to tab
    },
  },
});
