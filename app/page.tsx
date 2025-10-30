'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';

type WorkCalculationRecord = {
  id: number;
  employeeCode: string;
  employeeName: string | null;
  departmentName: string | null;
  branchName: string | null;
  zoneName: string | null;
  date: string;
  shiftName: string | null;
  shiftStart: string | null;
  shiftEnd: string | null;
  checkIn: string | null;
  breakOut: string | null;
  breakIn: string | null;
  checkOut: string | null;
  scanCount: number;
  scanTimes: string[];
  importSource: string;
  importedAt: string;
  lateMinutes: number;
  breakExceededMinutes: number;
  overtimeMinutes: number;
  missingCheckIn: boolean;
  missingCheckOut: boolean;
  missingBreak: boolean;
  workingMinutes: number;
};

type WorkIndicators = {
  totalLate: number;
  totalBreakExceeded: number;
  totalMissingCheckOut: number;
  totalMissingCheckIn: number;
  totalMissingBreak: number;
  totalOvertime: number;
  totalWorkingHours: number;
};

type WorkCalculationResponse = {
  records: WorkCalculationRecord[];
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

const statusBadges = [
  { key: 'totalLate', label: 'มาสาย' },
  { key: 'totalBreakExceeded', label: 'พักเกินเวลา' },
  { key: 'totalMissingCheckIn', label: 'ลืมบันทึกเข้า' },
  { key: 'totalMissingCheckOut', label: 'ลืมบันทึกออก' },
  { key: 'totalMissingBreak', label: 'ไม่มีบันทึกพัก' },
  { key: 'totalOvertime', label: 'มี OT' },
] as const;

export default function WorkCalculationPage() {
  const defaults = defaultDateRange();
  const [startDate, setStartDate] = useState(defaults.startDate);
  const [endDate, setEndDate] = useState(defaults.endDate);
  const [searchKeyword, setSearchKeyword] = useState('');

  const [records, setRecords] = useState<WorkCalculationRecord[]>([]);
  const [indicators, setIndicators] = useState<WorkIndicators | null>(null);
  const [generatedAt, setGeneratedAt] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const filteredRecords = useMemo(() => records, [records]);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams();
      params.set('startDate', startDate);
      params.set('endDate', endDate);
      if (searchKeyword.trim()) {
        params.set('search', searchKeyword.trim());
      }

      const response = await fetch(`/api/work-calculation?${params.toString()}`);
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data?.message ?? 'ไม่สามารถคำนวณข้อมูลได้');
      }

      const data = (await response.json()) as WorkCalculationResponse;
      setRecords(data.records);
      setIndicators(data.indicators);
      setGeneratedAt(data.generatedAt);
    } catch (err) {
      console.error('[WorkCalculation] error', err);
      setError(err instanceof Error ? err.message : 'ไม่สามารถคำนวณข้อมูลได้');
      setRecords([]);
      setIndicators(null);
      setGeneratedAt(null);
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate, searchKeyword]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    fetchData();
  };

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
          <form onSubmit={handleSubmit} className="grid gap-4 md:grid-cols-[repeat(3,minmax(0,1fr))_auto]">
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

        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {error}
          </div>
        )}

        {indicators && (
          <section className="rounded-lg bg-white p-6 shadow">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-semibold text-slate-900">สรุปสถานะสำคัญ</h2>
                {generatedAt && (
                  <p className="text-xs text-slate-500">อัปเดตเมื่อ {thaiDateTime(generatedAt)}</p>
                )}
              </div>
            </div>
            <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {statusBadges.map((badge) => (
                <div key={badge.key} className="rounded-lg border border-slate-200 p-4">
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                    {badge.label}
                  </p>
                  <p className="mt-2 text-2xl font-semibold text-slate-800">
                    {indicators[badge.key].toLocaleString('th-TH')}
                  </p>
                </div>
              ))}
              <div className="rounded-lg border border-slate-200 p-4">
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                  ชั่วโมงทำงานรวม (ประมาณ)
                </p>
                <p className="mt-2 text-2xl font-semibold text-slate-800">
                  {indicators.totalWorkingHours.toFixed(2)} ชม.
                </p>
              </div>
            </div>
          </section>
        )}

        <section className="rounded-lg bg-white shadow">
          <div className="flex items-center justify-between border-b px-6 py-4">
            <div>
              <h2 className="text-xl font-semibold text-slate-900">รายละเอียดการคำนวณ</h2>
              <p className="text-xs text-slate-500">
                วันที่ {thaiDate(startDate)} ถึง {thaiDate(endDate)} • ทั้งหมด {filteredRecords.length.toLocaleString('th-TH')} บันทึก
              </p>
            </div>
            {loading && <span className="text-sm text-slate-500">กำลังโหลดข้อมูล...</span>}
          </div>

          {filteredRecords.length === 0 ? (
            <div className="px-6 py-16 text-center text-slate-500">
              <p>ยังไม่มีข้อมูลสำหรับเงื่อนไขที่เลือก</p>
              <p className="mt-2 text-sm">
                หากเพิ่งนำเข้าข้อมูลจากเครื่องสแกนนิ้ว กรุณาเลือกช่วงวันที่และคำนวณใหม่
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium uppercase tracking-wide">วันที่</th>
                    <th className="px-4 py-3 text-left font-medium uppercase tracking-wide">พนักงาน</th>
                    <th className="px-4 py-3 text-left font-medium uppercase tracking-wide">กะ / เวลา</th>
                    <th className="px-4 py-3 text-left font-medium uppercase tracking-wide">เวลาที่สแกน</th>
                    <th className="px-4 py-3 text-left font-medium uppercase tracking-wide">สถานะ</th>
                    <th className="px-4 py-3 text-left font-medium uppercase tracking-wide">หมายเหตุ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 bg-white">
                  {filteredRecords.map((record) => (
                    <tr key={record.id}>
                      <td className="px-4 py-3 text-sm text-slate-700">{thaiDate(record.date)}</td>
                      <td className="px-4 py-3 text-sm text-slate-800">
                        <div className="font-mono text-xs text-slate-500">{record.employeeCode}</div>
                        <div>{record.employeeName ?? '-'}</div>
                        <div className="text-xs text-slate-500">{[record.zoneName, record.branchName, record.departmentName].filter(Boolean).join(' / ') || '-'}</div>
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-700">
                        <div>{record.shiftName ?? '-'}</div>
                        <div className="text-xs text-slate-500">
                          {record.shiftStart && record.shiftEnd ? `${record.shiftStart} - ${record.shiftEnd}` : '-'}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-700">
                        <div className="flex flex-wrap gap-2">
                          {record.scanTimes.map((time) => (
                            <span key={`${record.id}-${time}`} className="rounded bg-slate-100 px-2 py-1 font-mono text-xs">
                              {time}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-700">
                        <ul className="space-y-1">
                          {record.lateMinutes > 0 && (
                            <li className="text-orange-600">มาสาย {record.lateMinutes} นาที</li>
                          )}
                          {record.breakExceededMinutes > 0 && (
                            <li className="text-amber-600">พักเกินเวลา {record.breakExceededMinutes} นาที</li>
                          )}
                          {record.overtimeMinutes > 0 && (
                            <li className="text-blue-600">OT {formatMinutes(record.overtimeMinutes)}</li>
                          )}
                          {record.missingCheckIn && <li className="text-red-600">ไม่มีบันทึกเข้า</li>}
                          {record.missingCheckOut && <li className="text-red-600">ไม่มีบันทึกออก</li>}
                          {record.missingBreak && <li className="text-slate-500">ไม่มีบันทึกพัก</li>}
                          {record.lateMinutes === 0 &&
                            record.breakExceededMinutes === 0 &&
                            record.overtimeMinutes === 0 &&
                            !record.missingCheckIn &&
                            !record.missingCheckOut &&
                            !record.missingBreak && (
                              <li className="text-green-600">ปกติ</li>
                            )}
                        </ul>
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-600">
                        <div>นำเข้าจาก {record.importSource}</div>
                        <div className="text-xs text-slate-400">เมื่อ {thaiDateTime(record.importedAt)}</div>
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
