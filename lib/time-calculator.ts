// lib/time-calculator.ts - ฟังก์ชันคำนวณเวลาทำงาน

import { Shift, TimeCalculation } from '@/types';
import { differenceInMinutes, parse, isAfter, isBefore, isWithinInterval } from 'date-fns';

/**
 * แปลงเวลา HH:mm:ss เป็น Date object
 */
export function parseTime(timeStr: string, baseDate: Date = new Date()): Date {
  const [hours, minutes, seconds = '0'] = timeStr.split(':').map(Number);
  const date = new Date(baseDate);
  date.setHours(hours, minutes, seconds || 0, 0);
  return date;
}

/**
 * คำนวณความแตกต่างของเวลาเป็นนาที
 */
export function getMinutesDifference(start: string, end: string): number {
  const baseDate = new Date();
  const startTime = parseTime(start, baseDate);
  let endTime = parseTime(end, baseDate);
  
  // ถ้าเวลาสิ้นสุดน้อยกว่าเวลาเริ่ม แสดงว่าข้ามวัน
  if (endTime < startTime) {
    endTime = new Date(endTime.getTime() + 24 * 60 * 60 * 1000);
  }
  
  return differenceInMinutes(endTime, startTime);
}

/**
 * ตรวจสอบว่าเวลาอยู่ในช่วงพักหรือไม่
 */
export function isInBreakTime(time: string, shift: Shift): boolean {
  if (shift.breakType === 'FIXED' && shift.fixedBreakStart) {
    const breakEnd = addMinutes(shift.fixedBreakStart, shift.breakDuration);
    const timeMinutes = timeToMinutes(time);
    const breakStartMinutes = timeToMinutes(shift.fixedBreakStart);
    const breakEndMinutes = timeToMinutes(breakEnd);
    
    return timeMinutes >= breakStartMinutes && timeMinutes <= breakEndMinutes;
  }
  
  if (shift.breakType === 'FLEXIBLE' && shift.flexBreakStart && shift.flexBreakEnd) {
    const timeMinutes = timeToMinutes(time);
    const flexStartMinutes = timeToMinutes(shift.flexBreakStart);
    const flexEndMinutes = timeToMinutes(shift.flexBreakEnd);
    
    return timeMinutes >= flexStartMinutes && timeMinutes <= flexEndMinutes;
  }
  
  return false;
}

/**
 * แปลงเวลา HH:mm เป็นนาทีนับจากเที่ยงคืน
 */
export function timeToMinutes(time: string): number {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
}

/**
 * เพิ่มนาทีให้กับเวลา
 */
export function addMinutes(time: string, minutes: number): string {
  const totalMinutes = timeToMinutes(time) + minutes;
  const hours = Math.floor(totalMinutes / 60) % 24;
  const mins = totalMinutes % 60;
  return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
}

/**
 * คำนวณเวลาทำงานและ OT
 */
export function calculateWorkTime(
  checkIn: string | null,
  breakOut: string | null,
  breakIn: string | null,
  checkOut: string | null,
  shift: Shift
): TimeCalculation {
  // ถ้าไม่มีเวลาเข้าหรือเลิก ไม่สามารถคำนวณได้
  if (!checkIn || !checkOut) {
    return {
      checkIn: checkIn || '',
      breakOut: breakOut || undefined,
      breakIn: breakIn || undefined,
      checkOut: checkOut || '',
      shift,
      isLate: false,
      lateMinutes: 0,
      isEarlyLeave: false,
      earlyMinutes: 0,
      workMinutes: 0,
      overtimeMinutes: 0,
    };
  }

  const result: TimeCalculation = {
    checkIn,
    breakOut: breakOut || undefined,
    breakIn: breakIn || undefined,
    checkOut,
    shift,
    isLate: false,
    lateMinutes: 0,
    isEarlyLeave: false,
    earlyMinutes: 0,
    workMinutes: 0,
    overtimeMinutes: 0,
  };

  // ตรวจสอบการมาสาย
  const checkInMinutes = timeToMinutes(checkIn);
  const shiftStartMinutes = timeToMinutes(shift.startTime);
  const lateDiff = checkInMinutes - shiftStartMinutes;
  
  if (lateDiff > shift.lateGracePeriod) {
    result.isLate = true;
    result.lateMinutes = lateDiff - shift.lateGracePeriod;
  }

  // ตรวจสอบการกลับก่อน
  const checkOutMinutes = timeToMinutes(checkOut);
  const shiftEndMinutes = timeToMinutes(shift.endTime);
  const earlyDiff = shiftEndMinutes - checkOutMinutes;
  
  if (earlyDiff > 0) {
    result.isEarlyLeave = true;
    result.earlyMinutes = earlyDiff;
  }

  // คำนวณเวลาทำงาน
  let totalWorkMinutes = getMinutesDifference(checkIn, checkOut);
  
  // หักเวลาพัก
  if (shift.breakType === 'FIXED') {
    // พักแบบ Fixed ให้หักเวลาพักออก
    totalWorkMinutes -= shift.breakDuration;
  } else if (shift.breakType === 'FLEXIBLE' && breakOut && breakIn) {
    // พักแบบ Flexible ให้หักเวลาพักจริงที่สแกน
    const breakMinutes = getMinutesDifference(breakOut, breakIn);
    totalWorkMinutes -= breakMinutes;
  }

  result.workMinutes = Math.max(0, totalWorkMinutes);

  // คำนวณ OT (ทำงานเกินเวลาเลิกงาน + overtimeStart)
  const otStartMinutes = shiftEndMinutes + shift.overtimeStart;
  if (checkOutMinutes > otStartMinutes) {
    result.overtimeMinutes = checkOutMinutes - otStartMinutes;
  }

  return result;
}

/**
 * ประมวลผลข้อมูลการสแกนนิ้ว
 * จัดเรียงและแบ่งเป็น เข้า-พักออก-พักเข้า-เลิก
 */
export function processScans(
  scans: string[],
  shift: Shift
): {
  checkIn?: string;
  breakOut?: string;
  breakIn?: string;
  checkOut?: string;
} {
  if (scans.length === 0) {
    return {};
  }

  // เรียงเวลาจากน้อยไปมาก
  const sortedScans = [...scans].sort((a, b) => 
    timeToMinutes(a) - timeToMinutes(b)
  );

  const result: {
    checkIn?: string;
    breakOut?: string;
    breakIn?: string;
    checkOut?: string;
  } = {};

  if (sortedScans.length === 1) {
    // ถ้ามีแค่ 1 ครั้ง ให้เป็นเวลาเข้า
    result.checkIn = sortedScans[0];
  } else if (sortedScans.length === 2) {
    // ถ้ามี 2 ครั้ง ให้เป็นเข้า-เลิก
    result.checkIn = sortedScans[0];
    result.checkOut = sortedScans[1];
  } else if (sortedScans.length === 3) {
    // ถ้ามี 3 ครั้ง อาจเป็น เข้า-พักออก-เลิก หรือ เข้า-พักเข้า-เลิก
    result.checkIn = sortedScans[0];
    result.checkOut = sortedScans[2];
    
    // ตรวจสอบว่า scan ตัวกลางอยู่ในช่วงพักหรือไม่
    if (isInBreakTime(sortedScans[1], shift)) {
      result.breakOut = sortedScans[1];
    }
  } else if (sortedScans.length >= 4) {
    // ถ้ามี 4 ครั้งขึ้นไป ให้เป็น เข้า-พักออก-พักเข้า-เลิก
    result.checkIn = sortedScans[0];
    result.checkOut = sortedScans[sortedScans.length - 1];
    
    // หา breakOut และ breakIn จากตรงกลาง
    const middleScans = sortedScans.slice(1, -1);
    if (middleScans.length >= 2) {
      // ใช้ 2 ตัวแรกเป็น breakOut และ breakIn
      result.breakOut = middleScans[0];
      result.breakIn = middleScans[1];
    }
  }

  return result;
}

/**
 * ฟอร์แมตนาทีเป็นชั่วโมงและนาที
 */
export function formatMinutes(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hours > 0) {
    return `${hours} ชม. ${mins} นาที`;
  }
  return `${mins} นาที`;
}

/**
 * ฟอร์แมตนาทีเป็นทศนิยม (สำหรับชั่วโมง)
 */
export function minutesToHours(minutes: number): number {
  return Math.round((minutes / 60) * 100) / 100;
}
