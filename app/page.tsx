'use client';

import Link from 'next/link';

const actions = [
  {
    title: 'จัดการพนักงาน',
    description: 'ตั้งค่าโครงสร้างโซน-สาขา-แผนก เพิ่ม/แก้ไขพนักงาน และบริหาร Workflow การอนุมัติ',
    href: '/employees',
    tone: 'from-blue-500 to-blue-600',
  },
  {
    title: 'กะการทำงาน',
    description: 'สร้างและปรับกะทำงานรายวัน กำหนดเวลาพักแบบยืดหยุ่นหรือกำหนดเวลา แล้วผูกกับกลุ่มพนักงาน',
    href: '/shifts',
    tone: 'from-green-500 to-green-600',
  },
  {
    title: 'นำเข้าข้อมูลสแกนนิ้ว',
    description: 'อัปโหลดไฟล์ .dat หรือ CSV เพื่อตรวจสอบและบันทึกข้อมูลสแกนนิ้วเข้าสู่ระบบ',
    href: '/import',
    tone: 'from-purple-500 to-purple-600',
  },
  {
    title: 'ข้อมูลการบันทึกเวลา',
    description: 'ดูรายการบันทึกเวลาที่ถูกนำเข้า ตรวจสอบจำนวนครั้งสแกน และแหล่งที่มาของไฟล์',
    href: '/attendance',
    tone: 'from-orange-500 to-orange-600',
  },
  {
    title: 'การคำนวณเวลาทำงาน',
    description: 'เปรียบเทียบเวลาสแกนกับกะการทำงานเพื่อหาการมาสาย พักเกินเวลาหรือข้อมูลขาดหาย',
    href: '/work-calculation',
    tone: 'from-rose-500 to-rose-600',
  },
  {
    title: 'การขอลา',
    description: 'พนักงานตรวจสอบสิทธิและยื่นคำขอลา พร้อมส่งเข้า Workflow อนุมัติแบบ 3 ระดับ',
    href: '/leave',
    tone: 'from-amber-500 to-amber-600',
  },
  {
    title: 'รายงานและวิเคราะห์',
    description: 'เตรียมข้อมูลสำหรับสร้างรายงานเพิ่มเติม เช่น สรุป OT การลาหรือประสิทธิภาพแต่ละแผนก',
    href: '/reports',
    tone: 'from-slate-500 to-slate-600',
    disabled: true,
  },
];

export default function HomePage() {
  return (
    <div className="min-h-screen bg-white text-slate-900">
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-500/30 via-purple-500/30 to-transparent blur-3xl" />
        <div className="relative px-6 py-16 sm:px-12">
          <div className="mx-auto max-w-5xl text-center">
            <h1 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-5xl">
              ระบบบริหารเวลาทำงานและสแกนนิ้ว
            </h1>
            <p className="mt-6 text-base leading-7 text-slate-600 sm:text-lg">
              ตั้งค่ากะการทำงาน นำเข้าข้อมูลสแกนนิ้ว และตรวจสอบความถูกต้องของบันทึกเวลาเพื่อเตรียมรายงานในขั้นตอนถัดไป
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <Link
                href="/import"
                className="rounded-full bg-slate-900 px-5 py-2 text-sm font-medium text-white shadow hover:bg-slate-800"
              >
                นำเข้าข้อมูลสแกนนิ้ว
              </Link>
              <Link
                href="/work-calculation"
                className="rounded-full border border-slate-300 px-5 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
              >
                คำนวณเวลาทำงาน
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-slate-50 px-6 pb-20 sm:px-12">
        <div className="mx-auto max-w-6xl">
          <div className="mb-12">
            <h2 className="text-2xl font-semibold text-slate-900">เมนูหลัก</h2>
            <p className="mt-2 text-sm text-slate-600">
              เลือกฟังก์ชันที่ต้องการจัดการเพื่อทำงานกับข้อมูลพนักงาน กะการทำงาน และการบันทึกเวลา
            </p>
          </div>
          <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
            {actions.map((action) => (
              <div
                key={action.title}
                className={`group relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-6 shadow-lg transition hover:border-blue-300 ${
                  action.disabled ? 'opacity-60' : ''
                }`}
              >
                <div className={`absolute inset-0 bg-gradient-to-br ${action.tone} opacity-0 transition group-hover:opacity-10`} />
                <div className="relative space-y-3">
                  <h3 className="text-lg font-semibold text-slate-900">{action.title}</h3>
                  <p className="text-sm leading-6 text-slate-600">{action.description}</p>
                  <div>
                    {action.disabled ? (
                      <span className="inline-flex items-center text-xs font-medium text-slate-400">
                        อยู่ระหว่างการพัฒนา
                      </span>
                    ) : (
                      <Link
                        href={action.href}
                        className="inline-flex items-center text-sm font-medium text-blue-600 hover:text-blue-800"
                      >
                        ไปยังหน้าจัดการ
                        <span className="ml-1 text-base">→</span>
                      </Link>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-white px-6 pb-20 sm:px-12">
        <div className="mx-auto max-w-6xl">
          <div className="mb-8">
            <h2 className="text-2xl font-semibold text-slate-900">Workflow การอนุมัติ</h2>
            <p className="mt-2 text-sm text-slate-600">
              ใช้โครงสร้างการอนุมัติ 3 ระดับจาก{' '}
              <Link href="/employees#approvals" className="text-blue-600 hover:text-blue-800">
                ขั้นที่ 4: ตั้งค่าผู้อนุมัติ
              </Link>{' '}
              เพื่อควบคุมการลางาน การขอทำ OT และการสลับวันหยุดให้เป็นไปตามสายบังคับบัญชา
            </p>
          </div>
          <div className="grid gap-6">
            <div className="group relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-6 shadow-lg transition hover:border-emerald-300">
              <div className="absolute inset-0 bg-gradient-to-br from-emerald-500 to-blue-500 opacity-0 transition group-hover:opacity-10" />
              <div className="relative space-y-4">
                <div>
                  <h3 className="text-lg font-semibold text-slate-900">การอนุมัติคำขอ</h3>
                  <p className="mt-2 text-sm leading-6 text-slate-600">
                    รวมคำขอจากพนักงานทุกประเภทไว้ในศูนย์เดียว เพื่อให้หัวหน้าแผนก ผู้จัดการ และผู้บริหารทำงานร่วมกันได้ตามสายบังคับบัญชา
                  </p>
                </div>
                <ul className="space-y-2 text-sm leading-6 text-slate-600">
                  <li>
                    <span className="font-medium text-slate-900">• การอนุมัติคำขอลา:</span> ตรวจสอบสิทธิและส่งต่อผู้จัดการสาขา
                  </li>
                  <li>
                    <span className="font-medium text-slate-900">• การอนุมัติขอทำ OT:</span> ยืนยันชั่วโมงทำงานพิเศษก่อนคำนวณใหม่
                  </li>
                  <li>
                    <span className="font-medium text-slate-900">• การอนุมัติสลับวันหยุด:</span> ประเมินผลกระทบต่อกะทำงานก่อนอนุมัติ
                  </li>
                </ul>
                <Link
                  href="/approvals"
                  className="inline-flex items-center text-sm font-medium text-blue-600 hover:text-blue-800"
                >
                  เปิดศูนย์การอนุมัติ
                  <span className="ml-1 text-base">→</span>
                </Link>
              </div>
            </div>
          </div>
          <div className="mt-8 rounded-2xl border border-slate-200 bg-slate-50 p-6 text-sm leading-6 text-slate-600">
            <p className="font-medium text-slate-900">ลำดับการอนุมัติตามสายบังคับบัญชา</p>
            <ol className="mt-3 list-decimal space-y-2 pl-5">
              <li>หัวหน้าแผนก อนุมัติคำขอของพนักงานทั่วไปในแผนก และส่งต่อให้ผู้จัดการสาขา</li>
              <li>ผู้จัดการสาขา ตรวจสอบคำขอจากหัวหน้าแผนกและพนักงานในสาขาของตน ก่อนส่งต่อให้ผู้บริหาร</li>
              <li>ผู้บริหาร ปิดการอนุมัติสำหรับคำขอของผู้จัดการและยืนยันคำขอที่ส่งต่อขึ้นมา</li>
            </ol>
          </div>
        </div>
      </div>
    </div>
  );
}
