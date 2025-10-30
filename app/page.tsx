// app/page.tsx - หน้า Dashboard หลัก

'use client';

import { useState } from 'react';
import Link from 'next/link';

export default function Dashboard() {
  const [stats] = useState({
    totalEmployees: 0,
    presentToday: 0,
    absentToday: 0,
    lateToday: 0,
    pendingApprovals: 0,
  });

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">ระบบ HR - Dashboard</h1>
        
        {/* สถิติรวม */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-8">
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-gray-500 text-sm">พนักงานทั้งหมด</h3>
            <p className="text-3xl font-bold text-blue-600">{stats.totalEmployees}</p>
          </div>
          
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-gray-500 text-sm">มาทำงานวันนี้</h3>
            <p className="text-3xl font-bold text-green-600">{stats.presentToday}</p>
          </div>
          
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-gray-500 text-sm">ขาดงานวันนี้</h3>
            <p className="text-3xl font-bold text-red-600">{stats.absentToday}</p>
          </div>
          
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-gray-500 text-sm">มาสายวันนี้</h3>
            <p className="text-3xl font-bold text-orange-600">{stats.lateToday}</p>
          </div>
          
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-gray-500 text-sm">รออนุมัติ</h3>
            <p className="text-3xl font-bold text-purple-600">{stats.pendingApprovals}</p>
          </div>
        </div>

        {/* เมนูหลัก */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Link href="/employees" className="bg-white p-6 rounded-lg shadow hover:shadow-lg transition">
            <h2 className="text-xl font-bold mb-2">จัดการพนักงาน</h2>
            <p className="text-gray-600">เพิ่ม แก้ไข ข้อมูลพนักงาน</p>
          </Link>

          <Link href="/shifts" className="bg-white p-6 rounded-lg shadow hover:shadow-lg transition">
            <h2 className="text-xl font-bold mb-2">จัดการกะทำงาน</h2>
            <p className="text-gray-600">สร้างกะ กำหนดพนักงานเข้ากะ</p>
          </Link>

          <Link href="/import" className="bg-white p-6 rounded-lg shadow hover:shadow-lg transition">
            <h2 className="text-xl font-bold mb-2">นำเข้าข้อมูลสแกนนิ้ว</h2>
            <p className="text-gray-600">Import ไฟล์ CSV จากเครื่องสแกน</p>
          </Link>

          <Link href="/attendance" className="bg-white p-6 rounded-lg shadow hover:shadow-lg transition">
            <h2 className="text-xl font-bold mb-2">บันทึกเวลาทำงาน</h2>
            <p className="text-gray-600">ดูรายละเอียดการเข้า-ออกงาน</p>
          </Link>

          <Link href="/leave" className="bg-white p-6 rounded-lg shadow hover:shadow-lg transition">
            <h2 className="text-xl font-bold mb-2">จัดการการลา</h2>
            <p className="text-gray-600">ขอลา อนุมัติการลา</p>
          </Link>

          <Link href="/overtime" className="bg-white p-6 rounded-lg shadow hover:shadow-lg transition">
            <h2 className="text-xl font-bold mb-2">จัดการ OT</h2>
            <p className="text-gray-600">ขอทำ OT อนุมัติ OT</p>
          </Link>

          <Link href="/approvals" className="bg-white p-6 rounded-lg shadow hover:shadow-lg transition">
            <h2 className="text-xl font-bold mb-2">อนุมัติคำขอ</h2>
            <p className="text-gray-600">อนุมัติการลา OT สลับวันหยุด</p>
          </Link>

          <Link href="/reports" className="bg-white p-6 rounded-lg shadow hover:shadow-lg transition">
            <h2 className="text-xl font-bold mb-2">รายงาน</h2>
            <p className="text-gray-600">สรุปเวลาทำงาน รายงานต่างๆ</p>
          </Link>

          <Link href="/settings" className="bg-white p-6 rounded-lg shadow hover:shadow-lg transition">
            <h2 className="text-xl font-bold mb-2">ตั้งค่าระบบ</h2>
            <p className="text-gray-600">จัดการวันหยุด ตั้งค่าทั่วไป</p>
          </Link>
        </div>
      </div>
    </div>
  );
}
