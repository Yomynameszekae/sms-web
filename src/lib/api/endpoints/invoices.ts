import { apiClient } from '../client';
import type {
  ApiResponse, Invoice, InvoiceListItem, InvoiceStatus,
  CreateInvoicePayload, CorrectInvoicePayload, PaymentState,
} from '@/types/api';

export const invoicesApi = {
  list: (params?: {
    studentId?: string; termId?: string; status?: InvoiceStatus; paymentState?: PaymentState;
  }) =>
    apiClient.get<ApiResponse<{ items: InvoiceListItem[]; total: number }>>('/invoices', {
      params: params ?? {},
    }),

  get: (id: string) => apiClient.get<ApiResponse<Invoice>>(`/invoices/${id}`),

  create: (payload: CreateInvoicePayload) =>
    apiClient.post<ApiResponse<Invoice>>('/invoices', payload),

  cancel: (id: string, reason: string) =>
    apiClient.post<ApiResponse<Invoice>>(`/invoices/${id}/cancel`, { reason }),

  /** Cancel-and-reissue in one transaction; returns the NEW invoice. */
  correct: (id: string, payload: CorrectInvoicePayload) =>
    apiClient.post<ApiResponse<Invoice>>(`/invoices/${id}/correct`, payload),
};
