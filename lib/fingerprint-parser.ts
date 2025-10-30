// lib/fingerprint-parser.ts - helper functions for fingerprint attendance logs

export interface FingerprintRecord {
  userId: string;
  timestamp: string;
  date: string;
  time: string;
  status?: string;
  verifyMode?: string;
  workCode?: string;
  reserved?: string;
}

export interface FingerprintSummary {
  userId: string;
  scans: number;
}

const trimElectric = (value: string) => value.replace(/^\uFEFF/, "").trim();

export const parseFingerprintDat = (content: string): FingerprintRecord[] => {
  const lines = trimElectric(content)
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  const records: FingerprintRecord[] = [];

  lines.forEach((line) => {
    const parts = line.split(/\s+/).filter(Boolean);
    if (parts.length < 3) {
      // skip malformed line
      return;
    }

    const [userId, datePart, timePart, status, verifyMode, workCode, reserved] = parts;
    const timestamp = `${datePart} ${timePart ?? ""}`.trim();

    records.push({
      userId,
      date: datePart,
      time: timePart ?? "",
      timestamp,
      status,
      verifyMode,
      workCode,
      reserved,
    });
  });

  return records;
};

export const summarizeFingerprintRecords = (
  records: FingerprintRecord[],
): FingerprintSummary[] => {
  const map = new Map<string, number>();
  records.forEach((record) => {
    map.set(record.userId, (map.get(record.userId) ?? 0) + 1);
  });

  return Array.from(map.entries()).map(([userId, scans]) => ({
    userId,
    scans,
  }));
};
