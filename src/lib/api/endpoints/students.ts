import { apiClient } from '../client';
import type {
  ApiResponse,
  PaginatedData,
  Student,
  StudentGuardian,
  CreateStudentPayload,
  UpdateStudentPayload,
  StudentStatus,
} from '@/types/api';

export interface StudentsQuery {
  status?: StudentStatus;
  search?: string;
  page?: number;
  limit?: number;
}

export const studentsApi = {
  list: (query: StudentsQuery = {}) =>
    apiClient.get<ApiResponse<PaginatedData<Student>>>('/students', {
      params: { limit: 50, ...query },
    }),

  get: (id: string) =>
    apiClient.get<ApiResponse<Student>>(`/students/${id}`),

  create: (payload: CreateStudentPayload) =>
    apiClient.post<ApiResponse<Student>>('/students', payload),

  update: (id: string, payload: UpdateStudentPayload) =>
    apiClient.patch<ApiResponse<Student>>(`/students/${id}`, payload),

  archive: (id: string) =>
    apiClient.post<ApiResponse<Student>>(`/students/${id}/archive`),

  getGuardians: (id: string) =>
    apiClient.get<ApiResponse<StudentGuardian[]>>(`/students/${id}/guardians`),

  getEnrollments: (id: string) =>
    apiClient.get<ApiResponse<unknown[]>>(`/students/${id}/enrollments`),
};
