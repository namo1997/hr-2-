import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";

const DEPARTMENT_PREFIX = "DEP";

const createDepartmentCode = (lastCode: string | null) => {
  const lastNumber = lastCode?.split("-")[1] ?? "000";
  const nextNumber = (parseInt(lastNumber, 10) || 0) + 1;
  return `${DEPARTMENT_PREFIX}-${String(nextNumber).padStart(3, "0")}`;
};

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const branchId = searchParams.get("branchId");

  const departments = await prisma.department.findMany({
    where: branchId ? { branchId: Number(branchId) || undefined } : undefined,
    orderBy: { createdAt: "asc" },
    include: {
      branch: {
        include: {
          zone: true,
        },
      },
      employees: true,
    },
  });

  return NextResponse.json(departments);
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null) as { name?: string; branchId?: number } | null;

  if (!body?.branchId) {
    return NextResponse.json({ message: "กรุณาระบุสาขา" }, { status: 400 });
  }

  if (!body.name || !body.name.trim()) {
    return NextResponse.json({ message: "กรุณาระบุชื่อแผนก" }, { status: 400 });
  }

  const branch = await prisma.branch.findUnique({
    where: { id: body.branchId },
    select: { id: true },
  });

  if (!branch) {
    return NextResponse.json({ message: "ไม่พบสาขาที่เลือก" }, { status: 404 });
  }

  const lastDepartment = await prisma.department.findFirst({
    orderBy: { createdAt: "desc" },
    select: { code: true },
  });

  const department = await prisma.department.create({
    data: {
      name: body.name.trim(),
      code: createDepartmentCode(lastDepartment?.code ?? null),
      branchId: branch.id,
    },
  });

  return NextResponse.json(department, { status: 201 });
}
