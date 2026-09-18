// Standard response shapes from the Phase 1 backend

export interface ApiResponse<T = unknown> {
  success: boolean;
  message: string;
  data: T;
}

export interface PaginatedData<T> {
  items: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface ApiError {
  success: false;
  statusCode: number;
  message: string;
  errors?: string[];
}

// ─── Auth ────────────────────────────────────────────────────────────────────

export interface AuthUserRole {
  id: string;
  code: string;
  name: string;
}

// Shape from /auth/me (superset of login user object).
// firstName/lastName are NOT on the user entity — they live on the linked
// staff/student entity. Use email or phone for display purposes.
export interface AuthUser {
  id: string;
  email: string | null;
  phone: string | null;
  mustChangePassword: boolean;
  schoolId: string;
  linkedEntityType?: string;
  linkedEntityId?: string;
  roles?: AuthUserRole[];
  permissions?: string[];
}

export interface LoginResponse {
  accessToken: string;
  user: AuthUser;
}

// ─── School ──────────────────────────────────────────────────────────────────

export interface School {
  id: string;
  name: string;
  slug: string;
  logoUrl: string | null;
  address: string | null;
  ghanaPostGps: string | null;
  phone: string | null;
  email: string | null;
  motto: string | null;
  registrationNumber: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  createdBy: string | null;
  updatedBy: string | null;
}

export interface UpdateSchoolPayload {
  name?: string;
  logoUrl?: string;
  address?: string;
  ghanaPostGps?: string;
  phone?: string;
  email?: string;
  motto?: string;
  registrationNumber?: string;
}

// ─── School Settings ─────────────────────────────────────────────────────────

export interface SchoolSettingValueJson {
  type: 'string' | 'number' | 'boolean';
  value: string | number | boolean;
}

export interface SchoolSetting {
  id: string;
  schoolId: string;
  key: string;
  valueJson: SchoolSettingValueJson;
  description: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  createdBy: string | null;
  updatedBy: string | null;
}

// ─── Document Sequences ──────────────────────────────────────────────────────

export type DocumentSequenceType =
  | 'student_number'
  | 'admission_number'
  | 'invoice_number'
  | 'receipt_number'
  | 'staff_number';

export interface DocumentSequence {
  id: string;
  schoolId: string;
  type: DocumentSequenceType;
  prefix: string | null;
  currentNumber: number;
  paddingLength: number;
  resetPolicy: string | null;
  createdAt: string;
  updatedAt: string;
  createdBy: string | null;
  updatedBy: string | null;
}

export interface UpdateSequencePayload {
  prefix?: string;
  paddingLength?: number;
  resetPolicy?: string;
}

// ─── Academic Years ───────────────────────────────────────────────────────────

export interface AcademicYear {
  id: string;
  schoolId: string;
  label: string;
  startDate: string;
  endDate: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  createdBy: string | null;
  updatedBy: string | null;
}

export interface CreateAcademicYearPayload {
  label: string;
  startDate: string;
  endDate: string;
}

export interface UpdateAcademicYearPayload {
  label?: string;
  startDate?: string;
  endDate?: string;
}

// ─── Terms ────────────────────────────────────────────────────────────────────

// Mirrors backend `TermStatus` exactly — there is no 'pending' in the API.
export type TermStatus = 'draft' | 'active' | 'closed';
/** What a school/classroom/admission may offer or be interested in. */
export type CurriculumScope = 'GES_NACCA' | 'ABEKA' | 'BOTH';
/**
 * A single curriculum a child is actually taught on. Enrollments track one
 * curriculum, so 'BOTH' is not a valid value here — the backend rejects it.
 */
export type CurriculumCode = 'GES_NACCA' | 'ABEKA';

export interface Term {
  id: string;
  schoolId: string;
  academicYearId: string;
  termNumber: number;
  label: string;
  startDate: string;
  endDate: string;
  examStartDate: string | null;
  examEndDate: string | null;
  status: TermStatus;
  curriculumScope: CurriculumScope | null;
  createdAt: string;
  updatedAt: string;
  createdBy: string | null;
  updatedBy: string | null;
}

export interface CreateTermPayload {
  academicYearId: string;
  termNumber: number;
  label: string;
  startDate: string;
  endDate: string;
  examStartDate?: string;
  examEndDate?: string;
  curriculumScope?: CurriculumScope;
}

export interface UpdateTermPayload {
  termNumber?: number;
  label?: string;
  startDate?: string;
  endDate?: string;
  examStartDate?: string;
  examEndDate?: string;
  curriculumScope?: CurriculumScope;
}

// ─── Levels ───────────────────────────────────────────────────────────────────

export type LevelGroup =
  | 'CRECHE'
  | 'NURSERY'
  | 'KG'
  | 'LOWER_PRIMARY'
  | 'UPPER_PRIMARY'
  | 'JHS';

export interface Level {
  id: string;
  schoolId: string;
  name: string;
  gesDesignation: string | null;
  abekaDesignation: string | null;
  orderIndex: number;
  levelGroup: LevelGroup;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  createdBy: string | null;
  updatedBy: string | null;
}

export interface CreateLevelPayload {
  name: string;
  gesDesignation?: string;
  abekaDesignation?: string;
  orderIndex: number;
  levelGroup: LevelGroup;
}

export interface UpdateLevelPayload {
  name?: string;
  gesDesignation?: string;
  abekaDesignation?: string;
  orderIndex?: number;
  levelGroup?: LevelGroup;
}

// ─── Staff ────────────────────────────────────────────────────────────────────

export type EmploymentType = 'full_time' | 'part_time' | 'contract';
export type StaffStatus = 'active' | 'on_leave' | 'resigned' | 'terminated';
export type StaffRoleCategory = 'teacher' | 'admin' | 'support';
export type NtcStatus = 'licensed' | 'induction' | 'unlicensed' | 'not_applicable';

export interface Staff {
  id: string;
  schoolId: string;
  staffNumber: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  email: string | null;
  photoUrl: string | null;
  roleCategory: StaffRoleCategory;
  employmentType: EmploymentType | null;
  status: StaffStatus;
  ntcRegistrationNumber: string | null;
  ntcStatus: NtcStatus;
  joinedAt: string | null;
  archivedAt: string | null;
  createdAt: string;
  updatedAt: string;
  createdBy: string | null;
  updatedBy: string | null;
}

export interface CreateStaffPayload {
  /** Blank → the backend auto-generates the next STF number. */
  staffNumber?: string;
  firstName: string;
  lastName: string;
  phone?: string;
  email?: string;
  roleCategory: StaffRoleCategory;
  employmentType?: EmploymentType;
  ntcRegistrationNumber?: string;
  ntcStatus?: NtcStatus;
  joinedAt?: string;
}

export interface UpdateStaffPayload {
  firstName?: string;
  lastName?: string;
  phone?: string;
  email?: string;
  roleCategory?: StaffRoleCategory;
  employmentType?: EmploymentType;
  ntcRegistrationNumber?: string;
  ntcStatus?: NtcStatus;
  joinedAt?: string;
}

// ─── Classrooms ───────────────────────────────────────────────────────────────

export interface Classroom {
  id: string;
  schoolId: string;
  levelId: string;
  academicYearId: string;
  sectionLabel: string;
  displayName: string;
  capacity: number | null;
  classTeacherId: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  createdBy: string | null;
  updatedBy: string | null;
  // included in list response
  level?: { id: string; name: string; levelGroup: string };
  academicYear?: { id: string; label: string };
}

export interface CreateClassroomPayload {
  levelId: string;
  academicYearId: string;
  sectionLabel: string;
  displayName: string;
  capacity?: number;
}

export interface UpdateClassroomPayload {
  levelId?: string;
  academicYearId?: string;
  sectionLabel?: string;
  displayName?: string;
  capacity?: number;
}

// ─── Students ─────────────────────────────────────────────────────────────────

export type Gender = 'male' | 'female' | 'other';
// The backend has no separate student-status enum — Student.status is an
// EnrollmentStatus column. 'archived' was never a real value: archiving sets
// status='withdrawn' plus an archivedAt timestamp.
export type StudentStatus = EnrollmentStatus;

export interface Student {
  id: string;
  schoolId: string;
  studentNumber: string;
  firstName: string;
  middleName: string | null;
  lastName: string;
  preferredName: string | null;
  dateOfBirth: string;
  gender: Gender;
  nationality: string | null;
  religion: string | null;
  ghanaCardId: string | null;
  profilePhotoUrl: string | null;
  previousSchool: string | null;
  admissionDate: string | null;
  status: StudentStatus;
  archivedAt: string | null;
  createdAt: string;
  updatedAt: string;
  createdBy: string | null;
  updatedBy: string | null;
}

export interface CreateStudentPayload {
  /** Blank → the backend auto-generates the next STU number. */
  studentNumber?: string;
  firstName: string;
  middleName?: string;
  lastName: string;
  preferredName?: string;
  dateOfBirth: string;
  gender: Gender;
  nationality?: string;
  religion?: string;
  ghanaCardId?: string;
  previousSchool?: string;
  admissionDate?: string;
}

export interface UpdateStudentPayload {
  firstName?: string;
  middleName?: string;
  lastName?: string;
  preferredName?: string;
  dateOfBirth?: string;
  gender?: Gender;
  nationality?: string;
  religion?: string;
  ghanaCardId?: string;
  previousSchool?: string;
  admissionDate?: string;
}

// ─── Guardians ────────────────────────────────────────────────────────────────

export interface Guardian {
  id: string;
  schoolId: string;
  firstName: string;
  lastName: string;
  phonePrimary: string;
  phoneSecondary: string | null;
  email: string | null;
  occupation: string | null;
  address: string | null;
  archivedAt: string | null;
  createdAt: string;
  updatedAt: string;
  createdBy: string | null;
  updatedBy: string | null;
}

export interface CreateGuardianPayload {
  firstName: string;
  lastName: string;
  phonePrimary: string;
  phoneSecondary?: string;
  email?: string;
  occupation?: string;
  address?: string;
}

export interface UpdateGuardianPayload {
  firstName?: string;
  lastName?: string;
  phonePrimary?: string;
  phoneSecondary?: string;
  email?: string;
  occupation?: string;
  address?: string;
}

// ─── Student-Guardian Links ───────────────────────────────────────────────────

export interface StudentGuardian {
  id: string;
  schoolId: string;
  studentId: string;
  guardianId: string;
  relationship: string | null;
  isPrimary: boolean;
  isEmergencyContact: boolean;
  canReceiveSms: boolean;
  canAccessPortal: boolean;
  createdAt: string;
  createdBy: string | null;
  // included when fetched via /students/:id/guardians
  guardian?: Guardian;
  // included when fetched via /guardians/:id/students
  student?: Student;
}

export interface CreateStudentGuardianPayload {
  studentId: string;
  guardianId: string;
  relationship?: string;
  isPrimary?: boolean;
  isEmergencyContact?: boolean;
  canReceiveSms?: boolean;
  canAccessPortal?: boolean;
}

export interface UpdateStudentGuardianPayload {
  relationship?: string;
  isPrimary?: boolean;
  isEmergencyContact?: boolean;
  canReceiveSms?: boolean;
  canAccessPortal?: boolean;
}

// ─── Admissions ───────────────────────────────────────────────────────────────

// Mirrors backend `AdmissionStatus` exactly. 'withdrawn' (family declines the
// school — distinct from 'rejected', school declines the family) was added to
// the backend enum in Phase 1B.
export type AdmissionStatus =
  | 'enquiry' | 'application' | 'offered' | 'enrolled' | 'rejected' | 'withdrawn';

export interface Admission {
  id: string;
  schoolId: string;
  admissionNumber: string | null;
  studentId: string | null;
  intendedLevelId: string | null;
  curriculumInterest: CurriculumScope | null;
  enquirySource: string | null;
  notes: string | null;
  status: AdmissionStatus;
  applicationDate: string | null;
  offeredAt: string | null;
  approvedBy: string | null;
  approvedAt: string | null;
  enrolledAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateAdmissionPayload {
  studentId?: string;
  intendedLevelId?: string;
  curriculumInterest?: CurriculumScope;
  enquirySource?: string;
  notes?: string;
}

export interface UpdateAdmissionPayload {
  studentId?: string;
  intendedLevelId?: string;
  curriculumInterest?: CurriculumScope;
  enquirySource?: string;
  notes?: string;
}

export interface EnrollAdmissionPayload {
  classroomId: string;
  academicYearId: string;
  curriculumTrack: CurriculumCode;
  studentId?: string;
}

// ─── Enrollments ─────────────────────────────────────────────────────────────

// Mirrors backend `EnrollmentStatus` exactly (Student.status shares this enum).
export type EnrollmentStatus = 'active' | 'transferred' | 'withdrawn' | 'completed' | 'graduated';

export interface Enrollment {
  id: string;
  schoolId: string;
  studentId: string;
  classroomId: string;
  academicYearId: string;
  curriculumTrack: CurriculumCode;
  enrollmentDate: string | null;
  status: EnrollmentStatus;
  exitDate: string | null;
  exitReason: string | null;
  createdAt: string;
  updatedAt: string;
  createdBy: string | null;
  updatedBy: string | null;
}

export interface CreateEnrollmentPayload {
  studentId: string;
  classroomId: string;
  academicYearId: string;
  curriculumTrack: CurriculumCode;
  enrollmentDate?: string;
}

export interface WithdrawEnrollmentPayload {
  exitDate: string;
  exitReason?: string;
}

// ─── Files ────────────────────────────────────────────────────────────────────

export type FileOwnerType = 'student' | 'staff' | 'admission' | 'guardian' | 'school' | 'user' | 'other';

export interface FileRecord {
  id: string;
  schoolId: string;
  ownerType: FileOwnerType;
  ownerId: string | null;
  category: string | null;
  originalFileName: string;
  storedFileName: string | null;
  mimeType: string;
  sizeBytes: number;
  storageBucket: string;
  storageKey: string;
  publicUrl: string | null;
  checksumSha256: string | null;
  isPublic: boolean;
  uploadedBy: string | null;
  archivedAt: string | null;
  createdAt: string;
  updatedAt: string;
  createdBy: string | null;
  updatedBy: string | null;
}

export interface CreateFilePayload {
  ownerType: FileOwnerType;
  ownerId?: string;
  originalFileName: string;
  mimeType: string;
  sizeBytes: number;
  storageBucket: string;
  storageKey: string;
  category?: string;
  /**
   * NOT accepted by the backend — CreateFileDto has no isPublic and the
   * service always stores false. Sending it fails the whole request.
   */
  checksumSha256?: string;
}

// ─── Audit Logs ───────────────────────────────────────────────────────────────

export interface AuditLog {
  id: string;
  schoolId: string;
  userId: string | null;
  requestId: string | null;
  actorType: string;
  action: string;
  module: string;
  entityType: string | null;
  entityId: string | null;
  changes: {
    before?: Record<string, unknown>;
    after?: Record<string, unknown>;
  } | null;
  metadata: Record<string, unknown> | null;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: string;
}

// ─── Labels (Phase 2 Stage 1a) ───────────────────────────────────────────────

export type LabelCategory = 'fee' | 'income' | 'expenditure';

export interface FinanceLabel {
  id: string;
  schoolId: string;
  category: LabelCategory;
  name: string;
  description: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  createdBy: string | null;
  updatedBy: string | null;
}

export interface CreateLabelPayload {
  category: LabelCategory;
  name: string;
  description?: string;
}

/** No `category`: it is immutable after creation. */
export interface UpdateLabelPayload {
  name?: string;
  description?: string;
}

// ─── Attendance (Phase 2 Stage 1a) ───────────────────────────────────────────

export type AttendanceStatus = 'present' | 'absent' | 'late' | 'excused';

export interface AttendanceClassroomOption {
  id: string;
  displayName: string;
  levelName: string;
  academicYearId: string;
  academicYearLabel: string;
  canMark: boolean;
}

/**
 * Every figure here is over SESSIONS. A day has two — morning and afternoon —
 * and the rate is sessionsPresent / sessionsMarked. Mirrors
 * attendance.reporting.ts on the backend, which is the single definition; do
 * not recompute any of it here.
 */
export interface AttendanceSummary {
  /** Per-status counts, over sessions. */
  present: number;
  absent: number;
  late: number;
  excused: number;
  /** Rows marked in the period — NOT school days in the term. */
  daysMarked: number;
  /** 2 x daysMarked. NOT school sessions in the term. */
  sessionsMarked: number;
  /** present + late, over sessions. */
  sessionsPresent: number;
  /** absent + excused, over sessions. */
  sessionsAbsent: number;
  /** Both sessions present. */
  daysFullyPresent: number;
  /** Both sessions absent. */
  daysFullyAbsent: number;
  /** The sessions disagree — the number session attendance exists to surface. */
  daysPartial: number;
  attendanceRate: number | null;
}

export interface RegisterStudentRow {
  enrollmentId: string;
  studentId: string;
  studentNumber: string;
  fullName: string;
  /**
   * null means not marked — there is no stored `not_marked` status. Both
   * sessions are null together or neither is.
   */
  morningStatus: AttendanceStatus | null;
  morningReason: string | null;
  afternoonStatus: AttendanceStatus | null;
  afternoonReason: string | null;
  recordId: string | null;
  amended: boolean;
}

export interface AttendanceRegister {
  classroom: {
    id: string;
    displayName: string;
    levelName: string;
    academicYearId: string;
    academicYearLabel: string;
  };
  date: string;
  term: { id: string; label: string; status: TermStatus; amendable: boolean } | null;
  editable: boolean;
  lockReason: string | null;
  /** Per-status counts over sessions, plus the day-shape counts. */
  counts: {
    present: number;
    absent: number;
    late: number;
    excused: number;
    daysMarked: number;
    daysFullyPresent: number;
    daysFullyAbsent: number;
    daysPartial: number;
  };
  unmarkedCount: number;
  rows: RegisterStudentRow[];
}

export interface MarkRegisterResult extends AttendanceRegister {
  createdCount: number;
  amendedCount: number;
  unchangedCount: number;
  absentCount: number;
}

export interface MarkRegisterPayload {
  classroomId: string;
  date: string;
  marks: Array<{
    enrollmentId: string;
    /** The MORNING session. */
    status: AttendanceStatus;
    reason?: string;
    /**
     * OMITTED MEANS "MIRROR THE MORNING" — on create AND on amend.
     *
     * So a client that corrects only the morning and omits an afternoon it
     * had previously set will silently RESET that afternoon. Always send the
     * complete effective state of every row; never send a partial patch and
     * expect the unsent half to survive. `_register.tsx` composes a sparse
     * edit overlay over the server's rows and submits all four fields of all
     * of them, which is what makes this safe here.
     */
    afternoon?: {
      status: AttendanceStatus;
      reason?: string;
    };
  }>;
}

export interface AttendanceTermInfo {
  id: string;
  label: string;
  startDate: string;
  endDate: string;
  status: TermStatus;
}

export interface StudentAttendanceSummary {
  student: { id: string; studentNumber: string; fullName: string };
  classroom: { id: string; displayName: string } | null;
  term: AttendanceTermInfo;
  summary: AttendanceSummary;
}

export interface ClassroomAttendanceSummary {
  classroom: { id: string; displayName: string; levelName: string };
  term: AttendanceTermInfo;
  students: Array<{
    enrollmentId: string;
    studentId: string;
    studentNumber: string;
    fullName: string;
    summary: AttendanceSummary;
  }>;
  classroomTotals: AttendanceSummary;
  datesMarked: number;
}

export interface ReopenTermResult {
  termId: string;
  termLabel: string;
  status: TermStatus;
  registerAmendable: boolean;
  reason: string;
}

/**
 * The printable register: students down, dates across, AM and PM per cell.
 * A different SHAPE from the term summary, because per-date detail is not in
 * a summary view.
 */
export interface RegisterGridCell {
  am: AttendanceStatus | null;
  pm: AttendanceStatus | null;
}

export interface ClassroomRegisterGrid {
  school: { name: string };
  classroom: { id: string; displayName: string; levelName: string };
  term: AttendanceTermInfo;
  range: { from: string; to: string };
  /** Marked dates in range, ascending. Unmarked dates are not columns. */
  dates: string[];
  rows: Array<{
    enrollmentId: string;
    studentId: string;
    studentNumber: string;
    fullName: string;
    /** Keyed by `YYYY-MM-DD`. Dates absent from this map were not marked. */
    cells: Record<string, RegisterGridCell>;
    summary: AttendanceSummary;
  }>;
  totals: AttendanceSummary;
}
