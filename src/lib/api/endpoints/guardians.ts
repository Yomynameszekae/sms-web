import { apiClient } from '../client';
import type {
  ApiResponse,
  PaginatedData,
  Guardian,
  StudentGuardian,
  CreateGuardianPayload,
  UpdateGuardianPayload,
} from '@/types/api';

export interface GuardiansQuery {
  search?: string;
  page?: number;
  limit?: number;
  /** Archived guardians are hidden by default; true includes them. */
  includeArchived?: boolean;
}

export const guardiansApi = {
  list: (query: GuardiansQuery = {}) =>
    apiClient.get<ApiResponse<PaginatedData<Guardian>>>('/guardians', {
      params: { limit: 100, ...query },
    }),

  get: (id: string) =>
    apiClient.get<ApiResponse<Guardian>>(`/guardians/${id}`),

  create: (payload: CreateGuardianPayload) =>
    apiClient.post<ApiResponse<Guardian>>('/guardians', payload),

  update: (id: string, payload: UpdateGuardianPayload) =>
    apiClient.patch<ApiResponse<Guardian>>(`/guardians/${id}`, payload),

  archive: (id: string) =>
    apiClient.post<ApiResponse<Guardian>>(`/guardians/${id}/archive`),

  restore: (id: string) =>
    apiClient.post<ApiResponse<Guardian>>(`/guardians/${id}/restore`),

  getStudents: (id: string) =>
    apiClient.get<ApiResponse<StudentGuardian[]>>(`/guardians/${id}/students`),
};
