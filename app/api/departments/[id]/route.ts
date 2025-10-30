import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";

const findDepartmentByParam = async (identifier: string) => {
  const numericId = Number(identifier);
  if (!Number.isNaN(numericId)) {
    const department = await prisma.department.findUnique({ where: { id: numericId } });
    if (department) {
      return department;
    }
  }

  return prisma.department.findUnique({ where: { code: identifier } });
};

export async function PUT(request: Request, { params }: { params: { id: string } }) {
  const department = await findDepartmentByParam(params.id);
  if (!department) {
    return NextResponse.json({ message: "ระบุรหัสแผนกไม่ถูกต้อง" }, { status: 400 });
  }

  const body = await request.json().catch(() => null) as { name?: string; branchId?: number } | null;
  if (!body?.name || !body.name.trim()) {
    return NextResponse.json({ message: "กรุณาระบุชื่อแผนก" }, { status: 400 });
  }

  const data: { name: string; branchId?: number } = {
    name: body.name.trim(),
  };

  if (body.branchId) {
    const branchExists = await prisma.branch.findUnique({
      where: { id: body.branchId },
      select: { id: true },
    });

    if (!branchExists) {
      return NextResponse.json({ message: "ไม่พบสาขาที่เลือก" }, { status: 404 });
    }

    data.branchId = body.branchId;
  }

  const updatedDepartment = await prisma.department.update({
    where: { id: department.id },
    data,
  });

  return NextResponse.json(updatedDepartment);
}

export async function DELETE(_: Request, { params }: { params: { id: string } }) {
  const department = await findDepartmentByParam(params.id);
  if (!department) {
    return NextResponse.json({ message: "ระบุรหัสแผนกไม่ถูกต้อง" }, { status: 400 });
  }

  await prisma.$transaction(async (tx) => {
    await tx.employee.updateMany({
      where: { departmentId: department.id },
      data: { departmentId: null },
    });

    await tx.department.delete({
      where: { id: department.id },
    });
  });

  return NextResponse.json({ success: true });
}
