import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";

export async function DELETE(_: Request, { params }: { params: { id: string } }) {
  const assignmentId = Number(params.id);

  if (Number.isNaN(assignmentId)) {
    return NextResponse.json({ message: "รหัสรายการไม่ถูกต้อง" }, { status: 400 });
  }

  await prisma.approvalAssignment.delete({
    where: { id: assignmentId },
  });

  return NextResponse.json({ success: true });
}
