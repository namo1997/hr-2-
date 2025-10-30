'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';

type ParsedFingerprintRecord = {
  userId: string;
  timestamp: string;
  date: string;
  time: string;
  status?: string;
  verifyMode?: string;
  workCode?: string;
  reserved?: string;
};

type FingerprintSummary = {
  userId: string;
  scans: number;
};

type ParsedCsvRecord = {
  raw: string[];
};

type ParsedFile =
  | {
      name: string;
      type: 'fingerprint-dat';
      totalRecords: number;
      sampleRecords: ParsedFingerprintRecord[];
      summary: FingerprintSummary[];
      persistedRecords?: number;
    }
  | {
      name: string;
      type: 'csv';
      totalRecords: number;
      sampleRecords: ParsedCsvRecord[];
      summary?: never;
      persistedRecords?: number;
    };

interface ImportResponse {
  success: boolean;
  totalFiles: number;
  totalRecords: number;
  totalPersisted?: number;
  files: ParsedFile[];
}

const formatThaiDateTime = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return new Intl.DateTimeFormat('th-TH', {
    dateStyle: 'medium',
    timeStyle: 'medium',
  }).format(date);
};

const FingerprintSummaryTable = ({ summary }: { summary: FingerprintSummary[] }) => {
  const sorted = useMemo(
    () => [...summary].sort((a, b) => Number(b.scans) - Number(a.scans)),
    [summary],
  );

  return (
    <div className="overflow-x-auto rounded border border-gray-200">
      <table className="min-w-full divide-y divide-gray-200 text-sm">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-4 py-3 text-left font-medium uppercase tracking-wide">รหัสพนักงาน</th>
            <th className="px-4 py-3 text-right font-medium uppercase tracking-wide">จำนวนครั้ง</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100 bg-white">
          {sorted.map((item) => (
            <tr key={item.userId}>
              <td className="px-4 py-2">{item.userId}</td>
              <td className="px-4 py-2 text-right">{item.scans.toLocaleString('th-TH')}</td>
            </tr>
          ))}
          {sorted.length === 0 && (
            <tr>
              <td className="px-4 py-3 text-center text-gray-500" colSpan={2}>
                ไม่มีข้อมูลในไฟล์นี้
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
};

const FingerprintPreviewTable = ({ records }: { records: ParsedFingerprintRecord[] }) => (
  <div className="overflow-x-auto rounded border border-gray-200">
    <table className="min-w-full divide-y divide-gray-200 text-sm">
      <thead className="bg-gray-50">
        <tr>
          <th className="px-4 py-3 text-left font-medium uppercase tracking-wide">รหัสพนักงาน</th>
          <th className="px-4 py-3 text-left font-medium uppercase tracking-wide">วันเวลา</th>
          <th className="px-4 py-3 text-left font-medium uppercase tracking-wide">สถานะ</th>
          <th className="px-4 py-3 text-left font-medium uppercase tracking-wide">โหมดยืนยัน</th>
          <th className="px-4 py-3 text-left font-medium uppercase tracking-wide">รหัสงาน</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-gray-100 bg-white">
        {records.map((record, index) => (
          <tr key={`${record.timestamp}-${index}`}>
            <td className="px-4 py-2">{record.userId}</td>
            <td className="px-4 py-2">{formatThaiDateTime(record.timestamp)}</td>
            <td className="px-4 py-2">{record.status ?? '-'}</td>
            <td className="px-4 py-2">{record.verifyMode ?? '-'}</td>
            <td className="px-4 py-2">{record.workCode ?? '-'}</td>
          </tr>
        ))}
        {records.length === 0 && (
          <tr>
            <td className="px-4 py-3 text-center text-gray-500" colSpan={5}>
              ไม่มีข้อมูลสำหรับแสดง
            </td>
          </tr>
        )}
      </tbody>
    </table>
  </div>
);

const CsvPreviewTable = ({ records }: { records: ParsedCsvRecord[] }) => (
  <div className="overflow-x-auto rounded border border-gray-200">
    <table className="min-w-full divide-y divide-gray-200 text-sm">
      <thead className="bg-gray-50">
        <tr>
          <th className="px-4 py-3 text-left font-medium uppercase tracking-wide">ข้อมูล</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-gray-100 bg-white">
        {records.map((record, index) => (
          <tr key={index}>
            <td className="px-4 py-2 font-mono text-xs text-gray-700">
              {record.raw.join(', ')}
            </td>
          </tr>
        ))}
        {records.length === 0 && (
          <tr>
            <td className="px-4 py-3 text-center text-gray-500">ไม่มีข้อมูลสำหรับแสดง</td>
          </tr>
        )}
      </tbody>
    </table>
  </div>
);

export default function ImportPage() {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<ImportResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files) {
      setSelectedFiles([]);
      return;
    }
    setSelectedFiles(Array.from(files));
    setResult(null);
    setError(null);
  };

  const handleUpload = async () => {
    if (selectedFiles.length === 0) {
      setError('กรุณาเลือกไฟล์การแสกนนิ้วก่อน');
      return;
    }

    const formData = new FormData();
    selectedFiles.forEach((file) => formData.append('files', file));

    try {
      setUploading(true);
      setError(null);
      const response = await fetch('/api/import', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data?.message ?? 'ไม่สามารถนำเข้าข้อมูลได้');
      }

      const data = (await response.json()) as ImportResponse;
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'ไม่สามารถนำเข้าข้อมูลได้');
      setResult(null);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="mx-auto max-w-6xl space-y-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold">นำเข้าข้อมูลการแสกนนิ้ว</h1>
            <p className="mt-2 text-sm text-gray-600">
              รองรับไฟล์จากเครื่องสแกนนิ้ว (.dat) และไฟล์ CSV สำหรับการตรวจสอบข้อมูลก่อนบันทึกเข้าสู่ระบบ
            </p>
          </div>
          <Link href="/" className="rounded bg-gray-200 px-6 py-2 hover:bg-gray-300">
            กลับหน้าหลัก
          </Link>
        </div>

        <section className="space-y-4 rounded-lg bg-white p-6 shadow">
          <div>
            <h2 className="text-xl font-semibold">1. เลือกไฟล์การแสกนนิ้ว</h2>
            <p className="text-sm text-gray-600">
              รองรับไฟล์ .dat จากเครื่องสแกนนิ้ว (เช่น <code>ADV6183360039_attlog.dat</code>,{' '}
              <code>AEW2204860032_attlog.dat</code>) และไฟล์ .csv สำหรับข้อมูลนำเข้าอื่น ๆ
            </p>
            <p className="text-sm text-gray-500">
              ระบบจะอ่านไฟล์และแสดงตัวอย่างข้อมูลให้ตรวจสอบก่อนบันทึกลงฐานข้อมูลจริง
            </p>
          </div>

          <div className="rounded-lg border border-dashed border-gray-300 bg-gray-50 p-6 text-center">
            <input
              id="attendance-files"
              type="file"
              accept=".dat,.csv"
              multiple
              className="hidden"
              onChange={handleFileChange}
            />
            <label
              htmlFor="attendance-files"
              className="cursor-pointer text-blue-600 hover:underline"
            >
              {selectedFiles.length === 0
                ? 'คลิกเพื่อเลือกไฟล์ หรือ ลากไฟล์มาวางที่นี่'
                : `${selectedFiles.length} ไฟล์ถูกเลือก`}
            </label>
            <p className="mt-2 text-xs text-gray-500">
              รองรับไฟล์ .dat และ .csv สามารถเลือกได้มากกว่า 1 ไฟล์ในการอัปโหลดครั้งเดียว
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={handleUpload}
              disabled={uploading || selectedFiles.length === 0}
              className="rounded bg-blue-600 px-6 py-2 text-white hover:bg-blue-700 disabled:opacity-60"
            >
              {uploading ? 'กำลังประมวลผล...' : 'นำเข้าข้อมูล'}
            </button>
            {selectedFiles.length > 0 && (
              <button
                type="button"
                onClick={() => {
                  setSelectedFiles([]);
                  setResult(null);
                  setError(null);
                }}
                className="rounded bg-gray-200 px-4 py-2 text-sm hover:bg-gray-300"
              >
                ล้างรายการไฟล์
              </button>
            )}
          </div>

          {error && (
            <div className="rounded border border-red-200 bg-red-50 p-4 text-sm text-red-700">
              {error}
            </div>
          )}
        </section>

        {result && (
          <section className="space-y-6 rounded-lg bg-white p-6 shadow">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-semibold">2. ผลลัพธ์จากการนำเข้า</h2>
                <p className="text-sm text-gray-600">
                  พบข้อมูลทั้งหมด {result.totalRecords.toLocaleString('th-TH')} รายการ จากไฟล์{' '}
                  {result.totalFiles.toLocaleString('th-TH')} ไฟล์
                </p>
                {typeof result.totalPersisted === 'number' && (
                  <p className="text-xs text-gray-500">
                    บันทึกเข้าสู่ฐานข้อมูล {result.totalPersisted.toLocaleString('th-TH')} รายการ (เฉพาะไฟล์ .dat)
                  </p>
                )}
              </div>
            </div>

            {result.files.map((file) => (
              <div key={file.name} className="space-y-4 rounded-lg border border-gray-200 p-4">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">{file.name}</h3>
                    <p className="text-sm text-gray-600">
                      ประเภท: {file.type === 'fingerprint-dat' ? 'ไฟล์สแกนนิ้ว (.dat)' : 'ไฟล์ CSV'} •{' '}
                      ทั้งหมด {file.totalRecords.toLocaleString('th-TH')} แถว
                    </p>
                    {typeof file.persistedRecords === 'number' && (
                      <p className="text-xs text-gray-500">
                        บันทึกเข้าสู่ฐานข้อมูล {file.persistedRecords.toLocaleString('th-TH')} รายการ
                      </p>
                    )}
                  </div>
                </div>

                {file.type === 'fingerprint-dat' && 'summary' in file && (
                  <div className="space-y-2">
                    <h4 className="text-sm font-semibold text-gray-700">สรุปจำนวนการสแกนต่อพนักงาน</h4>
                    <FingerprintSummaryTable summary={file.summary} />
                  </div>
                )}

                <div className="space-y-2">
                  <h4 className="text-sm font-semibold text-gray-700">
                    ตัวอย่างข้อมูล (สูงสุด 200 รายการแรก)
                  </h4>
                  {file.type === 'fingerprint-dat' ? (
                    <FingerprintPreviewTable records={file.sampleRecords} />
                  ) : (
                    <CsvPreviewTable records={file.sampleRecords} />
                  )}
                </div>
              </div>
            ))}
          </section>
        )}

        <section className="space-y-4 rounded-lg bg-white p-6 shadow">
          <h2 className="text-xl font-semibold">3. คำแนะนำเพิ่มเติม</h2>
          <ul className="list-disc space-y-2 pl-6 text-sm text-gray-600">
            <li>
              ไฟล์ .dat มักแบ่งข้อมูลด้วยแท็บ โดยลำดับคอลัมน์คือ <code>[รหัสพนักงาน, วันที่, เวลา, สถานะ, โหมด, รหัสงาน, สำรอง]</code>
            </li>
            <li>
              ระบบจะแสดงตัวอย่างเพื่อให้ตรวจสอบความถูกต้องก่อนนำเข้าข้อมูลเข้าสู่ฐานข้อมูลจริง
            </li>
            <li>
              หากต้องการบันทึกเข้าสู่ฐานข้อมูลให้พัฒนาฟังก์ชันเพิ่มเติมโดยเชื่อมต่อกับ Prisma ในขั้นตอนถัดไป
            </li>
          </ul>
        </section>
      </div>
    </div>
  );
}
