import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,   // Data is fresh for 5 minutes (reduced skeletons)
      gcTime: 10 * 60 * 1000,     // Keep unused data in cache for 10 minutes
      retry: 1,                   // Don't retry multiple times to avoid 7s skeleton delays on errors
      refetchOnWindowFocus: true, // Refresh when user returns to tab
    },
  },
});
