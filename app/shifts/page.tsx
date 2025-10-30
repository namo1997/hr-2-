// app/shifts/page.tsx - หน้าจัดการกะทำงาน

'use client';

import { useState } from 'react';
import Link from 'next/link';

interface Shift {
  id: number;
  name: string;
  startTime: string;
  endTime: string;
  breakType: 'FLEXIBLE' | 'FIXED';
  breakDuration: number;
  flexBreakStart?: string;
  flexBreakEnd?: string;
  fixedBreakStart?: string;
  lateGracePeriod: number;
  overtimeStart: number;
  isActive: boolean;
}

export default function ShiftsPage() {
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingShift, setEditingShift] = useState<Shift | null>(null);
  
  const [formData, setFormData] = useState({
    name: '',
    startTime: '09:00',
    endTime: '18:00',
    breakType: 'FLEXIBLE' as 'FLEXIBLE' | 'FIXED',
    breakDuration: 60,
    flexBreakStart: '12:00',
    flexBreakEnd: '14:00',
    fixedBreakStart: '12:00',
    lateGracePeriod: 5,
    overtimeStart: 30,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (editingShift) {
      setShifts(shifts.map(shift => 
        shift.id === editingShift.id 
          ? { ...shift, ...formData, isActive: true }
          : shift
      ));
      setEditingShift(null);
    } else {
      const newShift: Shift = {
        id: Date.now(),
        ...formData,
        isActive: true,
      };
      setShifts([...shifts, newShift]);
    }
    
    setShowForm(false);
    resetForm();
  };

  const resetForm = () => {
    setFormData({
      name: '',
      startTime: '09:00',
      endTime: '18:00',
      breakType: 'FLEXIBLE',
      breakDuration: 60,
      flexBreakStart: '12:00',
      flexBreakEnd: '14:00',
      fixedBreakStart: '12:00',
      lateGracePeriod: 5,
      overtimeStart: 30,
    });
  };

  const handleEdit = (shift: Shift) => {
    setEditingShift(shift);
    setFormData({
      name: shift.name,
      startTime: shift.startTime,
      endTime: shift.endTime,
      breakType: shift.breakType,
      breakDuration: shift.breakDuration,
      flexBreakStart: shift.flexBreakStart || '12:00',
      flexBreakEnd: shift.flexBreakEnd || '14:00',
      fixedBreakStart: shift.fixedBreakStart || '12:00',
      lateGracePeriod: shift.lateGracePeriod,
      overtimeStart: shift.overtimeStart,
    });
    setShowForm(true);
  };

  const handleDelete = (id: number) => {
    if (confirm('ยืนยันการลบกะนี้?')) {
      setShifts(shifts.filter(shift => shift.id !== id));
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold">จัดการกะทำงาน</h1>
          <div className="space-x-4">
            <button
              onClick={() => {
                setShowForm(!showForm);
                setEditingShift(null);
                resetForm();
              }}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              {showForm ? 'ยกเลิก' : '+ เพิ่มกะใหม่'}
            </button>
            <Link href="/" className="px-6 py-2 bg-gray-200 rounded-lg hover:bg-gray-300">
              กลับหน้าหลัก
            </Link>
          </div>
        </div>

        {/* ฟอร์มเพิ่ม/แก้ไขกะ */}
        {showForm && (
          <div className="bg-white p-6 rounded-lg shadow mb-6">
            <h2 className="text-xl font-bold mb-4">
              {editingShift ? 'แก้ไขกะทำงาน' : 'เพิ่มกะใหม่'}
            </h2>
            <form onSubmit={handleSubmit}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium mb-2">ชื่อกะ *</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="เช่น กะเช้า, กะบ่าย, กะเย็น"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">เวลาเริ่มงาน *</label>
                  <input
                    type="time"
                    required
                    value={formData.startTime}
                    onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">เวลาเลิกงาน *</label>
                  <input
                    type="time"
                    required
                    value={formData.endTime}
                    onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium mb-2">ประเภทเวลาพัก *</label>
                  <div className="flex space-x-4">
                    <label className="flex items-center">
                      <input
                        type="radio"
                        name="breakType"
                        value="FLEXIBLE"
                        checked={formData.breakType === 'FLEXIBLE'}
                        onChange={(e) => setFormData({ ...formData, breakType: 'FLEXIBLE' })}
                        className="mr-2"
                      />
                      <span>พักยืดหยุ่น (พักได้ภายในช่วงเวลาที่กำหนด)</span>
                    </label>
                    <label className="flex items-center">
                      <input
                        type="radio"
                        name="breakType"
                        value="FIXED"
                        checked={formData.breakType === 'FIXED'}
                        onChange={(e) => setFormData({ ...formData, breakType: 'FIXED' })}
                        className="mr-2"
                      />
                      <span>พักตายตัว (พักเวลาเดียวกันทุกคน)</span>
                    </label>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">ระยะเวลาพัก (นาที) *</label>
                  <input
                    type="number"
                    required
                    min="0"
                    value={formData.breakDuration}
                    onChange={(e) => setFormData({ ...formData, breakDuration: parseInt(e.target.value) })}
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                {formData.breakType === 'FLEXIBLE' ? (
                  <>
                    <div>
                      <label className="block text-sm font-medium mb-2">เริ่มช่วงเวลาพักได้ *</label>
                      <input
                        type="time"
                        required
                        value={formData.flexBreakStart}
                        onChange={(e) => setFormData({ ...formData, flexBreakStart: e.target.value })}
                        className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">สิ้นสุดช่วงเวลาพักได้ *</label>
                      <input
                        type="time"
                        required
                        value={formData.flexBreakEnd}
                        onChange={(e) => setFormData({ ...formData, flexBreakEnd: e.target.value })}
                        className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </>
                ) : (
                  <div>
                    <label className="block text-sm font-medium mb-2">เวลาพักกลางวัน *</label>
                    <input
                      type="time"
                      required
                      value={formData.fixedBreakStart}
                      onChange={(e) => setFormData({ ...formData, fixedBreakStart: e.target.value })}
                      className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium mb-2">อนุโลมการมาสาย (นาที)</label>
                  <input
                    type="number"
                    min="0"
                    value={formData.lateGracePeriod}
                    onChange={(e) => setFormData({ ...formData, lateGracePeriod: parseInt(e.target.value) })}
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                  <p className="text-xs text-gray-500 mt-1">มาช้าภายใน X นาทีจะไม่ถือว่ามาสาย</p>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">เริ่มนับ OT หลังเลิกงาน (นาที)</label>
                  <input
                    type="number"
                    min="0"
                    value={formData.overtimeStart}
                    onChange={(e) => setFormData({ ...formData, overtimeStart: parseInt(e.target.value) })}
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                  <p className="text-xs text-gray-500 mt-1">ทำงานเกินเลิกงานกี่นาทีถึงจะนับเป็น OT</p>
                </div>
              </div>

              <div className="mt-6 flex space-x-4">
                <button
                  type="submit"
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  {editingShift ? 'บันทึกการแก้ไข' : 'เพิ่มกะ'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowForm(false);
                    setEditingShift(null);
                    resetForm();
                  }}
                  className="px-6 py-2 bg-gray-200 rounded-lg hover:bg-gray-300"
                >
                  ยกเลิก
                </button>
              </div>
            </form>
          </div>
        )}

        {/* ตารางแสดงกะทำงาน */}
        <div className="bg-white rounded-lg shadow">
          <div className="p-6 border-b">
            <h2 className="text-xl font-bold">รายการกะทำงาน ({shifts.length} กะ)</h2>
          </div>
          
          {shifts.length === 0 ? (
            <div className="p-12 text-center text-gray-500">
              ยังไม่มีข้อมูลกะทำงาน
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">ชื่อกะ</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">เวลาทำงาน</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">ประเภทพัก</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">เวลาพัก</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">อนุโลมมาสาย</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">เริ่ม OT</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">การจัดการ</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {shifts.map((shift) => (
                    <tr key={shift.id}>
                      <td className="px-6 py-4 text-sm font-medium">{shift.name}</td>
                      <td className="px-6 py-4 text-sm">{shift.startTime} - {shift.endTime}</td>
                      <td className="px-6 py-4 text-sm">
                        {shift.breakType === 'FLEXIBLE' ? (
                          <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs">ยืดหยุ่น</span>
                        ) : (
                          <span className="px-2 py-1 bg-green-100 text-green-800 rounded text-xs">ตายตัว</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-sm">
                        {shift.breakType === 'FLEXIBLE' 
                          ? `${shift.flexBreakStart}-${shift.flexBreakEnd} (${shift.breakDuration} นาที)`
                          : `${shift.fixedBreakStart} (${shift.breakDuration} นาที)`
                        }
                      </td>
                      <td className="px-6 py-4 text-sm">{shift.lateGracePeriod} นาที</td>
                      <td className="px-6 py-4 text-sm">+{shift.overtimeStart} นาที</td>
                      <td className="px-6 py-4 text-sm">
                        <button
                          onClick={() => handleEdit(shift)}
                          className="text-blue-600 hover:text-blue-800 mr-4"
                        >
                          แก้ไข
                        </button>
                        <button
                          onClick={() => handleDelete(shift.id)}
                          className="text-red-600 hover:text-red-800"
                        >
                          ลบ
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* คำแนะนำ */}
        <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="font-bold text-blue-900 mb-2">💡 คำแนะนำการใช้งาน:</h3>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>• <strong>พักยืดหยุ่น:</strong> พนักงานสามารถพักได้ภายในช่วงเวลาที่กำหนด (เช่น 12:00-14:00 พักได้ 60 นาที)</li>
            <li>• <strong>พักตายตัว:</strong> พนักงานทุกคนพักเวลาเดียวกัน (เช่น 12:00-13:00) ระบบจะหักเวลาพักออกโดยอัตโนมัติ</li>
            <li>• <strong>อนุโลมมาสาย:</strong> ถ้ามาภายในเวลาที่กำหนด จะไม่ถือว่ามาสาย</li>
            <li>• <strong>เริ่มนับ OT:</strong> ต้องทำงานเกินเวลาเลิกงานตามที่กำหนด ถึงจะนับเป็น OT</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
