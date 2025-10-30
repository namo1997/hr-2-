import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";

interface EmployeePayload {
  employeeCode?: string;
  name?: string;
  nickname?: string | null;
  position?: string | null;
  startDate?: string;
  zoneCode?: string;
  branchCode?: string;
  departmentCode?: string;
}

export async function PUT(request: Request, { params }: { params: { id: string } }) {
  const employeeId = Number(params.id);
  if (Number.isNaN(employeeId)) {
    return NextResponse.json({ message: "ระบุรหัสพนักงานไม่ถูกต้อง" }, { status: 400 });
  }

  const body = await request.json().catch(() => null) as EmployeePayload | null;

  if (!body) {
    return NextResponse.json({ message: "รูปแบบข้อมูลไม่ถูกต้อง" }, { status: 400 });
  }

  if (!body.employeeCode || !body.employeeCode.trim()) {
    return NextResponse.json({ message: "กรุณาระบุรหัสพนักงาน" }, { status: 400 });
  }

  if (!body.name || !body.name.trim()) {
    return NextResponse.json({ message: "กรุณาระบุชื่อพนักงาน" }, { status: 400 });
  }

  if (!body.zoneCode || !body.branchCode || !body.departmentCode) {
    return NextResponse.json({ message: "กรุณาเลือกโซน สาขา และแผนก" }, { status: 400 });
  }

  const [zone, branch, department] = await Promise.all([
    prisma.zone.findUnique({ where: { code: body.zoneCode } }),
    prisma.branch.findUnique({ where: { code: body.branchCode } }),
    prisma.department.findUnique({ where: { code: body.departmentCode }, include: { branch: true } }),
  ]);

  if (!zone) {
    return NextResponse.json({ message: "ไม่พบโซนที่เลือก" }, { status: 404 });
  }

  if (!branch) {
    return NextResponse.json({ message: "ไม่พบสาขาที่เลือก" }, { status: 404 });
  }

  if (!department) {
    return NextResponse.json({ message: "ไม่พบแผนกที่เลือก" }, { status: 404 });
  }

  if (branch.zoneId !== zone.id) {
    return NextResponse.json({ message: "สาขาไม่ตรงกับโซนที่เลือก" }, { status: 400 });
  }

  if (department.branchId !== branch.id) {
    return NextResponse.json({ message: "แผนกไม่ตรงกับสาขาที่เลือก" }, { status: 400 });
  }

  const startDate = body.startDate ? new Date(body.startDate) : null;

  if (startDate && Number.isNaN(startDate.getTime())) {
    return NextResponse.json({ message: "รูปแบบวันที่เริ่มงานไม่ถูกต้อง" }, { status: 400 });
  }

  const employee = await prisma.employee.update({
    where: { id: employeeId },
    data: {
      employeeCode: body.employeeCode.trim(),
      name: body.name.trim(),
      nickname: body.nickname?.trim() || null,
      position: body.position?.trim() || null,
      department: department.name,
      ...(startDate ? { startDate } : {}),
      zoneId: zone.id,
      branchId: branch.id,
      departmentId: department.id,
    },
    include: {
      zone: true,
      branch: true,
      departmentRel: true,
    },
  });

  return NextResponse.json(employee);
}

export async function DELETE(_: Request, { params }: { params: { id: string } }) {
  const employeeId = Number(params.id);
  if (Number.isNaN(employeeId)) {
    return NextResponse.json({ message: "ระบุรหัสพนักงานไม่ถูกต้อง" }, { status: 400 });
  }

  await prisma.employee.delete({
    where: { id: employeeId },
  });

  return NextResponse.json({ success: true });
}
