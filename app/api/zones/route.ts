import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";

const ZONE_PREFIX = "ZONE";

const createZoneCode = (lastCode: string | null) => {
  const lastNumber = lastCode?.split("-")[1] ?? "000";
  const nextNumber = (parseInt(lastNumber, 10) || 0) + 1;
  return `${ZONE_PREFIX}-${String(nextNumber).padStart(3, "0")}`;
};

export async function GET() {
  const zones = await prisma.zone.findMany({
    orderBy: { createdAt: "asc" },
    include: {
      branches: {
        orderBy: { createdAt: "asc" },
        include: {
          departments: {
            orderBy: { createdAt: "asc" },
          },
        },
      },
      employees: true,
    },
  });

  return NextResponse.json(zones);
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null) as { name?: string } | null;

  if (!body?.name || !body.name.trim()) {
    return NextResponse.json({ message: "กรุณาระบุชื่อโซน" }, { status: 400 });
  }

  const lastZone = await prisma.zone.findFirst({
    orderBy: { createdAt: "desc" },
    select: { code: true },
  });

  const zone = await prisma.zone.create({
    data: {
      name: body.name.trim(),
      code: createZoneCode(lastZone?.code ?? null),
    },
  });

  return NextResponse.json(zone, { status: 201 });
}
