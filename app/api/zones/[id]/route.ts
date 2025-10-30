import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";

export async function PUT(request: Request, { params }: { params: { id: string } }) {
  const zoneId = Number(params.id);
  if (Number.isNaN(zoneId)) {
    return NextResponse.json({ message: "ระบุรหัสโซนไม่ถูกต้อง" }, { status: 400 });
  }

  const body = await request.json().catch(() => null) as { name?: string } | null;
  if (!body?.name || !body.name.trim()) {
    return NextResponse.json({ message: "กรุณาระบุชื่อโซน" }, { status: 400 });
  }

  const zone = await prisma.zone.update({
    where: { id: zoneId },
    data: { name: body.name.trim() },
  });

  return NextResponse.json(zone);
}

export async function DELETE(_: Request, { params }: { params: { id: string } }) {
  const zoneId = Number(params.id);
  if (Number.isNaN(zoneId)) {
    return NextResponse.json({ message: "ระบุรหัสโซนไม่ถูกต้อง" }, { status: 400 });
  }

  await prisma.$transaction(async (tx) => {
    const branches = await tx.branch.findMany({
      where: { zoneId },
      select: { id: true },
    });

    const branchIds = branches.map((branch) => branch.id);

    if (branchIds.length > 0) {
      const departments = await tx.department.findMany({
        where: { branchId: { in: branchIds } },
        select: { id: true },
      });
      const departmentIds = departments.map((department) => department.id);

      await tx.employee.updateMany({
        where: {
          OR: [
            { zoneId },
            { branchId: { in: branchIds } },
            departmentIds.length > 0 ? { departmentId: { in: departmentIds } } : undefined,
          ].filter(Boolean) as Record<string, unknown>[],
        },
        data: {
          zoneId: null,
          branchId: null,
          departmentId: null,
        },
      });

      if (departmentIds.length > 0) {
        await tx.department.deleteMany({
          where: { id: { in: departmentIds } },
        });
      }

      await tx.branch.deleteMany({
        where: { id: { in: branchIds } },
      });
    } else {
      await tx.employee.updateMany({
        where: { zoneId },
        data: {
          zoneId: null,
          branchId: null,
          departmentId: null,
        },
      });
    }

    await tx.zone.delete({
      where: { id: zoneId },
    });
  });

  return NextResponse.json({ success: true });
}
