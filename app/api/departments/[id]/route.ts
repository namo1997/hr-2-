import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";

export async function PUT(request: Request, { params }: { params: { id: string } }) {
  const departmentId = Number(params.id);
  if (Number.isNaN(departmentId)) {
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

  const department = await prisma.department.update({
    where: { id: departmentId },
    data,
  });

  return NextResponse.json(department);
}

export async function DELETE(_: Request, { params }: { params: { id: string } }) {
  const departmentId = Number(params.id);
  if (Number.isNaN(departmentId)) {
    return NextResponse.json({ message: "ระบุรหัสแผนกไม่ถูกต้อง" }, { status: 400 });
  }

  await prisma.$transaction(async (tx) => {
    await tx.employee.updateMany({
      where: { departmentId },
      data: { departmentId: null },
    });

    await tx.department.delete({
      where: { id: departmentId },
    });
  });

  return NextResponse.json({ success: true });
}
