'use client';

import { useEffect, useMemo, useState } from 'react';
import type { ChangeEvent, FormEvent } from 'react';
import Link from 'next/link';

type LeaveType = 'SICK' | 'PERSONAL' | 'ANNUAL' | 'OTHER';

type LeaveDurationMode = 'FULL_DAY' | 'HOURLY' | 'MIXED';

const durationModeOptions: Array<{ value: LeaveDurationMode; label: string; description: string }> = [
  { value: 'FULL_DAY', label: 'ลาเต็มวัน', description: 'เลือกวันที่ต้องการลาเต็มวัน ระบบคำนวณเป็นจำนวนวัน' },
  { value: 'HOURLY', label: 'ลารายชั่วโมง', description: 'เลือกช่วงเวลาเริ่ม - สิ้นสุดในวันเดียว ขั้นต่ำ 30 นาที' },
  { value: 'MIXED', label: 'ลาแบบผสม', description: 'เลือกวันที่เป็นวันเต็มและเพิ่มช่วงเวลาบางส่วนได้' },
];

const leaveOptions: Array<{ value: LeaveType; label: string; description: string }> = [
  { value: 'SICK', label: 'ลาป่วย', description: 'ใช้เมื่อมีอาการป่วยหรือพบแพทย์' },
  { value: 'PERSONAL', label: 'ลากิจ', description: 'ธุระส่วนตัวเร่งด่วนที่ต้องจัดการ' },
  { value: 'ANNUAL', label: 'ลาพักร้อน', description: 'วางแผนการพักผ่อนล่วงหน้า' },
  { value: 'OTHER', label: 'อื่น ๆ', description: 'ระบุรายละเอียดเพิ่มเติมในหมายเหตุ' },
];

export default function LeaveRequestPage() {
  const today = useMemo(() => new Date().toISOString().split('T')[0], []);

  const [form, setForm] = useState({
    zoneId: '',
    branchId: '',
    departmentId: '',
    employeeId: '',
    leaveType: 'SICK' as LeaveType,
    durationMode: 'FULL_DAY' as LeaveDurationMode,
    startDate: today,
    endDate: today,
    startTime: '09:00',
    endTime: '17:00',
    reason: '',
    contact: '',
  });

  const [dailyRanges, setDailyRanges] = useState<Array<{ id: string; date: string; startTime: string; endTime: string }>>([]);

  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [allowRetroactive, setAllowRetroactive] = useState(false);
  const [mixIncludeFullDays, setMixIncludeFullDays] = useState(false);
  const [mixDate, setMixDate] = useState(today);
  const [mixStartTime, setMixStartTime] = useState('09:00');
  const [mixEndTime, setMixEndTime] = useState('12:00');
  const [zones, setZones] = useState<Array<{ id: number; name: string }>>([]);
  const [branches, setBranches] = useState<Array<{ id: number; name: string; zoneId: number }>>([]);
  const [departments, setDepartments] = useState<Array<{ id: number; name: string; branchId: number }>>([]);
  const [employees, setEmployees] = useState<
    Array<{ id: number; name: string; employeeCode: string; branchId: number | null; departmentId: number | null }>
  >([]);
  const [loadingStructure, setLoadingStructure] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const createId = () => Math.random().toString(36).slice(2, 10);

  const enumerateDates = (start: string, end: string) => {
    const results: string[] = [];
    if (!start || !end) {
      return results;
    }
    const startDate = new Date(`${start}T00:00:00`);
    const endDate = new Date(`${end}T00:00:00`);
    if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
      return results;
    }
    for (let cursor = new Date(startDate); cursor.getTime() <= endDate.getTime(); cursor.setDate(cursor.getDate() + 1)) {
      results.push(cursor.toISOString().split('T')[0]);
    }
    return results;
  };

  useEffect(() => {
    const loadStructure = async () => {
      try {
        setLoadingStructure(true);
        setLoadError(null);
        const [zonesRes, branchesRes, departmentsRes, employeesRes] = await Promise.all([
          fetch('/api/zones'),
          fetch('/api/branches'),
          fetch('/api/departments'),
          fetch('/api/employees'),
        ]);

        if (!zonesRes.ok || !branchesRes.ok || !departmentsRes.ok || !employeesRes.ok) {
          throw new Error('โหลดข้อมูลโครงสร้างองค์กรไม่สำเร็จ');
        }

        const [zonesData, branchesData, departmentsData, employeesData] = await Promise.all([
          zonesRes.json(),
          branchesRes.json(),
          departmentsRes.json(),
          employeesRes.json(),
        ]);

        setZones(zonesData.map((zone: any) => ({ id: zone.id, name: zone.name })));
        setBranches(
          branchesData.map((branch: any) => ({ id: branch.id, name: branch.name, zoneId: branch.zoneId })),
        );
        setDepartments(
          departmentsData.map((department: any) => ({
            id: department.id,
            name: department.name,
            branchId: department.branchId,
          })),
        );
        setEmployees(
          employeesData.map((employee: any) => ({
            id: employee.id,
            name: employee.name,
            employeeCode: employee.employeeCode,
            branchId: employee.branchId ?? null,
            departmentId: employee.departmentId ?? null,
          })),
        );
      } catch (error) {
        console.error('[LeaveRequest] load structure error', error);
        setLoadError('ไม่สามารถโหลดข้อมูลโครงสร้างองค์กรได้');
      } finally {
        setLoadingStructure(false);
      }
    };

    loadStructure();
  }, []);

  useEffect(() => {
    if (!allowRetroactive) {
      if (form.startDate < today) {
        setForm((prev) => {
          const adjustedStart = today;
          const adjustedEnd = prev.endDate < adjustedStart ? adjustedStart : prev.endDate;
          return { ...prev, startDate: adjustedStart, endDate: adjustedEnd };
        });
      }
      setDailyRanges((prev) => prev.filter((range) => range.date >= today));
      setMixDate((prev) => (prev < today ? today : prev));
    }
  }, [allowRetroactive, today, form.startDate, form.endDate]);

  useEffect(() => {
    setForm((prev) => {
      if (prev.endDate >= prev.startDate) {
        return prev;
      }
      return { ...prev, endDate: prev.startDate };
    });
  }, [form.startDate]);

  useEffect(() => {
    if (form.durationMode === 'HOURLY' && form.endDate !== form.startDate) {
      setForm((prev) => ({ ...prev, endDate: prev.startDate }));
    }
  }, [form.durationMode, form.startDate, form.endDate]);

  useEffect(() => {
    if (form.durationMode !== 'MIXED') {
      setDailyRanges([]);
      setMixIncludeFullDays(false);
      setMixStartTime('09:00');
      setMixEndTime('12:00');
    }
  }, [form.durationMode]);

  useEffect(() => {
    if (form.durationMode === 'MIXED') {
      setMixDate(form.startDate);
    }
  }, [form.durationMode, form.startDate]);

  const filteredBranches = useMemo(
    () => (form.zoneId ? branches.filter((branch) => branch.zoneId === Number(form.zoneId)) : []),
    [branches, form.zoneId],
  );

  const filteredDepartments = useMemo(
    () => (form.branchId ? departments.filter((department) => department.branchId === Number(form.branchId)) : []),
    [departments, form.branchId],
  );

  const filteredEmployees = useMemo(
    () =>
      form.branchId && form.departmentId
        ? employees.filter(
            (employee) =>
              employee.branchId === Number(form.branchId) && employee.departmentId === Number(form.departmentId),
          )
        : [],
    [employees, form.branchId, form.departmentId],
  );

  const selectedEmployee = useMemo(
    () => filteredEmployees.find((employee) => String(employee.id) === form.employeeId) ?? null,
    [filteredEmployees, form.employeeId],
  );

  const allSelectedDates = useMemo(() => {
    const dates = new Set<string>();
    if (form.durationMode === 'FULL_DAY') {
      enumerateDates(form.startDate, form.endDate).forEach((date) => dates.add(date));
    }
    if (form.durationMode === 'HOURLY') {
      dates.add(form.startDate);
    }
    if (form.durationMode === 'MIXED') {
      if (mixIncludeFullDays) {
        enumerateDates(form.startDate, form.endDate).forEach((date) => dates.add(date));
      }
      dailyRanges.forEach((range) => dates.add(range.date));
    }
    return Array.from(dates).sort();
  }, [form.durationMode, form.startDate, form.endDate, mixIncludeFullDays, dailyRanges]);

  const retroactiveDates = useMemo(() => allSelectedDates.filter((date) => date < today), [allSelectedDates, today]);
  const retroactive = useMemo(() => allowRetroactive && retroactiveDates.length > 0, [allowRetroactive, retroactiveDates]);

  const retroactiveDays = useMemo(() => {
    if (!retroactive || retroactiveDates.length === 0) return 0;
    const earliest = retroactiveDates[0];
    const diff =
      (new Date(`${today}T00:00:00`).getTime() - new Date(`${earliest}T00:00:00`).getTime()) / (1000 * 60 * 60 * 24);
    return diff > 0 ? Math.floor(diff) : 0;
  }, [retroactive, retroactiveDates, today]);

  const mixedMinutes = useMemo(() => {
    if (form.durationMode !== 'MIXED') return 0;
    return dailyRanges.reduce((total, range) => {
      const start = new Date(`${range.date}T${range.startTime}:00`);
      const end = new Date(`${range.date}T${range.endTime}:00`);
      const diff = (end.getTime() - start.getTime()) / (1000 * 60);
      return diff > 0 ? total + Math.round(diff) : total;
    }, 0);
  }, [dailyRanges, form.durationMode]);

  const baseMinutes = useMemo(() => {
    if (form.durationMode === 'FULL_DAY') {
      const start = new Date(`${form.startDate}T00:00:00`);
      const end = new Date(`${form.endDate}T23:59:59`);
      const diff = (end.getTime() - start.getTime()) / (1000 * 60) + 1;
      return diff > 0 ? Math.round(diff) : 0;
    }
    if (form.durationMode === 'HOURLY') {
      const start = new Date(`${form.startDate}T${form.startTime}:00`);
      const end = new Date(`${form.startDate}T${form.endTime}:00`);
      const diff = (end.getTime() - start.getTime()) / (1000 * 60);
      return diff > 0 ? Math.round(diff) : 0;
    }
    if (form.durationMode === 'MIXED' && mixIncludeFullDays) {
      const start = new Date(`${form.startDate}T00:00:00`);
      const end = new Date(`${form.endDate}T23:59:59`);
      const diff = (end.getTime() - start.getTime()) / (1000 * 60) + 1;
      return diff > 0 ? Math.round(diff) : 0;
    }
    return 0;
  }, [form.durationMode, form.startDate, form.endDate, form.startTime, form.endTime, mixIncludeFullDays]);

  const leaveDurationMinutes = useMemo(() => baseMinutes + mixedMinutes, [baseMinutes, mixedMinutes]);
  const leaveDurationHours = useMemo(() => (leaveDurationMinutes / 60).toFixed(1), [leaveDurationMinutes]);


  const handleSelectChange = (event: ChangeEvent<HTMLSelectElement>) => {
    const { name, value } = event.target;
    setMessage(null);
    setForm((prev) => ({
      ...prev,
      [name]: value,
      ...(name === 'zoneId' ? { branchId: '', departmentId: '', employeeId: '' } : {}),
      ...(name === 'branchId' ? { departmentId: '', employeeId: '' } : {}),
      ...(name === 'departmentId' ? { employeeId: '' } : {}),
      ...(name === 'durationMode' ? { startTime: '09:00', endTime: '17:00' } : {}),
    }));

    if (name === 'durationMode') {
      setDailyRanges([]);
      setMixIncludeFullDays(false);
      setMixStartTime('09:00');
      setMixEndTime('12:00');
    }
  };

  const handleChange = (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = event.target;
    setMessage(null);
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const addDailyRange = () => {
    if (!mixDate) return;
    const start = new Date(`${mixDate}T${mixStartTime}:00`);
    const end = new Date(`${mixDate}T${mixEndTime}:00`);
    const diff = (end.getTime() - start.getTime()) / (1000 * 60);
    if (!(end > start)) {
      setMessage('กรุณาเลือกช่วงเวลาให้ถูกต้อง');
      return;
    }
    if (diff % 30 !== 0) {
      setMessage('ช่วงเวลาการลาต้องเป็นทวีคูณของ 30 นาที');
      return;
    }
    const duplicate = dailyRanges.some(
      (range) =>
        range.date === mixDate && range.startTime === mixStartTime && range.endTime === mixEndTime,
    );
    if (duplicate) {
      setMessage('มีช่วงเวลานี้อยู่แล้ว');
      return;
    }
    setDailyRanges((prev) => [
      ...prev,
      { id: createId(), date: mixDate, startTime: mixStartTime, endTime: mixEndTime },
    ]);
    setMessage(null);
  };

  const updateDailyRange = (id: string, field: 'date' | 'startTime' | 'endTime', value: string) => {
    setDailyRanges((prev) =>
      prev.map((range) => (range.id === id ? { ...range, [field]: value } : range)),
    );
    setMessage(null);
  };

  const removeDailyRange = (id: string) => {
    setDailyRanges((prev) => prev.filter((range) => range.id !== id));
    setMessage(null);
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    setMessage(null);

    if (!form.employeeId || !selectedEmployee) {
      setMessage('กรุณาเลือกพนักงานที่ต้องการยื่นคำขอ');
      setSubmitting(false);
      return;
    }

    if (leaveDurationMinutes <= 0) {
      setMessage('กรุณาเลือกช่วงเวลาการลาให้ถูกต้อง');
      setSubmitting(false);
      return;
    }

    if (leaveDurationMinutes % 30 !== 0) {
      setMessage('การลาต้องเป็นช่วงเวลาที่หารด้วย 30 นาทีลงตัว');
      setSubmitting(false);
      return;
    }

    if (form.durationMode === 'HOURLY') {
      const start = new Date(`${form.startDate}T${form.startTime}:00`);
      const end = new Date(`${form.startDate}T${form.endTime}:00`);
      if (!(end > start)) {
        setMessage('กรุณาเลือกเวลาเริ่มและสิ้นสุดให้ถูกต้อง');
        setSubmitting(false);
        return;
      }
    }

    if (form.durationMode === 'MIXED') {
      if (!mixIncludeFullDays && dailyRanges.length === 0) {
        setMessage('กรุณาเพิ่มช่วงเวลาหรือเลือกวันเต็มอย่างน้อย 1 รายการสำหรับการลาแบบผสม');
        setSubmitting(false);
        return;
      }
      const hasInvalidRange = dailyRanges.some((range) => {
        const start = new Date(`${range.date}T${range.startTime}:00`);
        const end = new Date(`${range.date}T${range.endTime}:00`);
        return !(end > start) || ((end.getTime() - start.getTime()) / (1000 * 60)) % 30 !== 0;
      });
      if (hasInvalidRange) {
        setMessage('ช่วงเวลาในรายการผสมต้องมากกว่า 0 และเป็นทวีคูณของ 30 นาที');
        setSubmitting(false);
        return;
      }
    }

    try {
      if (retroactive && retroactiveDates.length > 0) {
        const retroStart = retroactiveDates[0];
        const retroEnd = retroactiveDates[retroactiveDates.length - 1];
        const params = new URLSearchParams();
        params.set('startDate', retroStart);
        params.set('endDate', retroEnd);
        params.set('search', selectedEmployee.employeeCode);
        const attendanceRes = await fetch(`/api/attendance?${params.toString()}`);
        if (!attendanceRes.ok) {
          throw new Error('ไม่สามารถตรวจสอบข้อมูลการลงเวลาได้');
        }
        const attendanceData = await attendanceRes.json();
        const retroSet = new Set(retroactiveDates);
        const conflictingRecord = Array.isArray(attendanceData.records)
          ? attendanceData.records.find((record: any) => {
              if (record.employeeCode !== selectedEmployee.employeeCode || typeof record.date !== 'string') {
                return false;
              }
              const recordDate = record.date.split('T')[0];
              return retroSet.has(recordDate);
            })
          : undefined;
        if (conflictingRecord) {
          const thaiDate = new Intl.DateTimeFormat('th-TH', { dateStyle: 'medium' }).format(
            new Date(conflictingRecord.date),
          );
          setMessage(`ไม่สามารถยื่นคำขอย้อนหลังได้ เนื่องจากพบการลงเวลาทำงานในวันที่ ${thaiDate}`);
          setSubmitting(false);
          return;
        }
      }

      // TODO: call POST /api/leave when backend is ready
      await new Promise((resolve) => setTimeout(resolve, 600));
      setMessage('ส่งคำขอลาเรียบร้อย ระบบจะส่งแจ้งเตือนให้หัวหน้าตามสายบังคับบัญชา');
      setForm((prev) => ({
        ...prev,
        reason: '',
        contact: '',
      }));
      setDailyRanges([]);
      setMixIncludeFullDays(false);
      setMixStartTime('09:00');
      setMixEndTime('12:00');
      setMixDate(today);
    } catch (error) {
      console.error('[LeaveRequest] submit error', error);
      setMessage(error instanceof Error ? error.message : 'ไม่สามารถส่งคำขอได้ กรุณาลองใหม่อีกครั้ง');
    } finally {
      setSubmitting(false);
    }
  };

  if (loadingStructure) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-100 text-slate-600">
        <p className="rounded-lg border border-slate-200 bg-white px-6 py-4 text-sm shadow">กำลังเตรียมข้อมูลโครงสร้าง...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900">
      <div className="relative overflow-hidden bg-white">
        <div className="absolute inset-0 bg-gradient-to-br from-amber-400/30 via-pink-400/30 to-transparent blur-3xl" />
        <div className="relative px-6 py-12 sm:px-12">
          <div className="mx-auto max-w-4xl space-y-4 text-center">
            <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">ยื่นคำขอลา</h1>
            <p className="text-sm leading-6 text-slate-600 sm:text-base">
              ส่งคำขอลาพร้อมรายละเอียดให้หัวหน้าอนุมัติ ระบบจะบันทึกข้อมูลเข้าสู่ workflow ผ่าน{' '}
              <Link href="/approvals" className="font-medium text-blue-600 hover:text-blue-800">
                ศูนย์อนุมัติคำขอ
              </Link>
            </p>
            <div className="flex flex-wrap justify-center gap-3">
              <Link
                href="/approvals?tab=LEAVE"
                className="rounded-full border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
              >
                ตรวจสอบสถานะคำขอ
              </Link>
              <Link
                href="/"
                className="rounded-full bg-slate-900 px-4 py-2 text-sm font-medium text-white shadow hover:bg-slate-800"
              >
                กลับหน้าแรก
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div className="px-6 py-12 sm:px-12">
        <div className="mx-auto max-w-4xl">
          <div className="rounded-2xl bg-white p-6 shadow-lg sm:p-8">
            <form className="space-y-6" onSubmit={handleSubmit}>
              {loadError && (
                <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {loadError}
                </div>
              )}
              <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={allowRetroactive}
                    onChange={(event) => setAllowRetroactive(event.target.checked)}
                    className="h-4 w-4 rounded border-amber-400 text-amber-600 focus:ring-amber-500"
                  />
                  ขออนุมัติย้อนหลัง (เลือกวันที่ผ่านมาแล้ว)
                </label>
                <p className="mt-2 text-xs">
                  {allowRetroactive
                    ? 'ระบบจะเปิดให้เลือกวันที่ก่อนวันปัจจุบันได้ และแจ้งหัวหน้าเพื่อรับทราบเหตุผลย้อนหลังก่อนอนุมัติ'
                    : 'เปิดตัวเลือกนี้หากต้องการยื่นคำขอย้อนหลัง'}
                </p>
                {retroactive && (
                  <p className="mt-2 rounded bg-white/70 px-3 py-2 text-xs text-amber-700">
                    ยื่นย้อนหลัง {retroactiveDays.toLocaleString('th-TH')} วัน ระบบจะบันทึกเป็นคำขอย้อนหลัง
                  </p>
                )}
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700" htmlFor="zoneId">
                    โซน
                  </label>
                  <select
                    id="zoneId"
                    name="zoneId"
                    value={form.zoneId}
                    onChange={handleSelectChange}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                    required
                  >
                    <option value="">เลือกโซน</option>
                    {zones.map((zone) => (
                      <option key={zone.id} value={zone.id}>
                        {zone.name}
                      </option>
                    ))}
                  </select>
                  <p className="mt-1 text-xs text-slate-500">โซนจะกรองรายการสาขาและแผนกที่เกี่ยวข้อง</p>
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700" htmlFor="branchId">
                    สาขา
                  </label>
                  <select
                    id="branchId"
                    name="branchId"
                    value={form.branchId}
                    onChange={handleSelectChange}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                    required
                    disabled={!form.zoneId}
                  >
                    <option value="">{form.zoneId ? 'เลือกสาขา' : 'เลือกโซนก่อน'}</option>
                    {filteredBranches.map((branch) => (
                      <option key={branch.id} value={branch.id}>
                        {branch.name}
                      </option>
                    ))}
                  </select>
                  <p className="mt-1 text-xs text-slate-500">เลือกสาขาที่สังกัด เพื่อกรองแผนกและพนักงาน</p>
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700" htmlFor="departmentId">
                    แผนก
                  </label>
                  <select
                    id="departmentId"
                    name="departmentId"
                    value={form.departmentId}
                    onChange={handleSelectChange}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                    required
                    disabled={!form.branchId}
                  >
                    <option value="">{form.branchId ? 'เลือกแผนก' : 'เลือกสาขาก่อน'}</option>
                    {filteredDepartments.map((department) => (
                      <option key={department.id} value={department.id}>
                        {department.name}
                      </option>
                    ))}
                  </select>
                  <p className="mt-1 text-xs text-slate-500">เลือกแผนกเพื่อกรองรายชื่อพนักงาน</p>
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700" htmlFor="employeeId">
                    พนักงาน
                  </label>
                  <select
                    id="employeeId"
                    name="employeeId"
                    value={form.employeeId}
                    onChange={handleSelectChange}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                    required
                    disabled={!form.departmentId}
                  >
                    <option value="">{form.departmentId ? 'เลือกพนักงาน' : 'เลือกแผนกก่อน'}</option>
                    {filteredEmployees.map((employee) => (
                      <option key={employee.id} value={employee.id}>
                        {employee.name} ({employee.employeeCode})
                      </option>
                    ))}
                  </select>
                  <p className="mt-1 text-xs text-slate-500">เลือกพนักงานที่จะส่งคำขออนุมัติ</p>
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700" htmlFor="leaveType">
                    ประเภทการลา
                  </label>
                  <select
                    id="leaveType"
                    name="leaveType"
                    value={form.leaveType}
                    onChange={handleChange}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                  >
                    {leaveOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                  <p className="mt-1 text-xs text-slate-500">
                    {leaveOptions.find((option) => option.value === form.leaveType)?.description}
                  </p>
                </div>
              </div>

              <div>
                <p className="mb-2 text-sm font-medium text-slate-700">รูปแบบการลา</p>
                <div className="grid gap-2 sm:grid-cols-3">
                  {durationModeOptions.map((option) => {
                    const isSelected = form.durationMode === option.value;
                    return (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() =>
                          handleSelectChange({
                            target: { name: 'durationMode', value: option.value },
                          } as ChangeEvent<HTMLSelectElement>)
                        }
                        className={`rounded-xl border px-4 py-3 text-left transition ${
                          isSelected
                            ? 'border-amber-500 bg-amber-50 text-amber-700'
                            : 'border-slate-200 bg-white text-slate-600 hover:border-amber-300'
                        }`}
                      >
                        <p className="font-semibold">{option.label}</p>
                        <p className="text-xs leading-5 text-slate-500">{option.description}</p>
                      </button>
                    );
                  })}
                </div>
              </div>

              {form.durationMode === 'FULL_DAY' && (
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-2 block text-sm font-medium text-slate-700" htmlFor="startDate">
                      เริ่มลา (เต็มวัน)
                    </label>
                    <input
                      id="startDate"
                      type="date"
                      name="startDate"
                      value={form.startDate}
                      onChange={handleChange}
                      min={allowRetroactive ? undefined : today}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="mb-2 block text-sm font-medium text-slate-700" htmlFor="endDate">
                      สิ้นสุดการลา (เต็มวัน)
                    </label>
                    <input
                      id="endDate"
                      type="date"
                      name="endDate"
                      min={form.startDate}
                      value={form.endDate}
                      onChange={handleChange}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                      required
                    />
                  </div>
                </div>
              )}

              {form.durationMode === 'HOURLY' && (
                <div className="grid gap-4 sm:grid-cols-3">
                  <div className="sm:col-span-1">
                    <label className="mb-2 block text-sm font-medium text-slate-700" htmlFor="startDate">
                      วันที่ลา (รายชั่วโมง)
                    </label>
                    <input
                      id="startDate"
                      type="date"
                      name="startDate"
                      value={form.startDate}
                      onChange={handleChange}
                      min={allowRetroactive ? undefined : today}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="mb-2 block text-sm font-medium text-slate-700" htmlFor="startTime">
                      เวลาเริ่มลา
                    </label>
                    <input
                      id="startTime"
                      type="time"
                      name="startTime"
                      value={form.startTime}
                      onChange={handleChange}
                      step={1800}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="mb-2 block text-sm font-medium text-slate-700" htmlFor="endTime">
                      เวลาสิ้นสุดลา
                    </label>
                    <input
                      id="endTime"
                      type="time"
                      name="endTime"
                      value={form.endTime}
                      onChange={handleChange}
                      step={1800}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                      required
                    />
                    <p className="mt-1 text-xs text-slate-500">ช่วงเวลาการลาต้องเป็นทวีคูณของ 30 นาที</p>
                  </div>
                </div>
              )}

              {form.durationMode === 'MIXED' && (
                <div className="space-y-4">
                  <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm">
                    <label className="flex items-center gap-2 text-slate-700">
                      <input
                        type="checkbox"
                        checked={mixIncludeFullDays}
                        onChange={(event) => setMixIncludeFullDays(event.target.checked)}
                        className="h-4 w-4 rounded border-amber-400 text-amber-600 focus:ring-amber-500"
                      />
                      รวมการลาแบบเต็มวันในช่วงวันที่กำหนด
                    </label>
                    <p className="mt-1 text-xs text-slate-500">
                      หากเลือก ระบบจะใช้วันที่ด้านล่างเพื่อคำนวณวันเต็ม และสามารถเพิ่มช่วงชั่วโมงแยกต่างหากได้
                    </p>
                  </div>

                  {mixIncludeFullDays && (
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div>
                        <label className="mb-2 block text-sm font-medium text-slate-700" htmlFor="startDate">
                          เริ่มลา (ช่วงวันเต็ม)
                        </label>
                        <input
                          id="startDate"
                          type="date"
                          name="startDate"
                          value={form.startDate}
                          onChange={handleChange}
                          min={allowRetroactive ? undefined : today}
                          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                          required
                        />
                      </div>
                      <div>
                        <label className="mb-2 block text-sm font-medium text-slate-700" htmlFor="endDate">
                          สิ้นสุดการลา (ช่วงวันเต็ม)
                        </label>
                        <input
                          id="endDate"
                          type="date"
                          name="endDate"
                          min={form.startDate}
                          value={form.endDate}
                          onChange={handleChange}
                          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                          required
                        />
                      </div>
                    </div>
                  )}

                  <div className="space-y-3 rounded-xl border border-slate-200 bg-white px-4 py-3">
                    <p className="text-sm font-medium text-slate-700">เพิ่มช่วงเวลาระดับชั่วโมง</p>
                    <div className="grid gap-3 sm:grid-cols-[repeat(3,minmax(0,1fr))_auto]">
                      <input
                        type="date"
                        value={mixDate}
                        onChange={(event) => setMixDate(event.target.value)}
                        min={allowRetroactive ? undefined : today}
                        className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                      />
                      <input
                        type="time"
                        value={mixStartTime}
                        onChange={(event) => setMixStartTime(event.target.value)}
                        step={1800}
                        className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                      />
                      <input
                        type="time"
                        value={mixEndTime}
                        onChange={(event) => setMixEndTime(event.target.value)}
                        step={1800}
                        className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                      />
                      <button
                        type="button"
                        onClick={addDailyRange}
                        className="rounded-lg bg-amber-500 px-3 py-2 text-sm font-medium text-white shadow hover:bg-amber-600"
                      >
                        + เพิ่มช่วงเวลา
                      </button>
                    </div>
                    <p className="text-xs text-slate-500">สามารถเพิ่มหลายช่วงเวลาในวันเดียวกันได้ (ช่วงละอย่างน้อย 30 นาที)</p>
                    {dailyRanges.length === 0 ? (
                      <p className="text-xs text-slate-500">ยังไม่มีช่วงเวลาที่เพิ่ม</p>
                    ) : (
                      <div className="space-y-2">
                        {dailyRanges.map((range) => (
                          <div
                            key={range.id}
                            className="grid gap-3 rounded-lg border border-slate-200 px-3 py-2 text-sm sm:grid-cols-[repeat(3,minmax(0,1fr))_auto]"
                          >
                            <input
                              type="date"
                              value={range.date}
                              min={allowRetroactive ? undefined : today}
                              onChange={(event) => updateDailyRange(range.id, 'date', event.target.value)}
                              className="rounded border border-slate-300 px-2 py-1 focus:outline-none focus:ring-2 focus:ring-amber-500"
                            />
                            <input
                              type="time"
                              value={range.startTime}
                              step={1800}
                              onChange={(event) => updateDailyRange(range.id, 'startTime', event.target.value)}
                              className="rounded border border-slate-300 px-2 py-1 focus:outline-none focus:ring-2 focus:ring-amber-500"
                            />
                            <input
                              type="time"
                              value={range.endTime}
                              step={1800}
                              onChange={(event) => updateDailyRange(range.id, 'endTime', event.target.value)}
                              className="rounded border border-slate-300 px-2 py-1 focus:outline-none focus:ring-2 focus:ring-amber-500"
                            />
                            <button
                              type="button"
                              onClick={() => removeDailyRange(range.id)}
                              className="rounded border border-rose-400 px-3 py-1 text-xs font-medium text-rose-500 hover:bg-rose-50"
                            >
                              ลบ
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700" htmlFor="reason">
                  เหตุผลการลา
                </label>
                <textarea
                  id="reason"
                  name="reason"
                  value={form.reason}
                  onChange={handleChange}
                  rows={4}
                  required
                  placeholder="ระบุเหตุผลการลาอย่างละเอียดเพื่อช่วยให้หัวหน้าอนุมัติได้รวดเร็ว"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700" htmlFor="contact">
                  ช่องทางติดต่อระหว่างลา (ถ้ามี)
                </label>
                <input
                  id="contact"
                  name="contact"
                  value={form.contact}
                  onChange={handleChange}
                  placeholder="เช่น เบอร์โทรศัพท์ หรือเบอร์หัวหน้าที่ติดต่อแทน"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              {message && (
                <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                  {message}
                </div>
              )}

              <div className="rounded-xl bg-blue-50 px-4 py-3 text-xs text-blue-700">
                <p>สรุปการลา: {leaveDurationMinutes.toLocaleString('th-TH')} นาที (~{leaveDurationHours} ชั่วโมง)</p>
                {form.durationMode === 'MIXED' && dailyRanges.length === 0 && (
                  <p className="mt-1">กรุณาเพิ่มช่วงเวลาย่อยอย่างน้อย 1 รายการเพื่อคำนวณเวลาลารวม</p>
                )}
              </div>

              <div className="flex flex-wrap justify-end gap-3">
                <Link
                  href="/"
                  className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100"
                >
                  ยกเลิก
                </Link>
                <button
                  type="submit"
                  disabled={submitting}
                  className="rounded-lg bg-amber-500 px-4 py-2 text-sm font-medium text-white shadow hover:bg-amber-600 disabled:opacity-60"
                >
                  {submitting ? 'กำลังส่งคำขอ...' : 'ส่งคำขอลา'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
