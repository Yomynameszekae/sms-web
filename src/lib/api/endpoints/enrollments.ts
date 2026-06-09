import { apiClient } from '../client';
import type {
  ApiResponse,
  PaginatedData,
  Enrollment,
  EnrollmentStatus,
  CreateEnrollmentPayload,
  WithdrawEnrollmentPayload,
} from '@/types/api';

export interface EnrollmentsQuery {
  status?: EnrollmentStatus;
  studentId?: string;
  classroomId?: string;
  academicYearId?: string;
  page?: number;
  limit?: number;
}

export const enrollmentsApi = {
  list: (query: EnrollmentsQuery = {}) =>
    apiClient.get<ApiResponse<PaginatedData<Enrollment>>>('/enrollments', {
      params: { limit: 20, ...query },
    }),

  get: (id: string) =>
    apiClient.get<ApiResponse<Enrollment>>(`/enrollments/${id}`),

  create: (payload: CreateEnrollmentPayload) =>
    apiClient.post<ApiResponse<Enrollment>>('/enrollments', payload),

  withdraw: (id: string, payload: WithdrawEnrollmentPayload) =>
    apiClient.post<ApiResponse<Enrollment>>(`/enrollments/${id}/withdraw`, payload),
};
