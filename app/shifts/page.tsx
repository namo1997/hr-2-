// app/shifts/page.tsx - จัดการกะทำงานพร้อมเชื่อมต่อฐานข้อมูล

'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

import {
  validateWeeklyTemplate,
  type BreakRule,
  type BreakRuleType,
  type DayOfWeek,
  type WeeklyShiftTemplate,
} from '@/lib/shift-logic';

type ScopeLevel = 'ZONE' | 'BRANCH' | 'DEPARTMENT';

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

interface ShiftBreakRuleResponse {
  id: number;
  type: BreakRuleType;
  minutes: number | null;
  startTime: string | null;
  endTime: string | null;
}

interface ShiftDayResponse {
  id: number;
  dayOfWeek: DayOfWeek;
  startTime: string;
  endTime: string;
  breakRules: ShiftBreakRuleResponse[];
}

interface ShiftScopeAssignmentResponse {
  id: number;
  level: ScopeLevel;
  zoneId: number | null;
  branchId: number | null;
  departmentId: number | null;
  zone?: Zone | null;
  branch?: Branch | null;
  department?: Department | null;
}

interface ShiftRecord {
  id: number;
  name: string;
  description?: string | null;
  isActive: boolean;
  days: ShiftDayResponse[];
  scopeAssignments: ShiftScopeAssignmentResponse[];
}

interface BreakRuleForm {
  type: BreakRuleType;
  minutes: number;
  startTime: string;
  endTime: string;
}

interface DayForm {
  day: DayOfWeek;
  startTime: string;
  endTime: string;
  breakRules: BreakRuleForm[];
}

interface ScopeForm {
  level: ScopeLevel;
  zoneId?: string;
  branchId?: string;
  departmentId?: string;
}

const DAY_ORDER: DayOfWeek[] = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];

const DAY_LABELS: Record<DayOfWeek, string> = {
  MON: 'จันทร์',
  TUE: 'อังคาร',
  WED: 'พุธ',
  THU: 'พฤหัสฯ',
  FRI: 'ศุกร์',
  SAT: 'เสาร์',
  SUN: 'อาทิตย์',
};

const createDefaultBreakRule = (): BreakRuleForm => ({
  type: 'DURATION',
  minutes: 60,
  startTime: '12:50',
  endTime: '18:00',
});

const createInitialDayForms = (): DayForm[] =>
  DAY_ORDER.map((day) => ({
    day,
    startTime: '10:00',
    endTime: '21:00',
    breakRules: [createDefaultBreakRule()],
  }));

const fetchJson = async <T,>(input: RequestInfo, init?: RequestInit) => {
  const response = await fetch(input, {
    headers: { 'Content-Type': 'application/json' },
    ...init,
  });
  if (!response.ok) {
    let message = response.statusText;
    try {
      const data = (await response.json()) as { message?: string };
      if (data?.message) {
        message = data.message;
      }
    } catch (error) {
      console.error('failed to parse error response', error);
    }
    throw new Error(message);
  }
  return (await response.json()) as T;
};

const formatBreakRules = (breakRules: ShiftBreakRuleResponse[]) => {
  if (breakRules.length === 0) {
    return 'ไม่มีเวลาพัก';
  }
  return breakRules
    .map((rule) =>
      rule.type === 'DURATION'
        ? `พักแบบยืดหยุ่น ${rule.minutes ?? 0} นาที (ช่วง ${rule.startTime ?? '-'} - ${rule.endTime ?? '-'})`
        : `พักแบบกำหนดเวลา ${rule.startTime ?? '-'} - ${rule.endTime ?? '-'}`,
    )
    .join(', ');
};

const formatScopeAssignment = (assignment: ShiftScopeAssignmentResponse) => {
  if (assignment.level === 'ZONE') {
    return `โซน ${assignment.zone?.code ?? assignment.zoneId ?? ''}`;
  }
  if (assignment.level === 'BRANCH') {
    return `สาขา ${assignment.branch?.code ?? assignment.branchId ?? ''}`;
  }
  return `สาขา ${assignment.branch?.code ?? assignment.branchId ?? ''} • แผนก ${
    assignment.department?.code ?? assignment.departmentId ?? ''
  }`;
};

export default function ShiftsPage() {
  const [zones, setZones] = useState<Zone[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [shifts, setShifts] = useState<ShiftRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [showForm, setShowForm] = useState(false);
  const [editingShift, setEditingShift] = useState<ShiftRecord | null>(null);
  const [shiftForm, setShiftForm] = useState({
    name: '',
    description: '',
    isActive: true,
  });
  const [dayForms, setDayForms] = useState<DayForm[]>(createInitialDayForms());
  const [scopeForms, setScopeForms] = useState<ScopeForm[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [formMessage, setFormMessage] = useState<string | null>(null);

  const loadInitialData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [zoneData, branchData, departmentData, shiftData] = await Promise.all([
        fetchJson<Zone[]>('/api/zones'),
        fetchJson<Branch[]>('/api/branches'),
        fetchJson<Department[]>('/api/departments'),
        fetchJson<ShiftRecord[]>('/api/shifts'),
      ]);
      setZones(zoneData);
      setBranches(branchData);
      setDepartments(departmentData);
      setShifts(shiftData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'ไม่สามารถโหลดข้อมูลได้');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadInitialData();
  }, []);

  const resetForm = () => {
    setShiftForm({
      name: '',
      description: '',
      isActive: true,
    });
    setDayForms(createInitialDayForms());
    setScopeForms([]);
    setEditingShift(null);
    setFormMessage(null);
  };

  const handleCreateNew = () => {
    resetForm();
    setShowForm(true);
  };

  const handleEdit = (shift: ShiftRecord) => {
    setEditingShift(shift);
    setShowForm(true);
    setFormMessage(null);
    setShiftForm({
      name: shift.name,
      description: shift.description ?? '',
      isActive: shift.isActive,
    });

    const configMap = new Map(shift.days.map((day) => [day.dayOfWeek, day]));
    setDayForms(
      DAY_ORDER.map((day) => {
        const config = configMap.get(day);
        return {
          day,
          startTime: config?.startTime ?? '10:00',
          endTime: config?.endTime ?? '21:00',
          breakRules:
            config && config.breakRules.length > 0
              ? config.breakRules.map((rule) => ({
                  type: rule.type,
                  minutes: rule.minutes ?? 60,
                  startTime:
                    rule.startTime ?? (rule.type === 'DURATION' ? '12:50' : '13:00'),
                  endTime:
                    rule.endTime ?? (rule.type === 'DURATION' ? '18:00' : '14:00'),
                }))
              : [createDefaultBreakRule()],
        };
      }),
    );

    setScopeForms(
      shift.scopeAssignments.map((assignment) => ({
        level: assignment.level,
        zoneId: assignment.zoneId ? String(assignment.zoneId) : undefined,
        branchId: assignment.branchId ? String(assignment.branchId) : undefined,
        departmentId: assignment.departmentId ? String(assignment.departmentId) : undefined,
      })),
    );
  };

  const handleCancelForm = () => {
    resetForm();
    setShowForm(false);
  };

  const updateDayField = (day: DayOfWeek, field: 'startTime' | 'endTime', value: string) => {
    setDayForms((prev) =>
      prev.map((item) =>
        item.day === day
          ? {
              ...item,
              [field]: value,
            }
          : item,
      ),
    );
  };

  const updateBreakRule = (
    day: DayOfWeek,
    index: number,
    updates: Partial<BreakRuleForm>,
  ) => {
    setDayForms((prev) =>
      prev.map((item) => {
        if (item.day !== day) return item;
        const nextRules = item.breakRules.map((rule, idx) => {
          if (idx !== index) return rule;

          const updatedRule: BreakRuleForm = {
            ...rule,
            ...updates,
          };

          if (updates.type === 'DURATION') {
            updatedRule.type = 'DURATION';
            updatedRule.minutes = updatedRule.minutes ?? 60;
            updatedRule.startTime = updates.startTime ?? rule.startTime ?? '12:50';
            updatedRule.endTime = updates.endTime ?? rule.endTime ?? '18:00';
          } else if (updates.type === 'FIXED') {
            updatedRule.type = 'FIXED';
            updatedRule.startTime = updates.startTime ?? rule.startTime ?? '13:00';
            updatedRule.endTime = updates.endTime ?? rule.endTime ?? '14:00';
          } else if (updatedRule.type === 'DURATION') {
            updatedRule.minutes = updatedRule.minutes ?? 60;
            updatedRule.startTime = updatedRule.startTime ?? '12:50';
            updatedRule.endTime = updatedRule.endTime ?? '18:00';
          } else {
            updatedRule.startTime = updatedRule.startTime ?? '13:00';
            updatedRule.endTime = updatedRule.endTime ?? '14:00';
          }

          return updatedRule;
        });

        return {
          ...item,
          breakRules: nextRules,
        };
      }),
    );
  };

  const addBreakRule = (day: DayOfWeek) => {
    setDayForms((prev) =>
      prev.map((item) =>
        item.day === day
          ? { ...item, breakRules: [...item.breakRules, createDefaultBreakRule()] }
          : item,
      ),
    );
  };

  const removeBreakRule = (day: DayOfWeek, index: number) => {
    setDayForms((prev) =>
      prev.map((item) =>
        item.day === day
          ? {
              ...item,
              breakRules:
                item.breakRules.length === 1
                  ? item.breakRules
                  : item.breakRules.filter((_, idx) => idx !== index),
            }
          : item,
      ),
    );
  };

  const handleAddScope = () => {
    setScopeForms((prev) => [...prev, { level: 'ZONE' }]);
  };

  const handleRemoveScope = (index: number) => {
    setScopeForms((prev) => prev.filter((_, idx) => idx !== index));
  };

  const updateScopeForm = (index: number, updates: Partial<ScopeForm>) => {
    setScopeForms((prev) =>
      prev.map((item, idx) =>
        idx === index
          ? {
              ...item,
              ...updates,
              ...(updates.level
                ? {
                    zoneId: updates.level === 'ZONE' ? item.zoneId : undefined,
                    branchId: updates.level === 'BRANCH' || updates.level === 'DEPARTMENT' ? item.branchId : undefined,
                    departmentId: updates.level === 'DEPARTMENT' ? item.departmentId : undefined,
                  }
                : {}),
            }
          : item,
      ),
    );
  };

  const buildWeeklyTemplate = (): WeeklyShiftTemplate => ({
    name: shiftForm.name,
    days: dayForms.map((day) => ({
      day: day.day,
      startTime: day.startTime,
      endTime: day.endTime,
      breakRules: day.breakRules.map<BreakRule>((rule) =>
        rule.type === 'DURATION'
          ? {
              type: 'DURATION',
              minutes: rule.minutes,
              startTime: rule.startTime,
              endTime: rule.endTime,
            }
          : { type: 'FIXED', startTime: rule.startTime, endTime: rule.endTime },
      ),
    })),
  });

  const buildScopePayload = () => {
    return scopeForms.map((scope, index) => {
      if (scope.level === 'ZONE') {
        const zoneId = scope.zoneId ? Number(scope.zoneId) : NaN;
        if (!Number.isFinite(zoneId)) {
          throw new Error(`กรุณาเลือกโซนที่รายการกำหนดกะลำดับที่ ${index + 1}`);
        }
        return { level: 'ZONE' as ScopeLevel, zoneId };
      }
      if (scope.level === 'BRANCH') {
        const branchId = scope.branchId ? Number(scope.branchId) : NaN;
        if (!Number.isFinite(branchId)) {
          throw new Error(`กรุณาเลือกสาขาที่รายการกำหนดกะลำดับที่ ${index + 1}`);
        }
        return { level: 'BRANCH' as ScopeLevel, branchId };
      }
      const branchId = scope.branchId ? Number(scope.branchId) : NaN;
      const departmentId = scope.departmentId ? Number(scope.departmentId) : NaN;
      if (!Number.isFinite(branchId) || !Number.isFinite(departmentId)) {
        throw new Error(`กรุณาเลือกสาขาและแผนกที่รายการกำหนดกะลำดับที่ ${index + 1}`);
      }
      return {
        level: 'DEPARTMENT' as ScopeLevel,
        branchId,
        departmentId,
      };
    });
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!shiftForm.name.trim()) {
      alert('กรุณาระบุชื่อกะ');
      return;
    }

    const template = buildWeeklyTemplate();

    try {
      validateWeeklyTemplate(template);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'ข้อมูลเวลาทำงานไม่ถูกต้อง');
      return;
    }

    let scopeAssignments: Array<{ level: ScopeLevel; zoneId?: number; branchId?: number; departmentId?: number }>;
    try {
      scopeAssignments = buildScopePayload();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'ข้อมูลการกำหนดกะไม่ถูกต้อง');
      return;
    }

    const payload = {
      name: shiftForm.name.trim(),
      description: shiftForm.description.trim() || null,
      isActive: shiftForm.isActive,
      days: template.days.map((day) => ({
        day: day.day,
        startTime: day.startTime,
        endTime: day.endTime,
        breakRules: day.breakRules.map((rule) =>
          rule.type === 'DURATION'
            ? {
                type: rule.type,
                minutes: rule.minutes,
                startTime: rule.startTime,
                endTime: rule.endTime,
              }
            : { type: rule.type, startTime: rule.startTime, endTime: rule.endTime },
        ),
      })),
      scopeAssignments: scopeAssignments.map((assignment) => ({
        level: assignment.level,
        zoneId: assignment.level === 'ZONE' ? assignment.zoneId ?? null : null,
        branchId:
          assignment.level === 'BRANCH' || assignment.level === 'DEPARTMENT'
            ? assignment.branchId ?? null
            : null,
        departmentId: assignment.level === 'DEPARTMENT' ? assignment.departmentId ?? null : null,
      })),
    };

    setSubmitting(true);
    try {
      const result = await fetchJson<ShiftRecord>(
        editingShift ? `/api/shifts/${editingShift.id}` : '/api/shifts',
        {
          method: editingShift ? 'PUT' : 'POST',
          body: JSON.stringify(payload),
        },
      );

      setShifts((prev) =>
        editingShift
          ? prev.map((shift) => (shift.id === result.id ? result : shift))
          : [result, ...prev],
      );

      setFormMessage(editingShift ? 'อัปเดตกะเรียบร้อยแล้ว' : 'สร้างกะใหม่เรียบร้อยแล้ว');
      resetForm();
      setShowForm(false);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'ไม่สามารถบันทึกกะได้');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (shiftId: number) => {
    if (!confirm('ยืนยันการลบกะนี้?')) {
      return;
    }
    try {
      await fetchJson<{ success: boolean }>(`/api/shifts/${shiftId}`, {
        method: 'DELETE',
      });
      setShifts((prev) => prev.filter((shift) => shift.id !== shiftId));
    } catch (err) {
      alert(err instanceof Error ? err.message : 'ไม่สามารถลบกะได้');
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="mx-auto max-w-7xl space-y-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold">จัดการกะทำงาน</h1>
            <p className="mt-2 text-sm text-gray-600">
              ตั้งค่าเวลาทำงานรายวัน กำหนดเวลาพัก และเลือกกลุ่มพนักงาน (โซน / สาขา / แผนก) ที่ใช้กะนั้น
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <button
              onClick={handleCreateNew}
              className="rounded-lg bg-blue-600 px-6 py-2 text-white hover:bg-blue-700"
            >
              {showForm ? 'สร้างกะใหม่' : '+ เพิ่มกะใหม่'}
            </button>
            <Link href="/" className="rounded-lg bg-gray-200 px-6 py-2 hover:bg-gray-300">
              กลับหน้าหลัก
            </Link>
          </div>
        </div>

        {loading && (
          <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 text-blue-700">
            กำลังโหลดข้อมูล...
          </div>
        )}

        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-700">
            {error}
          </div>
        )}

        {showForm && (
          <form
            onSubmit={handleSubmit}
            className="space-y-8 rounded-lg bg-white p-6 shadow"
          >
            <div className="space-y-4">
              <h2 className="text-xl font-semibold">ข้อมูลกะ</h2>
              <div className="grid gap-4 md:grid-cols-[2fr_1fr]">
                <div>
                  <label className="mb-2 block text-sm font-medium">ชื่อกะ *</label>
                  <input
                    type="text"
                    value={shiftForm.name}
                    onChange={(event) =>
                      setShiftForm((prev) => ({ ...prev, name: event.target.value }))
                    }
                    className="w-full rounded-lg border px-4 py-2 focus:ring-2 focus:ring-blue-500"
                    placeholder="เช่น กะเช้า, กะบ่าย"
                    required
                  />
                </div>
                <div className="flex items-center gap-2">
                  <input
                    id="shift-active"
                    type="checkbox"
                    checked={shiftForm.isActive}
                    onChange={(event) =>
                      setShiftForm((prev) => ({ ...prev, isActive: event.target.checked }))
                    }
                    className="h-4 w-4"
                  />
                  <label htmlFor="shift-active" className="text-sm font-medium">
                    ใช้งานกะนี้
                  </label>
                </div>
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium">คำอธิบาย</label>
                <textarea
                  value={shiftForm.description}
                  onChange={(event) =>
                    setShiftForm((prev) => ({ ...prev, description: event.target.value }))
                  }
                  rows={2}
                  className="w-full rounded-lg border px-4 py-2 focus:ring-2 focus:ring-blue-500"
                  placeholder="รายละเอียดเพิ่มเติม (ไม่จำเป็น)"
                />
              </div>
            </div>

            <div className="space-y-4">
              <h2 className="text-xl font-semibold">เวลาทำงานรายวัน</h2>
              <p className="text-sm text-gray-600">
                กำหนดเวลาเข้า-ออก และเวลาพักสำหรับทุกวัน (หากเป็นวันหยุดของพนักงานให้กำหนดที่ตัวพนักงานในภายหลัง)
              </p>
              <div className="grid gap-4 md:grid-cols-2">
                {dayForms.map((day) => (
                  <div key={day.day} className="rounded-lg border bg-gray-50 p-4">
                    <div className="font-medium text-gray-900">{DAY_LABELS[day.day]}</div>
                    <div className="mt-3 flex flex-wrap items-center gap-3 text-sm">
                      <label className="flex items-center gap-2">
                        <span>เข้า</span>
                        <input
                          type="time"
                          value={day.startTime}
                          onChange={(event) =>
                            updateDayField(day.day, 'startTime', event.target.value)
                          }
                          className="rounded border px-2 py-1"
                          required
                        />
                      </label>
                      <label className="flex items-center gap-2">
                        <span>ออก</span>
                        <input
                          type="time"
                          value={day.endTime}
                          onChange={(event) =>
                            updateDayField(day.day, 'endTime', event.target.value)
                          }
                          className="rounded border px-2 py-1"
                          required
                        />
                      </label>
                    </div>

                    <div className="mt-4 space-y-3 text-sm">
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-gray-700">เวลาพัก</span>
                        <button
                          type="button"
                          onClick={() => addBreakRule(day.day)}
                          className="rounded bg-blue-100 px-2 py-1 text-xs text-blue-700 hover:bg-blue-200"
                        >
                          + เพิ่มเวลาพัก
                        </button>
                      </div>
                      {day.breakRules.map((rule, index) => (
                        <div
                          key={`${day.day}-break-${index}`}
                          className="rounded border border-dashed border-gray-300 p-3"
                        >
                          <div className="flex flex-wrap items-center gap-3">
                            <select
                              value={rule.type}
                              onChange={(event) =>
                                updateBreakRule(day.day, index, {
                                  type: event.target.value as BreakRuleType,
                                })
                              }
                              className="rounded border px-2 py-1"
                            >
                              <option value="DURATION">พักแบบยืดหยุ่น</option>
                              <option value="FIXED">พักแบบกำหนดเวลา</option>
                            </select>

                            <button
                              type="button"
                              onClick={() => removeBreakRule(day.day, index)}
                              className="ml-auto text-xs text-red-600 hover:text-red-800"
                              disabled={day.breakRules.length === 1}
                            >
                              ลบ
                            </button>
                          </div>

                          {rule.type === 'DURATION' ? (
                            <div className="mt-3 space-y-2">
                              <div className="flex items-center gap-2">
                                <span>ระยะเวลา</span>
                                <input
                                  type="number"
                                  min={1}
                                  value={rule.minutes}
                                  onChange={(event) =>
                                    updateBreakRule(day.day, index, {
                                      minutes: Number(event.target.value),
                                    })
                                  }
                                  className="w-20 rounded border px-2 py-1"
                                />
                                <span>นาที</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <span>ช่วงพักได้</span>
                                <input
                                  type="time"
                                  value={rule.startTime}
                                  onChange={(event) =>
                                    updateBreakRule(day.day, index, {
                                      startTime: event.target.value,
                                    })
                                  }
                                  className="rounded border px-2 py-1"
                                />
                                <span>-</span>
                                <input
                                  type="time"
                                  value={rule.endTime}
                                  onChange={(event) =>
                                    updateBreakRule(day.day, index, {
                                      endTime: event.target.value,
                                    })
                                  }
                                  className="rounded border px-2 py-1"
                                />
                              </div>
                            </div>
                          ) : (
                            <div className="mt-3 flex items-center gap-2">
                              <span>พักเวลา</span>
                              <input
                                type="time"
                                value={rule.startTime}
                                onChange={(event) =>
                                  updateBreakRule(day.day, index, {
                                    startTime: event.target.value,
                                  })
                                }
                                className="rounded border px-2 py-1"
                              />
                              <span>-</span>
                              <input
                                type="time"
                                value={rule.endTime}
                                onChange={(event) =>
                                  updateBreakRule(day.day, index, {
                                    endTime: event.target.value,
                                  })
                                }
                                className="rounded border px-2 py-1"
                              />
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-4">
              <h2 className="text-xl font-semibold">กำหนดพนักงานที่ใช้กะนี้</h2>
              <p className="text-sm text-gray-600">
                เลือกโครงสร้างที่ต้องการให้พนักงานใช้กะนี้ (สามารถกำหนดได้หลายรายการ เช่น ทั้งโซนหรือเฉพาะแผนก)
              </p>
              <div className="space-y-3">
                {scopeForms.length === 0 && (
                  <p className="rounded border border-dashed border-gray-300 bg-gray-50 p-3 text-sm text-gray-600">
                    ยังไม่ได้กำหนดกลุ่มพนักงานที่จะใช้กะนี้
                  </p>
                )}
                {scopeForms.map((scope, index) => {
                  const selectedBranchId = scope.branchId ? Number(scope.branchId) : null;
                  const departmentOptions = selectedBranchId
                    ? departments.filter((department) => department.branchId === selectedBranchId)
                    : [];

                  return (
                    <div
                      key={`scope-${index}`}
                      className="flex flex-wrap items-center gap-3 rounded border border-dashed border-gray-300 bg-gray-50 p-3"
                    >
                      <select
                        value={scope.level}
                        onChange={(event) =>
                          updateScopeForm(index, {
                            level: event.target.value as ScopeLevel,
                            zoneId: undefined,
                            branchId: undefined,
                            departmentId: undefined,
                          })
                        }
                        className="rounded border px-3 py-2 text-sm"
                      >
                        <option value="ZONE">ตามโซน</option>
                        <option value="BRANCH">ตามสาขา</option>
                        <option value="DEPARTMENT">ตามแผนกในสาขา</option>
                      </select>

                      {scope.level === 'ZONE' && (
                        <select
                          value={scope.zoneId ?? ''}
                          onChange={(event) =>
                            updateScopeForm(index, { zoneId: event.target.value || undefined })
                          }
                          className="rounded border px-3 py-2 text-sm"
                          required
                        >
                          <option value="">เลือกโซน</option>
                          {zones.map((zone) => (
                            <option key={zone.id} value={zone.id}>
                              {zone.code} - {zone.name}
                            </option>
                          ))}
                        </select>
                      )}

                      {scope.level !== 'ZONE' && (
                        <select
                          value={scope.branchId ?? ''}
                          onChange={(event) =>
                            updateScopeForm(index, {
                              branchId: event.target.value || undefined,
                              departmentId:
                                scope.level === 'DEPARTMENT' ? undefined : scope.departmentId,
                            })
                          }
                          className="rounded border px-3 py-2 text-sm"
                          required
                        >
                          <option value="">เลือกสาขา</option>
                          {branches.map((branch) => (
                            <option key={branch.id} value={branch.id}>
                              {branch.code} - {branch.name}
                            </option>
                          ))}
                        </select>
                      )}

                      {scope.level === 'DEPARTMENT' && (
                        <select
                          value={scope.departmentId ?? ''}
                          onChange={(event) =>
                            updateScopeForm(index, {
                              departmentId: event.target.value || undefined,
                            })
                          }
                          className="rounded border px-3 py-2 text-sm"
                          required
                        >
                          <option value="">เลือกแผนก</option>
                          {departmentOptions.map((department) => (
                            <option key={department.id} value={department.id}>
                              {department.code} - {department.name}
                            </option>
                          ))}
                        </select>
                      )}

                      <button
                        type="button"
                        onClick={() => handleRemoveScope(index)}
                        className="ml-auto text-sm text-red-600 hover:text-red-800"
                      >
                        ลบ
                      </button>
                    </div>
                  );
                })}
              </div>
              <button
                type="button"
                onClick={handleAddScope}
                className="rounded bg-blue-100 px-4 py-2 text-sm text-blue-700 hover:bg-blue-200"
              >
                + เพิ่มการกำหนดกะตามโครงสร้าง
              </button>
            </div>

            <div className="flex flex-wrap gap-3">
              <button
                type="submit"
                disabled={submitting}
                className="rounded bg-blue-600 px-6 py-2 text-white hover:bg-blue-700 disabled:opacity-60"
              >
                {submitting ? 'กำลังบันทึก...' : editingShift ? 'บันทึกการแก้ไข' : 'สร้างกะ'}
              </button>
              <button
                type="button"
                onClick={handleCancelForm}
                className="rounded bg-gray-200 px-6 py-2 hover:bg-gray-300"
              >
                ยกเลิก
              </button>
            </div>
          </form>
        )}

        {formMessage && (
          <div className="rounded-lg border border-green-200 bg-green-50 p-4 text-green-700">
            {formMessage}
          </div>
        )}

        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">รายการกะทั้งหมด ({shifts.length})</h2>
          </div>

          {shifts.length === 0 ? (
            <div className="rounded-lg border border-dashed border-gray-300 bg-white p-10 text-center text-gray-500">
              ยังไม่มีกะทำงานที่ตั้งค่าไว้
            </div>
          ) : (
            <div className="space-y-4">
              {shifts.map((shift) => (
                <div key={shift.id} className="space-y-4 rounded-lg bg-white p-6 shadow">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-3">
                        <h3 className="text-xl font-semibold">{shift.name}</h3>
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-medium ${
                            shift.isActive
                              ? 'bg-green-100 text-green-800'
                              : 'bg-gray-200 text-gray-600'
                          }`}
                        >
                          {shift.isActive ? 'ใช้งาน' : 'ปิดใช้งาน'}
                        </span>
                      </div>
                      {shift.description && (
                        <p className="mt-1 text-sm text-gray-600">{shift.description}</p>
                      )}
                    </div>
                    <div className="flex gap-3 text-sm">
                      <button
                        onClick={() => handleEdit(shift)}
                        className="text-blue-600 hover:text-blue-800"
                      >
                        แก้ไข
                      </button>
                      <button
                        onClick={() => handleDelete(shift.id)}
                        className="text-red-600 hover:text-red-800"
                      >
                        ลบ
                      </button>
                    </div>
                  </div>

                  <div className="space-y-2 text-sm text-gray-700">
                    <h4 className="font-semibold text-gray-900">ตารางรายวัน</h4>
                    <ul className="grid gap-2 md:grid-cols-2">
                      {DAY_ORDER.map((day) => {
                        const config = shift.days.find((item) => item.dayOfWeek === day);
                        if (!config) {
                          return (
                            <li key={`${shift.id}-${day}`} className="rounded border p-3 text-gray-400">
                              {DAY_LABELS[day]} • ไม่ได้กำหนดเวลาทำงาน
                            </li>
                          );
                        }
                        return (
                          <li key={`${shift.id}-${day}`} className="rounded border p-3">
                            <div className="font-medium text-gray-900">
                              {DAY_LABELS[day]} • {config.startTime} - {config.endTime}
                            </div>
                            <div className="text-xs text-gray-600">
                              {formatBreakRules(config.breakRules)}
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  </div>

                  <div className="space-y-2 text-sm text-gray-700">
                    <h4 className="font-semibold text-gray-900">กลุ่มพนักงานที่ใช้กะนี้</h4>
                    {shift.scopeAssignments.length === 0 ? (
                      <p className="rounded border border-dashed border-gray-300 bg-gray-50 p-3 text-gray-500">
                        ยังไม่ได้กำหนดโครงสร้างพนักงาน
                      </p>
                    ) : (
                      <ul className="grid gap-2 md:grid-cols-2">
                        {shift.scopeAssignments.map((assignment) => (
                          <li key={assignment.id} className="rounded border border-dashed p-3">
                            {formatScopeAssignment(assignment)}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
