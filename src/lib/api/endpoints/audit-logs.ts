import { apiClient } from '../client';
import type { ApiResponse, PaginatedData, AuditLog } from '@/types/api';

export interface AuditLogsQuery {
  module?: string;
  action?: string;
  entityType?: string;
  page?: number;
  limit?: number;
}

export const auditLogsApi = {
  list: (query: AuditLogsQuery = {}) =>
    apiClient.get<ApiResponse<PaginatedData<AuditLog>>>('/audit-logs', {
      params: { limit: 20, ...query },
    }),
};
