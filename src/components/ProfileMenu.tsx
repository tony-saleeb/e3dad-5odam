'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useSchedulerStore } from '@/store/useSchedulerStore';

interface ProfileMenuProps {
  onClose: () => void;
  variant: 'desktop' | 'mobile';
}

export default function ProfileMenu({ onClose, variant }: ProfileMenuProps) {
  const { user, isAdmin, isServant, signOut } = useAuth();
  const { openAdminDashboard, setIsEditingTeamDetails, openServantPortal } = useSchedulerStore();

  const isMobile = variant === 'mobile';

  const initials = user?.displayName
    ? user.displayName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
    : user?.email?.[0]?.toUpperCase() || '?';

  const handleSignOut = async () => {
    onClose();
    await signOut();
  };

  const handleOpenAdmin = () => {
    onClose();
    openAdminDashboard();
  };

  const handleOpenServant = () => {
    onClose();
    openServantPortal();
  };

  const handleOpenTeamEdit = () => {
    onClose();
    setIsEditingTeamDetails(true);
  };

  // Shared sizes/styles based on variant
  const containerClass = isMobile
    ? "absolute left-0 top-full mt-2 w-64 bg-white border border-slate-200 rounded-2xl shadow-[0_8px_40px_-4px_rgba(0,0,0,0.16),0_4px_16px_-2px_rgba(0,0,0,0.08)] overflow-hidden animate-fade-in z-50"
    : "absolute left-0 top-full mt-2 w-72 bg-white border border-slate-200 rounded-2xl shadow-[0_8px_40px_-4px_rgba(0,0,0,0.16),0_4px_16px_-2px_rgba(0,0,0,0.08)] overflow-hidden animate-fade-in z-50";

  const paddingClass = isMobile ? "px-4 py-3" : "px-5 py-4";
  const avatarClass = isMobile ? "w-9 h-9" : "w-11 h-11";
  const itemPaddingClass = isMobile ? "px-3 py-2.5" : "px-4 py-3";
  const iconBoxClass = isMobile ? "w-7 h-7" : "w-8 h-8";
  const svgClass = isMobile ? "w-3.5 h-3.5" : "w-4 h-4";

  return (
    <div className={containerClass}>
      {/* User Info Header */}
      <div className={`${paddingClass} border-b border-slate-100 bg-slate-50/60`}>
        <div className="flex items-center gap-3">
          {user?.photoURL ? (
            <img src={user.photoURL} alt="" className={`${avatarClass} rounded-full object-cover ring-2 ring-slate-200 shadow-sm`} />
          ) : (
            <div className={`${avatarClass} rounded-full bg-slate-700 flex items-center justify-center text-white text-sm font-black ring-2 ring-slate-200 shadow-sm`}>
              {initials}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-black text-slate-800 truncate">{user?.displayName || 'المستخدم'}</p>
            <p className="text-xs text-slate-500 truncate">{user?.email}</p>
            <span className="inline-flex items-center gap-1 mt-1.5 px-2 py-0.5 rounded-md text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200/60">
              <span className="w-1 h-1 rounded-full bg-indigo-500" />
              {isAdmin ? 'مسؤول' : isServant ? 'مقيم' : 'قائد فريق'}
            </span>
          </div>
        </div>
      </div>

      {/* Menu items */}
      <div className={isMobile ? "p-1.5" : "p-2"}>
        {isServant && (
          <button
            onClick={handleOpenServant}
            className={`w-full flex items-center gap-3 ${itemPaddingClass} rounded-xl text-slate-700 hover:bg-slate-50 transition-all text-right cursor-pointer`}
          >
            <span className={`${iconBoxClass} rounded-lg bg-indigo-50 border border-indigo-200/60 flex items-center justify-center shrink-0`}>
              <svg className={`${svgClass} text-indigo-600`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
              </svg>
            </span>
            <div>
              <p className="text-sm font-bold text-slate-700">تقييم مشاريع فرق العمل</p>
              {!isMobile && <p className="text-xs text-slate-400">تسجيل وتعديل درجات تقييم اليوم</p>}
            </div>
          </button>
        )}

        {isAdmin && (
          <button
            onClick={handleOpenAdmin}
            className={`w-full flex items-center gap-3 ${itemPaddingClass} rounded-xl text-slate-700 hover:bg-slate-50 transition-all text-right cursor-pointer`}
          >
            <span className={`${iconBoxClass} rounded-lg bg-slate-100 border border-slate-200/60 flex items-center justify-center shrink-0`}>
              <svg className={`${svgClass} text-slate-600`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
              </svg>
            </span>
            <div>
              <p className="text-sm font-bold text-slate-700">إدارة المستخدمين والحجوزات</p>
              {!isMobile && <p className="text-xs text-slate-400">إضافة مسؤولين وقادة فرق</p>}
            </div>
          </button>
        )}

        {!isAdmin && user?.teamDetails && (
          <button
            onClick={handleOpenTeamEdit}
            className={`w-full flex items-center gap-3 ${itemPaddingClass} rounded-xl text-slate-700 hover:bg-slate-50 transition-all text-right cursor-pointer`}
          >
            <span className={`${iconBoxClass} rounded-lg bg-slate-100 border border-slate-200/60 flex items-center justify-center shrink-0`}>
              <svg className={`${svgClass} text-slate-600`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
            </span>
            <div>
              <p className="text-sm font-bold text-slate-700">تعديل بيانات الفريق</p>
              {!isMobile && <p className="text-xs text-slate-400">تعديل أسماء الأعضاء والمشروع</p>}
            </div>
          </button>
        )}

        <div className="border-t border-slate-100 my-1" />

        <button
          onClick={handleSignOut}
          className={`w-full flex items-center gap-3 ${itemPaddingClass} rounded-xl text-slate-500 hover:text-slate-700 hover:bg-slate-50 transition-all text-right cursor-pointer`}
        >
          <span className={`${iconBoxClass} rounded-lg bg-slate-100 border border-slate-200/60 flex items-center justify-center shrink-0`}>
            <svg className={`${svgClass} text-slate-500`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
          </span>
          <div>
            <p className="text-sm font-bold">تسجيل الخروج</p>
          </div>
        </button>
      </div>
    </div>
  );
}
