import { apiClient } from '../client';
import type { ApiResponse, SchoolSetting } from '@/types/api';

export const schoolSettingsApi = {
  list: () =>
    apiClient.get<ApiResponse<SchoolSetting[]>>('/school-settings'),

  getByKey: (key: string) =>
    apiClient.get<ApiResponse<SchoolSetting>>(`/school-settings/${key}`),

  update: (key: string, valueJson: SchoolSetting['valueJson']) =>
    apiClient.patch<ApiResponse<SchoolSetting>>(`/school-settings/${key}`, { valueJson }),
};
