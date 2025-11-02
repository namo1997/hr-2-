'use client';

import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import Link from 'next/link';

type AttendanceStatus =
  | 'PRESENT'
  | 'ABSENT'
  | 'LEAVE'
  | 'PENDING_LEAVE'
  | 'HOLIDAY'
  | 'DAY_OFF';

type WorkCalculationDay = {
  date: string;
  shiftId: number | null;
  shiftName: string | null;
  shiftStart: string | null;
  shiftEnd: string | null;
  checkIn: string | null;
  breakOut: string | null;
  breakIn: string | null;
  checkOut: string | null;
  scanCount: number;
  scanTimes: string[];
  shiftLateMinutes: number;
  breakLateMinutes: number;
  totalLateMinutes: number;
  lateMinutes: number;
  isLate: boolean;
  breakExceededMinutes: number;
  breakDeficitMinutes: number;
  overtimeMinutes: number;
  workingMinutes: number;
  missingCheckIn: boolean;
  missingCheckOut: boolean;
  missingBreak: boolean;
  derivedStatus: AttendanceStatus;
  status: AttendanceStatus;
  isAdjusted: boolean;
  adjustedBy: string | null;
  adjustedAt: string | null;
  notes: string | null;
  attendanceId: number | null;
  needsManualInput: boolean;
};

type WorkCalculationEmployee = {
  employeeId: number;
  employeeCode: string;
  employeeName: string | null;
  departmentName: string | null;
  branchName: string | null;
  zoneName: string | null;
  totals: {
    workingMinutes: number;
    overtimeMinutes: number;
    shiftLateMinutes: number;
    breakLateMinutes: number;
    totalLateMinutes: number;
    breakExceededMinutes: number;
    breakDeficitMinutes: number;
  };
  days: WorkCalculationDay[];
};

type WorkIndicators = {
  totalLate: number;
  totalBreakExceeded: number;
  totalBreakDeficit: number;
  totalMissingCheckOut: number;
  totalMissingCheckIn: number;
  totalMissingBreak: number;
  totalOvertime: number;
  totalAdjusted: number;
  totalWorkingHours: number;
  totalEmployees: number;
  manualPending: number;
};

type WorkCalculationResponse = {
  filters: {
    startDate: string;
    endDate: string;
    search?: string;
  };
  employees: WorkCalculationEmployee[];
  indicators: WorkIndicators;
  totalRecords: number;
  generatedAt: string;
};

const thaiDate = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('th-TH', { dateStyle: 'medium' }).format(date);
};

const thaiDateTime = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('th-TH', { dateStyle: 'medium', timeStyle: 'short' }).format(date);
};

const formatMinutes = (value: number) => {
  if (!value) return '-';
  const hours = Math.floor(value / 60);
  const minutes = value % 60;
  return `${hours} ชม. ${minutes} นาที`;
};

const defaultDateRange = () => {
  const today = new Date();
  const start = new Date(today.getFullYear(), today.getMonth(), 1);
  const format = (date: Date) => date.toISOString().split('T')[0];
  return {
    startDate: format(start),
    endDate: format(today),
  };
};

const statusBadges: Array<{ key: keyof WorkIndicators; label: string }> = [
  { key: 'totalLate', label: 'มาสาย' },
  { key: 'totalBreakExceeded', label: 'พักเกินเวลา' },
  { key: 'totalBreakDeficit', label: 'พักไม่ครบ' },
  { key: 'totalMissingCheckIn', label: 'ลืมบันทึกเข้า' },
  { key: 'totalMissingCheckOut', label: 'ลืมบันทึกออก' },
  { key: 'totalMissingBreak', label: 'ไม่มีบันทึกพัก' },
  { key: 'totalOvertime', label: 'มี OT' },
  { key: 'totalAdjusted', label: 'ยืนยันแล้ว' },
  { key: 'manualPending', label: 'รอตรวจสอบ' },
];

const statusLabels: Record<AttendanceStatus, string> = {
  PRESENT: 'ปกติ',
  ABSENT: 'ขาดงาน',
  LEAVE: 'ลางาน',
  PENDING_LEAVE: 'รออนุมัติลา',
  HOLIDAY: 'วันหยุดนักขัตฤกษ์',
  DAY_OFF: 'วันหยุดประจำสัปดาห์',
};

const statusStyles: Record<AttendanceStatus, string> = {
  PRESENT: 'bg-green-100 text-green-700',
  ABSENT: 'bg-red-100 text-red-700',
  LEAVE: 'bg-blue-100 text-blue-700',
  PENDING_LEAVE: 'bg-amber-100 text-amber-700',
  HOLIDAY: 'bg-purple-100 text-purple-700',
  DAY_OFF: 'bg-slate-100 text-slate-700',
};

const statusOptions: Array<{ value: AttendanceStatus; label: string }> = [
  { value: 'PRESENT', label: 'มาทำงาน' },
  { value: 'ABSENT', label: 'ขาดงาน' },
  { value: 'LEAVE', label: 'ลางาน' },
  { value: 'PENDING_LEAVE', label: 'รออนุมัติลา' },
  { value: 'DAY_OFF', label: 'วันหยุดประจำสัปดาห์' },
  { value: 'HOLIDAY', label: 'วันหยุดนักขัตฤกษ์' },
];

const WEEKDAY_KEYS = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'] as const;
type WeekdayKey = (typeof WEEKDAY_KEYS)[number];

const WEEKDAY_LABELS: Record<WeekdayKey, string> = {
  MON: 'จันทร์',
  TUE: 'อังคาร',
  WED: 'พุธ',
  THU: 'พฤหัสฯ',
  FRI: 'ศุกร์',
  SAT: 'เสาร์',
  SUN: 'อาทิตย์',
};

const WEEKDAY_FROM_INDEX: WeekdayKey[] = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];

export default function WorkCalculationPage() {
  const defaults = defaultDateRange();
  const [startDate, setStartDate] = useState(defaults.startDate);
  const [endDate, setEndDate] = useState(defaults.endDate);
  const [searchKeyword, setSearchKeyword] = useState('');
  const [selectedBranchId, setSelectedBranchId] = useState<string>('ALL');
  const [selectedDepartmentId, setSelectedDepartmentId] = useState<string>('ALL');
  const [branches, setBranches] = useState<Array<{ id: number; name: string }>>([]);
  const [departments, setDepartments] = useState<Array<{ id: number; name: string; branchId: number }>>([]);

  const fetchStructure = useCallback(async () => {
    try {
      const [branchResponse, departmentResponse] = await Promise.all([
        fetch('/api/branches'),
        fetch('/api/departments'),
      ]);
      if (branchResponse.ok) {
        const branchData = (await branchResponse.json()) as Array<{ id: number; name: string }>;
        setBranches(branchData);
      }
      if (departmentResponse.ok) {
        const departmentData = (await departmentResponse.json()) as Array<{
          id: number;
          name: string;
          branchId: number;
        }>;
        setDepartments(departmentData);
      }
    } catch (error) {
      console.warn('[WorkCalculation] failed to load structure', error);
    }
  }, []);

  const [employees, setEmployees] = useState<WorkCalculationEmployee[]>([]);
  const [indicators, setIndicators] = useState<WorkIndicators | null>(null);
  const [generatedAt, setGeneratedAt] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingEntry, setEditingEntry] = useState<{
    employeeId: number;
    employeeName: string | null;
    employeeCode: string;
    date: string;
    status: AttendanceStatus;
    notes: string;
    isLate: boolean;
    lateMinutes: number;
    adjustedBy: string;
    shiftId: number | null;
  } | null>(null);
  const [savingAdjustment, setSavingAdjustment] = useState(false);
  const [showDayOffDialog, setShowDayOffDialog] = useState(false);
  const [dayOffStartDate, setDayOffStartDate] = useState(defaults.startDate);
  const [dayOffEndDate, setDayOffEndDate] = useState(defaults.endDate);
  const [selectedDayOffEmployees, setSelectedDayOffEmployees] = useState<number[]>([]);
  const [dayOffStatus, setDayOffStatus] = useState<AttendanceStatus>('DAY_OFF');
  const [dayOffSaving, setDayOffSaving] = useState(false);
  const [dayOffError, setDayOffError] = useState<string | null>(null);
  const [dayOffSelections, setDayOffSelections] = useState<Record<number, WeekdayKey[]>>({});

  const filteredEmployees = useMemo(() => employees, [employees]);
  const hasSelection = selectedBranchId !== 'ALL' && selectedDepartmentId !== 'ALL';

  const fetchData = useCallback(async () => {
    if (selectedBranchId === 'ALL' || selectedDepartmentId === 'ALL') {
      setEmployees([]);
      setIndicators(null);
      setGeneratedAt(null);
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams();
      params.set('startDate', startDate);
      params.set('endDate', endDate);
      if (searchKeyword.trim()) {
        params.set('search', searchKeyword.trim());
      }
      if (selectedBranchId && selectedBranchId !== 'ALL') {
        params.set('branchId', selectedBranchId);
      }
      if (selectedDepartmentId && selectedDepartmentId !== 'ALL') {
        params.set('departmentId', selectedDepartmentId);
      }

      const response = await fetch(`/api/work-calculation?${params.toString()}`);
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data?.message ?? 'ไม่สามารถคำนวณข้อมูลได้');
      }

      const data = (await response.json()) as WorkCalculationResponse;
      setEmployees(data.employees);
      setIndicators(data.indicators);
      setGeneratedAt(data.generatedAt);
    } catch (err) {
      console.error('[WorkCalculation] error', err);
      setError(err instanceof Error ? err.message : 'ไม่สามารถคำนวณข้อมูลได้');
      setEmployees([]);
      setIndicators(null);
      setGeneratedAt(null);
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate, searchKeyword, selectedBranchId, selectedDepartmentId]);

  useEffect(() => {
    fetchStructure();
  }, [fetchStructure]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    setSelectedDepartmentId('ALL');
  }, [selectedBranchId]);

  const filteredDepartments = useMemo(() => {
    if (selectedBranchId === 'ALL') {
      return [] as Array<{ id: number; name: string; branchId: number }>;
    }
    const branchIdNumber = Number(selectedBranchId);
    if (Number.isNaN(branchIdNumber)) {
      return [] as Array<{ id: number; name: string; branchId: number }>;
    }
    return departments.filter((department) => department.branchId === branchIdNumber);
  }, [departments, selectedBranchId]);

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    fetchData();
  };

  const openEditDialog = (employee: WorkCalculationEmployee, day: WorkCalculationDay) => {
    setEditingEntry({
      employeeId: employee.employeeId,
      employeeName: employee.employeeName,
      employeeCode: employee.employeeCode,
      date: day.date,
      status: day.status ?? day.derivedStatus,
      notes: day.notes ?? '',
      isLate: day.isLate || day.totalLateMinutes > 0,
      lateMinutes: day.shiftLateMinutes ?? 0,
      adjustedBy: day.adjustedBy ?? '',
      shiftId: day.shiftId ?? null,
    });
  };

  const closeEditDialog = () => {
    if (!savingAdjustment) {
      setEditingEntry(null);
    }
  };

  const handleStatusChange = (status: AttendanceStatus) => {
    setEditingEntry((prev) => (prev ? { ...prev, status } : prev));
  };

  const handleLateToggle = (checked: boolean) => {
    setEditingEntry((prev) =>
      prev
        ? {
            ...prev,
            isLate: checked,
            lateMinutes: checked ? Math.max(prev.lateMinutes, 5) : 0,
          }
        : prev,
    );
  };

  const handleLateMinutesChange = (value: number) => {
    setEditingEntry((prev) =>
      prev
        ? {
            ...prev,
            lateMinutes: Math.max(0, Math.round(Number.isNaN(value) ? 0 : value)),
          }
        : prev,
    );
  };

  const handleNotesChange = (value: string) => {
    setEditingEntry((prev) => (prev ? { ...prev, notes: value } : prev));
  };

  const handleAdjustedByChange = (value: string) => {
    setEditingEntry((prev) => (prev ? { ...prev, adjustedBy: value } : prev));
  };

  const saveAdjustment = async () => {
    if (!editingEntry) {
      return;
    }
    try {
      setSavingAdjustment(true);
      const adjustedBy = editingEntry.adjustedBy.trim() || editingEntry.employeeName || 'ผู้ดูแลระบบ';
      const payload = {
        employeeId: editingEntry.employeeId,
        date: editingEntry.date,
        status: editingEntry.status,
        notes: editingEntry.notes.trim() ? editingEntry.notes.trim() : null,
        lateMinutes: editingEntry.isLate ? editingEntry.lateMinutes : 0,
        isLate: editingEntry.isLate,
        adjustedBy,
        shiftId: editingEntry.shiftId,
        markAdjusted: true,
      };

      const response = await fetch('/api/attendance/adjust', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data?.message ?? 'ไม่สามารถบันทึกการปรับข้อมูลได้');
      }

      await fetchData();
      setEditingEntry(null);
    } catch (err) {
      console.error('[WorkCalculation] adjust error', err);
      alert(err instanceof Error ? err.message : 'ไม่สามารถบันทึกการปรับข้อมูลได้');
    } finally {
      setSavingAdjustment(false);
    }
  };

  const openDayOffDialog = () => {
    if (filteredEmployees.length === 0) {
      return;
    }
    setDayOffSelections((prev) => {
      const next: Record<number, WeekdayKey[]> = {};
      filteredEmployees.forEach((employee) => {
        next[employee.employeeId] = prev[employee.employeeId] ?? [];
      });
      return next;
    });
    setSelectedDayOffEmployees(filteredEmployees.map((employee) => employee.employeeId));
    setDayOffStartDate(startDate);
    setDayOffEndDate(endDate);
    setDayOffStatus('DAY_OFF');
    setDayOffError(null);
    setShowDayOffDialog(true);
  };

  const closeDayOffDialog = () => {
    if (!dayOffSaving) {
      setShowDayOffDialog(false);
    }
  };

  const toggleDayOffEmployee = (employeeId: number) => {
    setSelectedDayOffEmployees((prev) =>
      prev.includes(employeeId) ? prev.filter((id) => id !== employeeId) : [...prev, employeeId],
    );
  };

  const toggleSelectAllDayOff = () => {
    setSelectedDayOffEmployees((prev) =>
      prev.length === filteredEmployees.length
        ? []
        : filteredEmployees.map((employee) => employee.employeeId),
    );
  };

  const toggleDayOffWeekday = (employeeId: number, day: WeekdayKey) => {
    setDayOffSelections((prev) => {
      const current = prev[employeeId] ?? [];
      const nextDays = current.includes(day)
        ? current.filter((item) => item !== day)
        : [...current, day];
      return { ...prev, [employeeId]: nextDays };
    });
    setSelectedDayOffEmployees((prev) =>
      prev.includes(employeeId) ? prev : [...prev, employeeId],
    );
  };

  const applyDayOffSettings = async () => {
    if (!dayOffStartDate || !dayOffEndDate) {
      setDayOffError('กรุณาระบุวันที่สำหรับวันหยุด');
      return;
    }

    if (selectedDayOffEmployees.length === 0) {
      setDayOffError('กรุณาเลือกพนักงานอย่างน้อย 1 คน');
      return;
    }

    const start = new Date(`${dayOffStartDate}T00:00:00`);
    const end = new Date(`${dayOffEndDate}T00:00:00`);

    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
      setDayOffError('รูปแบบวันที่ไม่ถูกต้อง');
      return;
    }

    if (end.getTime() < start.getTime()) {
      setDayOffError('วันที่สิ้นสุดต้องไม่ก่อนวันที่เริ่มต้น');
      return;
    }

    const dateList: Array<{ iso: string; weekday: WeekdayKey }> = [];
    for (
      let cursor = new Date(start);
      cursor.getTime() <= end.getTime();
      cursor.setDate(cursor.getDate() + 1)
    ) {
      const isoDate = cursor.toISOString().split('T')[0];
      const weekday = WEEKDAY_FROM_INDEX[cursor.getUTCDay()];
      dateList.push({ iso: `${isoDate}T00:00:00Z`, weekday });
    }

    if (dayOffStatus === 'DAY_OFF') {
      for (const employeeId of selectedDayOffEmployees) {
        const selections = dayOffSelections[employeeId] ?? [];
        if (selections.length === 0) {
          setDayOffError('กรุณาเลือกวันหยุดประจำสัปดาห์สำหรับพนักงานที่เลือก');
          return;
        }
        const hasMatchingDate = dateList.some((item) => selections.includes(item.weekday));
        if (!hasMatchingDate) {
          setDayOffError('ช่วงวันที่ที่เลือกไม่มีวันตรงกับวันหยุดที่กำหนด');
          return;
        }
      }
    }

    try {
      setDayOffSaving(true);
      setDayOffError(null);

      for (const employeeId of selectedDayOffEmployees) {
        const selections = dayOffSelections[employeeId] ?? [];
        const employeeDates =
          dayOffStatus === 'DAY_OFF'
            ? dateList.filter((item) => selections.includes(item.weekday))
            : dateList;

        for (const item of employeeDates) {
          const response = await fetch('/api/attendance/adjust', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              employeeId,
              date: item.iso,
              status: dayOffStatus,
              notes: 'กำหนดวันหยุดจากหน้าการคำนวณเวลาทำงาน',
              isLate: false,
              lateMinutes: 0,
              overtimeMinutes: 0,
              workMinutes: 0,
              adjustedBy: 'ระบบกำหนดวันหยุด',
              markAdjusted: true,
            }),
          });

          if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData?.message ?? 'ไม่สามารถบันทึกวันหยุดได้');
          }
        }
      }

      setShowDayOffDialog(false);
      await fetchData();
    } catch (err) {
      console.error('[WorkCalculation] day-off error', err);
      setDayOffError(err instanceof Error ? err.message : 'ไม่สามารถบันทึกวันหยุดได้');
    } finally {
      setDayOffSaving(false);
    }
  };

  let resultsContent: ReactNode = null;

  if (hasSelection) {
    if (loading) {
      resultsContent = (
        <div className="rounded-lg bg-white p-6 text-center text-slate-500 shadow">
          กำลังประมวลผลข้อมูล...
        </div>
      );
    } else if (filteredEmployees.length === 0) {
      resultsContent = (
        <div className="rounded-lg border border-dashed border-slate-300 bg-white p-10 text-center text-slate-500 shadow">
          ไม่พบข้อมูลการทำงานในช่วงวันที่เลือก
        </div>
      );
    } else {
      resultsContent = (
        <div className="space-y-6">
          {filteredEmployees.map((employee) => (
            <div key={employee.employeeId} className="space-y-4 rounded-lg bg-white p-6 shadow">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <h2 className="text-xl font-semibold text-slate-900">
                    {employee.employeeName ?? employee.employeeCode}
                  </h2>
                  <p className="text-sm text-slate-500">รหัสพนักงาน: {employee.employeeCode}</p>
                  <p className="text-xs text-slate-400">
                    {[
                      employee.zoneName ? `โซน ${employee.zoneName}` : null,
                      employee.branchName ? `สาขา ${employee.branchName}` : null,
                      employee.departmentName ? `แผนก ${employee.departmentName}` : null,
                    ]
                      .filter(Boolean)
                      .join(' • ')}
                  </p>
                </div>
                <div className="flex flex-wrap gap-3 text-sm text-slate-600">
                  <span className="rounded bg-slate-100 px-3 py-1">
                    เวลาทำงานรวม {formatMinutes(employee.totals.workingMinutes)}
                  </span>
                  <span className="rounded bg-blue-100 px-3 py-1 text-blue-700">
                    OT {formatMinutes(employee.totals.overtimeMinutes)}
                  </span>
                  <span className="rounded bg-amber-100 px-3 py-1 text-amber-700">
                    มาสายเข้างาน {formatMinutes(employee.totals.shiftLateMinutes)}
                  </span>
                  <span className="rounded bg-amber-100 px-3 py-1 text-amber-700">
                    มาสายจากพัก {formatMinutes(employee.totals.breakLateMinutes)}
                  </span>
                  <span className="rounded bg-amber-200 px-3 py-1 text-amber-800">
                    รวมมาสาย {formatMinutes(employee.totals.totalLateMinutes)}
                  </span>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-200">
                  <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
                    <tr>
                      <th className="px-4 py-3 text-left">วันที่</th>
                      <th className="px-4 py-3 text-left">กะที่กำหนด</th>
                      <th className="px-4 py-3 text-left">เวลาที่บันทึก</th>
                      <th className="px-4 py-3 text-left">สถานะ</th>
                      <th className="px-4 py-3 text-left">สรุป</th>
                      <th className="px-4 py-3 text-left">หมายเหตุ</th>
                      <th className="px-4 py-3 text-right">การดำเนินการ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-sm text-slate-700">
                    {employee.days.map((day) => (
                      <tr
                        key={`${employee.employeeId}-${day.date}`}
                        className={
                          day.needsManualInput
                            ? 'bg-yellow-50/60'
                            : day.isAdjusted
                              ? 'bg-green-50/40'
                              : ''
                        }
                      >
                        <td className="px-4 py-3 align-top">
                          <div className="font-medium text-slate-900">{thaiDate(day.date)}</div>
                          <div className="text-xs text-slate-400">{day.date.split('T')[0]}</div>
                        </td>
                        <td className="px-4 py-3 align-top">
                          {day.shiftName ? (
                            <>
                              <div className="font-medium text-slate-800">{day.shiftName}</div>
                              <div className="text-xs text-slate-500">
                                {day.shiftStart && day.shiftEnd
                                  ? `${day.shiftStart} - ${day.shiftEnd}`
                                  : '-'}
                              </div>
                            </>
                          ) : (
                            <span className="text-xs text-slate-500">ไม่มีกะที่กำหนด</span>
                          )}
                        </td>
                        <td className="px-4 py-3 align-top">
                          <div className="space-y-1 text-xs text-slate-600">
                            <div>เข้า: {day.checkIn ?? '-'}</div>
                            <div>พักออก: {day.breakOut ?? '-'}</div>
                            <div>พักเข้า: {day.breakIn ?? '-'}</div>
                            <div>ออก: {day.checkOut ?? '-'}</div>
                          </div>
                          {day.scanTimes.length > 0 && (
                            <div className="mt-2 flex flex-wrap gap-1">
                              {day.scanTimes.map((time) => (
                                <span
                                  key={`${day.date}-${time}`}
                                  className="rounded bg-slate-100 px-2 py-0.5 text-[11px] font-mono text-slate-700"
                                >
                                  {time}
                                </span>
                              ))}
                            </div>
                          )}
                          {day.needsManualInput && (
                            <div className="mt-2 rounded bg-yellow-100 px-3 py-1 text-xs text-yellow-800">
                              บันทึกสแกนไม่ครบ 4 ครั้ง – ระบบนับเป็นขาดงานจนกว่าจะยืนยัน
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3 align-top">
                          <div
                            className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold ${statusStyles[day.status]}`}
                          >
                            {statusLabels[day.status] ?? day.status}
                          </div>
                          {day.status !== day.derivedStatus && (
                            <div className="mt-1 text-[11px] text-slate-500">
                              เดิม: {statusLabels[day.derivedStatus] ?? day.derivedStatus}
                            </div>
                          )}
                          {day.isAdjusted && (
                            <div className="mt-1 text-[11px] font-medium text-green-600">
                              ยืนยันแล้ว{day.adjustedBy ? ` โดย ${day.adjustedBy}` : ''}
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3 align-top">
                          <ul className="space-y-1 text-[13px] text-slate-600">
                            {day.shiftLateMinutes > 0 && (
                              <li>มาสายจากเข้างาน {day.shiftLateMinutes} นาที</li>
                            )}
                            {day.breakLateMinutes > 0 && (
                              <li className="text-amber-700">มาสายจากการพัก {day.breakLateMinutes} นาที</li>
                            )}
                            {day.totalLateMinutes > 0 && (
                              <li className="text-amber-800">รวมมาสาย {day.totalLateMinutes} นาที</li>
                            )}
                            {day.breakDeficitMinutes > 0 && <li>พักไม่ครบ {day.breakDeficitMinutes} นาที</li>}
                            {day.breakExceededMinutes > 0 && <li>พักเกิน {day.breakExceededMinutes} นาที</li>}
                            {day.overtimeMinutes > 0 && <li>OT {formatMinutes(day.overtimeMinutes)}</li>}
                            {day.missingCheckIn && <li>ไม่มีบันทึกเข้า</li>}
                            {day.missingCheckOut && <li>ไม่มีบันทึกออก</li>}
                            {day.missingBreak && <li>ไม่มีบันทึกพัก</li>}
                            {day.totalLateMinutes === 0 &&
                              day.breakDeficitMinutes === 0 &&
                              day.breakExceededMinutes === 0 &&
                              day.overtimeMinutes === 0 &&
                              !day.missingCheckIn &&
                              !day.missingCheckOut &&
                              !day.missingBreak && <li className="text-green-600">ปกติ</li>}
                          </ul>
                        </td>
                        <td className="px-4 py-3 align-top text-sm text-slate-600">
                          {day.notes ? day.notes : <span className="text-xs text-slate-400">-</span>}
                        </td>
                        <td className="px-4 py-3 text-right align-top">
                          <button
                            type="button"
                            onClick={() => openEditDialog(employee, day)}
                            className="rounded border border-blue-500 px-3 py-1 text-sm font-medium text-blue-600 transition hover:bg-blue-50"
                          >
                            แก้ไข
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      );
    }
  }

  return (
    <div className="min-h-screen bg-slate-100 p-8">
      <div className="mx-auto max-w-7xl space-y-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">การคำนวณเวลาทำงาน</h1>
            <p className="mt-2 text-sm text-slate-600">
              ตรวจสอบข้อมูลการทำงานจากเครื่องสแกนนิ้ว เปรียบเทียบกับกะการทำงานเพื่อดูการมาสาย การพักเกินเวลา การลืมบันทึก และ OT
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link href="/" className="rounded bg-gray-200 px-4 py-2 text-sm hover:bg-gray-300">
              กลับหน้าหลัก
            </Link>
            <Link
              href="/import"
              className="rounded bg-blue-100 px-4 py-2 text-sm text-blue-700 hover:bg-blue-200"
            >
              นำเข้าข้อมูลสแกนนิ้ว
            </Link>
            <Link
              href="/attendance"
              className="rounded bg-gray-200 px-4 py-2 text-sm hover:bg-gray-300"
            >
              ดูข้อมูลบันทึกเวลา
            </Link>
          </div>
        </div>

        <section className="rounded-lg bg-white p-6 shadow">
          <form
            onSubmit={handleSubmit}
            className="grid gap-4 md:grid-cols-[repeat(3,minmax(0,1fr))_auto]"
          >
            <div>
              <label className="block text-sm font-medium text-slate-700">ตั้งแต่วันที่</label>
              <input
                type="date"
                value={startDate}
                onChange={(event) => setStartDate(event.target.value)}
                max={endDate}
                className="mt-1 w-full rounded-lg border px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700">ถึงวันที่</label>
              <input
                type="date"
                value={endDate}
                onChange={(event) => setEndDate(event.target.value)}
                min={startDate}
                className="mt-1 w-full rounded-lg border px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700">ค้นหาพนักงาน</label>
              <input
                type="text"
                value={searchKeyword}
                onChange={(event) => setSearchKeyword(event.target.value)}
                placeholder="รหัสหรือชื่อพนักงาน"
                className="mt-1 w-full rounded-lg border px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700">สาขา</label>
              <select
                value={selectedBranchId}
                onChange={(event) => setSelectedBranchId(event.target.value)}
                className="mt-1 w-full rounded-lg border px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500"
              >
                <option value="ALL">ทุกสาขา</option>
                {branches.map((branch) => (
                  <option key={branch.id} value={branch.id}>
                    {branch.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700">แผนก</label>
              <select
                value={selectedDepartmentId}
                onChange={(event) => setSelectedDepartmentId(event.target.value)}
                className="mt-1 w-full rounded-lg border px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500"
                disabled={selectedBranchId === 'ALL' || filteredDepartments.length === 0}
              >
                <option value="ALL">ทุกแผนก</option>
                {filteredDepartments.map((department) => (
                  <option key={department.id} value={department.id}>
                    {department.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-end">
              <button
                type="submit"
                disabled={loading}
                className="rounded-lg bg-blue-600 px-6 py-2 text-sm text-white hover:bg-blue-700 disabled:opacity-60"
              >
                {loading ? 'กำลังคำนวณ...' : 'คำนวณใหม่'}
              </button>
            </div>
          </form>
        </section>

        {!hasSelection && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
            กรุณาเลือกสาขาและแผนกก่อนทำการคำนวณข้อมูล
          </div>
        )}

        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {error}
          </div>
        )}

        {indicators && hasSelection && (
          <section className="rounded-lg bg-white p-6 shadow">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-semibold text-slate-900">สรุปสถานะสำคัญ</h2>
                {generatedAt && (
                  <p className="text-xs text-slate-500">อัปเดตเมื่อ {thaiDateTime(generatedAt)}</p>
                )}
              </div>
              <div className="flex flex-wrap gap-3 text-sm text-slate-600">
                <span className="rounded bg-slate-100 px-3 py-1">
                  พนักงานทั้งหมด {indicators.totalEmployees.toLocaleString('th-TH')}
                </span>
                <span className="rounded bg-emerald-100 px-3 py-1 text-emerald-700">
                  ชั่วโมงทำงานรวม {indicators.totalWorkingHours.toFixed(1)} ชม.
                </span>
              </div>
            </div>
            <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {statusBadges.map((badge) => {
                const highlightManual = badge.key === 'manualPending';
                return (
                  <div
                    key={badge.key}
                    className={`rounded-lg border p-4 ${
                      highlightManual ? 'border-amber-300 bg-amber-50' : 'border-slate-200'
                    }`}
                  >
                    <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                      {badge.label}
                    </p>
                    <p className="mt-2 text-2xl font-semibold text-slate-800">
                      {indicators[badge.key].toLocaleString('th-TH')}
                    </p>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {hasSelection && filteredEmployees.length > 0 && (
          <div className="flex justify-end">
            <button
              type="button"
              onClick={openDayOffDialog}
              className="rounded bg-emerald-600 px-4 py-2 text-sm font-medium text-white shadow hover:bg-emerald-700 disabled:opacity-60"
              disabled={loading}
            >
              กำหนดวันหยุดพนักงาน
            </button>
          </div>
        )}

        {resultsContent}

        {!hasSelection && !loading && (
          <div className="rounded-lg border border-dashed border-amber-200 bg-white p-10 text-center text-amber-700 shadow">
            เลือกสาขาและแผนกเพื่อเริ่มคำนวณข้อมูลการทำงาน
          </div>
        )}
      </div>

      {showDayOffDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 px-4">
          <div className="w-full max-w-3xl rounded-lg bg-white p-6 shadow-xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-lg font-semibold text-slate-900">กำหนดวันหยุดพนักงาน</h3>
                <p className="text-sm text-slate-600">
                  เลือกวันที่และพนักงานที่ต้องการกำหนดวันหยุด ระบบจะปรับสถานะเป็น{' '}
                  {dayOffStatus === 'HOLIDAY' ? 'วันหยุดพิเศษ' : 'วันหยุดประจำสัปดาห์'}
                </p>
              </div>
              <button
                type="button"
                onClick={closeDayOffDialog}
                className="rounded bg-slate-100 px-2 py-1 text-sm text-slate-500 hover:bg-slate-200"
                disabled={dayOffSaving}
              >
                ปิด
              </button>
            </div>
            <div className="mt-4 space-y-4">
              {dayOffError && (
                <div className="rounded border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">
                  {dayOffError}
                </div>
              )}
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">ตั้งแต่วันที่</label>
                  <input
                    type="date"
                    value={dayOffStartDate}
                    onChange={(event) => setDayOffStartDate(event.target.value)}
                    max={dayOffEndDate}
                    className="w-full rounded border px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500"
                    disabled={dayOffSaving}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">ถึงวันที่</label>
                  <input
                    type="date"
                    value={dayOffEndDate}
                    onChange={(event) => setDayOffEndDate(event.target.value)}
                    min={dayOffStartDate}
                    className="w-full rounded border px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500"
                    disabled={dayOffSaving}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">ประเภทวันหยุด</label>
                  <select
                    value={dayOffStatus}
                    onChange={(event) => setDayOffStatus(event.target.value as AttendanceStatus)}
                    className="w-full rounded border px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500"
                    disabled={dayOffSaving}
                  >
                    <option value="DAY_OFF">วันหยุดประจำสัปดาห์</option>
                    <option value="HOLIDAY">วันหยุดพิเศษ</option>
                  </select>
                </div>
                <div className="rounded border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-800">
                  ระบบจะสร้างหรือปรับข้อมูลลงเวลาอัตโนมัติสำหรับวันที่เลือก พร้อมบันทึกผู้ปรับเป็น &ldquo;ระบบกำหนดวันหยุด&rdquo;
                </div>
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">พนักงานที่ต้องการกำหนดวันหยุด</label>
                <div className="rounded border border-slate-200">
                  <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600">
                    <span>
                      เลือกแล้ว {selectedDayOffEmployees.length} / {filteredEmployees.length} คน
                    </span>
                    <button
                      type="button"
                      onClick={toggleSelectAllDayOff}
                      className="text-xs font-medium text-emerald-600 hover:text-emerald-700"
                      disabled={dayOffSaving}
                    >
                      {selectedDayOffEmployees.length === filteredEmployees.length ? 'ล้างการเลือก' : 'เลือกทั้งหมด'}
                    </button>
                  </div>
                  <div className="max-h-64 overflow-y-auto">
                    {filteredEmployees.length === 0 ? (
                      <div className="px-3 py-4 text-sm text-slate-500">ไม่มีพนักงานในรายการปัจจุบัน</div>
                    ) : (
                      filteredEmployees.map((employee) => {
                        const isChecked = selectedDayOffEmployees.includes(employee.employeeId);
                        const daySelections = dayOffSelections[employee.employeeId] ?? [];
                        return (
                          <div
                            key={employee.employeeId}
                            className="border-b border-slate-100 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
                          >
                            <label className="flex items-center gap-3">
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={() => toggleDayOffEmployee(employee.employeeId)}
                                className="h-4 w-4 text-emerald-600 focus:ring-emerald-500"
                                disabled={dayOffSaving}
                              />
                              <div className="flex flex-col">
                                <span className="font-medium">
                                  {employee.employeeName ?? employee.employeeCode}
                                </span>
                                <span className="text-xs text-slate-500">
                                  รหัสพนักงาน {employee.employeeCode}
                                  {employee.departmentName ? ` • ${employee.departmentName}` : ''}
                                </span>
                              </div>
                            </label>
                            <div className="mt-2 flex flex-wrap gap-2">
                              {WEEKDAY_KEYS.map((day) => {
                                const active = daySelections.includes(day);
                                return (
                                  <button
                                    key={day}
                                    type="button"
                                    onClick={(event) => {
                                      event.preventDefault();
                                      event.stopPropagation();
                                      toggleDayOffWeekday(employee.employeeId, day);
                                    }}
                                    className={`rounded px-3 py-1 text-xs transition ${
                                      active
                                        ? 'bg-emerald-600 text-white'
                                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                    }`}
                                    disabled={dayOffSaving}
                                  >
                                    {WEEKDAY_LABELS[day]}
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={closeDayOffDialog}
                className="rounded px-4 py-2 text-sm text-slate-500 hover:bg-slate-100"
                disabled={dayOffSaving}
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={applyDayOffSettings}
                className="rounded bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-60"
                disabled={dayOffSaving}
              >
                {dayOffSaving ? 'กำลังบันทึก...' : 'บันทึกวันหยุด'}
              </button>
            </div>
          </div>
        </div>
      )}

      {editingEntry && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 px-4">
          <div className="w-full max-w-lg rounded-lg bg-white p-6 shadow-xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-lg font-semibold text-slate-900">ปรับสถานะการทำงาน</h3>
                <p className="text-sm text-slate-600">
                  {editingEntry.employeeName ?? editingEntry.employeeCode} • {thaiDate(editingEntry.date)}
                </p>
              </div>
              <button
                type="button"
                onClick={closeEditDialog}
                className="rounded bg-slate-100 px-2 py-1 text-sm text-slate-500 hover:bg-slate-200"
                disabled={savingAdjustment}
              >
                ปิด
              </button>
            </div>
            <div className="mt-4 space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">สถานะ</label>
                <select
                  value={editingEntry.status}
                  onChange={(event) => handleStatusChange(event.target.value as AttendanceStatus)}
                  className="w-full rounded border px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500"
                >
                  {statusOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex items-center justify-between gap-4">
                <label className="flex items-center gap-2 text-sm text-slate-700">
                  <input
                    type="checkbox"
                    checked={editingEntry.isLate}
                    onChange={(event) => handleLateToggle(event.target.checked)}
                    className="h-4 w-4"
                  />
                  มาสาย
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min={0}
                    step={1}
                    value={editingEntry.lateMinutes}
                    onChange={(event) => handleLateMinutesChange(Number(event.target.value))}
                    className="w-24 rounded border px-2 py-1 text-sm focus:ring-2 focus:ring-blue-500"
                    disabled={!editingEntry.isLate}
                  />
                  <span className="text-xs text-slate-500">นาที</span>
                </div>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">หมายเหตุ</label>
                <textarea
                  value={editingEntry.notes}
                  onChange={(event) => handleNotesChange(event.target.value)}
                  rows={3}
                  className="w-full rounded border px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500"
                  placeholder="บันทึกเหตุผล เช่น ปรับจากขาดงานเป็นลางาน หรือสลับวันหยุด"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">ผู้ยืนยัน</label>
                <input
                  type="text"
                  value={editingEntry.adjustedBy}
                  onChange={(event) => handleAdjustedByChange(event.target.value)}
                  className="w-full rounded border px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500"
                  placeholder="ระบุชื่อผู้ยืนยัน"
                />
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={closeEditDialog}
                className="rounded px-4 py-2 text-sm text-slate-500 hover:bg-slate-100"
                disabled={savingAdjustment}
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={saveAdjustment}
                className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60"
                disabled={savingAdjustment}
              >
                {savingAdjustment ? 'กำลังบันทึก...' : 'ยืนยันการแก้ไข'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
