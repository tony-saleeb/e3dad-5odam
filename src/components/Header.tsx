'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useBookings } from '@/hooks/useBookings';
import { useSchedulerStore } from '@/store/useSchedulerStore';

export default function Header() {
  const { user, isAdmin, canCreateBooking, canSeePending } = useAuth();
  const { bookings } = useBookings();
  const { openAdminPanel, openAdminDashboard, openBookingModal } = useSchedulerStore();

  const pendingCount = bookings.filter((b) => b.status === 'pending').length;

  return (
    <header className="bg-white border-b border-gray-100" dir="rtl">
      {/* ===== DESKTOP HEADER ===== */}
      <div className="hidden lg:block max-w-400 mx-auto px-6 py-4">
        <div className="flex gap-6">
          <div className="flex-1 min-w-0 flex items-center justify-between relative">
            {/* Right: Brand Group */}
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-linear-to-br from-emerald-400 to-teal-500 flex items-center justify-center shadow-lg shrink-0">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-800">جدول الحجوزات</h1>
                <p className="text-xs text-gray-400">حجز مرافق الكنيسة</p>
              </div>
            </div>

            {/* Center */}
            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex items-center gap-4">
              <span className="px-4 py-2 rounded-xl bg-emerald-50 text-emerald-700 text-sm font-bold border flex items-center gap-2">
                نظام إدارة الحجوزات
              </span>
            </div>

            {/* Left Action Buttons */}
            <div className="flex items-center gap-3">

            </div>
          </div>
        </div>
      </div>

      {/* ===== MOBILE HEADER ===== */}
      <div className="lg:hidden">
        <div className="px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-500 flex items-center justify-center">
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <div>
              <h1 className="text-base font-bold text-gray-800">جدول الحجوزات</h1>
            </div>
          </div>
        </div>

        <div className="px-4 pb-3 flex items-center gap-2">
          {canCreateBooking && (
            <button
              onClick={openBookingModal}
              className="flex-1 py-2 rounded-xl bg-emerald-600 text-white font-semibold text-sm hover:bg-emerald-700 flex items-center justify-center gap-2 shadow"
            >
              إضافة حجز
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
