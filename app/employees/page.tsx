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

type ApprovalRole = "EXECUTIVE" | "MANAGER" | "DEPARTMENT_HEAD";

interface ApprovalAssignmentApiResponse {
  id: number;
  role: ApprovalRole;
  employeeId: number;
  branchId: number | null;
  departmentId: number | null;
  employee: EmployeeApiResponse;
  branch?: Branch | null;
  department?: Department | null;
}

interface ApprovalAssignmentRecord {
  id: number;
  role: ApprovalRole;
  employeeId: number;
  branchId: number | null;
  departmentId: number | null;
  employee: EmployeeRecord;
  branch: Branch | null;
  department: Department | null;
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

const normalizeAssignment = (
  assignment: ApprovalAssignmentApiResponse,
): ApprovalAssignmentRecord => ({
  id: assignment.id,
  role: assignment.role,
  employeeId: assignment.employeeId,
  branchId: assignment.branchId,
  departmentId: assignment.departmentId,
  employee: normalizeEmployee(assignment.employee),
  branch: assignment.branch ?? null,
  department: assignment.department ?? null,
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
  const [editingZoneId, setEditingZoneId] = useState<number | null>(null);
  const [editingBranchId, setEditingBranchId] = useState<number | null>(null);
  const [editingDepartmentId, setEditingDepartmentId] = useState<number | null>(null);

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

  const [approvalAssignments, setApprovalAssignments] = useState<ApprovalAssignmentRecord[]>([]);
  const [executiveForm, setExecutiveForm] = useState({ employeeId: '' });
  const [managerForm, setManagerForm] = useState({ employeeId: '', branchId: '' });
  const [departmentHeadForm, setDepartmentHeadForm] = useState({
    employeeId: '',
    branchId: '',
    departmentId: '',
  });
  const [assignmentMessage, setAssignmentMessage] = useState<string | null>(null);

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

      const [
        zonesData,
        branchesData,
        departmentsData,
        employeesData,
        assignmentsData,
      ] = await Promise.all([
        fetchJson<Zone[]>('/api/zones'),
        fetchJson<Branch[]>('/api/branches'),
        fetchJson<Department[]>('/api/departments'),
        fetchJson<EmployeeApiResponse[]>('/api/employees'),
        fetchJson<ApprovalAssignmentApiResponse[]>('/api/approval-assignments'),
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
      setApprovalAssignments(assignmentsData.map((assignment) => normalizeAssignment(assignment)));
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

  const resetZoneForm = () => {
    setZoneForm({ name: '' });
    setEditingZoneId(null);
  };

  const resetBranchForm = () => {
    setBranchForm({ name: '', zoneId: '' });
    setEditingBranchId(null);
  };

  const resetDepartmentForm = () => {
    setDepartmentForm({ name: '', branchId: '' });
    setEditingDepartmentId(null);
  };

  const handleZoneSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!zoneForm.name.trim()) {
      alert('กรุณาระบุชื่อโซน');
      return;
    }

    try {
      if (editingZoneId) {
        const updatedZone = await fetchJson<Zone>(`/api/zones/${editingZoneId}`, {
          method: 'PUT',
          body: JSON.stringify({ name: zoneForm.name.trim() }),
        });
        setZones((prev) => prev.map((zone) => (zone.id === updatedZone.id ? updatedZone : zone)));
        resetZoneForm();
      } else {
        const newZone = await fetchJson<Zone>('/api/zones', {
          method: 'POST',
          body: JSON.stringify({ name: zoneForm.name.trim() }),
        });
        setZones((prev) => [...prev, newZone]);
        resetZoneForm();
      }
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
      if (editingBranchId) {
        const updatedBranch = await fetchJson<Branch>(`/api/branches/${editingBranchId}`, {
          method: 'PUT',
          body: JSON.stringify({
            name: branchForm.name.trim(),
            zoneId,
          }),
        });

        setBranches((prev) =>
          prev.map((branch) => (branch.id === updatedBranch.id ? updatedBranch : branch)),
        );
        resetBranchForm();
      } else {
        const newBranch = await fetchJson<Branch>('/api/branches', {
          method: 'POST',
          body: JSON.stringify({
            name: branchForm.name.trim(),
            zoneId,
          }),
        });

        setBranches((prev) => [...prev, newBranch]);
        resetBranchForm();
      }
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
      if (editingDepartmentId) {
        const updatedDepartment = await fetchJson<Department>(
          `/api/departments/${editingDepartmentId}`,
          {
            method: 'PUT',
            body: JSON.stringify({
              name: departmentForm.name.trim(),
              branchId,
            }),
          },
        );

        setDepartments((prev) =>
          prev.map((department) =>
            department.id === updatedDepartment.id ? updatedDepartment : department,
          ),
        );
        resetDepartmentForm();
      } else {
        const newDepartment = await fetchJson<Department>('/api/departments', {
          method: 'POST',
          body: JSON.stringify({
            name: departmentForm.name.trim(),
            branchId,
          }),
        });

        setDepartments((prev) => [...prev, newDepartment]);
        resetDepartmentForm();
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : 'ไม่สามารถบันทึกแผนกได้');
    }
  };

  const handleZoneDelete = async (zoneId: number) => {
    if (!confirm('ยืนยันการลบโซนนี้? การลบจะลบสาขาและแผนกที่เกี่ยวข้องทั้งหมด')) {
      return;
    }
    try {
      await fetchJson<{ success: boolean }>(`/api/zones/${zoneId}`, {
        method: 'DELETE',
      });
      await loadData();
      if (editingZoneId === zoneId) {
        resetZoneForm();
      }
      resetBranchForm();
      resetDepartmentForm();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'ไม่สามารถลบโซนได้');
    }
  };

  const handleBranchDelete = async (branchId: number) => {
    if (!confirm('ยืนยันการลบสาขานี้? การลบจะลบแผนกที่เกี่ยวข้องทั้งหมด')) {
      return;
    }
    try {
      await fetchJson<{ success: boolean }>(`/api/branches/${branchId}`, {
        method: 'DELETE',
      });
      await loadData();
      if (editingBranchId === branchId) {
        resetBranchForm();
      }
      resetDepartmentForm();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'ไม่สามารถลบสาขาได้');
    }
  };

  const handleDepartmentDelete = async (departmentId: number) => {
    if (!confirm('ยืนยันการลบแผนกนี้?')) {
      return;
    }
    try {
      await fetchJson<{ success: boolean }>(`/api/departments/${departmentId}`, {
        method: 'DELETE',
      });
      await loadData();
      if (editingDepartmentId === departmentId) {
        resetDepartmentForm();
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : 'ไม่สามารถลบแผนกได้');
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

  const handleAddExecutive = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!executiveForm.employeeId) {
      alert('กรุณาเลือกพนักงานที่จะตั้งเป็นผู้บริหาร');
      return;
    }
    setAssignmentMessage(null);
    try {
      const assignment = await fetchJson<ApprovalAssignmentApiResponse>('/api/approval-assignments', {
        method: 'POST',
        body: JSON.stringify({
          role: 'EXECUTIVE',
          employeeId: Number(executiveForm.employeeId),
        }),
      });
      setApprovalAssignments((prev) => [...prev, normalizeAssignment(assignment)]);
      setExecutiveForm({ employeeId: '' });
      setAssignmentMessage('บันทึกผู้บริหารเรียบร้อยแล้ว');
    } catch (err) {
      setAssignmentMessage(err instanceof Error ? err.message : 'ไม่สามารถบันทึกข้อมูลได้');
    }
  };

  const handleAddManager = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!managerForm.branchId || !managerForm.employeeId) {
      alert('กรุณาเลือกสาขาและพนักงานที่จะตั้งเป็นผู้จัดการ');
      return;
    }
    setAssignmentMessage(null);
    try {
      const assignment = await fetchJson<ApprovalAssignmentApiResponse>('/api/approval-assignments', {
        method: 'POST',
        body: JSON.stringify({
          role: 'MANAGER',
          branchId: Number(managerForm.branchId),
          employeeId: Number(managerForm.employeeId),
        }),
      });
      setApprovalAssignments((prev) => [...prev, normalizeAssignment(assignment)]);
      setManagerForm({ branchId: '', employeeId: '' });
      setAssignmentMessage('บันทึกผู้จัดการสาขาเรียบร้อยแล้ว');
    } catch (err) {
      setAssignmentMessage(err instanceof Error ? err.message : 'ไม่สามารถบันทึกข้อมูลได้');
    }
  };

  const handleAddDepartmentHead = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!departmentHeadForm.branchId || !departmentHeadForm.departmentId || !departmentHeadForm.employeeId) {
      alert('กรุณาเลือกสาขา แผนก และพนักงานให้ครบ');
      return;
    }
    setAssignmentMessage(null);
    try {
      const assignment = await fetchJson<ApprovalAssignmentApiResponse>('/api/approval-assignments', {
        method: 'POST',
        body: JSON.stringify({
          role: 'DEPARTMENT_HEAD',
          branchId: Number(departmentHeadForm.branchId),
          departmentId: Number(departmentHeadForm.departmentId),
          employeeId: Number(departmentHeadForm.employeeId),
        }),
      });
      setApprovalAssignments((prev) => [...prev, normalizeAssignment(assignment)]);
      setDepartmentHeadForm({ branchId: '', departmentId: '', employeeId: '' });
      setAssignmentMessage('บันทึกหัวหน้าแผนกเรียบร้อยแล้ว');
    } catch (err) {
      setAssignmentMessage(err instanceof Error ? err.message : 'ไม่สามารถบันทึกข้อมูลได้');
    }
  };

  const handleRemoveAssignment = async (assignmentId: number) => {
    if (!confirm('ยืนยันการยกเลิกการตั้งค่านี้?')) {
      return;
    }
    setAssignmentMessage(null);
    try {
      await fetchJson<{ success: boolean }>(`/api/approval-assignments/${assignmentId}`, {
        method: 'DELETE',
      });
      setApprovalAssignments((prev) => prev.filter((assignment) => assignment.id !== assignmentId));
      setAssignmentMessage('ลบรายการเรียบร้อยแล้ว');
    } catch (err) {
      setAssignmentMessage(err instanceof Error ? err.message : 'ไม่สามารถลบข้อมูลได้');
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

  const executives = useMemo(
    () => approvalAssignments.filter((assignment) => assignment.role === 'EXECUTIVE'),
    [approvalAssignments],
  );

  const managersAssignments = useMemo(
    () => approvalAssignments.filter((assignment) => assignment.role === 'MANAGER'),
    [approvalAssignments],
  );

  const departmentHeadAssignments = useMemo(
    () => approvalAssignments.filter((assignment) => assignment.role === 'DEPARTMENT_HEAD'),
    [approvalAssignments],
  );

  const availableExecutiveEmployees = useMemo(
    () =>
      employees.filter(
        (employee) =>
          !executives.some((assignment) => assignment.employeeId === employee.id),
      ),
    [employees, executives],
  );

  const managerSelectedBranchId = managerForm.branchId ? Number(managerForm.branchId) : null;
  const managerEligibleEmployees = useMemo(() => {
    if (!managerSelectedBranchId) {
      return [];
    }
    return employees.filter((employee) => employee.branchId === managerSelectedBranchId);
  }, [employees, managerSelectedBranchId]);

  const departmentHeadSelectedBranchId = departmentHeadForm.branchId
    ? Number(departmentHeadForm.branchId)
    : null;
  const departmentHeadSelectedDepartmentId = departmentHeadForm.departmentId
    ? Number(departmentHeadForm.departmentId)
    : null;

  const departmentOptionsForHead = useMemo(() => {
    if (!departmentHeadSelectedBranchId) {
      return [];
    }
    return departments.filter((department) => department.branchId === departmentHeadSelectedBranchId);
  }, [departments, departmentHeadSelectedBranchId]);

  const departmentHeadEligibleEmployees = useMemo(() => {
    if (!departmentHeadSelectedBranchId || !departmentHeadSelectedDepartmentId) {
      return [];
    }
    return employees.filter(
      (employee) =>
        employee.branchId === departmentHeadSelectedBranchId &&
        employee.departmentId === departmentHeadSelectedDepartmentId,
    );
  }, [departmentHeadSelectedBranchId, departmentHeadSelectedDepartmentId, employees]);

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
                <div className="flex items-center justify-between">
                  <label className="block text-sm font-medium mb-2">ชื่อโซน *</label>
                  {editingZoneId && (
                    <span className="text-xs text-blue-600">กำลังแก้ไข: {zones.find((zone) => zone.id === editingZoneId)?.code}</span>
                  )}
                </div>
                <input
                  type="text"
                  value={zoneForm.name}
                  onChange={(event) => setZoneForm({ name: event.target.value })}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="เช่น โซนภาคเหนือ"
                  required
                />
              </div>
              <div className="flex items-end gap-2">
                <button
                  type="submit"
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  {editingZoneId ? 'บันทึกการแก้ไข' : 'บันทึกโซน'}
                </button>
                {editingZoneId && (
                  <button
                    type="button"
                    onClick={resetZoneForm}
                    className="px-4 py-2 bg-gray-200 rounded-lg hover:bg-gray-300 text-sm"
                  >
                    ยกเลิก
                  </button>
                )}
              </div>
            </form>

            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase">รหัสโซน</th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase">ชื่อโซน</th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase">การจัดการ</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {zones.length === 0 ? (
                    <tr>
                      <td className="px-6 py-4 text-sm text-gray-500" colSpan={3}>
                        ยังไม่มีข้อมูลโซน
                      </td>
                    </tr>
                  ) : (
                    zones.map((zone) => (
                      <tr key={zone.id}>
                        <td className="px-6 py-4 text-sm font-medium">{zone.code}</td>
                        <td className="px-6 py-4 text-sm">{zone.name}</td>
                        <td className="px-6 py-4 text-sm">
                          <button
                            type="button"
                            onClick={() => {
                              setZoneForm({ name: zone.name });
                              setEditingZoneId(zone.id);
                            }}
                            className="text-blue-600 hover:text-blue-800 mr-4"
                          >
                            แก้ไข
                          </button>
                          <button
                            type="button"
                            onClick={() => handleZoneDelete(zone.id)}
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
                <div className="flex items-center justify-between">
                  <label className="block text-sm font-medium mb-2">โซน *</label>
                  {editingBranchId && (
                    <span className="text-xs text-blue-600">
                      กำลังแก้ไข: {branches.find((branch) => branch.id === editingBranchId)?.code}
                    </span>
                  )}
                </div>
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
              <div className="flex items-end gap-2">
                <button
                  type="submit"
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  disabled={zones.length === 0}
                >
                  {editingBranchId ? 'บันทึกการแก้ไข' : 'บันทึกสาขา'}
                </button>
                {editingBranchId && (
                  <button
                    type="button"
                    onClick={resetBranchForm}
                    className="px-4 py-2 bg-gray-200 rounded-lg hover:bg-gray-300 text-sm"
                  >
                    ยกเลิก
                  </button>
                )}
              </div>
            </form>

            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase">รหัสสาขา</th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase">ชื่อสาขา</th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase">โซนที่เชื่อม</th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase">การจัดการ</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {branches.length === 0 ? (
                    <tr>
                      <td className="px-6 py-4 text-sm text-gray-500" colSpan={4}>
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
                          <td className="px-6 py-4 text-sm">
                            <button
                              type="button"
                              onClick={() => {
                                setBranchForm({ name: branch.name, zoneId: String(branch.zoneId) });
                                setEditingBranchId(branch.id);
                              }}
                              className="text-blue-600 hover:text-blue-800 mr-4"
                            >
                              แก้ไข
                            </button>
                            <button
                              type="button"
                              onClick={() => handleBranchDelete(branch.id)}
                              className="text-red-600 hover:text-red-800"
                            >
                              ลบ
                            </button>
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
                <div className="flex items-center justify-between">
                  <label className="block text-sm font-medium mb-2">สาขา *</label>
                  {editingDepartmentId && (
                    <span className="text-xs text-blue-600">
                      กำลังแก้ไข: {departments.find((department) => department.id === editingDepartmentId)?.code}
                    </span>
                  )}
                </div>
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
              <div className="flex items-end gap-2">
                <button
                  type="submit"
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  disabled={branches.length === 0}
                >
                  {editingDepartmentId ? 'บันทึกการแก้ไข' : 'บันทึกแผนก'}
                </button>
                {editingDepartmentId && (
                  <button
                    type="button"
                    onClick={resetDepartmentForm}
                    className="px-4 py-2 bg-gray-200 rounded-lg hover:bg-gray-300 text-sm"
                  >
                    ยกเลิก
                  </button>
                )}
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
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase">การจัดการ</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {departments.length === 0 ? (
                    <tr>
                      <td className="px-6 py-4 text-sm text-gray-500" colSpan={5}>
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
                          <td className="px-6 py-4 text-sm">
                            <button
                              type="button"
                              onClick={() => {
                                setDepartmentForm({ name: department.name, branchId: String(department.branchId) });
                                setEditingDepartmentId(department.id);
                              }}
                              className="text-blue-600 hover:text-blue-800 mr-4"
                            >
                              แก้ไข
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDepartmentDelete(department.id)}
                              className="text-red-600 hover:text-red-800"
                            >
                              ลบ
                            </button>
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
              <h2 className="text-xl font-bold">ขั้นที่ 4: ตั้งค่าผู้อนุมัติ</h2>
              <p className="text-sm mt-2 text-gray-600">
                กำหนดบทบาทการอนุมัติสำหรับการลา การขอทำ OT และการสลับวันหยุดตามโครงสร้าง 3 ระดับ
              </p>
              <ul className="text-sm text-gray-600 mt-2 list-disc list-inside space-y-1">
                <li>ผู้บริหารอนุมัติผู้จัดการ</li>
                <li>ผู้จัดการอนุมัติพนักงานในสาขาตนเอง</li>
                <li>หัวหน้าแผนกอนุมัติพนักงานทั่วไปในแผนก (และส่งต่อให้ผู้จัดการ)</li>
              </ul>
            </div>
          </div>
          <div className="p-6 space-y-8">
            <div className="grid gap-6 md:grid-cols-2">
              <div className="border rounded-lg p-6">
                <h3 className="text-lg font-semibold mb-4">ผู้บริหาร (Executive)</h3>
                <form onSubmit={handleAddExecutive} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">เลือกพนักงาน</label>
                    <select
                      value={executiveForm.employeeId}
                      onChange={(event) =>
                        setExecutiveForm({ employeeId: event.target.value })
                      }
                      className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                      required
                      disabled={availableExecutiveEmployees.length === 0}
                    >
                      <option value="">เลือกพนักงาน</option>
                      {availableExecutiveEmployees.map((employee) => (
                        <option key={employee.id} value={employee.id}>
                          {employee.employeeCode} - {employee.name}
                        </option>
                      ))}
                    </select>
                    {availableExecutiveEmployees.length === 0 && (
                      <p className="text-xs text-gray-500 mt-2">
                        * ไม่มีพนักงานที่ยังไม่ได้ตั้งเป็นผู้บริหาร หากต้องการเปลี่ยนให้ลบรายการเดิมก่อน
                      </p>
                    )}
                  </div>
                  <button
                    type="submit"
                    className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300"
                    disabled={availableExecutiveEmployees.length === 0 || !executiveForm.employeeId}
                  >
                    บันทึกผู้บริหาร
                  </button>
                </form>
                <div className="mt-6">
                  <h4 className="text-sm font-semibold mb-2">รายการผู้บริหาร</h4>
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200 text-sm">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-2 text-left font-medium uppercase">พนักงาน</th>
                          <th className="px-4 py-2 text-left font-medium uppercase">การจัดการ</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {executives.length === 0 ? (
                          <tr>
                            <td className="px-4 py-3 text-gray-500" colSpan={2}>
                              ยังไม่มีผู้บริหารที่ตั้งค่าไว้
                            </td>
                          </tr>
                        ) : (
                          executives.map((assignment) => (
                            <tr key={assignment.id}>
                              <td className="px-4 py-3">
                                {assignment.employee.employeeCode} • {assignment.employee.name}
                              </td>
                              <td className="px-4 py-3">
                                <button
                                  type="button"
                                  onClick={() => handleRemoveAssignment(assignment.id)}
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
              </div>

              <div className="border rounded-lg p-6">
                <h3 className="text-lg font-semibold mb-4">ผู้จัดการสาขา (Manager)</h3>
                <form onSubmit={handleAddManager} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">เลือกสาขา</label>
                    <select
                      value={managerForm.branchId}
                      onChange={(event) =>
                        setManagerForm({
                          branchId: event.target.value,
                          employeeId: '',
                        })
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
                    <label className="block text-sm font-medium mb-2">เลือกพนักงาน</label>
                    <select
                      value={managerForm.employeeId}
                      onChange={(event) =>
                        setManagerForm((prev) => ({ ...prev, employeeId: event.target.value }))
                      }
                      className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                      required
                      disabled={!managerForm.branchId || managerEligibleEmployees.length === 0}
                    >
                      <option value="">เลือกพนักงาน</option>
                      {managerEligibleEmployees.map((employee) => (
                        <option key={employee.id} value={employee.id}>
                          {employee.employeeCode} - {employee.name}
                        </option>
                      ))}
                    </select>
                    {managerForm.branchId && managerEligibleEmployees.length === 0 && (
                      <p className="text-xs text-gray-500 mt-2">
                        * ไม่มีพนักงานในสาขานี้ กรุณาเพิ่มพนักงานหรือเลือกสาขาอื่น
                      </p>
                    )}
                  </div>
                  <button
                    type="submit"
                    className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300"
                    disabled={
                      !managerForm.branchId ||
                      !managerForm.employeeId ||
                      managerEligibleEmployees.length === 0
                    }
                  >
                    บันทึกผู้จัดการสาขา
                  </button>
                </form>
                <div className="mt-6">
                  <h4 className="text-sm font-semibold mb-2">รายการผู้จัดการ</h4>
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200 text-sm">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-2 text-left font-medium uppercase">สาขา</th>
                          <th className="px-4 py-2 text-left font-medium uppercase">พนักงาน</th>
                          <th className="px-4 py-2 text-left font-medium uppercase">การจัดการ</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {managersAssignments.length === 0 ? (
                          <tr>
                            <td className="px-4 py-3 text-gray-500" colSpan={3}>
                              ยังไม่มีผู้จัดการที่ตั้งค่าไว้
                            </td>
                          </tr>
                        ) : (
                          managersAssignments.map((assignment) => (
                            <tr key={assignment.id}>
                              <td className="px-4 py-3">
                                {assignment.branch
                                  ? `${assignment.branch.code} • ${assignment.branch.name}`
                                  : '-'}
                              </td>
                              <td className="px-4 py-3">
                                {assignment.employee.employeeCode} • {assignment.employee.name}
                              </td>
                              <td className="px-4 py-3">
                                <button
                                  type="button"
                                  onClick={() => handleRemoveAssignment(assignment.id)}
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
              </div>
            </div>

            <div className="border rounded-lg p-6">
              <h3 className="text-lg font-semibold mb-4">หัวหน้าแผนก (Department Head)</h3>
              <form onSubmit={handleAddDepartmentHead} className="grid gap-4 md:grid-cols-3">
                <div>
                  <label className="block text-sm font-medium mb-2">สาขา *</label>
                  <select
                    value={departmentHeadForm.branchId}
                    onChange={(event) =>
                      setDepartmentHeadForm({
                        branchId: event.target.value,
                        departmentId: '',
                        employeeId: '',
                      })
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
                  <label className="block text-sm font-medium mb-2">แผนก *</label>
                  <select
                    value={departmentHeadForm.departmentId}
                    onChange={(event) =>
                      setDepartmentHeadForm((prev) => ({
                        ...prev,
                        departmentId: event.target.value,
                        employeeId: '',
                      }))
                    }
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                    required
                    disabled={departmentOptionsForHead.length === 0}
                  >
                    <option value="">เลือกแผนก</option>
                    {departmentOptionsForHead.map((department) => (
                      <option key={department.id} value={department.id}>
                        {department.code} - {department.name}
                      </option>
                    ))}
                  </select>
                  {departmentHeadForm.branchId && departmentOptionsForHead.length === 0 && (
                    <p className="text-xs text-gray-500 mt-2">
                      * สาขานี้ยังไม่มีแผนก กรุณาเพิ่มแผนกก่อน
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">พนักงาน *</label>
                  <select
                    value={departmentHeadForm.employeeId}
                    onChange={(event) =>
                      setDepartmentHeadForm((prev) => ({ ...prev, employeeId: event.target.value }))
                    }
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                    required
                    disabled={departmentHeadEligibleEmployees.length === 0}
                  >
                    <option value="">เลือกพนักงาน</option>
                    {departmentHeadEligibleEmployees.map((employee) => (
                      <option key={employee.id} value={employee.id}>
                        {employee.employeeCode} - {employee.name}
                      </option>
                    ))}
                  </select>
                  {departmentHeadForm.departmentId && departmentHeadEligibleEmployees.length === 0 && (
                    <p className="text-xs text-gray-500 mt-2">
                      * ยังไม่มีพนักงานในแผนกนี้ กรุณาเพิ่มพนักงานก่อน
                    </p>
                  )}
                </div>

                <div className="md:col-span-3">
                  <button
                    type="submit"
                    className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300"
                    disabled={
                      !departmentHeadForm.branchId ||
                      !departmentHeadForm.departmentId ||
                      !departmentHeadForm.employeeId ||
                      departmentHeadEligibleEmployees.length === 0
                    }
                  >
                    บันทึกหัวหน้าแผนก
                  </button>
                </div>
              </form>

              <div className="mt-6">
                <h4 className="text-sm font-semibold mb-2">รายการหัวหน้าแผนก</h4>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200 text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-2 text-left font-medium uppercase">สาขา</th>
                        <th className="px-4 py-2 text-left font-medium uppercase">แผนก</th>
                        <th className="px-4 py-2 text-left font-medium uppercase">พนักงาน</th>
                        <th className="px-4 py-2 text-left font-medium uppercase">การจัดการ</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {departmentHeadAssignments.length === 0 ? (
                        <tr>
                          <td className="px-4 py-3 text-gray-500" colSpan={4}>
                            ยังไม่มีหัวหน้าแผนกที่ตั้งค่าไว้
                          </td>
                        </tr>
                      ) : (
                        departmentHeadAssignments.map((assignment) => (
                          <tr key={assignment.id}>
                            <td className="px-4 py-3">
                              {assignment.branch
                                ? `${assignment.branch.code} • ${assignment.branch.name}`
                                : '-'}
                            </td>
                            <td className="px-4 py-3">
                              {assignment.department
                                ? `${assignment.department.code} • ${assignment.department.name}`
                                : '-'}
                            </td>
                            <td className="px-4 py-3">
                              {assignment.employee.employeeCode} • {assignment.employee.name}
                            </td>
                            <td className="px-4 py-3">
                              <button
                                type="button"
                                onClick={() => handleRemoveAssignment(assignment.id)}
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
            </div>

            {assignmentMessage && (
              <div
                className={`rounded-lg border p-3 text-sm ${
                  assignmentMessage.includes('เรียบร้อย')
                    ? 'bg-green-50 border-green-200 text-green-800'
                    : 'bg-red-50 border-red-200 text-red-800'
                }`}
              >
                {assignmentMessage}
              </div>
            )}
          </div>
        </section>

        <section className="bg-white rounded-lg shadow">
          <div className="p-6 border-b flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold">ขั้นที่ 5: เพิ่มพนักงาน</h2>
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
