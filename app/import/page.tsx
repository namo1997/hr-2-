// app/import/page.tsx - หน้านำเข้าข้อมูลสแกนนิ้ว

'use client';

import { useState } from 'react';
import Link from 'next/link';

interface ImportedData {
  employeeCode: string;
  employeeName: string;
  department: string;
  date: string;
  scanCount: number;
  scans: string;
}

export default function ImportPage() {
  const [file, setFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string; data?: ImportedData[] } | null>(null);
  const [previewData, setPreviewData] = useState<ImportedData[]>([]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setResult(null);
      
      // แสดงตัวอย่างข้อมูล
      const reader = new FileReader();
      reader.onload = (event) => {
        const text = event.target?.result as string;
        const rows = text.split('\n').filter(row => row.trim());
        const preview = rows.slice(0, 10).map(row => {
          const cols = row.split(',');
          return {
            employeeCode: cols[0] || '',
            employeeName: cols[1] || '',
            department: cols[2] || '',
            date: cols[3] || '',
            scanCount: parseInt(cols[4] || '0'),
            scans: cols[5] || '',
          };
        });
        setPreviewData(preview);
      };
      reader.readAsText(selectedFile);
    }
  };

  const handleImport = async () => {
    if (!file) return;

    setImporting(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch('/api/import', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();
      setResult(data);
    } catch (error) {
      setResult({
        success: false,
        message: 'เกิดข้อผิดพลาดในการนำเข้าข้อมูล',
      });
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold">นำเข้าข้อมูลสแกนนิ้ว</h1>
          <Link href="/" className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300">
            กลับหน้าหลัก
          </Link>
        </div>

        {/* ส่วนอัพโหลดไฟล์ */}
        <div className="bg-white p-6 rounded-lg shadow mb-6">
          <h2 className="text-xl font-bold mb-4">อัพโหลดไฟล์ CSV</h2>
          
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center mb-4">
            <input
              type="file"
              accept=".csv"
              onChange={handleFileChange}
              className="hidden"
              id="file-upload"
            />
            <label htmlFor="file-upload" className="cursor-pointer">
              <div className="text-gray-600 mb-2">
                {file ? (
                  <span className="font-medium text-blue-600">{file.name}</span>
                ) : (
                  'คลิกเพื่อเลือกไฟล์ CSV หรือลากไฟล์มาวางที่นี่'
                )}
              </div>
              <p className="text-sm text-gray-500">รองรับเฉพาะไฟล์ .csv</p>
            </label>
          </div>

          <div className="mb-4">
            <h3 className="font-medium mb-2">รูปแบบไฟล์ CSV:</h3>
            <div className="bg-gray-50 p-4 rounded border text-sm font-mono">
              รหัสพนักงาน,ชื่อ-สกุล,แผนก,วันที่(YYYY-MM-DD),จำนวนครั้ง,"เวลา1,เวลา2,เวลา3,เวลา4"
            </div>
            <p className="text-sm text-gray-600 mt-2">
              ตัวอย่าง: 2,นางสาวเอมพิกา แซ่อี่,ส่วนหน้า,2025-05-27,4,"10:03:03,15:07:22,17:05:23,20:07:30"
            </p>
          </div>

          <button
            onClick={handleImport}
            disabled={!file || importing}
            className="w-full py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
          >
            {importing ? 'กำลังนำเข้า...' : 'นำเข้าข้อมูล'}
          </button>
        </div>

        {/* แสดงผลลัพธ์ */}
        {result && (
          <div className={`p-4 rounded-lg mb-6 ${result.success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
            <p className={`font-medium ${result.success ? 'text-green-800' : 'text-red-800'}`}>
              {result.message}
            </p>
          </div>
        )}

        {/* แสดงตัวอย่างข้อมูล */}
        {previewData.length > 0 && (
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-xl font-bold mb-4">ตัวอย่างข้อมูล (10 แถวแรก)</h2>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">รหัส</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">ชื่อ</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">แผนก</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">วันที่</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">ครั้ง</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">เวลาสแกน</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {previewData.map((row, index) => (
                    <tr key={index}>
                      <td className="px-4 py-3 text-sm">{row.employeeCode}</td>
                      <td className="px-4 py-3 text-sm">{row.employeeName}</td>
                      <td className="px-4 py-3 text-sm">{row.department}</td>
                      <td className="px-4 py-3 text-sm">{row.date}</td>
                      <td className="px-4 py-3 text-sm text-center">{row.scanCount}</td>
                      <td className="px-4 py-3 text-sm font-mono text-xs">{row.scans}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
