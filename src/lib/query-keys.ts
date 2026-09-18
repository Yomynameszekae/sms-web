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
} as const;
