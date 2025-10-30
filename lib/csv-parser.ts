// lib/csv-parser.ts - ฟังก์ชันสำหรับแปลงไฟล์ CSV

import Papa from 'papaparse';
import { CSVAttendanceRow } from '@/types';

/**
 * Parse CSV file และแปลงเป็นข้อมูลการสแกนนิ้ว
 */
export async function parseAttendanceCSV(file: File): Promise<CSVAttendanceRow[]> {
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      complete: (results) => {
        try {
          const rows: CSVAttendanceRow[] = results.data
            .filter((row: any) => row && row.length >= 6)
            .map((row: any) => ({
              employeeCode: String(row[0] || '').trim(),
              employeeName: String(row[1] || '').trim(),
              department: String(row[2] || '').trim(),
              date: String(row[3] || '').trim(),
              scanCount: parseInt(row[4] || '0', 10),
              scans: String(row[5] || '').trim(),
            }))
            .filter(row => row.employeeCode && row.date);
          
          resolve(rows);
        } catch (error) {
          reject(error);
        }
      },
      error: (error) => {
        reject(error);
      },
    });
  });
}

/**
 * แปลงข้อมูล CSV เป็น JSON สำหรับบันทึกลงฐานข้อมูล
 */
export function convertCSVToAttendanceScans(rows: CSVAttendanceRow[]) {
  return rows.map(row => ({
    employeeCode: row.employeeCode,
    scanDate: new Date(row.date),
    scanTime: row.scans.split(',')[0] || '',
    scanCount: row.scanCount,
    allScans: row.scans.split(',').map(s => s.trim()),
    importSource: 'csv_upload',
  }));
}

/**
 * Validate CSV data
 */
export function validateCSVData(rows: CSVAttendanceRow[]): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];
  
  if (rows.length === 0) {
    errors.push('ไฟล์ CSV ไม่มีข้อมูล');
    return { valid: false, errors };
  }
  
  rows.forEach((row, index) => {
    if (!row.employeeCode) {
      errors.push(`แถว ${index + 1}: ไม่มีรหัสพนักงาน`);
    }
    
    if (!row.date) {
      errors.push(`แถว ${index + 1}: ไม่มีวันที่`);
    } else {
      // ตรวจสอบรูปแบบวันที่
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      if (!dateRegex.test(row.date)) {
        errors.push(`แถว ${index + 1}: รูปแบบวันที่ไม่ถูกต้อง (ต้องเป็น YYYY-MM-DD)`);
      }
    }
    
    if (row.scanCount <= 0) {
      errors.push(`แถว ${index + 1}: จำนวนครั้งที่สแกนต้องมากกว่า 0`);
    }
    
    if (!row.scans) {
      errors.push(`แถว ${index + 1}: ไม่มีเวลาที่สแกน`);
    } else {
      const scans = row.scans.split(',');
      if (scans.length !== row.scanCount) {
        errors.push(`แถว ${index + 1}: จำนวนเวลาที่สแกนไม่ตรงกับจำนวนที่ระบุ`);
      }
    }
  });
  
  return {
    valid: errors.length === 0,
    errors,
  };
}
