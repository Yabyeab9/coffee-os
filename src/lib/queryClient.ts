import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 0, // Always consider stale so route switches and tab activations immediately refresh
      gcTime: 5 * 60 * 1000,
      retry: 1,
      refetchOnWindowFocus: true,
      refetchOnMount: true,
      refetchOnReconnect: true,
    },
    mutations: {
      retry: 1,
    },
  },
});

/**
 * Centrally invalidate queries without page reloads
 */
export function invalidateAppQueries(queryKeys?: (string | string[])[]) {
  if (!queryKeys || queryKeys.length === 0) {
    queryClient.invalidateQueries();
    return;
  }
  queryKeys.forEach(k => {
    const keyArray = Array.isArray(k) ? k : [k];
    queryClient.invalidateQueries({ queryKey: keyArray });
  });
}
