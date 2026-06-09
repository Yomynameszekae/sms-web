import { apiClient } from '../client';
import type {
  ApiResponse,
  Level,
  CreateLevelPayload,
  UpdateLevelPayload,
} from '@/types/api';

export const levelsApi = {
  list: () =>
    apiClient.get<ApiResponse<Level[]>>('/levels'),

  get: (id: string) =>
    apiClient.get<ApiResponse<Level>>(`/levels/${id}`),

  create: (payload: CreateLevelPayload) =>
    apiClient.post<ApiResponse<Level>>('/levels', payload),

  update: (id: string, payload: UpdateLevelPayload) =>
    apiClient.patch<ApiResponse<Level>>(`/levels/${id}`, payload),

  archive: (id: string) =>
    apiClient.post<ApiResponse<Level>>(`/levels/${id}/archive`),
};
