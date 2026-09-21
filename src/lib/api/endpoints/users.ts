import { apiClient } from '../client';
import type { ApiResponse, PaginatedData, User } from '@/types/api';

export interface CreateUserPayload {
  email?: string;
  phone?: string;
  /** Temporary — the backend sets mustChangePassword, so it is replaced at first sign-in. */
  password: string;
  linkedEntityType: 'staff' | 'guardian';
  linkedEntityId: string;
}

export const usersApi = {
  /**
   * Creates a login PRE-LINKED to an existing staff or guardian record. There
   * is no way to create a floating account: linkedEntityType and
   * linkedEntityId are both required by the backend.
   */
  create: (payload: CreateUserPayload) =>
    apiClient.post<ApiResponse<User>>('/users', payload),

  /** Each user arrives with their granted roles embedded — no per-row fetch. */
  list: (params?: {
    page?: number;
    /** Capped at 100 by PaginationDto — a larger value is rejected with a 400. */
    limit?: number;
    isActive?: boolean;
    linkedEntityType?: 'staff' | 'guardian';
  }) =>
    apiClient.get<ApiResponse<PaginatedData<User>>>('/users', { params }),

  /** RBAC role assignment. Separate from Staff.roleCategory, which is HR data. */
  assignRole: (userId: string, roleId: string) =>
    apiClient.post<ApiResponse<unknown>>(`/users/${userId}/roles`, { roleId }),

  removeRole: (userId: string, roleId: string) =>
    apiClient.delete<ApiResponse<unknown>>(`/users/${userId}/roles/${roleId}`),
};
