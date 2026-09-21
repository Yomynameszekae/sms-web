export const queryKeys = {
  school: {
    all: ['school'] as const,
    detail: () => [...queryKeys.school.all, 'detail'] as const,
  },
  schoolSettings: {
    all: ['school-settings'] as const,
    list: () => [...queryKeys.schoolSettings.all, 'list'] as const,
    byKey: (key: string) => [...queryKeys.schoolSettings.all, key] as const,
  },
  documentSequences: {
    all: ['document-sequences'] as const,
    list: () => [...queryKeys.documentSequences.all, 'list'] as const,
    byType: (type: string) => [...queryKeys.documentSequences.all, type] as const,
  },
  academicYears: {
    all: ['academic-years'] as const,
    list: () => [...queryKeys.academicYears.all, 'list'] as const,
    detail: (id: string) => [...queryKeys.academicYears.all, id] as const,
  },
  terms: {
    all: ['terms'] as const,
    list: (academicYearId?: string) =>
      [...queryKeys.terms.all, 'list', academicYearId ?? 'all'] as const,
    detail: (id: string) => [...queryKeys.terms.all, id] as const,
  },
  levels: {
    all: ['levels'] as const,
    list: (params?: object) => [...queryKeys.levels.all, 'list', params ?? {}] as const,
    detail: (id: string) => [...queryKeys.levels.all, id] as const,
  },
  staff: {
    all: ['staff'] as const,
    list: (params?: object) => [...queryKeys.staff.all, 'list', params ?? {}] as const,
    detail: (id: string) => [...queryKeys.staff.all, id] as const,
  },
  classrooms: {
    all: ['classrooms'] as const,
    list: (params?: object) => [...queryKeys.classrooms.all, 'list', params ?? {}] as const,
    detail: (id: string) => [...queryKeys.classrooms.all, id] as const,
  },
  students: {
    all: ['students'] as const,
    list: (params?: object) => [...queryKeys.students.all, 'list', params ?? {}] as const,
    detail: (id: string) => [...queryKeys.students.all, id] as const,
    guardians: (id: string) => [...queryKeys.students.all, id, 'guardians'] as const,
    enrollments: (id: string) => [...queryKeys.students.all, id, 'enrollments'] as const,
  },
  guardians: {
    all: ['guardians'] as const,
    list: (params?: object) => [...queryKeys.guardians.all, 'list', params ?? {}] as const,
    detail: (id: string) => [...queryKeys.guardians.all, id] as const,
    students: (id: string) => [...queryKeys.guardians.all, id, 'students'] as const,
  },
  admissions: {
    all: ['admissions'] as const,
    list: (params?: object) => [...queryKeys.admissions.all, 'list', params ?? {}] as const,
    detail: (id: string) => [...queryKeys.admissions.all, id] as const,
  },
  enrollments: {
    all: ['enrollments'] as const,
    list: (params?: object) => [...queryKeys.enrollments.all, 'list', params ?? {}] as const,
    detail: (id: string) => [...queryKeys.enrollments.all, id] as const,
  },
  files: {
    all: ['files'] as const,
    list: (params?: object) => [...queryKeys.files.all, 'list', params ?? {}] as const,
    detail: (id: string) => [...queryKeys.files.all, id] as const,
  },
  auditLogs: {
    all: ['audit-logs'] as const,
    list: (params?: object) => [...queryKeys.auditLogs.all, 'list', params ?? {}] as const,
  },
  labels: {
    all: ['labels'] as const,
    list: (params?: object) => [...queryKeys.labels.all, 'list', params ?? {}] as const,
    detail: (id: string) => [...queryKeys.labels.all, id] as const,
  },
  fees: {
    all: ['fees'] as const,
    types: (params?: object) => [...queryKeys.fees.all, 'types', params ?? {}] as const,
    schoolFees: (params?: object) => [...queryKeys.fees.all, 'school-fees', params ?? {}] as const,
    payments: (params?: object) => [...queryKeys.fees.all, 'payments', params ?? {}] as const,
    assignmentPayments: (id?: string) => [...queryKeys.fees.all, 'assignment-payments', id ?? ''] as const,
    summary: (params?: object) => [...queryKeys.fees.all, 'summary', params ?? {}] as const,
    bill: (studentId?: string, termId?: string) =>
      [...queryKeys.fees.all, 'bill', studentId ?? '', termId ?? ''] as const,
    ledger: (params?: object) => [...queryKeys.fees.all, 'ledger', params ?? {}] as const,
  },
  invoices: {
    all: ['invoices'] as const,
    list: (params?: object) => [...queryKeys.invoices.all, 'list', params ?? {}] as const,
    detail: (id?: string) => [...queryKeys.invoices.all, id ?? ''] as const,
  },
  notifications: {
    all: ['notifications'] as const,
    list: (params?: object) => [...queryKeys.notifications.all, 'list', params ?? {}] as const,
    counts: () => [...queryKeys.notifications.all, 'counts'] as const,
  },
  roles: {
    all: ['roles'] as const,
    list: () => [...queryKeys.roles.all, 'list'] as const,
    permissions: () => [...queryKeys.roles.all, 'permissions'] as const,
  },
  attendance: {
    all: ['attendance'] as const,
    classrooms: () => [...queryKeys.attendance.all, 'classrooms'] as const,
    register: (classroomId?: string, date?: string) =>
      [...queryKeys.attendance.all, 'register', classroomId ?? '', date ?? ''] as const,
    classroomSummary: (classroomId?: string, termId?: string) =>
      [...queryKeys.attendance.all, 'summary', 'classroom', classroomId ?? '', termId ?? ''] as const,
    studentSummary: (studentId?: string, termId?: string) =>
      [...queryKeys.attendance.all, 'summary', 'student', studentId ?? '', termId ?? ''] as const,
    grid: (classroomId?: string, termId?: string, from?: string, to?: string) =>
      [
        ...queryKeys.attendance.all, 'grid',
        classroomId ?? '', termId ?? '', from ?? '', to ?? '',
      ] as const,
  },
} as const;
