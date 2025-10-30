import { NextRequest, NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";

type Filters = {
  startDate: string;
  endDate: string;
  departmentId?: string | null;
  search?: string;
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

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const startDateParam = searchParams.get("startDate");
    const endDateParam = searchParams.get("endDate");
    const departmentIdParam = searchParams.get("departmentId");
    const searchParam = searchParams.get("search");

    const today = new Date();
    const defaultStart = new Date(today.getFullYear(), today.getMonth(), 1);
    const startDate = toStartOfDayUTC(parseDate(startDateParam, defaultStart));
    const endDate = toEndOfDayUTC(parseDate(endDateParam, today));

    const employeeWhere: Parameters<typeof prisma.employee.findMany>[0]['where'] = {};

    if (departmentIdParam && departmentIdParam !== 'ALL') {
      const departmentIdNum = Number(departmentIdParam);
      if (!Number.isNaN(departmentIdNum)) {
        employeeWhere.departmentId = departmentIdNum;
      }
    }

    if (searchParam && searchParam.trim().length > 0) {
      const keyword = searchParam.trim();
      employeeWhere.OR = [
        { employeeCode: { contains: keyword, mode: 'insensitive' } },
        { name: { contains: keyword, mode: 'insensitive' } },
      ];
    }

    let filteredEmployeeCodes: string[] | undefined;
    const preFilteredEmployees = Object.keys(employeeWhere).length > 0
      ? await prisma.employee.findMany({
          where: employeeWhere,
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
        })
      : [];

    if (preFilteredEmployees.length > 0) {
      filteredEmployeeCodes = preFilteredEmployees
        .map((employee) => employee.employeeCode)
        .filter((code): code is string => Boolean(code && code.trim().length > 0));

      if (filteredEmployeeCodes.length === 0) {
        return NextResponse.json({
          filters: {
            startDate: startDate.toISOString(),
            endDate: endDate.toISOString(),
            departmentId: departmentIdParam,
            search: searchParam ?? '',
          } satisfies Filters,
          summary: {
            totalRecords: 0,
            totalEmployees: 0,
            totalScans: 0,
          },
          records: [],
          generatedAt: new Date().toISOString(),
        });
      }
    }

    const scanWhere: Parameters<typeof prisma.attendanceScan.findMany>[0]['where'] = {
      scanDate: {
        gte: startDate,
        lte: endDate,
      },
    };

    if (filteredEmployeeCodes) {
      scanWhere.employeeCode = { in: filteredEmployeeCodes };
    }

    const scans = await prisma.attendanceScan.findMany({
      where: scanWhere,
      orderBy: [
        { scanDate: 'desc' },
        { employeeCode: 'asc' },
        { id: 'asc' },
      ],
    });

    const codesInScans = Array.from(new Set(scans.map((scan) => scan.employeeCode).filter(Boolean)));

    const existingEmployeeMap = new Map<string, Awaited<typeof prisma.employee.findFirst>>();
    preFilteredEmployees.forEach((employee) => {
      existingEmployeeMap.set(employee.employeeCode, employee);
    });

    const missingCodes = codesInScans.filter((code) => !existingEmployeeMap.has(code));
    if (missingCodes.length > 0) {
      const additionalEmployees = await prisma.employee.findMany({
        where: {
          employeeCode: { in: missingCodes },
        },
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
      additionalEmployees.forEach((employee) => {
        existingEmployeeMap.set(employee.employeeCode, employee);
      });
    }

    const records = scans.map((scan) => {
      const employee = scan.employeeCode
        ? existingEmployeeMap.get(scan.employeeCode)
        : undefined;
      let scanTimes: string[] = [];
      try {
        scanTimes = scan.allScans ? (JSON.parse(scan.allScans) as string[]) : [];
      } catch (error) {
        console.warn('Failed to parse scan times for', scan.employeeCode, error);
      }

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
        date: scan.scanDate.toISOString(),
        scanCount: scan.scanCount,
        scanTimes,
        importSource: scan.importSource,
        importedAt: scan.importedAt.toISOString(),
      };
    });

    const summary = {
      totalRecords: records.length,
      totalEmployees: new Set(records.map((record) => record.employeeCode)).size,
      totalScans: records.reduce((sum, record) => sum + (record.scanCount ?? 0), 0),
    };

    return NextResponse.json({
      filters: {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        departmentId: departmentIdParam,
        search: searchParam ?? '',
      } satisfies Filters,
      summary,
      records,
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
