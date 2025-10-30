import { NextRequest, NextResponse } from "next/server";

import {
  aggregateFingerprintRecords,
  parseFingerprintDat,
  summarizeFingerprintRecords,
} from "@/lib/fingerprint-parser";
import { prisma } from "@/lib/prisma";

const parseDateOnlyToUTC = (value: string) => {
  const [year, month, day] = value.split('-').map(Number);
  if (
    Number.isNaN(year) ||
    Number.isNaN(month) ||
    Number.isNaN(day)
  ) {
    return new Date();
  }
  return new Date(Date.UTC(year, month - 1, day));
};

interface ParsedCsvRecord {
  raw: string[];
}

interface ParsedFileResponse<T> {
  name: string;
  type: "fingerprint-dat" | "csv";
  totalRecords: number;
  sampleRecords: T[];
  summary?: unknown;
}

const SAMPLE_LIMIT = 200;

const parseCsv = (content: string): ParsedCsvRecord[] => {
  const rows = content
    .split(/\r?\n/)
    .map((row) => row.trim())
    .filter(Boolean);

  return rows.map((row) => ({ raw: row.split(/[,\t]/).map((value) => value.trim()) }));
};

const createFingerprintResponse = async (name: string, content: string) => {
  const records = parseFingerprintDat(content);
  const summary = summarizeFingerprintRecords(records);
  const aggregates = aggregateFingerprintRecords(records);

  if (aggregates.length > 0) {
    await prisma.$transaction(async (tx) => {
      for (const aggregate of aggregates) {
        const scanDate = parseDateOnlyToUTC(aggregate.date);
        await tx.attendanceScan.deleteMany({
          where: {
            employeeCode: aggregate.employeeCode,
            scanDate,
          },
        });

        await tx.attendanceScan.create({
          data: {
            employeeCode: aggregate.employeeCode,
            scanDate,
            scanTime: aggregate.times[0] ?? null,
            scanCount: aggregate.times.length,
            allScans: JSON.stringify(aggregate.times),
            importSource: name,
          },
        });
      }
    });
  }

  return {
    name,
    type: "fingerprint-dat" as const,
    totalRecords: records.length,
    sampleRecords: records.slice(0, SAMPLE_LIMIT),
    summary,
    persistedRecords: aggregates.length,
  } satisfies ParsedFileResponse<typeof records[number]>;
};

const createCsvResponse = (name: string, content: string) => {
  const records = parseCsv(content);
  return {
    name,
    type: "csv" as const,
    totalRecords: records.length,
    sampleRecords: records.slice(0, SAMPLE_LIMIT),
  } satisfies ParsedFileResponse<ParsedCsvRecord>;
};

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const files = formData.getAll("files").filter((value): value is File => value instanceof File);

    if (files.length === 0) {
      return NextResponse.json({ message: "กรุณาเลือกไฟล์อย่างน้อย 1 ไฟล์" }, { status: 400 });
    }

    const parsedFiles: Array<ParsedFileResponse<unknown> & { persistedRecords?: number }> = [];
    let totalPersisted = 0;

    // Process sequentially to avoid large memory spikes
    for (const file of files) {
      const content = await file.text();
      if (/\.dat$/i.test(file.name)) {
        const parsed = await createFingerprintResponse(file.name, content);
        totalPersisted += parsed.persistedRecords ?? 0;
        parsedFiles.push(parsed);
      } else {
        parsedFiles.push(createCsvResponse(file.name, content));
      }
    }

    const totalRecords = parsedFiles.reduce((sum, file) => sum + file.totalRecords, 0);

    return NextResponse.json({
      success: true,
      totalFiles: parsedFiles.length,
      totalRecords,
      totalPersisted,
      files: parsedFiles,
    });
  } catch (error) {
    console.error("Error importing attendance log:", error);
    return NextResponse.json(
      { message: "เกิดข้อผิดพลาดในการนำเข้าข้อมูล" },
      { status: 500 },
    );
  }
}
