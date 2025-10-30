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
    title: 'รายงานและวิเคราะห์',
    description: 'เตรียมข้อมูลสำหรับสร้างรายงานเพิ่มเติม เช่น สรุป OT การลาหรือประสิทธิภาพแต่ละแผนก',
    href: '/reports',
    tone: 'from-slate-500 to-slate-600',
    disabled: true,
  },
];

export default function HomePage() {
  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-500/30 via-purple-500/30 to-transparent blur-3xl" />
        <div className="relative px-6 py-16 sm:px-12">
          <div className="mx-auto max-w-5xl text-center">
            <h1 className="text-3xl font-bold tracking-tight text-white sm:text-5xl">
              ระบบบริหารเวลาทำงานและสแกนนิ้ว
            </h1>
            <p className="mt-6 text-base leading-7 text-slate-200 sm:text-lg">
              ตั้งค่ากะการทำงาน นำเข้าข้อมูลสแกนนิ้ว และตรวจสอบความถูกต้องของบันทึกเวลาเพื่อเตรียมรายงานในขั้นตอนถัดไป
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <Link
                href="/import"
                className="rounded-full bg-white px-5 py-2 text-sm font-medium text-slate-900 shadow hover:bg-slate-100"
              >
                นำเข้าข้อมูลสแกนนิ้ว
              </Link>
              <Link
                href="/work-calculation"
                className="rounded-full border border-white/40 px-5 py-2 text-sm font-medium text-white hover:bg-white/10"
              >
                คำนวณเวลาทำงาน
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-slate-900/80 px-6 pb-20 sm:px-12">
        <div className="mx-auto max-w-6xl">
          <div className="mb-12">
            <h2 className="text-2xl font-semibold text-white">เมนูหลัก</h2>
            <p className="mt-2 text-sm text-slate-300">
              เลือกฟังก์ชันที่ต้องการจัดการเพื่อทำงานกับข้อมูลพนักงาน กะการทำงาน และการบันทึกเวลา
            </p>
          </div>
          <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
            {actions.map((action) => (
              <div
                key={action.title}
                className={`group relative overflow-hidden rounded-2xl border border-white/10 bg-slate-900/60 p-6 shadow-lg transition hover:border-white/30 ${
                  action.disabled ? 'opacity-60' : ''
                }`}
              >
                <div className={`absolute inset-0 bg-gradient-to-br ${action.tone} opacity-0 transition group-hover:opacity-20`} />
                <div className="relative space-y-3">
                  <h3 className="text-lg font-semibold text-white">{action.title}</h3>
                  <p className="text-sm leading-6 text-slate-300">{action.description}</p>
                  <div>
                    {action.disabled ? (
                      <span className="inline-flex items-center text-xs font-medium text-slate-400">
                        อยู่ระหว่างการพัฒนา
                      </span>
                    ) : (
                      <Link
                        href={action.href}
                        className="inline-flex items-center text-sm font-medium text-blue-200 hover:text-white"
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
    </div>
  );
}
