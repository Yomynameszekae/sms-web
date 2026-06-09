import { apiClient } from '../client';
import type {
  ApiResponse,
  Term,
  CreateTermPayload,
  UpdateTermPayload,
} from '@/types/api';

export const termsApi = {
  list: (academicYearId?: string) =>
    apiClient.get<ApiResponse<Term[]>>('/terms', {
      params: academicYearId ? { academicYearId } : undefined,
    }),

  get: (id: string) =>
    apiClient.get<ApiResponse<Term>>(`/terms/${id}`),

  create: (payload: CreateTermPayload) =>
    apiClient.post<ApiResponse<Term>>('/terms', payload),

  update: (id: string, payload: UpdateTermPayload) =>
    apiClient.patch<ApiResponse<Term>>(`/terms/${id}`, payload),

  activate: (id: string) =>
    apiClient.post<ApiResponse<Term>>(`/terms/${id}/activate`),

  close: (id: string) =>
    apiClient.post<ApiResponse<Term>>(`/terms/${id}/close`),
};
