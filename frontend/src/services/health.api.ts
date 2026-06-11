import { ENDPOINTS } from './http/endpoints';
import { httpClient } from './http/client';
import type { HealthResponse } from '@/types/health';

interface ApiResponse<T> {
  success: boolean;
  data: T;
  error: string | null;
}

export async function getHealth(): Promise<HealthResponse> {
  const response = await httpClient.get<HealthResponse | ApiResponse<HealthResponse>>(ENDPOINTS.HEALTH);

  if ('success' in response.data && 'data' in response.data) {
    return response.data.data;
  }

  return response.data;
}
