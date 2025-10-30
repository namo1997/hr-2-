import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";

export async function PUT(request: Request, { params }: { params: { id: string } }) {
  const branchId = Number(params.id);
  if (Number.isNaN(branchId)) {
    return NextResponse.json({ message: "ระบุรหัสสาขาไม่ถูกต้อง" }, { status: 400 });
  }

  const body = await request.json().catch(() => null) as { name?: string; zoneId?: number } | null;
  if (!body?.name || !body.name.trim()) {
    return NextResponse.json({ message: "กรุณาระบุชื่อสาขา" }, { status: 400 });
  }

  const data: { name: string; zoneId?: number } = {
    name: body.name.trim(),
  };

  if (body.zoneId) {
    const zoneExists = await prisma.zone.findUnique({
      where: { id: body.zoneId },
      select: { id: true },
    });

    if (!zoneExists) {
      return NextResponse.json({ message: "ไม่พบโซนที่เลือก" }, { status: 404 });
    }

    data.zoneId = body.zoneId;
  }

  const branch = await prisma.branch.update({
    where: { id: branchId },
    data,
  });

  return NextResponse.json(branch);
}

export async function DELETE(_: Request, { params }: { params: { id: string } }) {
  const branchId = Number(params.id);
  if (Number.isNaN(branchId)) {
    return NextResponse.json({ message: "ระบุรหัสสาขาไม่ถูกต้อง" }, { status: 400 });
  }

  await prisma.$transaction(async (tx) => {
    const departments = await tx.department.findMany({
      where: { branchId },
      select: { id: true },
    });

    const departmentIds = departments.map((department) => department.id);

    await tx.employee.updateMany({
      where: {
        OR: [
          { branchId },
          departmentIds.length > 0 ? { departmentId: { in: departmentIds } } : undefined,
        ].filter(Boolean) as Record<string, unknown>[],
      },
      data: {
        branchId: null,
        departmentId: null,
      },
    });

    if (departmentIds.length > 0) {
      await tx.department.deleteMany({
        where: { id: { in: departmentIds } },
      });
    }

    await tx.branch.delete({
      where: { id: branchId },
    });
  });

  return NextResponse.json({ success: true });
}
