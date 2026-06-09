import { apiClient } from '../client';
import type {
  ApiResponse,
  PaginatedData,
  Admission,
  AdmissionStatus,
  CreateAdmissionPayload,
  UpdateAdmissionPayload,
  EnrollAdmissionPayload,
  Enrollment,
} from '@/types/api';

export interface AdmissionsQuery {
  status?: AdmissionStatus;
  studentId?: string;
  page?: number;
  limit?: number;
}

export const admissionsApi = {
  list: (query: AdmissionsQuery = {}) =>
    apiClient.get<ApiResponse<PaginatedData<Admission>>>('/admissions', {
      params: { limit: 20, ...query },
    }),

  get: (id: string) =>
    apiClient.get<ApiResponse<Admission>>(`/admissions/${id}`),

  create: (payload: CreateAdmissionPayload) =>
    apiClient.post<ApiResponse<Admission>>('/admissions', payload),

  update: (id: string, payload: UpdateAdmissionPayload) =>
    apiClient.patch<ApiResponse<Admission>>(`/admissions/${id}`, payload),

  offer: (id: string) =>
    apiClient.post<ApiResponse<Admission>>(`/admissions/${id}/offer`),

  enroll: (id: string, payload: EnrollAdmissionPayload) =>
    apiClient.post<ApiResponse<Enrollment>>(`/admissions/${id}/enroll`, payload),
};
