// app/api/import/route.ts - API สำหรับ import ไฟล์ CSV

import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    
    if (!file) {
      return NextResponse.json(
        { error: 'ไม่พบไฟล์' },
        { status: 400 }
      );
    }
    
    // อ่านไฟล์ CSV
    const text = await file.text();
    const rows = text.split('\n').filter(row => row.trim());
    
    const attendanceData = rows.map(row => {
      const cols = row.split(',');
      return {
        employeeCode: cols[0],
        employeeName: cols[1],
        department: cols[2],
        date: cols[3],
        scanCount: parseInt(cols[4]),
        scans: cols[5],
      };
    });
    
    // บันทึกลง database (ตอนนี้ return ข้อมูลก่อน)
    // TODO: บันทึกลง Prisma database
    
    return NextResponse.json({
      success: true,
      message: `นำเข้าข้อมูลสำเร็จ ${attendanceData.length} รายการ`,
      data: attendanceData,
    });
    
  } catch (error) {
    console.error('Error importing CSV:', error);
    return NextResponse.json(
      { error: 'เกิดข้อผิดพลาดในการนำเข้าข้อมูล' },
      { status: 500 }
    );
  }
}
