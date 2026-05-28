'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useBookings } from '@/hooks/useBookings';
import { useSettings } from '@/hooks/useSettings';
import { useSchedulerStore } from '@/store/useSchedulerStore';
import { Booking } from '@/types';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { getChurchColor } from '@/data/initialData';

interface EventModalProps {
  booking: Booking | null;
  isOpen: boolean;
  onClose: () => void;
}

export default function EventModal({ booking, isOpen, onClose }: EventModalProps) {
  const { user, isAdmin, isServant } = useAuth();
  const { updateBookingStatus, deleteBooking } = useBookings();
  const { settings } = useSettings();
  const { openServantPortal, setGradingBooking } = useSchedulerStore();
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [realtimeAllowCancellation, setRealtimeAllowCancellation] = useState<boolean | null>(null);

  // Directly observe the allow_user_cancellation document from Firestore in real-time
  useEffect(() => {
    if (!isOpen || !booking) return;
    const ref = doc(db, 'settings', 'allow_user_cancellation');
    const unsub = onSnapshot(
      ref,
      (snap) => {
        if (snap.exists()) {
          const val = snap.data().value;
          setRealtimeAllowCancellation(val !== false);
        } else {
          setRealtimeAllowCancellation(true);
        }
      },
      (err) => {
        console.error('[EventModal] Real-time settings fetch failed:', err);
        setRealtimeAllowCancellation(true);
      }
    );
    return () => unsub();
  }, [isOpen, booking]);

  if (!isOpen || !booking) return null;

  const isOwner = !!user?.email && !!booking.requesterEmail && user.email.toLowerCase() === booking.requesterEmail.toLowerCase();
  
  // Use the realtime direct subscription value with a safe fallback to context/defaults
  const isCancellationAllowedForUser = realtimeAllowCancellation !== null 
    ? realtimeAllowCancellation 
    : (settings.allowUserCancellation !== false);

  const canModify = isAdmin || (isOwner && isCancellationAllowedForUser);


  const handleDelete = async () => {
    if (!showDeleteConfirm) {
      setShowDeleteConfirm(true);
      return;
    }
    setIsDeleting(true);
    try {
      await deleteBooking(booking.id);
      onClose();
    } catch (error) {
      console.error('Error deleting booking:', error);
    } finally {
      setIsDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  const handleApprove = async () => {
    try {
      await updateBookingStatus(booking.id, 'approved');
      onClose();
    } catch (error) {
      console.error('Error approving:', error);
    }
  };

  // Resolve team members: prefer new teamMembers array, fall back to teammates
  const members = booking.teamMembers || (booking.teammates || []).map(name => ({ name, id: '—' }));
  const churchColor = getChurchColor(booking.churchName);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" dir="rtl">
      {/* Backdrop with elegant blur */}
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-md transition-opacity duration-300" onClick={onClose} />

      {/* Main card modal with premium scale-in animation */}
      <div 
        className="relative w-full max-w-md sm:max-w-2xl animate-scale-in transition-all duration-300 z-10"
        style={{
          boxShadow: `0 25px 50px -12px rgba(0,0,0,0.15), 0 0 40px -5px ${churchColor.hex}15`
        }}
      >
        <div className="bg-white rounded-[28px] overflow-hidden border border-slate-100/80 max-h-[88vh] overflow-y-auto flex flex-col scrollbar-hide">

          {/* Header styled dynamically with Church Brand Gradient */}
          <div className={`relative px-6 py-6 ${churchColor.gradient || 'bg-linear-to-r from-emerald-500 to-teal-600'} text-white shadow-lg overflow-hidden shrink-0`}>
            {/* Soft grid background overlay for header */}
            <div className="absolute inset-0 opacity-10 bg-[linear-gradient(to_right,#808080_1px,transparent_1px),linear-gradient(to_bottom,#808080_1px,transparent_1px)] bg-size-[14px_24px]" />
            <div className="relative flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <h2 className="text-xl sm:text-2xl font-black tracking-tight leading-normal pb-1 truncate drop-shadow-xs">{booking.title}</h2>
                <div className="flex items-center gap-1.5 mt-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                  <p className="text-white/90 font-bold text-xs leading-normal pb-1 truncate">{booking.churchName || 'بدون اسم كنيسة'}</p>
                </div>
              </div>
              <button 
                onClick={onClose} 
                className="w-8 h-8 flex items-center justify-center rounded-full bg-white/15 hover:bg-white/30 text-white font-medium text-lg shrink-0 transition-all duration-200 active:scale-90"
                aria-label="close"
              >
                &times;
              </button>
            </div>
          </div>

          {/* Body */}
          <div className="px-6 py-5 space-y-4">

            {/* Dynamic details dashboard grid */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              {booking.requesterName && (
                <DetailCard 
                  icon={
                    <svg className="w-4 h-4 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  }
                  label="قائد المجموعة"
                  value={booking.requesterName}
                />
              )}
              {booking.teamName && (
                <DetailCard 
                  icon={
                    <svg className="w-4 h-4 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                  }
                  label="اسم الفريق"
                  value={booking.teamName}
                />
              )}
              {booking.ageGroup && (
                <DetailCard 
                  icon={
                    <svg className="w-4 h-4 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                    </svg>
                  }
                  label="المرحلة العمرية"
                  value={booking.ageGroup}
                />
              )}
            </div>

            {/* Date and Time premium dual-dashboard widget */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-50/40 border border-slate-100 p-4 rounded-2xl shadow-xs">
              
              {/* Right Column: Date Info */}
              <div className="flex items-center gap-3">
                {/* Calendar Tear-Off Icon */}
                <div className="flex flex-col items-center justify-center w-11 h-11 rounded-xl bg-white border border-slate-150 shrink-0 shadow-2xs overflow-hidden">
                  <div className="w-full bg-red-500 py-0.5 text-[8px] text-white font-black text-center uppercase tracking-widest leading-none">
                    حجز
                  </div>
                  <div className="flex-1 flex items-center justify-center">
                    <svg className="w-4 h-4 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">تاريخ الحجز</p>
                  <p className="text-xs sm:text-sm font-black text-slate-800 leading-normal mt-0.5">{booking.date}</p>
                </div>
              </div>

              {/* Left Column: Time Info (with vertical divider on sm screens) */}
              <div className="flex items-center gap-3 sm:border-r sm:border-slate-100 sm:pr-4">
                {/* Clock Icon */}
                <div className="flex items-center justify-center w-11 h-11 rounded-xl bg-white border border-slate-150 shrink-0 shadow-2xs text-slate-500">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">توقيت الحجز</p>
                  <div className="mt-1">
                    <span 
                      dir="ltr" 
                      className={`inline-block text-[11px] font-bold px-2.5 py-0.5 rounded-full ${churchColor.badge} border border-current/10 leading-normal`}
                    >
                      {booking.startTime} - {booking.endTime}
                    </span>
                  </div>
                </div>
              </div>

            </div>

            {/* Team Members with IDs */}
            {members.length > 0 && (
              <div className="bg-white border border-slate-100 p-4 rounded-2xl shadow-xs">
                <div className="flex items-center justify-between mb-3 border-b border-slate-50 pb-2">
                  <div className="flex items-center gap-2">
                    <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                    <p className="text-xs font-black text-slate-700 tracking-wider">أعضاء الفريق ({members.length})</p>
                  </div>
                </div>
                <div className="flex flex-col gap-2 max-h-40 overflow-y-auto overflow-x-hidden pr-1 scrollbar-hide">
                  {members.map((member, i) => (
                    <div key={i} className="flex items-center justify-between bg-slate-50/50 hover:bg-slate-50 border border-slate-100 px-3 py-2.5 rounded-xl transition-all duration-200 hover:border-slate-200/80 hover:shadow-2xs">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className={`w-5 h-5 rounded-full ${churchColor.gradient || 'bg-linear-to-r from-emerald-500 to-teal-500'} text-white flex items-center justify-center text-[10px] font-black shrink-0 shadow-sm shadow-emerald-500/10`}>
                          {i + 1}
                        </span>
                        <span className="text-xs font-bold text-slate-700 pb-0.5 truncate">{member.name}</span>
                      </div>
                      {member.id && member.id !== '—' && (
                        <span className="text-[10px] text-slate-400 font-bold shrink-0 bg-white border border-slate-150 px-1.5 py-1 rounded-md">
                          #{member.id}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Servant Evaluation Shortcut Button */}
          {isServant && booking.status === 'approved' && (
            <div className="px-6 pb-6 pt-3 bg-indigo-50/20 border-t border-indigo-100 shrink-0">
              <button
                onClick={() => {
                  setGradingBooking(booking);
                  onClose();
                  openServantPortal();
                }}
                className="w-full py-3.5 px-6 bg-indigo-600 hover:bg-indigo-700 text-white font-black rounded-xl shadow-lg shadow-indigo-600/10 hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200 flex items-center justify-center gap-2 text-sm cursor-pointer"
              >
                <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                </svg>
                رصد وتقييم درجات هذا الفريق
              </button>
            </div>
          )}

          {/* Actions — only for owner or admin */}
          {canModify && (
            <div className="px-6 pb-6 pt-3 bg-slate-50/40 border-t border-slate-100 shrink-0 space-y-3">
              {isAdmin && booking.status === 'pending' && (
                <button
                  onClick={handleApprove}
                  className="w-full py-3 px-6 bg-linear-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-black rounded-xl shadow-lg shadow-emerald-600/10 hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200 flex items-center justify-center gap-2 text-sm cursor-pointer"
                >
                  <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                  الموافقة على الطلب
                </button>
              )}

              {isAdmin && !isCancellationAllowedForUser && (
                <div className="text-[11px] text-purple-600 font-bold text-center bg-purple-50 border border-purple-100 py-2.5 px-3 rounded-xl mb-1.5 leading-relaxed flex items-center gap-1.5 justify-center">
                  <span>💡</span>
                  <span>تم إيقاف الإلغاء للمستخدمين. تظهر لك هذه الأزرار لأنك مسؤول النظام فقط.</span>
                </div>
              )}

              <div className="flex gap-3">
                {showDeleteConfirm ? (
                  <>
                    <button 
                      onClick={() => setShowDeleteConfirm(false)} 
                      className="flex-1 py-3 px-6 border border-slate-200 hover:bg-slate-50 rounded-xl text-slate-600 font-bold transition-all text-xs cursor-pointer active:scale-95 text-center"
                    >
                      تراجع
                    </button>
                    <button 
                      onClick={handleDelete} 
                      disabled={isDeleting} 
                      className="flex-1 py-3 px-6 bg-linear-to-r from-rose-500 to-red-600 hover:from-rose-600 hover:to-red-700 text-white font-black rounded-xl shadow-md shadow-red-500/10 disabled:opacity-50 transition-all text-xs cursor-pointer active:scale-95 text-center"
                    >
                      {isDeleting ? 'جاري...' : 'تأكيد الحذف'}
                    </button>
                  </>
                ) : (
                  <button 
                    onClick={handleDelete} 
                    className="w-full py-3 px-6 border border-rose-200 text-rose-600 font-bold rounded-xl hover:bg-rose-50/50 hover:border-rose-300 transition-all text-xs cursor-pointer hover:-translate-y-0.5 active:translate-y-0 flex items-center justify-center gap-1.5"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                    حذف الحجز
                  </button>
                )}
              </div>
            </div>
          )}

          {/* View-only notice for non-owners or disabled cancellation */}
          {!canModify && (
            <div className="px-6 py-4 bg-slate-50/40 border-t border-slate-100 shrink-0">
              <p className="text-center text-xs text-slate-500 bg-slate-50/80 border border-slate-100 rounded-xl py-3 px-4 font-medium leading-relaxed flex items-center justify-center gap-1.5">
                <svg className="w-3.5 h-3.5 text-slate-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
                <span>
                  {isOwner && !isCancellationAllowedForUser
                    ? 'تم إيقاف إلغاء الحجز من قبل المسؤول. يرجى التواصل معه لإجراء أي تعديل.'
                    : 'عرض فقط — لا يمكنك تعديل هذا الحجز'}
                </span>
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function DetailCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center gap-3 bg-white border border-slate-100 p-3 rounded-2xl shadow-xs transition-all hover:border-slate-200/80 hover:scale-[1.01] hover:shadow-sm">
      <div className="w-8 h-8 rounded-xl bg-slate-50 flex items-center justify-center text-slate-500 shrink-0 border border-slate-100">
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider leading-normal">{label}</p>
        <p className="text-xs font-black text-slate-800 pb-0.5 truncate mt-0.5 leading-normal">{value}</p>
      </div>
    </div>
  );
}
