import { apiClient } from '../client';
import type {
  ApiResponse,
  PaginatedData,
  Staff,
  CreateStaffPayload,
  UpdateStaffPayload,
  StaffStatus,
  StaffRoleCategory,
} from '@/types/api';

export interface StaffQuery {
  status?: StaffStatus;
  roleCategory?: StaffRoleCategory;
  page?: number;
  limit?: number;
}

export const staffApi = {
  list: (query: StaffQuery = {}) =>
    apiClient.get<ApiResponse<PaginatedData<Staff>>>('/staff', { params: { limit: 100, ...query } }),

  get: (id: string) =>
    apiClient.get<ApiResponse<Staff>>(`/staff/${id}`),

  create: (payload: CreateStaffPayload) =>
    apiClient.post<ApiResponse<Staff>>('/staff', payload),

  update: (id: string, payload: UpdateStaffPayload) =>
    apiClient.patch<ApiResponse<Staff>>(`/staff/${id}`, payload),

  archive: (id: string) =>
    apiClient.post<ApiResponse<Staff>>(`/staff/${id}/archive`),
};
