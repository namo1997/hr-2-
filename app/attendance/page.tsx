// app/attendance/page.tsx - หน้าบันทึกเวลาทำงาน

'use client';

import { useState } from 'react';
import Link from 'next/link';

interface AttendanceRecord {
  id: number;
  date: string;
  employeeCode: string;
  employeeName: string;
  department: string;
  shift: string;
  checkIn?: string;
  breakOut?: string;
  breakIn?: string;
  checkOut?: string;
  status: 'PRESENT' | 'ABSENT' | 'LEAVE' | 'LATE';
  isLate: boolean;
  lateMinutes: number;
  workHours: number;
  overtimeHours: number;
}

export default function AttendancePage() {
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedDepartment, setSelectedDepartment] = useState('ALL');
  const [records, setRecords] = useState<AttendanceRecord[]>([]);

  const departments = ['ALL', 'ส่วนหน้า', 'ส่วนครัว', 'ส่วนบริการ'];

  const statusColors = {
    PRESENT: 'bg-green-100 text-green-800',
    ABSENT: 'bg-red-100 text-red-800',
    LEAVE: 'bg-yellow-100 text-yellow-800',
    LATE: 'bg-orange-100 text-orange-800',
  };

  const statusLabels = {
    PRESENT: 'มาทำงาน',
    ABSENT: 'ขาดงาน',
    LEAVE: 'ลา',
    LATE: 'มาสาย',
  };

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold">บันทึกเวลาทำงาน</h1>
          <Link href="/" className="px-6 py-2 bg-gray-200 rounded-lg hover:bg-gray-300">
            กลับหน้าหลัก
          </Link>
        </div>

        {/* ตัวกรอง */}
        <div className="bg-white p-6 rounded-lg shadow mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">เลือกวันที่</label>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">เลือกแผนก</label>
              <select
                value={selectedDepartment}
                onChange={(e) => setSelectedDepartment(e.target.value)}
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                {departments.map(dept => (
                  <option key={dept} value={dept}>{dept === 'ALL' ? 'ทุกแผนก' : dept}</option>
                ))}
              </select>
            </div>

            <div className="flex items-end">
              <button
                onClick={() => {/* ค้นหาข้อมูล */}}
                className="w-full px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                ค้นหา
              </button>
            </div>
          </div>
        </div>

        {/* สถิติสรุป */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white p-4 rounded-lg shadow">
            <h3 className="text-gray-500 text-sm">มาทำงาน</h3>
            <p className="text-2xl font-bold text-green-600">{records.filter(r => r.status === 'PRESENT').length}</p>
          </div>
          <div className="bg-white p-4 rounded-lg shadow">
            <h3 className="text-gray-500 text-sm">มาสาย</h3>
            <p className="text-2xl font-bold text-orange-600">{records.filter(r => r.isLate).length}</p>
          </div>
          <div className="bg-white p-4 rounded-lg shadow">
            <h3 className="text-gray-500 text-sm">ลา</h3>
            <p className="text-2xl font-bold text-yellow-600">{records.filter(r => r.status === 'LEAVE').length}</p>
          </div>
          <div className="bg-white p-4 rounded-lg shadow">
            <h3 className="text-gray-500 text-sm">ขาดงาน</h3>
            <p className="text-2xl font-bold text-red-600">{records.filter(r => r.status === 'ABSENT').length}</p>
          </div>
        </div>

        {/* ตารางแสดงบันทึกเวลา */}
        <div className="bg-white rounded-lg shadow">
          <div className="p-6 border-b">
            <h2 className="text-xl font-bold">รายละเอียดการเข้า-ออกงาน วันที่ {selectedDate}</h2>
          </div>
          
          {records.length === 0 ? (
            <div className="p-12 text-center text-gray-500">
              <p>ยังไม่มีข้อมูลการเข้า-ออกงานสำหรับวันที่เลือก</p>
              <p className="text-sm mt-2">กรุณานำเข้าข้อมูลจากเครื่องสแกนนิ้วก่อน</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">รหัส</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">ชื่อ-สกุล</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">แผนก</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">กะ</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">เข้า</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">พักออก</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">พักเข้า</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">เลิก</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">สถานะ</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">ชม.ทำงาน</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">OT</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {records.map((record) => (
                    <tr key={record.id}>
                      <td className="px-4 py-3 text-sm">{record.employeeCode}</td>
                      <td className="px-4 py-3 text-sm font-medium">{record.employeeName}</td>
                      <td className="px-4 py-3 text-sm">{record.department}</td>
                      <td className="px-4 py-3 text-sm">{record.shift}</td>
                      <td className="px-4 py-3 text-sm font-mono">
                        {record.checkIn || '-'}
                        {record.isLate && (
                          <span className="ml-2 text-xs text-red-600">({record.lateMinutes}น)</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm font-mono">{record.breakOut || '-'}</td>
                      <td className="px-4 py-3 text-sm font-mono">{record.breakIn || '-'}</td>
                      <td className="px-4 py-3 text-sm font-mono">{record.checkOut || '-'}</td>
                      <td className="px-4 py-3 text-sm">
                        <span className={`px-2 py-1 rounded text-xs ${statusColors[record.status]}`}>
                          {statusLabels[record.status]}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-right">{record.workHours.toFixed(2)}</td>
                      <td className="px-4 py-3 text-sm text-right">
                        {record.overtimeHours > 0 ? (
                          <span className="text-blue-600 font-medium">{record.overtimeHours.toFixed(2)}</span>
                        ) : '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* คำอธิบาย */}
        <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="font-bold text-blue-900 mb-2">💡 คำอธิบาย:</h3>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>• <strong>เข้า:</strong> เวลาสแกนเข้าทำงาน (ถ้ามีเลขสีแดงแสดงว่ามาสายกี่นาที)</li>
            <li>• <strong>พักออก/พักเข้า:</strong> เวลาพักกลางวัน (สำหรับกะที่พักยืดหยุ่น)</li>
            <li>• <strong>เลิก:</strong> เวลาสแกนออกจากงาน</li>
            <li>• <strong>ชม.ทำงาน:</strong> จำนวนชั่วโมงทำงานจริง (หักเวลาพักแล้ว)</li>
            <li>• <strong>OT:</strong> จำนวนชั่วโมง Overtime (ทำงานเกินเวลาที่กำหนด)</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
