import { apiClient } from '../client';
import type {
  ApiResponse,
  FinanceLabel,
  LabelCategory,
  CreateLabelPayload,
  UpdateLabelPayload,
} from '@/types/api';

export const labelsApi = {
  list: (params?: { category?: LabelCategory; includeArchived?: boolean }) =>
    apiClient.get<ApiResponse<FinanceLabel[]>>('/labels', {
      params: {
        ...(params?.category ? { category: params.category } : {}),
        ...(params?.includeArchived ? { includeArchived: true } : {}),
      },
    }),

  get: (id: string) => apiClient.get<ApiResponse<FinanceLabel>>(`/labels/${id}`),

  create: (payload: CreateLabelPayload) =>
    apiClient.post<ApiResponse<FinanceLabel>>('/labels', payload),

  update: (id: string, payload: UpdateLabelPayload) =>
    apiClient.patch<ApiResponse<FinanceLabel>>(`/labels/${id}`, payload),

  archive: (id: string) =>
    apiClient.post<ApiResponse<FinanceLabel>>(`/labels/${id}/archive`),

  restore: (id: string) =>
    apiClient.post<ApiResponse<FinanceLabel>>(`/labels/${id}/restore`),
};
