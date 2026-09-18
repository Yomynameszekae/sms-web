import { apiClient } from '../client';
import type {
  ApiResponse, FeeType, CreateFeeTypePayload, UpdateFeeTypePayload,
  SchoolFee, CreateSchoolFeePayload, UpdateSchoolFeePayload,
  FeePayment, CreatePaymentPayload, AssignmentPayments,
  StudentBill, FeeLevelSummary, FeeLedger, MoneyString,
} from '@/types/api';

export const feesApi = {
  // ── fee types ──
  listTypes: (includeArchived?: boolean) =>
    apiClient.get<ApiResponse<FeeType[]>>('/fees/types', {
      params: includeArchived ? { includeArchived: true } : {},
    }),
  createType: (payload: CreateFeeTypePayload) =>
    apiClient.post<ApiResponse<FeeType>>('/fees/types', payload),
  updateType: (id: string, payload: UpdateFeeTypePayload) =>
    apiClient.patch<ApiResponse<FeeType>>(`/fees/types/${id}`, payload),
  archiveType: (id: string) => apiClient.post<ApiResponse<FeeType>>(`/fees/types/${id}/archive`),
  restoreType: (id: string) => apiClient.post<ApiResponse<FeeType>>(`/fees/types/${id}/restore`),

  // ── school fees ──
  listFees: (params?: {
    academicYearId?: string; termId?: string; levelId?: string; includeArchived?: boolean;
  }) => apiClient.get<ApiResponse<SchoolFee[]>>('/fees/school-fees', { params: params ?? {} }),
  createFee: (payload: CreateSchoolFeePayload) =>
    apiClient.post<ApiResponse<SchoolFee>>('/fees/school-fees', payload),
  updateFee: (id: string, payload: UpdateSchoolFeePayload) =>
    apiClient.patch<ApiResponse<SchoolFee>>(`/fees/school-fees/${id}`, payload),
  archiveFee: (id: string) => apiClient.post<ApiResponse<SchoolFee>>(`/fees/school-fees/${id}/archive`),
  restoreFee: (id: string) => apiClient.post<ApiResponse<SchoolFee>>(`/fees/school-fees/${id}/restore`),
  /** Idempotent: closes the late-enrollment hole. */
  reconcile: (id: string) =>
    apiClient.post<ApiResponse<{ schoolFeeId: string; createdCount: number }>>(
      `/fees/school-fees/${id}/reconcile`,
    ),

  // ── assignments ──
  updateAssignment: (id: string, amountDue: MoneyString) =>
    apiClient.patch<ApiResponse<unknown>>(`/fees/assignments/${id}`, { amountDue }),

  // ── payments ──
  listPayments: (params?: { studentId?: string; from?: string; to?: string }) =>
    apiClient.get<ApiResponse<{ items: FeePayment[]; totalCollected: MoneyString }>>(
      '/fees/payments', { params: params ?? {} },
    ),
  paymentsForAssignment: (feeAssignmentId: string) =>
    apiClient.get<ApiResponse<AssignmentPayments>>(`/fees/payments/assignment/${feeAssignmentId}`),
  createPayment: (payload: CreatePaymentPayload) =>
    apiClient.post<ApiResponse<FeePayment>>('/fees/payments', payload),
  reversePayment: (id: string, reason: string) =>
    apiClient.post<ApiResponse<FeePayment>>(`/fees/payments/${id}/reverse`, { reason }),

  // ── reporting ──
  summary: (levelId: string, academicYearId: string, termId: string) =>
    apiClient.get<ApiResponse<FeeLevelSummary>>('/fees/summary', {
      params: { levelId, academicYearId, termId },
    }),
  bill: (studentId: string, termId: string) =>
    apiClient.get<ApiResponse<StudentBill>>(`/fees/bill/${studentId}`, { params: { termId } }),
  ledger: (academicYearId: string, termId?: string) =>
    apiClient.get<ApiResponse<FeeLedger>>('/fees/ledger', {
      params: { academicYearId, ...(termId ? { termId } : {}) },
    }),
};
