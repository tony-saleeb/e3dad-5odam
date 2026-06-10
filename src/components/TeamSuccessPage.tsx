'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useSchedulerStore } from '@/store/useSchedulerStore';
import { getChurchColor } from '@/data/initialData';

export default function TeamSuccessPage() {
  const { user, signOut } = useAuth();
  const { setIsEditingTeamDetails } = useSchedulerStore();
  const teamDetails = user?.teamDetails;

  if (!teamDetails) return null;

  const churchColor = getChurchColor(teamDetails.churchName);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col" dir="rtl">
      {/* Header */}
      <header className="bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl overflow-hidden shadow-lg shrink-0">
            <img src="/logo.png" alt="Logo" className="w-full h-full object-cover" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-gray-800">إعداد خدام كنائس وسط القاهرة</h1>
            <p className="text-xs text-gray-400">نظام تسجيل بيانات الفرق</p>
          </div>
        </div>
        <button 
          onClick={signOut}
          className="px-4 py-2 text-xs font-bold text-red-600 bg-red-50 hover:bg-red-100 rounded-xl transition-all cursor-pointer"
        >
          تسجيل الخروج
        </button>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex items-center justify-center p-4 sm:p-6">
        <div className="w-full max-w-lg">
          {/* Success Card */}
          <div className="bg-white border border-slate-100 rounded-3xl shadow-xl overflow-hidden">
            {/* Success Header */}
            <div className="bg-linear-to-r from-emerald-500 to-teal-500 px-6 py-8 text-center">
              <div className="w-16 h-16 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h2 className="text-xl font-black text-white mb-1">تم تسجيل بيانات فريقك بنجاح ✓</h2>
              <p className="text-sm text-white/70 font-medium">سيقوم مسؤول كنيستك بحجز ميعاد المناقشة نيابة عنك</p>
            </div>

            {/* Team Details Summary */}
            <div className="p-6 space-y-4">
              {/* Church Name */}
              <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-100">
                <span className={`w-3.5 h-3.5 rounded-full shrink-0`} style={{ backgroundColor: churchColor.hex }} />
                <div>
                  <p className="text-xs text-slate-400 font-bold">الكنيسة</p>
                  <p className="text-sm font-bold text-slate-800">{teamDetails.churchName}</p>
                </div>
              </div>

              {/* Project Title */}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                <p className="text-xs text-slate-400 font-bold mb-0.5">عنوان المشروع</p>
                <p className="text-sm font-bold text-slate-800">{teamDetails.title}</p>
              </div>

              {/* Team Name & Age Group */}
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <p className="text-xs text-slate-400 font-bold mb-0.5">اسم الفريق</p>
                  <p className="text-sm font-bold text-slate-800">{teamDetails.teamName}</p>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <p className="text-xs text-slate-400 font-bold mb-0.5">المرحلة العمرية</p>
                  <p className="text-sm font-bold text-slate-800">{teamDetails.ageGroup}</p>
                </div>
              </div>

              {/* Team Members */}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                <p className="text-xs text-slate-400 font-bold mb-2">أعضاء الفريق ({teamDetails.teamMembers?.length || 0})</p>
                <div className="space-y-1.5">
                  {teamDetails.teamMembers?.map((member, idx) => (
                    <div key={idx} className="flex items-center gap-2 text-sm">
                      <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-[10px] font-black shrink-0">
                        {idx + 1}
                      </span>
                      <span className="font-bold text-slate-700">{member.name}</span>
                      <span className="text-slate-400 text-xs">— {member.id}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Edit Button */}
              <button
                onClick={() => setIsEditingTeamDetails(true)}
                className="w-full py-3 px-6 border border-slate-200 hover:bg-slate-50 rounded-2xl text-slate-700 font-bold transition-all cursor-pointer flex items-center justify-center gap-2 text-sm"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                تعديل بيانات الفريق
              </button>
            </div>
          </div>

          {/* Info Banner */}
          <div className="mt-4 bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-start gap-3">
            <svg className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>
              <p className="text-sm font-bold text-amber-800">ملاحظة مهمة</p>
              <p className="text-xs text-amber-700 mt-1 leading-relaxed">
                مسؤول كنيستك هو المسؤول عن حجز ميعاد المناقشة. بعد الحجز، سيتم إبلاغكم بالميعاد المحدد.
              </p>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="text-center py-4 text-xs text-slate-400 shrink-0">
        اعداد خدام كنائس وسط القاهرة &copy; {new Date().getFullYear()}
      </footer>
    </div>
  );
}
