import { apiClient } from '../client';
import type { ApiResponse, School, UpdateSchoolPayload } from '@/types/api';

export const schoolApi = {
  get: () =>
    apiClient.get<ApiResponse<School>>('/school'),

  update: (payload: UpdateSchoolPayload) =>
    apiClient.patch<ApiResponse<School>>('/school', payload),
};
