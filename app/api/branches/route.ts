import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";

const BRANCH_PREFIX = "BRN";

const createBranchCode = (lastCode: string | null) => {
  const lastNumber = lastCode?.split("-")[1] ?? "000";
  const nextNumber = (parseInt(lastNumber, 10) || 0) + 1;
  return `${BRANCH_PREFIX}-${String(nextNumber).padStart(3, "0")}`;
};

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const zoneId = searchParams.get("zoneId");

  const branches = await prisma.branch.findMany({
    where: zoneId ? { zoneId: Number(zoneId) || undefined } : undefined,
    orderBy: { createdAt: "asc" },
    include: {
      zone: true,
      departments: {
        orderBy: { createdAt: "asc" },
      },
    },
  });

  return NextResponse.json(branches);
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null) as { name?: string; zoneId?: number } | null;

  if (!body?.zoneId) {
    return NextResponse.json({ message: "กรุณาระบุโซน" }, { status: 400 });
  }

  if (!body.name || !body.name.trim()) {
    return NextResponse.json({ message: "กรุณาระบุชื่อสาขา" }, { status: 400 });
  }

  const zone = await prisma.zone.findUnique({
    where: { id: body.zoneId },
    select: { id: true },
  });

  if (!zone) {
    return NextResponse.json({ message: "ไม่พบโซนที่เลือก" }, { status: 404 });
  }

  const lastBranch = await prisma.branch.findFirst({
    orderBy: { createdAt: "desc" },
    select: { code: true },
  });

  const branch = await prisma.branch.create({
    data: {
      name: body.name.trim(),
      code: createBranchCode(lastBranch?.code ?? null),
      zoneId: zone.id,
    },
  });

  return NextResponse.json(branch, { status: 201 });
}
