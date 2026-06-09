import { apiClient } from '../client';
import type {
  ApiResponse,
  Classroom,
  CreateClassroomPayload,
  UpdateClassroomPayload,
} from '@/types/api';

export const classroomsApi = {
  list: (params?: { levelId?: string; academicYearId?: string }) =>
    apiClient.get<ApiResponse<Classroom[]>>('/classrooms', { params }),

  get: (id: string) =>
    apiClient.get<ApiResponse<Classroom>>(`/classrooms/${id}`),

  create: (payload: CreateClassroomPayload) =>
    apiClient.post<ApiResponse<Classroom>>('/classrooms', payload),

  update: (id: string, payload: UpdateClassroomPayload) =>
    apiClient.patch<ApiResponse<Classroom>>(`/classrooms/${id}`, payload),

  assignTeacher: (id: string, staffId: string) =>
    apiClient.post<ApiResponse<Classroom>>(`/classrooms/${id}/assign-class-teacher`, { staffId }),

  archive: (id: string) =>
    apiClient.post<ApiResponse<Classroom>>(`/classrooms/${id}/archive`),
};
