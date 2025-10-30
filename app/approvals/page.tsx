// app/approvals/page.tsx - หน้าอนุมัติคำขอ

'use client';

import { useState } from 'react';
import Link from 'next/link';

interface ApprovalRequest {
  id: number;
  requestType: 'LEAVE' | 'OVERTIME' | 'DAYOFF_SWAP';
  employeeCode: string;
  employeeName: string;
  department: string;
  requestDate: string;
  details: string;
  reason: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  submittedAt: string;
}

export default function ApprovalsPage() {
  const [requests, setRequests] = useState<ApprovalRequest[]>([
    {
      id: 1,
      requestType: 'LEAVE',
      employeeCode: '002',
      employeeName: 'นางสาวสมหญิง ใจดี',
      department: 'ส่วนหน้า',
      requestDate: '2025-11-05',
      details: 'ลาป่วย 1 วัน',
      reason: 'ป่วยเป็นไข้หวัด',
      status: 'PENDING',
      submittedAt: '2025-11-03 09:30',
    },
    {
      id: 2,
      requestType: 'OVERTIME',
      employeeCode: '005',
      employeeName: 'นายสมชาย ขยัน',
      department: 'ส่วนครัว',
      requestDate: '2025-11-04',
      details: 'ทำ OT 2 ชั่วโมง (18:00-20:00)',
      reason: 'มีงานเร่งด่วน',
      status: 'PENDING',
      submittedAt: '2025-11-04 17:30',
    },
  ]);

  const [selectedFilter, setSelectedFilter] = useState<'ALL' | 'PENDING' | 'APPROVED' | 'REJECTED'>('PENDING');
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [reviewingRequest, setReviewingRequest] = useState<ApprovalRequest | null>(null);
  const [reviewNote, setReviewNote] = useState('');

  const requestTypeLabels = {
    LEAVE: 'ขอลา',
    OVERTIME: 'ขอทำ OT',
    DAYOFF_SWAP: 'ขอสลับวันหยุด',
  };

  const requestTypeColors = {
    LEAVE: 'bg-yellow-100 text-yellow-800',
    OVERTIME: 'bg-blue-100 text-blue-800',
    DAYOFF_SWAP: 'bg-purple-100 text-purple-800',
  };

  const statusColors = {
    PENDING: 'bg-orange-100 text-orange-800',
    APPROVED: 'bg-green-100 text-green-800',
    REJECTED: 'bg-red-100 text-red-800',
  };

  const statusLabels = {
    PENDING: 'รออนุมัติ',
    APPROVED: 'อนุมัติแล้ว',
    REJECTED: 'ไม่อนุมัติ',
  };

  const filteredRequests = selectedFilter === 'ALL' 
    ? requests 
    : requests.filter(r => r.status === selectedFilter);

  const handleReview = (request: ApprovalRequest, action: 'APPROVED' | 'REJECTED') => {
    setReviewingRequest(request);
    setShowReviewModal(true);
  };

  const confirmReview = (action: 'APPROVED' | 'REJECTED') => {
    if (!reviewingRequest) return;

    setRequests(requests.map(r => 
      r.id === reviewingRequest.id 
        ? { ...r, status: action }
        : r
    ));

    setShowReviewModal(false);
    setReviewingRequest(null);
    setReviewNote('');
    
    // TODO: เรียก API เพื่อ update status และส่ง notification กลับไปยังพนักงาน
    alert(`${action === 'APPROVED' ? 'อนุมัติ' : 'ไม่อนุมัติ'}คำขอเรียบร้อยแล้ว\nระบบจะคำนวณเวลาทำงานใหม่อัตโนมัติ`);
  };

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold">อนุมัติคำขอ</h1>
          <Link href="/" className="px-6 py-2 bg-gray-200 rounded-lg hover:bg-gray-300">
            กลับหน้าหลัก
          </Link>
        </div>

        {/* สถิติคำขอ */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white p-4 rounded-lg shadow">
            <h3 className="text-gray-500 text-sm">รออนุมัติ</h3>
            <p className="text-2xl font-bold text-orange-600">
              {requests.filter(r => r.status === 'PENDING').length}
            </p>
          </div>
          <div className="bg-white p-4 rounded-lg shadow">
            <h3 className="text-gray-500 text-sm">อนุมัติแล้ว (วันนี้)</h3>
            <p className="text-2xl font-bold text-green-600">
              {requests.filter(r => r.status === 'APPROVED').length}
            </p>
          </div>
          <div className="bg-white p-4 rounded-lg shadow">
            <h3 className="text-gray-500 text-sm">ไม่อนุมัติ (วันนี้)</h3>
            <p className="text-2xl font-bold text-red-600">
              {requests.filter(r => r.status === 'REJECTED').length}
            </p>
          </div>
          <div className="bg-white p-4 rounded-lg shadow">
            <h3 className="text-gray-500 text-sm">ทั้งหมด</h3>
            <p className="text-2xl font-bold text-blue-600">{requests.length}</p>
          </div>
        </div>

        {/* ตัวกรอง */}
        <div className="bg-white p-4 rounded-lg shadow mb-6">
          <div className="flex space-x-2">
            <button
              onClick={() => setSelectedFilter('ALL')}
              className={`px-4 py-2 rounded ${selectedFilter === 'ALL' ? 'bg-blue-600 text-white' : 'bg-gray-100'}`}
            >
              ทั้งหมด ({requests.length})
            </button>
            <button
              onClick={() => setSelectedFilter('PENDING')}
              className={`px-4 py-2 rounded ${selectedFilter === 'PENDING' ? 'bg-orange-600 text-white' : 'bg-gray-100'}`}
            >
              รออนุมัติ ({requests.filter(r => r.status === 'PENDING').length})
            </button>
            <button
              onClick={() => setSelectedFilter('APPROVED')}
              className={`px-4 py-2 rounded ${selectedFilter === 'APPROVED' ? 'bg-green-600 text-white' : 'bg-gray-100'}`}
            >
              อนุมัติแล้ว ({requests.filter(r => r.status === 'APPROVED').length})
            </button>
            <button
              onClick={() => setSelectedFilter('REJECTED')}
              className={`px-4 py-2 rounded ${selectedFilter === 'REJECTED' ? 'bg-red-600 text-white' : 'bg-gray-100'}`}
            >
              ไม่อนุมัติ ({requests.filter(r => r.status === 'REJECTED').length})
            </button>
          </div>
        </div>

        {/* รายการคำขอ */}
        <div className="space-y-4">
          {filteredRequests.length === 0 ? (
            <div className="bg-white p-12 rounded-lg shadow text-center text-gray-500">
              ไม่มีคำขอในสถานะนี้
            </div>
          ) : (
            filteredRequests.map(request => (
              <div key={request.id} className="bg-white p-6 rounded-lg shadow">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center mb-2">
                      <span className={`px-3 py-1 rounded text-sm font-medium mr-3 ${requestTypeColors[request.requestType]}`}>
                        {requestTypeLabels[request.requestType]}
                      </span>
                      <span className={`px-3 py-1 rounded text-sm ${statusColors[request.status]}`}>
                        {statusLabels[request.status]}
                      </span>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                      <div>
                        <p className="text-sm text-gray-500">พนักงาน</p>
                        <p className="font-medium">{request.employeeName} ({request.employeeCode})</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">แผนก</p>
                        <p className="font-medium">{request.department}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">วันที่ขอ</p>
                        <p className="font-medium">{request.requestDate}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">ส่งคำขอเมื่อ</p>
                        <p className="font-medium">{request.submittedAt}</p>
                      </div>
                      <div className="md:col-span-2">
                        <p className="text-sm text-gray-500">รายละเอียด</p>
                        <p className="font-medium">{request.details}</p>
                      </div>
                      <div className="md:col-span-2">
                        <p className="text-sm text-gray-500">เหตุผล</p>
                        <p className="text-gray-700">{request.reason}</p>
                      </div>
                    </div>
                  </div>
                  
                  {request.status === 'PENDING' && (
                    <div className="flex flex-col space-y-2 ml-6">
                      <button
                        onClick={() => {
                          setReviewingRequest(request);
                          confirmReview('APPROVED');
                        }}
                        className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                      >
                        ✓ อนุมัติ
                      </button>
                      <button
                        onClick={() => {
                          setReviewingRequest(request);
                          confirmReview('REJECTED');
                        }}
                        className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                      >
                        ✗ ไม่อนุมัติ
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        {/* คำอธิบาย Workflow */}
        <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="font-bold text-blue-900 mb-2">🔄 Workflow การอนุมัติ:</h3>
          <ol className="text-sm text-blue-800 space-y-1 list-decimal list-inside">
            <li>พนักงานส่งคำขอ (ลา / OT / สลับวันหยุด) ผ่านระบบ</li>
            <li>หัวหน้าได้รับแจ้งเตือนและเข้ามาหน้านี้เพื่อพิจารณา</li>
            <li>หัวหน้ากดอนุมัติหรือไม่อนุมัติพร้อมเหตุผล</li>
            <li><strong>ระบบจะคำนวณเวลาทำงานใหม่โดยอัตโนมัติ</strong> ตามผลการอนุมัติ</li>
            <li>พนักงานได้รับแจ้งเตือนผลการพิจารณา</li>
          </ol>
        </div>
      </div>
    </div>
  );
}
