import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";

import {
  SHIFT_INCLUDE,
  mapBreakRuleToPrisma,
  normalizeWeeklyTemplate,
  resolveScopeAssignments,
  type ShiftPayload,
} from "../utils";

export async function PUT(
  request: Request,
  { params }: { params: { id: string } },
) {
  const shiftId = Number(params.id);
  if (Number.isNaN(shiftId)) {
    return NextResponse.json({ message: "รหัสกะไม่ถูกต้อง" }, { status: 400 });
  }

  try {
    const body = (await request.json().catch(() => null)) as ShiftPayload | null;
    if (!body || !body.name) {
      return NextResponse.json({ message: "กรุณาระบุชื่อกะ" }, { status: 400 });
    }

    const template = normalizeWeeklyTemplate(body);
    const scopeAssignments = await resolveScopeAssignments(shiftId, body.scopeAssignments);

    const shift = await prisma.$transaction(async (tx) => {
      await tx.shiftDayConfig.deleteMany({ where: { shiftId } });
      await tx.shiftScopeAssignment.deleteMany({ where: { shiftId } });

      return tx.shift.update({
        where: { id: shiftId },
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
    });

    return NextResponse.json(shift);
  } catch (error) {
    console.error("[PUT /api/shifts/:id] error", error);
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2025"
    ) {
      return NextResponse.json({ message: "ไม่พบกะที่ต้องการแก้ไข" }, { status: 404 });
    }
    if (error instanceof Error) {
      return NextResponse.json({ message: error.message }, { status: 400 });
    }
    return NextResponse.json({ message: "ไม่สามารถบันทึกกะได้" }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: { id: string } },
) {
  const shiftId = Number(params.id);
  if (Number.isNaN(shiftId)) {
    return NextResponse.json({ message: "รหัสกะไม่ถูกต้อง" }, { status: 400 });
  }

  try {
    await prisma.shift.delete({ where: { id: shiftId } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[DELETE /api/shifts/:id] error", error);
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2025"
    ) {
      return NextResponse.json({ message: "ไม่พบกะที่ต้องการลบ" }, { status: 404 });
    }
    return NextResponse.json({ message: "ไม่สามารถลบกะได้" }, { status: 500 });
  }
}
