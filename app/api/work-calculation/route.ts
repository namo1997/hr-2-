import { NextRequest, NextResponse } from "next/server";

import { DayOfWeek } from "@prisma/client";

import { prisma } from "@/lib/prisma";

const dayIndexToEnum: Record<number, DayOfWeek> = {
  0: "SUN",
  1: "MON",
  2: "TUE",
  3: "WED",
  4: "THU",
  5: "FRI",
  6: "SAT",
};

const parseDate = (value: string | null, fallback: Date) => {
  if (!value) return fallback;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return fallback;
  }
  return parsed;
};

const toStartOfDayUTC = (date: Date) => {
  const next = new Date(date);
  next.setUTCHours(0, 0, 0, 0);
  return next;
};

const toEndOfDayUTC = (date: Date) => {
  const next = new Date(date);
  next.setUTCHours(23, 59, 59, 999);
  return next;
};

const timeToMinutes = (value: string | null | undefined) => {
  if (!value) return null;
  const [hour, minute] = value.split(":").map(Number);
  if (Number.isNaN(hour) || Number.isNaN(minute)) {
    return null;
  }
  return hour * 60 + minute;
};

const minutesDiff = (from: string | null | undefined, to: string | null | undefined) => {
  const fromMinutes = timeToMinutes(from);
  const toMinutes = timeToMinutes(to);
  if (fromMinutes === null || toMinutes === null) {
    return null;
  }
  return toMinutes - fromMinutes;
};

const convertMinutesToHours = (minutes: number) => minutes / 60;

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const startDateParam = searchParams.get("startDate");
    const endDateParam = searchParams.get("endDate");
    const searchParam = searchParams.get("search");

    const today = new Date();
    const defaultStart = new Date(today.getFullYear(), today.getMonth(), 1);
    const startDate = toStartOfDayUTC(parseDate(startDateParam, defaultStart));
    const endDate = toEndOfDayUTC(parseDate(endDateParam, today));

    const employeeFilters: Parameters<typeof prisma.employee.findMany>[0]['where'] = {};

    if (searchParam && searchParam.trim()) {
      const keyword = searchParam.trim();
      employeeFilters.OR = [
        { employeeCode: { contains: keyword, mode: 'insensitive' } },
        { name: { contains: keyword, mode: 'insensitive' } },
      ];
    }

    const employees = await prisma.employee.findMany({
      where: employeeFilters,
      select: {
        id: true,
        employeeCode: true,
        name: true,
        departmentId: true,
        departmentRel: true,
        branchId: true,
        branch: true,
        zoneId: true,
        zone: true,
      },
    });

    const employeeMap = new Map<string, (typeof employees)[number]>();
    employees.forEach((employee) => {
      if (employee.employeeCode) {
        employeeMap.set(employee.employeeCode, employee);
      }
    });

    const shifts = await prisma.shift.findMany({
      include: {
        days: {
          include: {
            breakRules: true,
          },
        },
        scopeAssignments: true,
      },
    });

    const scans = await prisma.attendanceScan.findMany({
      where: {
        scanDate: {
          gte: startDate,
          lte: endDate,
        },
      },
      orderBy: [
        { scanDate: 'desc' },
        { employeeCode: 'asc' },
        { id: 'asc' },
      ],
    });

    const records = scans.map((scan) => {
      const employee = scan.employeeCode ? employeeMap.get(scan.employeeCode) : undefined;
      const scanDate = scan.scanDate;
      const dayEnum = dayIndexToEnum[scanDate.getUTCDay()];

      const applicableShift = shifts.find((shift) =>
        shift.scopeAssignments.some((scope) => {
          if (scope.level === 'ZONE') {
            return employee?.zoneId && scope.zoneId === employee.zoneId;
          }
          if (scope.level === 'BRANCH') {
            return employee?.branchId && scope.branchId === employee.branchId;
          }
          if (scope.level === 'DEPARTMENT') {
            return (
              employee?.branchId &&
              employee?.departmentId &&
              scope.branchId === employee.branchId &&
              scope.departmentId === employee.departmentId
            );
          }
          return false;
        })
      );

      const shiftDay = applicableShift?.days.find((day) => day.dayOfWeek === dayEnum);
      const breakRule = shiftDay?.breakRules[0];

      let scanTimes: string[] = [];
      try {
        scanTimes = scan.allScans ? (JSON.parse(scan.allScans) as string[]) : [];
      } catch (error) {
        console.warn('[work-calculation] failed to parse scan times', error);
      }

      scanTimes.sort();
      const checkIn = scanTimes[0] ?? null;
      const checkOut = scanTimes.length > 1 ? scanTimes[scanTimes.length - 1] : null;
      const breakOut = scanTimes.length >= 3 ? scanTimes[1] : null;
      const breakIn = scanTimes.length >= 4 ? scanTimes[scanTimes.length - 2] : null;

      const lateness = shiftDay?.startTime ? (timeToMinutes(checkIn) ?? 0) - (timeToMinutes(shiftDay.startTime) ?? 0) : 0;
      const lateMinutes = lateness && lateness > 0 ? lateness : 0;

      let breakExceededMinutes = 0;
      if (breakRule && breakOut && breakIn) {
        const actualBreak = minutesDiff(breakOut, breakIn) ?? 0;
        if (breakRule.type === 'DURATION') {
          const allowed = breakRule.minutes ?? 0;
          if (actualBreak > allowed) {
            breakExceededMinutes = actualBreak - allowed;
          }
        } else if (breakRule.startTime && breakRule.endTime) {
          const breakWindowStart = timeToMinutes(breakRule.startTime) ?? 0;
          const breakWindowEnd = timeToMinutes(breakRule.endTime) ?? 0;
          const actualOut = timeToMinutes(breakOut) ?? 0;
          const actualIn = timeToMinutes(breakIn) ?? 0;

          if (actualOut < breakWindowStart) {
            breakExceededMinutes += breakWindowStart - actualOut;
          }
          if (actualIn > breakWindowEnd) {
            breakExceededMinutes += actualIn - breakWindowEnd;
          }
        }
      }

      let overtimeMinutes = 0;
      if (shiftDay?.endTime && checkOut) {
        const diff = (timeToMinutes(checkOut) ?? 0) - (timeToMinutes(shiftDay.endTime) ?? 0);
        if (diff > 0) {
          overtimeMinutes = diff;
        }
      }

      const missingCheckOut = !!shiftDay && !checkOut;
      const missingBreak = !!breakRule && (!breakOut || !breakIn);
      const missingCheckIn = !!shiftDay && !checkIn;

      const rawWorkingMinutes = checkIn && checkOut ? minutesDiff(checkIn, checkOut) ?? 0 : 0;
      const breakMinutes = breakRule?.minutes ?? 0;
      const netWorkMinutes = Math.max(0, rawWorkingMinutes - breakMinutes);

      return {
        id: scan.id,
        employeeCode: scan.employeeCode,
        employeeName: employee?.name ?? null,
        departmentId: employee?.departmentId ?? null,
        departmentName: employee?.departmentRel?.name ?? null,
        branchId: employee?.branchId ?? null,
        branchName: employee?.branch?.name ?? null,
        zoneId: employee?.zoneId ?? null,
        zoneName: employee?.zone?.name ?? null,
        date: scanDate.toISOString(),
        shiftName: applicableShift?.name ?? null,
        shiftStart: shiftDay?.startTime ?? null,
        shiftEnd: shiftDay?.endTime ?? null,
        checkIn,
        breakOut,
        breakIn,
        checkOut,
        scanCount: scan.scanCount,
        scanTimes,
        importSource: scan.importSource,
        importedAt: scan.importedAt.toISOString(),
        lateMinutes,
        breakExceededMinutes,
        overtimeMinutes,
        missingCheckIn,
        missingCheckOut,
        missingBreak,
        workingMinutes: netWorkMinutes,
      };
    });

    const indicators = {
      totalLate: records.filter((record) => record.lateMinutes > 0).length,
      totalBreakExceeded: records.filter((record) => record.breakExceededMinutes > 0).length,
      totalMissingCheckOut: records.filter((record) => record.missingCheckOut).length,
      totalMissingCheckIn: records.filter((record) => record.missingCheckIn).length,
      totalMissingBreak: records.filter((record) => record.missingBreak).length,
      totalOvertime: records.filter((record) => record.overtimeMinutes > 0).length,
      totalWorkingHours: convertMinutesToHours(records.reduce((sum, record) => sum + record.workingMinutes, 0)),
    };

    return NextResponse.json({
      records,
      indicators,
      totalRecords: records.length,
      generatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[GET /api/work-calculation] error', error);
    return NextResponse.json({ message: 'เกิดข้อผิดพลาดในการคำนวณข้อมูล' }, { status: 500 });
  }
}
