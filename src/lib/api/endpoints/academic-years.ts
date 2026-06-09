import { apiClient } from '../client';
import type {
  ApiResponse,
  AcademicYear,
  CreateAcademicYearPayload,
  UpdateAcademicYearPayload,
} from '@/types/api';

export const academicYearsApi = {
  list: () =>
    apiClient.get<ApiResponse<AcademicYear[]>>('/academic-years'),

  get: (id: string) =>
    apiClient.get<ApiResponse<AcademicYear>>(`/academic-years/${id}`),

  create: (payload: CreateAcademicYearPayload) =>
    apiClient.post<ApiResponse<AcademicYear>>('/academic-years', payload),

  update: (id: string, payload: UpdateAcademicYearPayload) =>
    apiClient.patch<ApiResponse<AcademicYear>>(`/academic-years/${id}`, payload),

  activate: (id: string) =>
    apiClient.post<ApiResponse<AcademicYear>>(`/academic-years/${id}/activate`),

  close: (id: string) =>
    apiClient.post<ApiResponse<AcademicYear>>(`/academic-years/${id}/close`),
};
