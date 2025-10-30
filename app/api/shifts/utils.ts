import { Prisma, BreakRuleType as PrismaBreakRuleType } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import {
  validateWeeklyTemplate,
  type BreakRule,
  type BreakRuleType,
  type DayOfWeek,
  type WeeklyShiftTemplate,
} from "@/lib/shift-logic";

export const SHIFT_INCLUDE = {
  days: {
    orderBy: { dayOfWeek: "asc" },
    include: {
      breakRules: {
        orderBy: { createdAt: "asc" },
      },
    },
  },
  scopeAssignments: {
    include: {
      zone: true,
      branch: true,
      department: true,
    },
  },
} satisfies Prisma.ShiftInclude;

const DAY_VALUES: DayOfWeek[] = [
  "MON",
  "TUE",
  "WED",
  "THU",
  "FRI",
  "SAT",
  "SUN",
];

const isDayOfWeek = (value: unknown): value is DayOfWeek =>
  typeof value === "string" && DAY_VALUES.includes(value as DayOfWeek);

const isBreakRuleType = (value: unknown): value is BreakRuleType =>
  value === "DURATION" || value === "FIXED";

type ScopeLevel = "ZONE" | "BRANCH" | "DEPARTMENT";

const isScopeLevel = (value: unknown): value is ScopeLevel =>
  value === "ZONE" || value === "BRANCH" || value === "DEPARTMENT";

export interface BreakRulePayload {
  type?: BreakRuleType;
  minutes?: number;
  startTime?: string;
  endTime?: string;
}

export interface DayPayload {
  day?: DayOfWeek;
  startTime?: string;
  endTime?: string;
  breakRules?: BreakRulePayload[];
}

export interface ScopeAssignmentPayload {
  level?: ScopeLevel;
  zoneId?: number | null;
  branchId?: number | null;
  departmentId?: number | null;
}

export interface ShiftPayload {
  name?: string;
  description?: string | null;
  isActive?: boolean;
  days?: DayPayload[];
  scopeAssignments?: ScopeAssignmentPayload[];
}

const normalizeBreakRule = (rule: BreakRulePayload, day: DayOfWeek, index: number): BreakRule => {
  if (!isBreakRuleType(rule.type)) {
    throw new Error(`กรุณาระบุประเภทการพักของวัน ${day} แถวที่ ${index + 1}`);
  }

  if (rule.type === "DURATION") {
    if (typeof rule.minutes !== "number" || Number.isNaN(rule.minutes)) {
      throw new Error(`กรุณาระบุจำนวนนาทีที่พักของวัน ${day} แถวที่ ${index + 1}`);
    }
    if (!rule.startTime || !rule.endTime) {
      throw new Error(`กรุณาระบุช่วงเวลาที่อนุญาตให้พักของวัน ${day} แถวที่ ${index + 1}`);
    }
    return {
      type: "DURATION",
      minutes: rule.minutes,
      startTime: rule.startTime,
      endTime: rule.endTime,
    };
  }

  if (!rule.startTime || !rule.endTime) {
    throw new Error(`กรุณาระบุเวลาเริ่ม/สิ้นสุดการพักของวัน ${day} แถวที่ ${index + 1}`);
  }

  return {
    type: "FIXED",
    startTime: rule.startTime,
    endTime: rule.endTime,
  };
};

export const normalizeWeeklyTemplate = (body: ShiftPayload) => {
  if (!body.days || body.days.length === 0) {
    throw new Error("ต้องกำหนดเวลาทำงานอย่างน้อยหนึ่งวัน");
  }

  const days = body.days.map((dayPayload, dayIndex) => {
    if (!isDayOfWeek(dayPayload.day)) {
      throw new Error(`ระบุวันไม่ถูกต้องในรายการที่ ${dayIndex + 1}`);
    }
    if (!dayPayload.startTime || !dayPayload.endTime) {
      throw new Error(`กรุณาระบุเวลาเริ่มและสิ้นสุดสำหรับวัน ${dayPayload.day}`);
    }
    const breakRulesPayload = dayPayload.breakRules ?? [];
    const breakRules = breakRulesPayload.map((rule, ruleIndex) =>
      normalizeBreakRule(rule, dayPayload.day as DayOfWeek, ruleIndex),
    );
    return {
      day: dayPayload.day,
      startTime: dayPayload.startTime,
      endTime: dayPayload.endTime,
      breakRules,
    };
  });

  if (days.length !== DAY_VALUES.length) {
    throw new Error("ต้องกำหนดเวลาทำงานครบทั้ง 7 วัน");
  }

  const template: WeeklyShiftTemplate = {
    name: body.name?.trim() || "Shift Template",
    days,
  };
  validateWeeklyTemplate(template);
  return template;
};

export const resolveScopeAssignments = async (
  shiftId: number | null,
  payloads: ScopeAssignmentPayload[] | undefined,
) => {
  const assignments = payloads ?? [];
  const zoneIds = new Set<number>();
  const branchIds = new Set<number>();
  const departmentIds = new Set<number>();
  const assignmentKeys = new Set<string>();

  assignments.forEach((assignment, index) => {
    if (!isScopeLevel(assignment.level)) {
      throw new Error(`กรุณาระบุระดับการกำหนดกะสำหรับรายการที่ ${index + 1}`);
    }
    const keyParts = [assignment.level];

    if (assignment.level === "ZONE") {
      if (!assignment.zoneId) {
        throw new Error(`กรุณาเลือกโซนสำหรับรายการที่ ${index + 1}`);
      }
      keyParts.push(String(assignment.zoneId));
      zoneIds.add(assignment.zoneId);
    } else if (assignment.level === "BRANCH") {
      if (!assignment.branchId) {
        throw new Error(`กรุณาเลือกสาขาสำหรับรายการที่ ${index + 1}`);
      }
      keyParts.push(String(assignment.branchId));
      branchIds.add(assignment.branchId);
    } else {
      if (!assignment.branchId || !assignment.departmentId) {
        throw new Error(`กรุณาเลือกสาขาและแผนกสำหรับรายการที่ ${index + 1}`);
      }
      keyParts.push(String(assignment.branchId), String(assignment.departmentId));
      branchIds.add(assignment.branchId);
      departmentIds.add(assignment.departmentId);
    }

    const key = `${shiftId ?? "new"}-${keyParts.join("-")}`;
    if (assignmentKeys.has(key)) {
      throw new Error(`มีการกำหนดกะซ้ำในรายการที่ ${index + 1}`);
    }
    assignmentKeys.add(key);
  });

  const [zones, branches, departments] = await Promise.all([
    zoneIds.size
      ? prisma.zone.findMany({ where: { id: { in: Array.from(zoneIds) } } })
      : Promise.resolve([]),
    branchIds.size
      ? prisma.branch.findMany({ where: { id: { in: Array.from(branchIds) } } })
      : Promise.resolve([]),
    departmentIds.size
      ? prisma.department.findMany({ where: { id: { in: Array.from(departmentIds) } } })
      : Promise.resolve([]),
  ]);

  const zoneMap = new Map(zones.map((zone) => [zone.id, zone]));
  const branchMap = new Map(branches.map((branch) => [branch.id, branch]));
  const departmentMap = new Map(departments.map((department) => [department.id, department]));

  assignments.forEach((assignment, index) => {
    if (assignment.level === "ZONE") {
      if (!assignment.zoneId || !zoneMap.has(assignment.zoneId)) {
        throw new Error(`ไม่พบโซนที่เลือกในรายการที่ ${index + 1}`);
      }
    } else if (assignment.level === "BRANCH") {
      if (!assignment.branchId || !branchMap.has(assignment.branchId)) {
        throw new Error(`ไม่พบสาขาที่เลือกในรายการที่ ${index + 1}`);
      }
    } else if (assignment.level === "DEPARTMENT") {
      if (
        !assignment.branchId ||
        !assignment.departmentId ||
        !branchMap.has(assignment.branchId) ||
        !departmentMap.has(assignment.departmentId)
      ) {
        throw new Error(`ไม่พบสาขา/แผนกที่เลือกในรายการที่ ${index + 1}`);
      }
      const department = departmentMap.get(assignment.departmentId)!;
      if (department.branchId !== assignment.branchId) {
        throw new Error(
          `แผนกที่เลือกไม่อยู่ในสาขาที่ระบุ (รายการที่ ${index + 1})`,
        );
      }
    }
  });

  return assignments.map((assignment) => ({
    level: assignment.level!,
    zoneId: assignment.level === "ZONE" ? assignment.zoneId : null,
    branchId:
      assignment.level === "BRANCH" || assignment.level === "DEPARTMENT"
        ? assignment.branchId ?? null
        : null,
    departmentId: assignment.level === "DEPARTMENT" ? assignment.departmentId ?? null : null,
  }));
};

export const mapBreakRuleToPrisma = (rule: BreakRule) =>
  rule.type === "DURATION"
    ? {
        type: PrismaBreakRuleType.DURATION,
        minutes: rule.minutes,
        startTime: rule.startTime,
        endTime: rule.endTime,
      }
    : {
        type: PrismaBreakRuleType.FIXED,
        startTime: rule.startTime,
        endTime: rule.endTime,
      };
