import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";

import {
  SHIFT_INCLUDE,
  mapBreakRuleToPrisma,
  normalizeWeeklyTemplate,
  resolveScopeAssignments,
  type ShiftPayload,
} from "./utils";

export async function GET() {
  const shifts = await prisma.shift.findMany({
    orderBy: { createdAt: "desc" },
    include: SHIFT_INCLUDE,
  });
  return NextResponse.json(shifts);
}

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => null)) as ShiftPayload | null;
    if (!body || !body.name) {
      return NextResponse.json({ message: "กรุณาระบุชื่อกะ" }, { status: 400 });
    }

    const template = normalizeWeeklyTemplate(body);
    const scopeAssignments = await resolveScopeAssignments(null, body.scopeAssignments);

    const shift = await prisma.shift.create({
      data: {
        name: body.name.trim(),
        description: body.description?.trim() || null,
        isActive: body.isActive ?? true,
        days: {
          create: template.days.map((day) => ({
            dayOfWeek: day.day,
            startTime: day.startTime,
            endTime: day.endTime,
            breakRules: {
              create: day.breakRules.map(mapBreakRuleToPrisma),
            },
          })),
        },
        scopeAssignments: {
          create: scopeAssignments,
        },
      },
      include: SHIFT_INCLUDE,
    });

    return NextResponse.json(shift, { status: 201 });
  } catch (error) {
    console.error("[POST /api/shifts] error", error);
    if (error instanceof Error) {
      return NextResponse.json({ message: error.message }, { status: 400 });
    }
    return NextResponse.json({ message: "ไม่สามารถบันทึกกะได้" }, { status: 500 });
  }
}
