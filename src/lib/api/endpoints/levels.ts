import { apiClient } from '../client';
import type {
  ApiResponse,
  Level,
  CreateLevelPayload,
  UpdateLevelPayload,
} from '@/types/api';

export const levelsApi = {
  list: (includeArchived?: boolean) =>
    apiClient.get<ApiResponse<Level[]>>('/levels', {
      params: includeArchived ? { includeArchived: true } : {},
    }),

  get: (id: string) =>
    apiClient.get<ApiResponse<Level>>(`/levels/${id}`),

  create: (payload: CreateLevelPayload) =>
    apiClient.post<ApiResponse<Level>>('/levels', payload),

  update: (id: string, payload: UpdateLevelPayload) =>
    apiClient.patch<ApiResponse<Level>>(`/levels/${id}`, payload),

  archive: (id: string) =>
    apiClient.post<ApiResponse<Level>>(`/levels/${id}/archive`),

  restore: (id: string) =>
    apiClient.post<ApiResponse<Level>>(`/levels/${id}/restore`),
};
