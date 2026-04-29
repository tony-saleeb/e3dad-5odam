'use client';

import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useBookings } from '@/hooks/useBookings';
import { Booking } from '@/types';

interface EventModalProps {
  booking: Booking | null;
  isOpen: boolean;
  onClose: () => void;
}

export default function EventModal({ booking, isOpen, onClose }: EventModalProps) {
  const { user, isAdmin } = useAuth();
  const { updateBookingStatus, deleteBooking } = useBookings();
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  if (!isOpen || !booking) return null;

  const isOwner = user?.displayName === booking.requesterName || user?.email === booking.requesterEmail;
  const canModify = isOwner || isAdmin;

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

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4" dir="rtl">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      <div className="relative w-full sm:max-w-md animate-slide-up transition-all duration-300">
        <div className="bg-white rounded-t-[1.5rem] sm:rounded-[2rem] shadow-[0_25px_50px_-12px_rgba(0,0,0,0.25)] overflow-hidden border border-slate-100 max-h-[85vh] overflow-y-auto">
          <div className="px-5 sm:px-8 py-5 sm:py-6 bg-gradient-to-r from-emerald-600 to-teal-700 text-white shadow-md shadow-emerald-900/10">
            <div className="flex items-start justify-between">
              <div className="flex-1 min-w-0">
                <h2 className="text-xl sm:text-2xl font-black tracking-tight truncate">{booking.title}</h2>
                <p className="text-emerald-100 font-bold text-sm mt-0.5 truncate">{booking.churchName || 'بدون اسم كنيسة'}</p>
              </div>
              <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 text-white hover:scale-105 transition-all font-medium text-lg shrink-0 mr-2">&times;</button>
            </div>
            
          </div>

          <div className="px-5 sm:px-8 py-5 sm:py-6 space-y-3 sm:space-y-4">
            {booking.requesterName && (
              <div className="flex items-center gap-3 bg-slate-50 border border-slate-100 p-4 rounded-2xl shadow-inner">
                <div className="flex-1">
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">قائد المجموعة</p>
                  <p className="text-base font-black text-slate-800 mt-1">{booking.requesterName}</p>
                </div>
              </div>
            )}

            {booking.teamName && (
              <div className="flex items-center gap-3 bg-slate-50 border border-slate-100 p-4 rounded-2xl shadow-inner">
                <div className="flex-1">
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">اسم الفريق</p>
                  <p className="text-base font-black text-slate-800 mt-1">{booking.teamName}</p>
                </div>
              </div>
            )}

            {booking.ageGroup && (
              <div className="flex items-center gap-3 bg-slate-50 border border-slate-100 p-4 rounded-2xl shadow-inner">
                <div className="flex-1">
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">المرحلة العمرية</p>
                  <p className="text-base font-black text-slate-800 mt-1">{booking.ageGroup}</p>
                </div>
              </div>
            )}

            <div className="flex items-center gap-3 bg-slate-50 border border-slate-100 p-4 rounded-2xl shadow-inner">
              <div className="flex-1">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">التاريخ والوقت</p>
                <div className="flex flex-wrap items-center gap-2 mt-2">
                  <span className="text-sm font-bold text-emerald-700 bg-emerald-50 border border-emerald-200/50 px-3 py-1 rounded-xl">{booking.date}</span>
                  <span className="text-sm font-bold text-teal-700 bg-teal-50 border border-teal-200/50 px-3 py-1 rounded-xl">{booking.startTime} - {booking.endTime}</span>
                </div>
              </div>
            </div>

            {/* Teammates section */}
            {booking.teammates && booking.teammates.length > 0 && (
              <div className="bg-slate-50 border border-slate-100 p-4 rounded-2xl shadow-inner">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">فريق العمل ({booking.teammates.length})</p>
                <div className="flex flex-wrap gap-2">
                  {booking.teammates.map((member, i) => (
                    <span key={i} className="bg-white border border-slate-200 px-3 py-1.5 rounded-xl text-xs font-bold text-slate-700 shadow-sm">
                      {member}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Actions */}
          {canModify && (
            <div className="px-5 sm:px-8 pb-5 sm:pb-6 space-y-3">
              {isAdmin && booking.status === 'pending' && (
                <button
                  onClick={handleApprove}
                  className="w-full py-3.5 px-6 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-bold rounded-2xl shadow-lg shadow-emerald-600/20 hover:shadow-xl hover:shadow-emerald-600/30 hover:-translate-y-0.5 transition-all flex items-center justify-center gap-2"
                >
                  الموافقة على الطلب
                </button>
              )}

              <div className="flex gap-3">
                {showDeleteConfirm ? (
                  <>
                    <button onClick={() => setShowDeleteConfirm(false)} className="flex-1 py-3 px-6 border border-slate-200 hover:bg-slate-100 rounded-2xl text-slate-700 font-bold transition-all">إلغاء</button>
                    <button onClick={handleDelete} disabled={isDeleting} className="flex-1 py-3 px-6 bg-red-600 hover:bg-red-700 text-white font-bold rounded-2xl shadow-lg shadow-red-600/20 disabled:opacity-50 transition-all">
                      {isDeleting ? 'جاري...' : 'تأكيد الحذف'}
                    </button>
                  </>
                ) : (
                  <button onClick={handleDelete} className="w-full py-3 px-6 border border-red-200 text-red-600 font-bold rounded-2xl hover:bg-red-50/50 hover:border-red-300 transition-all text-sm">حذف الحدث</button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
