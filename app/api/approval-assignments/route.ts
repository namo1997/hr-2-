import { ApprovalRole } from "@prisma/client";
import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";

const includeConfig = {
  employee: {
    include: {
      zone: true,
      branch: true,
      departmentRel: true,
    },
  },
  branch: true,
  department: true,
} as const;

export async function GET() {
  const assignments = await prisma.approvalAssignment.findMany({
    orderBy: [{ role: "asc" }, { createdAt: "asc" }],
    include: includeConfig,
  });

  return NextResponse.json(assignments);
}

interface AssignmentPayload {
  role?: ApprovalRole;
  employeeId?: number;
  branchId?: number | null;
  departmentId?: number | null;
}

const isValidRole = (value: unknown): value is ApprovalRole =>
  typeof value === "string" &&
  (value === "EXECUTIVE" || value === "MANAGER" || value === "DEPARTMENT_HEAD");

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as AssignmentPayload | null;

  if (!body || !isValidRole(body.role)) {
    return NextResponse.json({ message: "รูปแบบข้อมูลไม่ถูกต้อง" }, { status: 400 });
  }

  if (!body.employeeId || Number.isNaN(Number(body.employeeId))) {
    return NextResponse.json({ message: "กรุณาระบุพนักงานที่ต้องการตั้งค่า" }, { status: 400 });
  }

  const employee = await prisma.employee.findUnique({
    where: { id: Number(body.employeeId) },
    include: {
      branch: true,
      departmentRel: true,
      zone: true,
    },
  });

  if (!employee) {
    return NextResponse.json({ message: "ไม่พบพนักงานที่เลือก" }, { status: 404 });
  }

  if (body.role === "EXECUTIVE") {
    // สำหรับผู้บริหาร ไม่ต้องมี branch/department
    const existing = await prisma.approvalAssignment.findFirst({
      where: {
        role: "EXECUTIVE",
        employeeId: employee.id,
      },
    });
    if (existing) {
      return NextResponse.json({ message: "พนักงานคนนี้ถูกตั้งเป็นผู้บริหารแล้ว" }, { status: 409 });
    }

    const assignment = await prisma.approvalAssignment.create({
      data: {
        role: "EXECUTIVE",
        employeeId: employee.id,
      },
      include: includeConfig,
    });

    return NextResponse.json(assignment, { status: 201 });
  }

  if (body.role === "MANAGER") {
    const branchId = body.branchId ? Number(body.branchId) : undefined;
    if (!branchId || Number.isNaN(branchId)) {
      return NextResponse.json({ message: "กรุณาเลือกสาขา" }, { status: 400 });
    }

    const branch = await prisma.branch.findUnique({
      where: { id: branchId },
    });

    if (!branch) {
      return NextResponse.json({ message: "ไม่พบสาขาที่เลือก" }, { status: 404 });
    }

    if (employee.branchId !== branch.id) {
      return NextResponse.json(
        { message: "พนักงานต้องอยู่ในสาขาที่เลือกไว้" },
        { status: 400 },
      );
    }

    const existingForBranch = await prisma.approvalAssignment.findFirst({
      where: {
        role: "MANAGER",
        branchId: branch.id,
      },
    });

    if (existingForBranch) {
      return NextResponse.json(
        { message: "สาขานี้ถูกตั้งผู้จัดการไว้แล้ว กรุณายกเลิกก่อน" },
        { status: 409 },
      );
    }

    const existingForEmployee = await prisma.approvalAssignment.findFirst({
      where: {
        role: "MANAGER",
        employeeId: employee.id,
      },
    });

    if (existingForEmployee) {
      return NextResponse.json(
        { message: "พนักงานคนนี้ถูกตั้งเป็นผู้จัดการในสาขาอื่นแล้ว" },
        { status: 409 },
      );
    }

    const assignment = await prisma.approvalAssignment.create({
      data: {
        role: "MANAGER",
        employeeId: employee.id,
        branchId: branch.id,
      },
      include: includeConfig,
    });

    return NextResponse.json(assignment, { status: 201 });
  }

  // Department Head
  const branchId = body.branchId ? Number(body.branchId) : undefined;
  const departmentId = body.departmentId ? Number(body.departmentId) : undefined;

  if (!branchId || Number.isNaN(branchId) || !departmentId || Number.isNaN(departmentId)) {
    return NextResponse.json(
      { message: "กรุณาเลือกสาขาและแผนกให้ครบ" },
      { status: 400 },
    );
  }

  const [branch, department] = await Promise.all([
    prisma.branch.findUnique({ where: { id: branchId } }),
    prisma.department.findUnique({ where: { id: departmentId } }),
  ]);

  if (!branch) {
    return NextResponse.json({ message: "ไม่พบสาขาที่เลือก" }, { status: 404 });
  }

  if (!department) {
    return NextResponse.json({ message: "ไม่พบแผนกที่เลือก" }, { status: 404 });
  }

  if (department.branchId !== branch.id) {
    return NextResponse.json(
      { message: "แผนกไม่อยู่ในสาขาที่เลือก" },
      { status: 400 },
    );
  }

  if (employee.branchId !== branch.id || employee.departmentId !== department.id) {
    return NextResponse.json(
      { message: "พนักงานต้องอยู่ในสาขาและแผนกที่เลือกไว้" },
      { status: 400 },
    );
  }

  const existingDepartmentHead = await prisma.approvalAssignment.findFirst({
    where: {
      role: "DEPARTMENT_HEAD",
      departmentId: department.id,
    },
  });

  if (existingDepartmentHead) {
    return NextResponse.json(
      { message: "แผนกนี้มีหัวหน้าอยู่แล้ว กรุณายกเลิกก่อน" },
      { status: 409 },
    );
  }

  const existingForEmployee = await prisma.approvalAssignment.findFirst({
    where: {
      role: "DEPARTMENT_HEAD",
      employeeId: employee.id,
      departmentId: department.id,
    },
  });

  if (existingForEmployee) {
    return NextResponse.json(
      { message: "พนักงานคนนี้ถูกตั้งเป็นหัวหน้าแผนกอยู่แล้ว" },
      { status: 409 },
    );
  }

  const assignment = await prisma.approvalAssignment.create({
    data: {
      role: "DEPARTMENT_HEAD",
      employeeId: employee.id,
      branchId: branch.id,
      departmentId: department.id,
    },
    include: includeConfig,
  });

  return NextResponse.json(assignment, { status: 201 });
}
