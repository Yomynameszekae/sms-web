import { apiClient } from '../client';
import type {
  ApiResponse, PaginatedData, NotificationMessage, NotificationCounts,
  NotificationStatus, NotificationTrigger, DispatchResult, SmsConsentMethod,
} from '@/types/api';

export const notificationsApi = {
  list: (params?: {
    status?: NotificationStatus; trigger?: NotificationTrigger;
    guardianId?: string; studentId?: string; page?: number; limit?: number;
  }) =>
    apiClient.get<ApiResponse<PaginatedData<NotificationMessage>>>('/notifications', {
      params: params ?? {},
    }),

  counts: (since?: string) =>
    apiClient.get<ApiResponse<NotificationCounts>>('/notifications/counts', {
      params: since ? { since } : {},
    }),

  sendFeeReminders: (payload: { termId: string; levelId?: string; studentId?: string }) =>
    apiClient.post<ApiResponse<DispatchResult>>('/notifications/fee-reminders', payload),

  sendAbsenceAlerts: (payload: { classroomId: string; date: string }) =>
    apiClient.post<ApiResponse<DispatchResult>>('/notifications/absence-alerts', payload),

  /** Run the outbox now instead of waiting for the next 15s tick. */
  dispatch: () =>
    apiClient.post<ApiResponse<{ claimed: number; sent: number; failed: number; retrying: number }>>(
      '/notifications/dispatch',
    ),
};

export const consentApi = {
  grant: (guardianId: string, smsConsentMethod: SmsConsentMethod) =>
    apiClient.post<ApiResponse<unknown>>(`/guardians/${guardianId}/consent`, { smsConsentMethod }),

  /** Stops future sends immediately and cancels anything already queued. */
  revoke: (guardianId: string, reason: string) =>
    apiClient.delete<ApiResponse<{ linksDisabled: number; queuedMessagesCancelled: number }>>(
      `/guardians/${guardianId}/consent`,
      { data: { reason } },
    ),
};
