import { NextResponse } from "next/server";
import Papa from "papaparse";

import { prisma } from "@/lib/prisma";

interface EmployeeCsvRow {
  "รหัสพนักงาน"?: string;
  "ชื่อ-สกุล"?: string;
  "ชื่อเล่น"?: string;
  "ตำแหน่ง"?: string;
  "วันที่เริ่มงาน(YYYY-MM-DD)"?: string;
  "รหัสโซน"?: string;
  "รหัสสาขา"?: string;
  "รหัสแผนก"?: string;
}

interface ParsedEmployeeRow {
  employeeCode: string;
  name: string;
  nickname: string | null;
  position: string | null;
  startDate: string | null;
  zoneCode: string;
  branchCode: string;
  departmentCode: string;
}

const parseCsv = (content: string) => {
  const { data, errors } = Papa.parse<EmployeeCsvRow>(content, {
    header: true,
    skipEmptyLines: true,
    transformHeader(header: string) {
      return header.trim();
    },
    transform(value: string | undefined) {
      return value?.trim() ?? "";
    },
  });

  if (errors.length > 0) {
    const firstError = errors[0];
    throw new Error(`เกิดข้อผิดพลาดในไฟล์ CSV แถวที่ ${firstError.row}: ${firstError.message}`);
  }

  const rows: ParsedEmployeeRow[] = [];

  data.forEach((row, index) => {
    const employeeCode = row["รหัสพนักงาน"]?.trim();
    const name = row["ชื่อ-สกุล"]?.trim();
    const zoneCode = row["รหัสโซน"]?.trim();
    const branchCode = row["รหัสสาขา"]?.trim();
    const departmentCode = row["รหัสแผนก"]?.trim();

    if (!employeeCode && !name) {
      return;
    }

    if (!employeeCode || !name || !zoneCode || !branchCode || !departmentCode) {
      throw new Error(`ข้อมูลไม่ครบถ้วนในแถวที่ ${index + 2} (ต้องมีรหัสพนักงาน ชื่อ โซน สาขา และแผนก)`);
    }

    rows.push({
      employeeCode,
      name,
      nickname: row["ชื่อเล่น"]?.trim() || null,
      position: row["ตำแหน่ง"]?.trim() || null,
      startDate: row["วันที่เริ่มงาน(YYYY-MM-DD)"]?.trim() || null,
      zoneCode,
      branchCode,
      departmentCode,
    });
  });

  if (rows.length === 0) {
    throw new Error("ไม่พบข้อมูลพนักงานในไฟล์");
  }

  return rows;
};

export async function POST(request: Request) {
  const formData = await request.formData();
  const file = formData.get("file");

  if (!(file instanceof File)) {
    return NextResponse.json({ message: "กรุณาเลือกไฟล์ CSV" }, { status: 400 });
  }

  const content = await file.text();

  let rows: ParsedEmployeeRow[];
  try {
    rows = parseCsv(content);
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "ไม่สามารถอ่านไฟล์ CSV ได้" },
      { status: 400 },
    );
  }

  const zoneCodes = Array.from(new Set(rows.map((row) => row.zoneCode)));
  const branchCodes = Array.from(new Set(rows.map((row) => row.branchCode)));
  const departmentCodes = Array.from(new Set(rows.map((row) => row.departmentCode)));

  const [zones, branches, departments] = await Promise.all([
    prisma.zone.findMany({ where: { code: { in: zoneCodes } } }),
    prisma.branch.findMany({ where: { code: { in: branchCodes } } }),
    prisma.department.findMany({ where: { code: { in: departmentCodes } } }),
  ]);

  const zoneMap = new Map(zones.map((zone) => [zone.code, zone]));
  const branchMap = new Map(branches.map((branch) => [branch.code, branch]));
  const departmentMap = new Map(departments.map((department) => [department.code, department]));

  for (const zoneCode of zoneCodes) {
    if (!zoneMap.has(zoneCode)) {
      return NextResponse.json(
        { message: `ไม่พบโซนรหัส ${zoneCode} ในระบบ กรุณาสร้างโซนก่อนนำเข้า` },
        { status: 400 },
      );
    }
  }

  for (const branchCode of branchCodes) {
    const branch = branchMap.get(branchCode);
    if (!branch) {
      return NextResponse.json(
        { message: `ไม่พบสาขารหัส ${branchCode} ในระบบ กรุณาสร้างสาขาก่อนนำเข้า` },
        { status: 400 },
      );
    }
  }

  for (const departmentCode of departmentCodes) {
    if (!departmentMap.has(departmentCode)) {
      return NextResponse.json(
        { message: `ไม่พบแผนกรหัส ${departmentCode} ในระบบ กรุณาสร้างแผนกก่อนนำเข้า` },
        { status: 400 },
      );
    }
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      let created = 0;
      let updated = 0;

      const processed = [];

      for (const row of rows) {
        const zone = zoneMap.get(row.zoneCode);
        const branch = branchMap.get(row.branchCode);
        const department = departmentMap.get(row.departmentCode);

        if (!zone) {
          throw new Error(`ไม่พบโซนรหัส ${row.zoneCode}`);
        }

        if (!branch) {
          throw new Error(`ไม่พบสาขารหัส ${row.branchCode}`);
        }

        if (!department) {
          throw new Error(`ไม่พบแผนกรหัส ${row.departmentCode}`);
        }

        if (branch.zoneId !== zone.id) {
          throw new Error(
            `สาขา ${row.branchCode} ไม่อยู่ในโซน ${row.zoneCode} ตามที่ระบุ (แถวที่มีรหัสพนักงาน ${row.employeeCode})`,
          );
        }

        if (department.branchId !== branch.id) {
          throw new Error(
            `แผนก ${row.departmentCode} ไม่อยู่ในสาขา ${row.branchCode} (แถวที่มีรหัสพนักงาน ${row.employeeCode})`,
          );
        }

        let startDate: Date | undefined;
        if (row.startDate) {
          const parsedDate = new Date(row.startDate);
          if (Number.isNaN(parsedDate.getTime())) {
            throw new Error(`รูปแบบวันที่ไม่ถูกต้อง (${row.startDate}) สำหรับรหัสพนักงาน ${row.employeeCode}`);
          }
          startDate = parsedDate;
        }

        const existing = await tx.employee.findUnique({
          where: { employeeCode: row.employeeCode },
        });

        const data = {
          employeeCode: row.employeeCode,
          name: row.name,
          nickname: row.nickname,
          position: row.position,
          department: department.name,
          ...(startDate ? { startDate } : {}),
          zoneId: zone.id,
          branchId: branch.id,
          departmentId: department.id,
        };

        const employee = existing
          ? await tx.employee.update({
              where: { id: existing.id },
              data,
              include: {
                zone: true,
                branch: true,
                departmentRel: true,
              },
            })
          : await tx.employee.create({
              data: {
                ...data,
                startDate: startDate ?? new Date(),
              },
              include: {
                zone: true,
                branch: true,
                departmentRel: true,
              },
            });

        if (existing) {
          updated += 1;
        } else {
          created += 1;
        }

        processed.push(employee);
      }

      return {
        created,
        updated,
        employees: processed,
      };
    });

    return NextResponse.json({
      message: `นำเข้าสำเร็จ เพิ่ม ${result.created} รายการ อัปเดต ${result.updated} รายการ`,
      created: result.created,
      updated: result.updated,
      employees: result.employees,
    });
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "ไม่สามารถนำเข้าพนักงานได้" },
      { status: 400 },
    );
  }
}
