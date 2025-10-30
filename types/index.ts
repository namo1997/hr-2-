// types/index.ts - TypeScript types สำหรับระบบ HR

export type UserRole = 'ADMIN' | 'MANAGER' | 'EMPLOYEE';

export type DayOfWeek = 'MON' | 'TUE' | 'WED' | 'THU' | 'FRI' | 'SAT' | 'SUN';
export type BreakRuleType = 'DURATION' | 'FIXED';
export type ShiftScopeLevel = 'ZONE' | 'BRANCH' | 'DEPARTMENT';

export type AttendanceStatus = 
  | 'PRESENT' 
  | 'ABSENT' 
  | 'LEAVE' 
  | 'PENDING_LEAVE' 
  | 'HOLIDAY' 
  | 'DAY_OFF';

export type LeaveType = 'SICK' | 'PERSONAL' | 'ANNUAL' | 'MATERNITY' | 'OTHER';

export type RequestStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED';

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  employeeId?: number;
}

export interface Employee {
  id: number;
  employeeCode: string;
  name: string;
  nickname?: string;
  department: string;
  position?: string;
  startDate: Date;
  isActive: boolean;
}

export interface ShiftBreakRule {
  id: number;
  type: BreakRuleType;
  minutes?: number | null;
  startTime?: string | null;
  endTime?: string | null;
}

export interface ShiftDayConfig {
  id: number;
  dayOfWeek: DayOfWeek;
  startTime: string;
  endTime: string;
  breakRules: ShiftBreakRule[];
}

export interface ShiftScopeAssignment {
  id: number;
  level: ShiftScopeLevel;
  zoneId?: number | null;
  branchId?: number | null;
  departmentId?: number | null;
}

export interface Shift {
  id: number;
  name: string;
  description?: string | null;
  isActive: boolean;
  days?: ShiftDayConfig[];
  scopeAssignments?: ShiftScopeAssignment[];
  // Legacy fields for compatibility with existing calculators
  startTime?: string;
  endTime?: string;
  breakType?: BreakRuleType;
  breakDuration?: number;
  flexBreakStart?: string;
  flexBreakEnd?: string;
  fixedBreakStart?: string;
  lateGracePeriod?: number;
  overtimeStart?: number;
}

export interface ShiftAssignment {
  id: number;
  employeeId: number;
  shiftId: number;
  startDate: Date;
  endDate?: Date;
  isActive: boolean;
  employee?: Employee;
  shift?: Shift;
}

export interface AttendanceScanRaw {
  employeeCode: string;
  scanDate: string;
  scanCount: number;
  allScans: string[];
}

export interface Attendance {
  id: number;
  employeeId: number;
  date: Date;
  shiftId?: number;
  checkIn?: string;
  breakOut?: string;
  breakIn?: string;
  checkOut?: string;
  status: AttendanceStatus;
  isLate: boolean;
  lateMinutes: number;
  isEarlyLeave: boolean;
  earlyMinutes: number;
  workMinutes: number;
  overtimeMinutes: number;
  notes?: string;
  isAdjusted: boolean;
  employee?: Employee;
}

export interface LeaveRequest {
  id: number;
  employeeId: number;
  leaveType: LeaveType;
  startDate: Date;
  endDate: Date;
  totalDays: number;
  reason: string;
  status: RequestStatus;
  submittedAt: Date;
  reviewedAt?: Date;
  reviewedBy?: string;
  reviewNote?: string;
  employee?: Employee;
}

export interface OvertimeRequest {
  id: number;
  employeeId: number;
  date: Date;
  startTime: string;
  endTime: string;
  totalMinutes: number;
  reason: string;
  status: RequestStatus;
  submittedAt: Date;
  reviewedAt?: Date;
  reviewedBy?: string;
  reviewNote?: string;
  employee?: Employee;
}

export interface DayOffSwap {
  id: number;
  employeeId: number;
  originalDate: Date;
  swapToDate: Date;
  reason: string;
  status: RequestStatus;
  submittedAt: Date;
  reviewedAt?: Date;
  reviewedBy?: string;
  reviewNote?: string;
}

export interface Approval {
  id: number;
  requestType: string;
  requestId: number;
  approverId: string;
  approverLevel: number;
  status: RequestStatus;
  comment?: string;
  reviewedAt?: Date;
}

// ข้อมูลจากไฟล์ CSV ที่อัพโหลด
export interface CSVAttendanceRow {
  employeeCode: string;
  employeeName: string;
  department: string;
  date: string;
  scanCount: number;
  scans: string;
}

// สำหรับการคำนวณเวลา
export interface TimeCalculation {
  checkIn: string;
  breakOut?: string;
  breakIn?: string;
  checkOut: string;
  shift: Shift;
  isLate: boolean;
  lateMinutes: number;
  isEarlyLeave: boolean;
  earlyMinutes: number;
  workMinutes: number;
  overtimeMinutes: number;
}

// สำหรับ Dashboard
export interface DashboardStats {
  totalEmployees: number;
  presentToday: number;
  absentToday: number;
  lateToday: number;
  pendingApprovals: number;
}

// สำหรับ Report
export interface AttendanceReport {
  employeeId: number;
  employeeName: string;
  department: string;
  totalWorkDays: number;
  presentDays: number;
  absentDays: number;
  lateDays: number;
  totalWorkHours: number;
  totalOvertimeHours: number;
  totalLeaves: number;
}
