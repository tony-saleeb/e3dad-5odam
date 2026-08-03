'use client';

import { useState, useRef, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useSchedulerStore } from '@/store/useSchedulerStore';
import ProfileMenu from './ProfileMenu';
import ThemeToggle from './ThemeToggle';

export default function Header() {
  const { user, isServant } = useAuth();
  const { openServantPortal } = useSchedulerStore();
  
  const [profileOpen, setProfileOpen] = useState(false);
  const desktopRef = useRef<HTMLDivElement>(null);
  const mobileRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click or Escape key
  useEffect(() => {
    const handleEvents = (e: Event) => {
      if (e instanceof MouseEvent) {
        const target = e.target as Node;
        const isInsideDesktop = desktopRef.current?.contains(target);
        const isInsideMobile = mobileRef.current?.contains(target);
        if (!isInsideDesktop && !isInsideMobile) {
          setProfileOpen(false);
        }
      } else if (e instanceof KeyboardEvent) {
        if (e.key === 'Escape') {
          setProfileOpen(false);
        }
      }
    };
    if (profileOpen) {
      document.addEventListener('click', handleEvents);
      document.addEventListener('keydown', handleEvents);
      return () => {
        document.removeEventListener('click', handleEvents);
        document.removeEventListener('keydown', handleEvents);
      };
    }
  }, [profileOpen]);

  const initials = user?.displayName
    ? user.displayName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
    : user?.email?.[0]?.toUpperCase() || '?';

  return (
    <header className="bg-white border-b border-gray-100 dark:bg-slate-900 dark:border-slate-800 transition-colors" dir="rtl">
      {/* ===== DESKTOP HEADER ===== */}
      <div className="hidden lg:block max-w-400 mx-auto px-6 py-4">
        <div className="flex gap-6">
          <div className="flex-1 min-w-0 flex items-center justify-between relative">
            {/* Right: Brand Group */}
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl overflow-hidden shadow-lg shrink-0">
                <img src="/logo.png" alt="Logo" className="w-full h-full object-cover" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-800 dark:text-slate-100">جدول الحجوزات</h1>
                <p className="text-xs text-gray-400 dark:text-slate-400">حجز ميعاد مناقشة المشاريع</p>
              </div>
            </div>

            {/* Center */}
            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex items-center gap-4 pointer-events-none">
              <span className="px-4 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-sm font-bold border border-slate-200 dark:border-slate-700 flex items-center gap-2 pointer-events-auto">
                نظام إدارة الحجوزات
              </span>
            </div>

            {/* Left: Actions & Profile */}
            <div className="flex items-center gap-3 relative z-20" ref={desktopRef}>
              <ThemeToggle />

              {isServant && (
                <button
                  onClick={openServantPortal}
                  className="px-4 py-1.5 rounded-xl bg-indigo-50 border border-indigo-200 text-indigo-700 hover:bg-indigo-100 transition-all font-bold text-sm flex items-center gap-2 cursor-pointer shadow-sm"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                  </svg>
                  <span>تقييم الفرق</span>
                </button>
              )}

              <div className="relative">
                <button
                  onClick={() => setProfileOpen(!profileOpen)}
                  className="flex items-center gap-2.5 pl-3 pr-1 py-1 rounded-2xl border border-slate-200 hover:border-slate-300 bg-slate-50 hover:bg-white transition-all shadow-sm cursor-pointer"
                >
                  {user?.photoURL ? (
                    <img src={user.photoURL} alt="" className="w-8 h-8 rounded-full object-cover ring-2 ring-slate-200" />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-white text-xs font-black">
                      {initials}
                    </div>
                  )}
                  <span className="text-sm font-bold text-slate-700 max-w-30 truncate">
                    {user?.displayName || user?.email?.split('@')[0] || 'المستخدم'}
                  </span>
                  <svg className={`w-3.5 h-3.5 text-slate-400 transition-transform ${profileOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {/* Desktop Dropdown */}
                {profileOpen && (
                  <ProfileMenu variant="desktop" onClose={() => setProfileOpen(false)} />
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
              <img src="/logo.png" alt="Logo" className="w-full h-full object-cover" />
            </div>
            <div>
              <h1 className="text-base font-bold text-gray-800">جدول الحجوزات</h1>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <ThemeToggle />

            {/* Mobile profile button */}
            <div className="relative" ref={mobileRef}>
              <button
                onClick={() => setProfileOpen(!profileOpen)}
              className="flex items-center gap-2 p-1 rounded-full"
            >
              {user?.photoURL ? (
                <img src={user.photoURL} alt="" className="w-8 h-8 rounded-full object-cover ring-2 ring-slate-200" />
              ) : (
                <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-white text-xs font-black ring-2 ring-slate-200">
                  {initials}
                </div>
              )}
            </button>

            {/* Mobile dropdown */}
            {profileOpen && (
              <ProfileMenu variant="mobile" onClose={() => setProfileOpen(false)} />
            )}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
