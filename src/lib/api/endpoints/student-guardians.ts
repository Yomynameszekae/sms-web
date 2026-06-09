import { apiClient } from '../client';
import type {
  ApiResponse,
  StudentGuardian,
  CreateStudentGuardianPayload,
  UpdateStudentGuardianPayload,
} from '@/types/api';

export const studentGuardiansApi = {
  link: (payload: CreateStudentGuardianPayload) =>
    apiClient.post<ApiResponse<StudentGuardian>>('/student-guardians', payload),

  update: (id: string, payload: UpdateStudentGuardianPayload) =>
    apiClient.patch<ApiResponse<StudentGuardian>>(`/student-guardians/${id}`, payload),

  unlink: (id: string) =>
    apiClient.delete<ApiResponse<null>>(`/student-guardians/${id}`),

  setPrimary: (id: string) =>
    apiClient.post<ApiResponse<StudentGuardian>>(`/student-guardians/${id}/set-primary`),
};
