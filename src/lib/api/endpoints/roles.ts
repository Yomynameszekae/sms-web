import { apiClient } from '../client';
import type { ApiResponse, Permission, Role } from '@/types/api';

export const rolesApi = {
  /** Roles with their granted permissions already included — one call, no N+1. */
  list: () => apiClient.get<ApiResponse<Role[]>>('/roles'),

  /** Every permission the system knows about, grouped by module on the client. */
  permissions: () => apiClient.get<ApiResponse<Permission[]>>('/permissions'),

  grant: (roleId: string, permissionId: string) =>
    apiClient.post<ApiResponse<unknown>>(`/roles/${roleId}/permissions`, { permissionId }),

  revoke: (roleId: string, permissionId: string) =>
    apiClient.delete<ApiResponse<unknown>>(`/roles/${roleId}/permissions/${permissionId}`),
};
