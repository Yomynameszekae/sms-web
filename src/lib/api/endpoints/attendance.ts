import { apiClient } from '../client';
import type {
  ApiResponse,
  AttendanceClassroomOption,
  AttendanceRegister,
  ClassroomAttendanceSummary,
  ClassroomRegisterGrid,
  MarkRegisterPayload,
  MarkRegisterResult,
  ReopenTermResult,
  StudentAttendanceSummary,
} from '@/types/api';

export const attendanceApi = {
  /** Classrooms the caller may open a register for (own, or all with `_any`). */
  classrooms: (academicYearId?: string) =>
    apiClient.get<ApiResponse<AttendanceClassroomOption[]>>('/attendance/classrooms', {
      params: academicYearId ? { academicYearId } : {},
    }),

  register: (classroomId: string, date: string) =>
    apiClient.get<ApiResponse<AttendanceRegister>>('/attendance/register', {
      params: { classroomId, date },
    }),

  /** Create AND amend — one idempotent endpoint, as the backend models it. */
  markRegister: (payload: MarkRegisterPayload) =>
    apiClient.put<ApiResponse<MarkRegisterResult>>('/attendance/register', payload),

  studentSummary: (studentId: string, termId: string) =>
    apiClient.get<ApiResponse<StudentAttendanceSummary>>(
      `/attendance/summary/student/${studentId}`,
      { params: { termId } },
    ),

  classroomSummary: (classroomId: string, termId: string) =>
    apiClient.get<ApiResponse<ClassroomAttendanceSummary>>(
      `/attendance/summary/classroom/${classroomId}`,
      { params: { termId } },
    ),

  /**
   * Download in a registered format. `responseType: 'blob'` because the
   * response is a file, not the JSON envelope every other endpoint returns.
   * `format` is resolved against the backend's export registry; omitting it
   * gives CSV, which is what the shipped caller relied on.
   */
  exportClassroomSummary: (classroomId: string, termId: string, format = 'csv') =>
    apiClient.get<Blob>(`/attendance/summary/classroom/${classroomId}/export`, {
      params: { termId, format },
      responseType: 'blob',
    }),

  /**
   * The printable register grid as DATA. The print page renders it itself
   * rather than fetching the server's HTML, so it can show a loading state and
   * reuse the app's session — `format=register` on the same route returns that
   * HTML for anyone who wants the file.
   */
  registerGrid: (params: {
    classroomId: string;
    termId: string;
    from?: string;
    to?: string;
  }) =>
    apiClient.get<ApiResponse<ClassroomRegisterGrid>>('/attendance/register/grid', {
      params,
    }),

  reopenTerm: (termId: string, reason: string) =>
    apiClient.post<ApiResponse<ReopenTermResult>>(
      `/attendance/terms/${termId}/reopen`,
      { reason },
    ),
};
