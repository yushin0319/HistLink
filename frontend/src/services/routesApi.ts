import { apiClient } from './api';
import type { RoutesResponse, RouteStepsResponse } from '../types/api';

/**
 * ルート一覧を取得
 */
export async function fetchRoutes(): Promise<RoutesResponse> {
  const response = await apiClient.get<RoutesResponse>('/routes');
  return response.data;
}

/**
 * ルートのステップ一覧を取得
 */
export async function fetchRouteSteps(routeId: number): Promise<RouteStepsResponse> {
  const response = await apiClient.get<RouteStepsResponse>(`/routes/${routeId}/steps`);
  return response.data;
}
