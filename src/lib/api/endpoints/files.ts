import { apiClient } from '../client';
import type {
  ApiResponse,
  PaginatedData,
  FileRecord,
  FileOwnerType,
  CreateFilePayload,
} from '@/types/api';

export interface FilesQuery {
  ownerType?: FileOwnerType;
  ownerId?: string;
  page?: number;
  limit?: number;
}

export const filesApi = {
  list: (query: FilesQuery = {}) =>
    apiClient.get<ApiResponse<PaginatedData<FileRecord>>>('/files', {
      params: { limit: 20, ...query },
    }),

  get: (id: string) =>
    apiClient.get<ApiResponse<FileRecord>>(`/files/${id}`),

  create: (payload: CreateFilePayload) =>
    apiClient.post<ApiResponse<FileRecord>>('/files', payload),

  archive: (id: string) =>
    apiClient.post<ApiResponse<FileRecord>>(`/files/${id}/archive`),
};
