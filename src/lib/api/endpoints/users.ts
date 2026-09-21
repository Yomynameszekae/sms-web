import { apiClient } from '../client';
import type { ApiResponse, PaginatedData, User } from '@/types/api';

export const usersApi = {
  /** Each user arrives with their granted roles embedded — no per-row fetch. */
  list: (params?: { page?: number; limit?: number; isActive?: boolean }) =>
    apiClient.get<ApiResponse<PaginatedData<User>>>('/users', { params }),

  /** RBAC role assignment. Separate from Staff.roleCategory, which is HR data. */
  assignRole: (userId: string, roleId: string) =>
    apiClient.post<ApiResponse<unknown>>(`/users/${userId}/roles`, { roleId }),

  removeRole: (userId: string, roleId: string) =>
    apiClient.delete<ApiResponse<unknown>>(`/users/${userId}/roles/${roleId}`),
};
