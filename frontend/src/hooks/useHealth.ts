import { useQuery } from '@tanstack/react-query';
import { getHealth } from '@/services/health.api';

export function useHealth() {
  const query = useQuery({
    queryKey: ['health'],
    queryFn: getHealth,
    staleTime: 30_000,
    retry: 1,
    refetchInterval: 30_000,
    refetchOnWindowFocus: false,
  });

  return {
    ...query,
    isOnline: Boolean(query.data?.model_loaded),
  };
}
