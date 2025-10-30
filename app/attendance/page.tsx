'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';

type AttendanceRecord = {
  id: number;
  employeeCode: string;
  employeeName: string | null;
  departmentId: number | null;
  departmentName: string | null;
  branchId: number | null;
  branchName: string | null;
  zoneId: number | null;
  zoneName: string | null;
  date: string;
  scanCount: number;
  scanTimes: string[];
  importSource: string;
  importedAt: string;
};

type AttendanceSummary = {
  totalRecords: number;
  totalEmployees: number;
  totalScans: number;
};

type AttendanceResponse = {
  filters: {
    startDate: string;
    endDate: string;
    departmentId?: string | null;
    search?: string;
  };
  summary: AttendanceSummary;
  records: AttendanceRecord[];
  generatedAt: string;
};

type DepartmentOption = {
  id: number;
  code: string;
  name: string;
};

const thaiDate = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('th-TH', { dateStyle: 'medium' }).format(date);
};

const thaiDateTime = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('th-TH', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
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

export default function AttendancePage() {
  const defaults = defaultDateRange();
  const [startDate, setStartDate] = useState(defaults.startDate);
  const [endDate, setEndDate] = useState(defaults.endDate);
  const [departmentId, setDepartmentId] = useState<string>('ALL');
  const [searchKeyword, setSearchKeyword] = useState('');

  const [departments, setDepartments] = useState<DepartmentOption[]>([]);
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [summary, setSummary] = useState<AttendanceSummary | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const summaryCards = useMemo(() => (
    summary
      ? [
          {
            label: 'บันทึกทั้งหมด',
            value: summary.totalRecords.toLocaleString('th-TH'),
            tone: 'text-slate-700',
            highlight: 'bg-slate-100',
          },
          {
            label: 'จำนวนพนักงาน',
            value: summary.totalEmployees.toLocaleString('th-TH'),
            tone: 'text-blue-700',
            highlight: 'bg-blue-100',
          },
          {
            label: 'จำนวนครั้งสแกน',
            value: summary.totalScans.toLocaleString('th-TH'),
            tone: 'text-green-700',
            highlight: 'bg-green-100',
          },
        ]
      : []
  ), [summary]);

  const fetchDepartments = useCallback(async () => {
    try {
      const response = await fetch('/api/departments');
      if (!response.ok) {
        throw new Error('ไม่สามารถโหลดรายการแผนกได้');
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

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="mx-auto max-w-7xl space-y-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">ข้อมูลการบันทึกเวลา</h1>
            <p className="mt-2 text-sm text-slate-600">
              ตรวจสอบการเข้า-ออกงานจากเครื่องสแกนนิ้ว สามารถกรองตามช่วงวันที่ แผนก และค้นหาพนักงานได้
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link href="/import" className="rounded bg-blue-100 px-4 py-2 text-sm text-blue-700 hover:bg-blue-200">
              นำเข้าข้อมูลสแกนนิ้ว
            </Link>
            <Link href="/" className="rounded bg-gray-200 px-6 py-2 text-sm hover:bg-gray-300">
              กลับหน้าหลัก
            </Link>
          </div>
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
                <p className="text-xs text-slate-500">อัปเดตล่าสุด: {thaiDateTime(lastUpdated)}</p>
              )}
            </div>
            {error && (
              <div className="rounded border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">
                {error}
              </div>
            )}
          </div>

          {summaryCards.length > 0 && (
            <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {summaryCards.map((card) => (
                <div key={card.label} className={`rounded-lg p-4 shadow-sm ${card.highlight}`}>
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
              <h2 className="text-xl font-semibold text-slate-900">รายละเอียดการสแกน</h2>
              <p className="text-xs text-slate-500">
                วันที่ {thaiDate(startDate)} ถึง {thaiDate(endDate)} • ทั้งหมด {records.length.toLocaleString('th-TH')} รายการ
              </p>
            </div>
            {loading && <span className="text-sm text-slate-500">กำลังโหลดข้อมูล...</span>}
          </div>

          {records.length === 0 ? (
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
                    <th className="px-4 py-3 text-left font-medium uppercase tracking-wide">พนักงาน</th>
                    <th className="px-4 py-3 text-left font-medium uppercase tracking-wide">โซน / สาขา / แผนก</th>
                    <th className="px-4 py-3 text-left font-medium uppercase tracking-wide">จำนวนครั้ง</th>
                    <th className="px-4 py-3 text-left font-medium uppercase tracking-wide">เวลาที่สแกน</th>
                    <th className="px-4 py-3 text-left font-medium uppercase tracking-wide">ข้อมูลนำเข้า</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 bg-white">
                  {records.map((record) => (
                    <tr key={record.id}>
                      <td className="px-4 py-3 text-sm text-slate-700">{thaiDate(record.date)}</td>
                      <td className="px-4 py-3 text-sm text-slate-800">
                        <div className="font-mono text-xs text-slate-500">{record.employeeCode}</div>
                        <div>{record.employeeName ?? '-'}</div>
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-600">
                        {[record.zoneName, record.branchName, record.departmentName]
                          .filter(Boolean)
                          .join(' / ') || '-'}
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-700">{record.scanCount.toLocaleString('th-TH')}</td>
                      <td className="px-4 py-3 text-sm text-slate-700">
                        <div className="flex flex-wrap gap-2">
                          {record.scanTimes.length === 0 && <span className="text-slate-400">-</span>}
                          {record.scanTimes.map((time) => (
                            <span key={`${record.id}-${time}`} className="rounded bg-slate-100 px-2 py-1 font-mono text-xs">
                              {time}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-600">
                        <div>{record.importSource}</div>
                        <div className="text-xs text-slate-400">อัปโหลดเมื่อ {thaiDateTime(record.importedAt)}</div>
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
