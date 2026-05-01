'use client';

import { useState, useRef, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useBookings } from '@/hooks/useBookings';
import { useSchedulerStore } from '@/store/useSchedulerStore';

export default function Header() {
  const { user, isAdmin, canCreateBooking, signOut } = useAuth();
  const { bookings, hasUserAlreadyBooked } = useBookings();
  const { openAdminDashboard, openBookingModal } = useSchedulerStore();
  
  const userAlreadyBooked = !isAdmin && user?.email && hasUserAlreadyBooked(user.email);
  
  const [profileOpen, setProfileOpen] = useState(false);
  const desktopRef = useRef<HTMLDivElement>(null);
  const mobileRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      const isInsideDesktop = desktopRef.current?.contains(target);
      const isInsideMobile = mobileRef.current?.contains(target);
      if (!isInsideDesktop && !isInsideMobile) {
        setProfileOpen(false);
      }
    };
    if (profileOpen) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [profileOpen]);

  const initials = user?.displayName
    ? user.displayName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
    : user?.email?.[0]?.toUpperCase() || '?';

  const handleSignOut = async () => {
    setProfileOpen(false);
    await signOut();
  };

  const handleOpenAdmin = () => {
    setProfileOpen(false);
    openAdminDashboard();
  };

  return (
    <header className="bg-white border-b border-gray-100" dir="rtl">
      {/* ===== DESKTOP HEADER ===== */}
      <div className="hidden lg:block max-w-400 mx-auto px-6 py-4">
        <div className="flex gap-6">
          <div className="flex-1 min-w-0 flex items-center justify-between relative">
            {/* Right: Brand Group */}
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl overflow-hidden shadow-lg shrink-0">
                <img src="/church-logo.png" alt="Logo" className="w-full h-full object-cover" />
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

            {/* Left: Profile */}
            <div className="flex items-center gap-3" ref={desktopRef}>
              <div className="relative">
                <button
                  onClick={() => setProfileOpen(!profileOpen)}
                  className="flex items-center gap-2.5 pl-3 pr-1 py-1 rounded-2xl border border-slate-200 hover:border-slate-300 bg-slate-50 hover:bg-white transition-all shadow-sm"
                >
                  {user?.photoURL ? (
                    <img src={user.photoURL} alt="" className="w-8 h-8 rounded-full object-cover" />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center text-white text-xs font-black">
                      {initials}
                    </div>
                  )}
                  <span className="text-sm font-bold text-slate-700 max-w-[120px] truncate">
                    {user?.displayName || user?.email?.split('@')[0] || 'المستخدم'}
                  </span>
                  <svg className={`w-3.5 h-3.5 text-slate-400 transition-transform ${profileOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {/* Desktop Dropdown */}
                {profileOpen && (
                  <div className="absolute left-0 top-full mt-2 w-72 bg-white border border-slate-200 rounded-2xl shadow-2xl shadow-slate-200/60 overflow-hidden animate-fade-in z-50">
                    {/* User info */}
                    <div className="px-5 py-4 border-b border-slate-100 bg-gradient-to-r from-emerald-50 to-teal-50">
                      <div className="flex items-center gap-3">
                        {user?.photoURL ? (
                          <img src={user.photoURL} alt="" className="w-11 h-11 rounded-full object-cover border-2 border-white shadow" />
                        ) : (
                          <div className="w-11 h-11 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center text-white text-sm font-black border-2 border-white shadow">
                            {initials}
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-black text-slate-800 truncate">{user?.displayName || 'المستخدم'}</p>
                          <p className="text-xs text-slate-500 truncate">{user?.email}</p>
                          <span className={`inline-flex items-center gap-1 mt-1 px-2 py-0.5 rounded-md text-[10px] font-bold ${isAdmin ? 'bg-purple-100 text-purple-700' : 'bg-emerald-100 text-emerald-700'}`}>
                            <span className={`w-1 h-1 rounded-full ${isAdmin ? 'bg-purple-500' : 'bg-emerald-500'}`} />
                            {isAdmin ? 'مسؤول' : 'قائد فريق'}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Menu items */}
                    <div className="p-2">
                      {isAdmin && (
                        <button
                          onClick={handleOpenAdmin}
                          className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-slate-700 hover:bg-slate-50 transition-all text-right"
                        >
                          <span className="w-8 h-8 rounded-lg bg-purple-50 flex items-center justify-center shrink-0">
                            <svg className="w-4 h-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                            </svg>
                          </span>
                          <div>
                            <p className="text-sm font-bold">إدارة المستخدمين والحجوزات</p>
                            <p className="text-xs text-slate-400">إضافة مسؤولين وقادة فرق</p>
                          </div>
                        </button>
                      )}

                      <div className="border-t border-slate-100 my-1" />

                      <button
                        onClick={handleSignOut}
                        className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-red-600 hover:bg-red-50 transition-all text-right"
                      >
                        <span className="w-8 h-8 rounded-lg bg-red-50 flex items-center justify-center shrink-0">
                          <svg className="w-4 h-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                          </svg>
                        </span>
                        <div>
                          <p className="text-sm font-bold">تسجيل الخروج</p>
                        </div>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ===== MOBILE HEADER ===== */}
      <div className="lg:hidden">
        <div className="px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl overflow-hidden shadow-sm">
              <img src="/church-logo.png" alt="Logo" className="w-full h-full object-cover" />
            </div>
            <div>
              <h1 className="text-base font-bold text-gray-800">جدول الحجوزات</h1>
            </div>
          </div>

          {/* Mobile profile button */}
          <div className="relative" ref={mobileRef}>
            <button
              onClick={() => setProfileOpen(!profileOpen)}
              className="flex items-center gap-2 p-1 rounded-full"
            >
              {user?.photoURL ? (
                <img src={user.photoURL} alt="" className="w-8 h-8 rounded-full object-cover border-2 border-emerald-200" />
              ) : (
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center text-white text-xs font-black border-2 border-emerald-200">
                  {initials}
                </div>
              )}
            </button>

            {/* Mobile dropdown */}
            {profileOpen && (
              <div className="absolute left-0 top-full mt-2 w-64 bg-white border border-slate-200 rounded-2xl shadow-2xl overflow-hidden animate-fade-in z-50">
                <div className="px-4 py-3 border-b border-slate-100 bg-gradient-to-r from-emerald-50 to-teal-50">
                  <p className="text-sm font-bold text-slate-800 truncate">{user?.displayName || 'المستخدم'}</p>
                  <p className="text-xs text-slate-500 truncate">{user?.email}</p>
                  <span className={`inline-flex items-center gap-1 mt-1 px-2 py-0.5 rounded-md text-[10px] font-bold ${isAdmin ? 'bg-purple-100 text-purple-700' : 'bg-emerald-100 text-emerald-700'}`}>
                    {isAdmin ? 'مسؤول' : 'قائد فريق'}
                  </span>
                </div>
                <div className="p-1.5">
                  {isAdmin && (
                    <button
                      onClick={handleOpenAdmin}
                      className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-slate-700 hover:bg-slate-50 transition-all text-right text-sm font-bold"
                    >
                      <span className="w-7 h-7 rounded-lg bg-purple-50 flex items-center justify-center shrink-0">
                        <svg className="w-3.5 h-3.5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                        </svg>
                      </span>
                      إدارة المستخدمين والحجوزات
                    </button>
                  )}
                  <button
                    onClick={handleSignOut}
                    className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-red-600 hover:bg-red-50 transition-all text-right text-sm font-bold"
                  >
                    <span className="w-7 h-7 rounded-lg bg-red-50 flex items-center justify-center shrink-0">
                      <svg className="w-3.5 h-3.5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                      </svg>
                    </span>
                    تسجيل الخروج
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="px-4 pb-3 flex items-center gap-2">
          {canCreateBooking && !userAlreadyBooked && (
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
