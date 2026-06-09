import { apiClient } from '../client';
import type { ApiResponse, DocumentSequence, DocumentSequenceType, UpdateSequencePayload } from '@/types/api';

export const documentSequencesApi = {
  list: () =>
    apiClient.get<ApiResponse<DocumentSequence[]>>('/document-sequences'),

  getByType: (type: DocumentSequenceType) =>
    apiClient.get<ApiResponse<DocumentSequence>>(`/document-sequences/${type}`),

  update: (type: DocumentSequenceType, payload: UpdateSequencePayload) =>
    apiClient.patch<ApiResponse<DocumentSequence>>(`/document-sequences/${type}`, payload),
};
