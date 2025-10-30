import { NextRequest, NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";

type AttendanceStatusCounts = Record<string, number>;

const toStartOfDay = (date: Date) => {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  return next;
};

const toEndOfDay = (date: Date) => {
  const next = new Date(date);
  next.setHours(23, 59, 59, 999);
  return next;
};

const parseDate = (value: string | null, fallback: Date) => {
  if (!value) return fallback;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return fallback;
  }
  return parsed;
};

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const startDateParam = searchParams.get("startDate");
    const endDateParam = searchParams.get("endDate");
    const departmentIdParam = searchParams.get("departmentId");
    const searchParam = searchParams.get("search");

    const today = new Date();
    const defaultStart = new Date(today.getFullYear(), today.getMonth(), 1);
    const startDate = toStartOfDay(parseDate(startDateParam, defaultStart));
    const endDate = toEndOfDay(parseDate(endDateParam, today));

    const employeeFilters: Record<string, unknown> = {};

    if (departmentIdParam) {
      const departmentIdNum = Number(departmentIdParam);
      if (!Number.isNaN(departmentIdNum)) {
        employeeFilters.departmentId = departmentIdNum;
      }
    }

    if (searchParam && searchParam.trim().length > 0) {
      const keyword = searchParam.trim();
      employeeFilters.OR = [
        { employeeCode: { contains: keyword, mode: "insensitive" } },
        { name: { contains: keyword, mode: "insensitive" } },
      ];
    }

    const where: Parameters<typeof prisma.attendance.findMany>[0] = {
      date: {
        gte: startDate,
        lte: endDate,
      },
      ...(Object.keys(employeeFilters).length > 0
        ? {
            employee: {
              is: employeeFilters,
            },
          }
        : {}),
    };

    const records = await prisma.attendance.findMany({
      where,
      include: {
        employee: {
          include: {
            departmentRel: true,
            branch: true,
            zone: true,
          },
        },
      },
      orderBy: [
        { date: "desc" },
        { employeeId: "asc" },
        { id: "asc" },
      ],
    });

    const statusCounts: AttendanceStatusCounts = {};
    let totalWorkMinutes = 0;
    let totalOvertimeMinutes = 0;
    let lateCount = 0;
    let earlyLeaveCount = 0;

    const data = records.map((record) => {
      statusCounts[record.status] = (statusCounts[record.status] ?? 0) + 1;
      totalWorkMinutes += record.workMinutes;
      totalOvertimeMinutes += record.overtimeMinutes;
      if (record.isLate) lateCount += 1;
      if (record.isEarlyLeave) earlyLeaveCount += 1;

      const employee = record.employee;

      return {
        id: record.id,
        date: record.date.toISOString(),
        employeeId: record.employeeId,
        employeeCode: employee.employeeCode,
        employeeName: employee.name,
        departmentId: employee.departmentId ?? null,
        departmentName:
          employee.departmentRel?.name ?? employee.department ?? null,
        branchId: employee.branchId ?? null,
        branchName: employee.branch?.name ?? null,
        zoneId: employee.zoneId ?? null,
        zoneName: employee.zone?.name ?? null,
        status: record.status,
        isLate: record.isLate,
        lateMinutes: record.lateMinutes,
        isEarlyLeave: record.isEarlyLeave,
        earlyMinutes: record.earlyMinutes,
        workMinutes: record.workMinutes,
        overtimeMinutes: record.overtimeMinutes,
        checkIn: record.checkIn,
        breakOut: record.breakOut,
        breakIn: record.breakIn,
        checkOut: record.checkOut,
        notes: record.notes,
      };
    });

    const summary = {
      totalRecords: records.length,
      distinctEmployees: new Set(records.map((record) => record.employeeId)).size,
      statusCounts,
      lateCount,
      earlyLeaveCount,
      totalWorkMinutes,
      totalOvertimeMinutes,
    };

    return NextResponse.json({
      filters: {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        departmentId: departmentIdParam,
        search: searchParam ?? '',
      },
      summary,
      records: data,
      generatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[GET /api/attendance] error', error);
    return NextResponse.json(
      { message: 'เกิดข้อผิดพลาดในการโหลดข้อมูลการบันทึกเวลา' },
      { status: 500 },
    );
  }
}
