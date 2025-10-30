// app/employees/page.tsx - หน้าจัดการพนักงาน (เวอร์ชันเชื่อมต่อฐานข้อมูล)

'use client';

import type { ChangeEvent } from 'react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';

interface Zone {
  id: number;
  code: string;
  name: string;
}

interface Branch {
  id: number;
  code: string;
  name: string;
  zoneId: number;
}

interface Department {
  id: number;
  code: string;
  name: string;
  branchId: number;
}

interface EmployeeApiResponse {
  id: number;
  employeeCode: string;
  name: string;
  nickname: string | null;
  position: string | null;
  startDate: string;
  zoneId: number | null;
  branchId: number | null;
  departmentId: number | null;
  zone?: Zone | null;
  branch?: Branch | null;
  departmentRel?: Department | null;
}

interface EmployeeRecord {
  id: number;
  employeeCode: string;
  name: string;
  nickname: string;
  position: string;
  startDate: string;
  zoneId: number | null;
  branchId: number | null;
  departmentId: number | null;
  zoneCode: string;
  branchCode: string;
  departmentCode: string;
}

const normalizeEmployee = (employee: EmployeeApiResponse): EmployeeRecord => ({
  id: employee.id,
  employeeCode: employee.employeeCode,
  name: employee.name,
  nickname: employee.nickname ?? '',
  position: employee.position ?? '',
  startDate: employee.startDate?.slice(0, 10),
  zoneId: employee.zoneId,
  branchId: employee.branchId,
  departmentId: employee.departmentId,
  zoneCode: employee.zone?.code ?? '',
  branchCode: employee.branch?.code ?? '',
  departmentCode: employee.departmentRel?.code ?? '',
});

export default function EmployeesPage() {
  const [zones, setZones] = useState<Zone[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [employees, setEmployees] = useState<EmployeeRecord[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [zoneForm, setZoneForm] = useState({ name: '' });
  const [branchForm, setBranchForm] = useState({ name: '', zoneId: '' });
  const [departmentForm, setDepartmentForm] = useState({ name: '', branchId: '' });

  const [showEmployeeForm, setShowEmployeeForm] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<EmployeeRecord | null>(null);
  const [employeeForm, setEmployeeForm] = useState({
    employeeCode: '',
    name: '',
    nickname: '',
    position: '',
    startDate: new Date().toISOString().split('T')[0],
    zoneCode: '',
    branchCode: '',
    departmentCode: '',
  });

  const [showImportPanel, setShowImportPanel] = useState(false);
  const [employeeFile, setEmployeeFile] = useState<File | null>(null);
  const [uploadingEmployees, setUploadingEmployees] = useState(false);
  const [importMessage, setImportMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const fetchJson = async <T,>(input: RequestInfo, init?: RequestInit) => {
    const response = await fetch(input, {
      headers: {
        'Content-Type': 'application/json',
      },
      ...init,
    });

    if (!response.ok) {
      let message = response.statusText;
      try {
        const data = (await response.json()) as { message?: string };
        if (data?.message) {
          message = data.message;
        }
      } catch (err) {
        console.error('Failed to parse error response', err);
      }
      throw new Error(message);
    }

    return (await response.json()) as T;
  };

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const [zonesData, branchesData, departmentsData, employeesData] = await Promise.all([
        fetchJson<Zone[]>('/api/zones'),
        fetchJson<Branch[]>('/api/branches'),
        fetchJson<Department[]>('/api/departments'),
        fetchJson<EmployeeApiResponse[]>('/api/employees'),
      ]);

      setZones(
        zonesData.map((zone) => ({
          id: zone.id,
          code: zone.code,
          name: zone.name,
        })),
      );

      setBranches(
        branchesData.map((branch) => ({
          id: branch.id,
          code: branch.code,
          name: branch.name,
          zoneId: branch.zoneId,
        })),
      );

      setDepartments(
        departmentsData.map((department) => ({
          id: department.id,
          code: department.code,
          name: department.name,
          branchId: department.branchId,
        })),
      );

      setEmployees(employeesData.map((employee) => normalizeEmployee(employee)));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'ไม่สามารถโหลดข้อมูลได้');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const resetEmployeeForm = () => {
    setEmployeeForm({
      employeeCode: '',
      name: '',
      nickname: '',
      position: '',
      startDate: new Date().toISOString().split('T')[0],
      zoneCode: '',
      branchCode: '',
      departmentCode: '',
    });
  };

  const handleZoneSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!zoneForm.name.trim()) {
      alert('กรุณาระบุชื่อโซน');
      return;
    }

    try {
      const newZone = await fetchJson<Zone>('/api/zones', {
        method: 'POST',
        body: JSON.stringify({ name: zoneForm.name.trim() }),
      });
      setZones((prev) => [...prev, newZone]);
      setZoneForm({ name: '' });
    } catch (err) {
      alert(err instanceof Error ? err.message : 'ไม่สามารถบันทึกโซนได้');
    }
  };

  const handleBranchSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    const zoneId = Number(branchForm.zoneId);
    if (!zoneId) {
      alert('กรุณาเลือกโซน');
      return;
    }

    if (!branchForm.name.trim()) {
      alert('กรุณาระบุชื่อสาขา');
      return;
    }

    try {
      const newBranch = await fetchJson<Branch>('/api/branches', {
        method: 'POST',
        body: JSON.stringify({
          name: branchForm.name.trim(),
          zoneId,
        }),
      });

      setBranches((prev) => [...prev, newBranch]);
      setBranchForm({ name: '', zoneId: '' });
    } catch (err) {
      alert(err instanceof Error ? err.message : 'ไม่สามารถบันทึกสาขาได้');
    }
  };

  const handleDepartmentSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    const branchId = Number(departmentForm.branchId);
    if (!branchId) {
      alert('กรุณาเลือกสาขา');
      return;
    }

    if (!departmentForm.name.trim()) {
      alert('กรุณาระบุชื่อแผนก');
      return;
    }

    try {
      const newDepartment = await fetchJson<Department>('/api/departments', {
        method: 'POST',
        body: JSON.stringify({
          name: departmentForm.name.trim(),
          branchId,
        }),
      });

      setDepartments((prev) => [...prev, newDepartment]);
      setDepartmentForm({ name: '', branchId: '' });
    } catch (err) {
      alert(err instanceof Error ? err.message : 'ไม่สามารถบันทึกแผนกได้');
    }
  };

  const handleEmployeeSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!employeeForm.zoneCode || !employeeForm.branchCode || !employeeForm.departmentCode) {
      alert('กรุณาเลือกโซน สาขา และแผนกให้ครบก่อน');
      return;
    }

    const payload = {
      employeeCode: employeeForm.employeeCode.trim(),
      name: employeeForm.name.trim(),
      nickname: employeeForm.nickname.trim() || null,
      position: employeeForm.position.trim() || null,
      startDate: employeeForm.startDate,
      zoneCode: employeeForm.zoneCode,
      branchCode: employeeForm.branchCode,
      departmentCode: employeeForm.departmentCode,
    };

    try {
      if (editingEmployee) {
        const updated = await fetchJson<EmployeeApiResponse>(`/api/employees/${editingEmployee.id}`, {
          method: 'PUT',
          body: JSON.stringify(payload),
        });

        const normalized = normalizeEmployee(updated);
        setEmployees((prev) =>
          prev.map((employee) => (employee.id === normalized.id ? normalized : employee)),
        );
      } else {
        const created = await fetchJson<EmployeeApiResponse>('/api/employees', {
          method: 'POST',
          body: JSON.stringify(payload),
        });

        const normalized = normalizeEmployee(created);
        setEmployees((prev) => [...prev, normalized]);
      }

      setShowEmployeeForm(false);
      setEditingEmployee(null);
      resetEmployeeForm();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'ไม่สามารถบันทึกพนักงานได้');
    }
  };

  const handleEmployeeFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0] ?? null;
    setEmployeeFile(selectedFile);
    setImportMessage(null);
  };

  const handleEmployeeImport = async () => {
    if (!employeeFile) {
      alert('กรุณาเลือกไฟล์พนักงาน');
      return;
    }

    setUploadingEmployees(true);
    setImportMessage(null);

    const formData = new FormData();
    formData.append('file', employeeFile);

    try {
      const response = await fetch('/api/employees/import', {
        method: 'POST',
        body: formData,
      });
      const data = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(data?.message ?? 'ไม่สามารถนำเข้าไฟล์พนักงานได้');
      }

      setImportMessage(data?.message ?? 'นำเข้าข้อมูลสำเร็จ');
      setEmployeeFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }

      await loadData();
    } catch (err) {
      setImportMessage(err instanceof Error ? err.message : 'ไม่สามารถนำเข้าไฟล์พนักงานได้');
    } finally {
      setUploadingEmployees(false);
    }
  };

  const handleEmployeeEdit = (employee: EmployeeRecord) => {
    setEditingEmployee(employee);
    setEmployeeForm({
      employeeCode: employee.employeeCode,
      name: employee.name,
      nickname: employee.nickname,
      position: employee.position,
      startDate: employee.startDate,
      zoneCode: employee.zoneCode,
      branchCode: employee.branchCode,
      departmentCode: employee.departmentCode,
    });
    setShowEmployeeForm(true);
  };

  const handleEmployeeDelete = async (employeeId: number) => {
    if (!confirm('ยืนยันการลบพนักงานนี้?')) {
      return;
    }

    try {
      await fetchJson<{ success: boolean }>(`/api/employees/${employeeId}`, {
        method: 'DELETE',
      });

      setEmployees((prev) => prev.filter((employee) => employee.id !== employeeId));
    } catch (err) {
      alert(err instanceof Error ? err.message : 'ไม่สามารถลบพนักงานได้');
    }
  };

  const readyToAddEmployee = zones.length > 0 && branches.length > 0 && departments.length > 0;

  const availableBranches = useMemo(() => {
    const selectedZone = zones.find((zone) => zone.code === employeeForm.zoneCode);
    if (!selectedZone) {
      return [];
    }
    return branches.filter((branch) => branch.zoneId === selectedZone.id);
  }, [branches, employeeForm.zoneCode, zones]);

  const availableDepartments = useMemo(() => {
    const selectedBranch = branches.find((branch) => branch.code === employeeForm.branchCode);
    if (!selectedBranch) {
      return [];
    }
    return departments.filter((department) => department.branchId === selectedBranch.id);
  }, [branches, departments, employeeForm.branchCode]);

  const getZoneName = (code: string) => zones.find((zone) => zone.code === code)?.name ?? '-';
  const getBranchName = (code: string) => branches.find((branch) => branch.code === code)?.name ?? '-';
  const getDepartmentName = (code: string) =>
    departments.find((department) => department.code === code)?.name ?? '-';

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        <div className="flex flex-wrap justify-between items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold">จัดการพนักงาน</h1>
            <p className="text-sm mt-2">
              ดำเนินการตามลำดับ: ตั้งค่าโซน → เชื่อมกับสาขา → สร้างแผนก → เพิ่มพนักงาน
            </p>
          </div>
          <Link href="/" className="px-6 py-2 bg-gray-200 rounded-lg hover:bg-gray-300">
            กลับหน้าหลัก
          </Link>
        </div>

        {loading && (
          <div className="bg-white border border-blue-200 p-4 rounded text-blue-600">
            กำลังโหลดข้อมูล...
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 p-4 rounded text-red-700">
            {error}
          </div>
        )}

        <section className="bg-white rounded-lg shadow">
          <div className="p-6 border-b">
            <h2 className="text-xl font-bold">ขั้นที่ 1: ตั้งค่าโซน</h2>
            <p className="text-sm mt-2 text-gray-600">
              ระบบจะสร้างรหัสโซนอัตโนมัติ เช่น ZONE-001 เพื่อใช้เป็นตัวกลางเชื่อมกับสาขา
            </p>
          </div>
          <div className="p-6 space-y-6">
            <form onSubmit={handleZoneSubmit} className="grid gap-4 md:grid-cols-[1fr_auto]">
              <div>
                <label className="block text-sm font-medium mb-2">ชื่อโซน *</label>
                <input
                  type="text"
                  value={zoneForm.name}
                  onChange={(event) => setZoneForm({ name: event.target.value })}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="เช่น โซนภาคเหนือ"
                  required
                />
              </div>
              <div className="flex items-end">
                <button
                  type="submit"
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  บันทึกโซน
                </button>
              </div>
            </form>

            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase">รหัสโซน</th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase">ชื่อโซน</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {zones.length === 0 ? (
                    <tr>
                      <td className="px-6 py-4 text-sm text-gray-500" colSpan={2}>
                        ยังไม่มีข้อมูลโซน
                      </td>
                    </tr>
                  ) : (
                    zones.map((zone) => (
                      <tr key={zone.id}>
                        <td className="px-6 py-4 text-sm font-medium">{zone.code}</td>
                        <td className="px-6 py-4 text-sm">{zone.name}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        <section className="bg-white rounded-lg shadow">
          <div className="p-6 border-b">
            <h2 className="text-xl font-bold">ขั้นที่ 2: เชื่อมโซนกับสาขา</h2>
            <p className="text-sm mt-2 text-gray-600">
              เลือกโซนที่ต้องการแล้วระบบจะสร้างรหัสสาขา เช่น BRN-001 ให้โดยอัตโนมัติ
            </p>
          </div>
          <div className="p-6 space-y-6">
            <form onSubmit={handleBranchSubmit} className="grid gap-4 md:grid-cols-[1fr_1fr_auto]">
              <div>
                <label className="block text-sm font-medium mb-2">โซน *</label>
                <select
                  value={branchForm.zoneId}
                  onChange={(event) =>
                    setBranchForm((prev) => ({ ...prev, zoneId: event.target.value }))
                  }
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  required
                >
                  <option value="">เลือกโซน</option>
                  {zones.map((zone) => (
                    <option key={zone.id} value={zone.id}>
                      {zone.code} - {zone.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">ชื่อสาขา *</label>
                <input
                  type="text"
                  value={branchForm.name}
                  onChange={(event) =>
                    setBranchForm((prev) => ({ ...prev, name: event.target.value }))
                  }
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="เช่น สาขาเชียงใหม่"
                  required
                  disabled={zones.length === 0}
                />
              </div>
              <div className="flex items-end">
                <button
                  type="submit"
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  disabled={zones.length === 0}
                >
                  บันทึกสาขา
                </button>
              </div>
            </form>

            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase">รหัสสาขา</th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase">ชื่อสาขา</th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase">โซนที่เชื่อม</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {branches.length === 0 ? (
                    <tr>
                      <td className="px-6 py-4 text-sm text-gray-500" colSpan={3}>
                        ยังไม่มีข้อมูลสาขา
                      </td>
                    </tr>
                  ) : (
                    branches.map((branch) => {
                      const zone = zones.find((item) => item.id === branch.zoneId);
                      return (
                        <tr key={branch.id}>
                          <td className="px-6 py-4 text-sm font-medium">{branch.code}</td>
                          <td className="px-6 py-4 text-sm">{branch.name}</td>
                          <td className="px-6 py-4 text-sm">
                            {zone ? `${zone.code} • ${zone.name}` : '-'}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        <section className="bg-white rounded-lg shadow">
          <div className="p-6 border-b">
            <h2 className="text-xl font-bold">ขั้นที่ 3: เชื่อมสาขากับแผนก</h2>
            <p className="text-sm mt-2 text-gray-600">
              ระบบจะสร้างรหัสแผนก เช่น DEP-001 เพื่อให้ผูกกับพนักงานได้อย่างถูกต้อง
            </p>
          </div>
          <div className="p-6 space-y-6">
            <form
              onSubmit={handleDepartmentSubmit}
              className="grid gap-4 md:grid-cols-[1fr_1fr_auto]"
            >
              <div>
                <label className="block text-sm font-medium mb-2">สาขา *</label>
                <select
                  value={departmentForm.branchId}
                  onChange={(event) =>
                    setDepartmentForm((prev) => ({ ...prev, branchId: event.target.value }))
                  }
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  required
                >
                  <option value="">เลือกสาขา</option>
                  {branches.map((branch) => (
                    <option key={branch.id} value={branch.id}>
                      {branch.code} - {branch.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">ชื่อแผนก *</label>
                <input
                  type="text"
                  value={departmentForm.name}
                  onChange={(event) =>
                    setDepartmentForm((prev) => ({ ...prev, name: event.target.value }))
                  }
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="เช่น แผนกบริการลูกค้า"
                  required
                  disabled={branches.length === 0}
                />
              </div>
              <div className="flex items-end">
                <button
                  type="submit"
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  disabled={branches.length === 0}
                >
                  บันทึกแผนก
                </button>
              </div>
            </form>

            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase">รหัสแผนก</th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase">ชื่อแผนก</th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase">สาขา</th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase">โซน</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {departments.length === 0 ? (
                    <tr>
                      <td className="px-6 py-4 text-sm text-gray-500" colSpan={4}>
                        ยังไม่มีข้อมูลแผนก
                      </td>
                    </tr>
                  ) : (
                    departments.map((department) => {
                      const branch = branches.find((item) => item.id === department.branchId);
                      const zone = branch ? zones.find((item) => item.id === branch.zoneId) : null;
                      return (
                        <tr key={department.id}>
                          <td className="px-6 py-4 text-sm font-medium">{department.code}</td>
                          <td className="px-6 py-4 text-sm">{department.name}</td>
                          <td className="px-6 py-4 text-sm">
                            {branch ? `${branch.code} • ${branch.name}` : '-'}
                          </td>
                          <td className="px-6 py-4 text-sm">
                            {zone ? `${zone.code} • ${zone.name}` : '-'}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        <section className="bg-white rounded-lg shadow">
          <div className="p-6 border-b flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold">ขั้นที่ 4: เพิ่มพนักงาน</h2>
              <p className="text-sm mt-2 text-gray-600">
                ระบบจะเชื่อมโยงพนักงานกับโซน สาขา และแผนกตามรหัสที่สร้างไว้แล้ว
              </p>
              <p className="text-sm mt-1 text-gray-600">
                ดาวน์โหลดเทมเพลตไฟล์นำเข้าพนักงานได้ที่{' '}
                <a
                  href="/templates/employee-import-template.csv"
                  download
                  className="text-blue-600 underline hover:text-blue-700"
                >
                  employee-import-template.csv
                </a>
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => {
                  if (!readyToAddEmployee) {
                    alert('กรุณาสร้างโซน สาขา และแผนกให้ครบก่อน');
                    return;
                  }
                  if (showEmployeeForm && !editingEmployee) {
                    setShowEmployeeForm(false);
                    resetEmployeeForm();
                    return;
                  }
                  if (!editingEmployee) {
                    resetEmployeeForm();
                  }
                  setEditingEmployee(null);
                  setShowEmployeeForm((prev) => !prev);
                  if (!showEmployeeForm) {
                    setShowImportPanel(false);
                    setEmployeeFile(null);
                    setImportMessage(null);
                    if (fileInputRef.current) {
                      fileInputRef.current.value = '';
                    }
                  }
                }}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-60"
                disabled={!readyToAddEmployee}
              >
                {showEmployeeForm ? 'ยกเลิก' : '+ เพิ่มพนักงาน'}
              </button>
              <button
                onClick={() => {
                  if (!readyToAddEmployee) {
                    alert('กรุณาสร้างโซน สาขา และแผนกให้ครบก่อน');
                    return;
                  }
                  if (!showImportPanel) {
                    setShowEmployeeForm(false);
                    setEditingEmployee(null);
                    resetEmployeeForm();
                  } else {
                    setEmployeeFile(null);
                    setImportMessage(null);
                    if (fileInputRef.current) {
                      fileInputRef.current.value = '';
                    }
                  }
                  setShowImportPanel((prev) => !prev);
                }}
                className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-60"
                disabled={!readyToAddEmployee}
              >
                {showImportPanel ? 'ยกเลิกการนำเข้า' : '+ เพิ่มไฟล์พนักงาน'}
              </button>
            </div>
          </div>
          {showEmployeeForm && (
            <div className="p-6 border-b">
              <h3 className="text-lg font-semibold mb-4">
                {editingEmployee ? 'แก้ไขข้อมูลพนักงาน' : 'เพิ่มพนักงานใหม่'}
              </h3>
              <form onSubmit={handleEmployeeSubmit} className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium mb-2">รหัสพนักงาน *</label>
                  <input
                    type="text"
                    value={employeeForm.employeeCode}
                    onChange={(event) =>
                      setEmployeeForm((prev) => ({ ...prev, employeeCode: event.target.value }))
                    }
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="เช่น EMP-001"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">ชื่อ-สกุล *</label>
                  <input
                    type="text"
                    value={employeeForm.name}
                    onChange={(event) =>
                      setEmployeeForm((prev) => ({ ...prev, name: event.target.value }))
                    }
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="เช่น นายสมชาย ใจดี"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">ชื่อเล่น</label>
                  <input
                    type="text"
                    value={employeeForm.nickname}
                    onChange={(event) =>
                      setEmployeeForm((prev) => ({ ...prev, nickname: event.target.value }))
                    }
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="เช่น แจ็ค"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">ตำแหน่ง</label>
                  <input
                    type="text"
                    value={employeeForm.position}
                    onChange={(event) =>
                      setEmployeeForm((prev) => ({ ...prev, position: event.target.value }))
                    }
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="เช่น พนักงานบริการ"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">วันที่เริ่มงาน *</label>
                  <input
                    type="date"
                    value={employeeForm.startDate}
                    onChange={(event) =>
                      setEmployeeForm((prev) => ({ ...prev, startDate: event.target.value }))
                    }
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">โซน *</label>
                  <select
                    value={employeeForm.zoneCode}
                    onChange={(event) => {
                      const zoneCode = event.target.value;
                      setEmployeeForm((prev) => ({
                        ...prev,
                        zoneCode,
                        branchCode: '',
                        departmentCode: '',
                      }));
                    }}
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                    required
                  >
                    <option value="">เลือกโซน</option>
                    {zones.map((zone) => (
                      <option key={zone.code} value={zone.code}>
                        {zone.code} - {zone.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">สาขา *</label>
                  <select
                    value={employeeForm.branchCode}
                    onChange={(event) => {
                      const branchCode = event.target.value;
                      setEmployeeForm((prev) => ({
                        ...prev,
                        branchCode,
                        departmentCode: '',
                      }));
                    }}
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                    required
                    disabled={!employeeForm.zoneCode}
                  >
                    <option value="">เลือกสาขา</option>
                    {availableBranches.map((branch) => (
                      <option key={branch.code} value={branch.code}>
                        {branch.code} - {branch.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">แผนก *</label>
                  <select
                    value={employeeForm.departmentCode}
                    onChange={(event) =>
                      setEmployeeForm((prev) => ({
                        ...prev,
                        departmentCode: event.target.value,
                      }))
                    }
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                    required
                    disabled={!employeeForm.branchCode}
                  >
                    <option value="">เลือกแผนก</option>
                    {availableDepartments.map((department) => (
                      <option key={department.code} value={department.code}>
                        {department.code} - {department.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="md:col-span-2 flex gap-4">
                  <button
                    type="submit"
                    className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    {editingEmployee ? 'บันทึกการแก้ไข' : 'เพิ่มพนักงาน'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowEmployeeForm(false);
                      setEditingEmployee(null);
                      resetEmployeeForm();
                    }}
                    className="px-6 py-2 bg-gray-200 rounded-lg hover:bg-gray-300"
                  >
                    ยกเลิก
                  </button>
                </div>
              </form>
            </div>
          )}

          {showImportPanel && (
            <div className="p-6 border-b">
              <h3 className="text-lg font-semibold mb-4">เพิ่มพนักงานจากไฟล์ CSV</h3>
              <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_auto] items-start">
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                  <input
                    ref={fileInputRef}
                    id="employee-file-upload"
                    type="file"
                    accept=".csv"
                    className="hidden"
                    onChange={handleEmployeeFileChange}
                  />
                  <label htmlFor="employee-file-upload" className="cursor-pointer block">
                    <span className="text-gray-600">
                      {employeeFile ? (
                        <span className="font-medium text-blue-600">{employeeFile.name}</span>
                      ) : (
                        'คลิกเพื่อเลือกไฟล์ CSV หรือ ลากไฟล์มาวาง'
                      )}
                    </span>
                    <p className="text-sm text-gray-500 mt-2">รองรับเฉพาะไฟล์ .csv</p>
                  </label>
                </div>
                <div className="flex flex-col gap-2">
                  <button
                    type="button"
                    onClick={handleEmployeeImport}
                    disabled={!employeeFile || uploadingEmployees}
                    className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
                  >
                    {uploadingEmployees ? 'กำลังนำเข้า...' : 'นำเข้าพนักงาน'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setEmployeeFile(null);
                      setImportMessage(null);
                      if (fileInputRef.current) {
                        fileInputRef.current.value = '';
                      }
                    }}
                    disabled={!employeeFile || uploadingEmployees}
                    className="px-6 py-2 bg-gray-200 rounded-lg hover:bg-gray-300 disabled:bg-gray-200 disabled:text-gray-400"
                  >
                    ล้างไฟล์
                  </button>
                </div>
              </div>
              <p className="text-sm text-gray-600 mt-4">
                ใช้รูปแบบเดียวกับไฟล์เทมเพลตด้านบน โดยต้องสร้างโซน สาขา และแผนกล่วงหน้าให้ครบถ้วน
              </p>
              {importMessage && (
                <div
                  className={`mt-4 rounded-lg border p-3 text-sm ${
                    importMessage.startsWith('นำเข้าสำเร็จ')
                      ? 'bg-green-50 border-green-200 text-green-800'
                      : 'bg-red-50 border-red-200 text-red-800'
                  }`}
                >
                  {importMessage}
                </div>
              )}
            </div>
          )}

          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">รายชื่อพนักงาน ({employees.length} คน)</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase">รหัสพนักงาน</th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase">ชื่อ-สกุล</th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase">ชื่อเล่น</th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase">ตำแหน่ง</th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase">วันที่เริ่มงาน</th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase">โซน</th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase">สาขา</th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase">แผนก</th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase">การจัดการ</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {employees.length === 0 ? (
                    <tr>
                      <td className="px-6 py-4 text-sm text-gray-500" colSpan={9}>
                        ยังไม่มีข้อมูลพนักงาน
                      </td>
                    </tr>
                  ) : (
                    employees.map((employee) => (
                      <tr key={employee.id}>
                        <td className="px-6 py-4 text-sm font-medium">{employee.employeeCode}</td>
                        <td className="px-6 py-4 text-sm">{employee.name}</td>
                        <td className="px-6 py-4 text-sm">{employee.nickname || '-'}</td>
                        <td className="px-6 py-4 text-sm">{employee.position || '-'}</td>
                        <td className="px-6 py-4 text-sm">{employee.startDate}</td>
                        <td className="px-6 py-4 text-sm">
                          {employee.zoneCode
                            ? `${employee.zoneCode} • ${getZoneName(employee.zoneCode)}`
                            : '-'}
                        </td>
                        <td className="px-6 py-4 text-sm">
                          {employee.branchCode
                            ? `${employee.branchCode} • ${getBranchName(employee.branchCode)}`
                            : '-'}
                        </td>
                        <td className="px-6 py-4 text-sm">
                          {employee.departmentCode
                            ? `${employee.departmentCode} • ${getDepartmentName(employee.departmentCode)}`
                            : '-'}
                        </td>
                        <td className="px-6 py-4 text-sm">
                          <button
                            onClick={() => handleEmployeeEdit(employee)}
                            className="text-blue-600 hover:text-blue-800 mr-4"
                          >
                            แก้ไข
                          </button>
                          <button
                            onClick={() => handleEmployeeDelete(employee.id)}
                            className="text-red-600 hover:text-red-800"
                          >
                            ลบ
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
