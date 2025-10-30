'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';

type AttendanceStatus =
  | 'PRESENT'
  | 'ABSENT'
  | 'LEAVE'
  | 'PENDING_LEAVE'
  | 'HOLIDAY'
  | 'DAY_OFF';

type AttendanceStatusCounts = Record<AttendanceStatus, number>;

interface AttendanceRecord {
  id: number;
  date: string;
  employeeId: number;
  employeeCode: string;
  employeeName: string;
  departmentId: number | null;
  departmentName: string | null;
  branchId: number | null;
  branchName: string | null;
  zoneId: number | null;
  zoneName: string | null;
  status: AttendanceStatus;
  isLate: boolean;
  lateMinutes: number;
  isEarlyLeave: boolean;
  earlyMinutes: number;
  workMinutes: number;
  overtimeMinutes: number;
  checkIn?: string | null;
  breakOut?: string | null;
  breakIn?: string | null;
  checkOut?: string | null;
  notes?: string | null;
}

interface AttendanceSummary {
  totalRecords: number;
  distinctEmployees: number;
  statusCounts: Record<string, number>;
  lateCount: number;
  earlyLeaveCount: number;
  totalWorkMinutes: number;
  totalOvertimeMinutes: number;
}

interface DepartmentOption {
  id: number;
  code: string;
  name: string;
}

interface AttendanceResponse {
  records: AttendanceRecord[];
  summary: AttendanceSummary;
  generatedAt: string;
}

const getDefaultDateRange = () => {
  const today = new Date();
  const start = new Date(today.getFullYear(), today.getMonth(), 1);
  const format = (date: Date) => date.toISOString().split('T')[0];
  return {
    startDate: format(start),
    endDate: format(today),
  };
};

const formatDate = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return new Intl.DateTimeFormat('th-TH', {
    dateStyle: 'medium',
  }).format(date);
};

const formatMinutesToHours = (minutes: number) => {
  if (!minutes) return '0 ชม.';
  const hours = minutes / 60;
  return `${hours.toFixed(2)} ชม.`;
};

const formatStatusLabel = (status: AttendanceStatus) => {
  switch (status) {
    case 'PRESENT':
      return 'มาทำงาน';
    case 'ABSENT':
      return 'ขาดงาน';
    case 'LEAVE':
      return 'ลา';
    case 'PENDING_LEAVE':
      return 'รออนุมัติลา';
    case 'HOLIDAY':
      return 'วันหยุด';
    case 'DAY_OFF':
      return 'วันหยุดประจำ';
    default:
      return status;
  }
};

const statusBadgeStyles: Record<AttendanceStatus, string> = {
  PRESENT: 'bg-green-100 text-green-700',
  ABSENT: 'bg-red-100 text-red-700',
  LEAVE: 'bg-yellow-100 text-yellow-700',
  PENDING_LEAVE: 'bg-indigo-100 text-indigo-700',
  HOLIDAY: 'bg-blue-100 text-blue-700',
  DAY_OFF: 'bg-slate-100 text-slate-600',
};

const attendanceTabs: { key: AttendanceStatus | 'ALL'; label: string }[] = [
  { key: 'ALL', label: 'ทั้งหมด' },
  { key: 'PRESENT', label: 'มาทำงาน' },
  { key: 'ABSENT', label: 'ขาดงาน' },
  { key: 'LEAVE', label: 'ลา' },
  { key: 'PENDING_LEAVE', label: 'รออนุมัติลา' },
  { key: 'HOLIDAY', label: 'วันหยุด' },
  { key: 'DAY_OFF', label: 'วันหยุดประจำ' },
];

export default function AttendancePage() {
  const defaultRange = getDefaultDateRange();
  const [startDate, setStartDate] = useState(defaultRange.startDate);
  const [endDate, setEndDate] = useState(defaultRange.endDate);
  const [departmentId, setDepartmentId] = useState<string>('ALL');
  const [searchKeyword, setSearchKeyword] = useState('');
  const [statusFilter, setStatusFilter] = useState<AttendanceStatus | 'ALL'>('ALL');

  const [departments, setDepartments] = useState<DepartmentOption[]>([]);
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [summary, setSummary] = useState<AttendanceSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);

  const filteredRecords = useMemo(() => {
    if (statusFilter === 'ALL') {
      return records;
    }
    return records.filter((record) => record.status === statusFilter);
  }, [records, statusFilter]);

  const filteredSummary = useMemo(() => {
    if (!summary) return null;
    if (statusFilter === 'ALL') return summary;

    const filtered = records.filter((record) => record.status === statusFilter);
    const statusCounts: AttendanceStatusCounts = {};
    let lateCount = 0;
    let earlyLeaveCount = 0;
    let totalWorkMinutes = 0;
    let totalOvertimeMinutes = 0;

    filtered.forEach((record) => {
      statusCounts[record.status] = (statusCounts[record.status] ?? 0) + 1;
      totalWorkMinutes += record.workMinutes;
      totalOvertimeMinutes += record.overtimeMinutes;
      if (record.isLate) lateCount += 1;
      if (record.isEarlyLeave) earlyLeaveCount += 1;
    });

    return {
      totalRecords: filtered.length,
      distinctEmployees: new Set(filtered.map((record) => record.employeeId)).size,
      statusCounts,
      lateCount,
      earlyLeaveCount,
      totalWorkMinutes,
      totalOvertimeMinutes,
    } satisfies AttendanceSummary;
  }, [summary, records, statusFilter]);

  const fetchDepartments = useCallback(async () => {
    try {
      const response = await fetch('/api/departments');
      if (!response.ok) {
        throw new Error('ไม่สามารถโหลดรายชื่อแผนกได้');
      }
      const data = (await response.json()) as DepartmentOption[];
      setDepartments(data);
    } catch (err) {
      console.error('[AttendancePage] load departments error', err);
    }
  }, []);

  const fetchAttendance = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams();
      params.set('startDate', startDate);
      params.set('endDate', endDate);
      if (departmentId && departmentId !== 'ALL') {
        params.set('departmentId', departmentId);
      }
      if (searchKeyword.trim()) {
        params.set('search', searchKeyword.trim());
      }

      const response = await fetch(`/api/attendance?${params.toString()}`);
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data?.message ?? 'ไม่สามารถโหลดข้อมูลการบันทึกเวลาได้');
      }

      const data = (await response.json()) as AttendanceResponse;
      setRecords(data.records);
      setSummary(data.summary);
      setLastUpdated(data.generatedAt);
    } catch (err) {
      console.error('[AttendancePage] load attendance error', err);
      setError(err instanceof Error ? err.message : 'ไม่สามารถโหลดข้อมูลการบันทึกเวลาได้');
      setRecords([]);
      setSummary(null);
      setLastUpdated(null);
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate, departmentId, searchKeyword]);

  useEffect(() => {
    fetchDepartments();
    fetchAttendance();
  }, [fetchDepartments, fetchAttendance]);

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    fetchAttendance();
  };

  const summaryCards = useMemo(() => {
    if (!filteredSummary) return [];
    return [
      {
        label: 'บันทึกทั้งหมด',
        value: filteredSummary.totalRecords.toLocaleString('th-TH'),
        tone: 'text-slate-700',
        highlight: 'bg-slate-100',
      },
      {
        label: 'จำนวนพนักงาน',
        value: filteredSummary.distinctEmployees.toLocaleString('th-TH'),
        tone: 'text-slate-700',
        highlight: 'bg-slate-100',
      },
      {
        label: 'มาทำงาน',
        value: (filteredSummary.statusCounts.PRESENT ?? 0).toLocaleString('th-TH'),
        tone: 'text-green-700',
        highlight: 'bg-green-100',
      },
      {
        label: 'มาสาย',
        value: filteredSummary.lateCount.toLocaleString('th-TH'),
        tone: 'text-orange-700',
        highlight: 'bg-orange-100',
      },
      {
        label: 'ลา',
        value: (filteredSummary.statusCounts.LEAVE ?? 0).toLocaleString('th-TH'),
        tone: 'text-yellow-700',
        highlight: 'bg-yellow-100',
      },
      {
        label: 'ขาดงาน',
        value: (filteredSummary.statusCounts.ABSENT ?? 0).toLocaleString('th-TH'),
        tone: 'text-red-700',
        highlight: 'bg-red-100',
      },
      {
        label: 'เวลาทำงานรวม',
        value: formatMinutesToHours(filteredSummary.totalWorkMinutes),
        tone: 'text-blue-700',
        highlight: 'bg-blue-100',
      },
      {
        label: 'OT รวม',
        value: formatMinutesToHours(filteredSummary.totalOvertimeMinutes),
        tone: 'text-purple-700',
        highlight: 'bg-purple-100',
      },
    ];
  }, [filteredSummary]);

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="mx-auto max-w-7xl space-y-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">ข้อมูลการบันทึกเวลา</h1>
            <p className="mt-2 text-sm text-slate-600">
              ตรวจสอบการเข้า-ออกงานที่นำเข้าจากเครื่องสแกนนิ้ว สามารถกรองตามช่วงเวลา แผนก และค้นหาพนักงานได้
            </p>
          </div>
          <Link href="/" className="rounded bg-gray-200 px-6 py-2 text-sm hover:bg-gray-300">
            กลับหน้าหลัก
          </Link>
        </div>

        <section className="rounded-lg bg-white p-6 shadow">
          <form onSubmit={handleSubmit} className="grid gap-4 md:grid-cols-4">
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
              <label className="block text-sm font-medium text-slate-700">แผนก</label>
              <select
                value={departmentId}
                onChange={(event) => setDepartmentId(event.target.value)}
                className="mt-1 w-full rounded-lg border px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500"
              >
                <option value="ALL">ทุกแผนก</option>
                {departments.map((department) => (
                  <option key={department.id} value={department.id}>
                    {department.code} - {department.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700">ค้นหาพนักงาน</label>
              <div className="mt-1 flex items-center gap-2">
                <input
                  type="text"
                  value={searchKeyword}
                  onChange={(event) => setSearchKeyword(event.target.value)}
                  placeholder="รหัสหรือชื่อพนักงาน"
                  className="w-full rounded-lg border px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500"
                />
                <button
                  type="submit"
                  disabled={loading}
                  className="whitespace-nowrap rounded-lg bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700 disabled:opacity-60"
                >
                  {loading ? 'กำลังค้นหา...' : 'ค้นหา'}
                </button>
              </div>
            </div>
          </form>
        </section>

        <section className="rounded-lg bg-white p-6 shadow">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-semibold text-slate-900">สรุปภาพรวม</h2>
              {lastUpdated && (
                <p className="text-xs text-slate-500">อัปเดตล่าสุด: {formatDate(lastUpdated)}</p>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              {attendanceTabs.map((tab) => (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setStatusFilter(tab.key)}
                  className={`rounded-full px-4 py-1 text-sm ${
                    statusFilter === tab.key
                      ? 'bg-blue-600 text-white shadow'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {error && (
            <div className="mt-4 rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              {error}
            </div>
          )}

          {summaryCards.length > 0 && (
            <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {summaryCards.map((card) => (
                <div
                  key={card.label}
                  className={`rounded-lg p-4 shadow-sm ${card.highlight}`}
                >
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                    {card.label}
                  </p>
                  <p className={`mt-2 text-2xl font-semibold ${card.tone}`}>{card.value}</p>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="rounded-lg bg-white shadow">
          <div className="flex items-center justify-between border-b px-6 py-4">
            <div>
              <h2 className="text-xl font-semibold text-slate-900">รายละเอียดการบันทึกเวลา</h2>
              <p className="text-xs text-slate-500">
                วันที่ {formatDate(startDate)} ถึง {formatDate(endDate)}
              </p>
            </div>
            {loading && <span className="text-sm text-slate-500">กำลังโหลดข้อมูล...</span>}
          </div>

          {filteredRecords.length === 0 ? (
            <div className="px-6 py-16 text-center text-slate-500">
              <p>ยังไม่มีข้อมูลการบันทึกเวลาสำหรับเงื่อนไขที่เลือก</p>
              <p className="mt-2 text-sm">
                หากเพิ่งนำเข้าข้อมูลจากเครื่องสแกนนิ้ว ลองตรวจสอบช่วงวันที่ หรือกลับไปที่หน้าการนำเข้าข้อมูลเพื่ออัปโหลดไฟล์
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium uppercase tracking-wide">วันที่</th>
                    <th className="px-4 py-3 text-left font-medium uppercase tracking-wide">รหัสพนักงาน</th>
                    <th className="px-4 py-3 text-left font-medium uppercase tracking-wide">ชื่อพนักงาน</th>
                    <th className="px-4 py-3 text-left font-medium uppercase tracking-wide">โซน / สาขา / แผนก</th>
                    <th className="px-4 py-3 text-left font-medium uppercase tracking-wide">เข้า</th>
                    <th className="px-4 py-3 text-left font-medium uppercase tracking-wide">พักออก</th>
                    <th className="px-4 py-3 text-left font-medium uppercase tracking-wide">พักเข้า</th>
                    <th className="px-4 py-3 text-left font-medium uppercase tracking-wide">เลิก</th>
                    <th className="px-4 py-3 text-left font-medium uppercase tracking-wide">สถานะ</th>
                    <th className="px-4 py-3 text-right font-medium uppercase tracking-wide">ชั่วโมงทำงาน</th>
                    <th className="px-4 py-3 text-right font-medium uppercase tracking-wide">OT</th>
                    <th className="px-4 py-3 text-left font-medium uppercase tracking-wide">หมายเหตุ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 bg-white">
                  {filteredRecords.map((record) => (
                    <tr key={record.id}>
                      <td className="px-4 py-3 text-sm text-slate-700">{formatDate(record.date)}</td>
                      <td className="px-4 py-3 text-sm font-mono text-slate-700">{record.employeeCode}</td>
                      <td className="px-4 py-3 text-sm text-slate-700">{record.employeeName}</td>
                      <td className="px-4 py-3 text-sm text-slate-600">
                        {[record.zoneName, record.branchName, record.departmentName]
                          .filter(Boolean)
                          .join(' / ') || '-'}
                      </td>
                      <td className="px-4 py-3 text-sm font-mono">
                        {record.checkIn ?? '-'}
                        {record.isLate && (
                          <span className="ml-2 text-xs font-medium text-red-600">
                            +{record.lateMinutes} นาที
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm font-mono">{record.breakOut ?? '-'}</td>
                      <td className="px-4 py-3 text-sm font-mono">{record.breakIn ?? '-'}</td>
                      <td className="px-4 py-3 text-sm font-mono">
                        {record.checkOut ?? '-'}
                        {record.isEarlyLeave && (
                          <span className="ml-2 text-xs font-medium text-orange-600">
                            -{record.earlyMinutes} นาที
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <span
                          className={`rounded-full px-2 py-1 text-xs font-medium ${statusBadgeStyles[record.status]}`}
                        >
                          {formatStatusLabel(record.status)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right text-sm text-slate-700">
                        {(record.workMinutes / 60).toFixed(2)}
                      </td>
                      <td className="px-4 py-3 text-right text-sm text-slate-700">
                        {record.overtimeMinutes > 0 ? (record.overtimeMinutes / 60).toFixed(2) : '-'}
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-600">
                        {record.notes ?? '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
