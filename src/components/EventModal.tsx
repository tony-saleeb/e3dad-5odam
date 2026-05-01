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

  // Team leader (creator) can edit/delete their own booking; admin can always
  const isOwner = user?.email === booking.requesterEmail;
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

  // Resolve team members: prefer new teamMembers array, fall back to teammates
  const members = booking.teamMembers
    ? booking.teamMembers
    : (booking.teammates || []).map(name => ({ name, id: '—' }));

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4" dir="rtl">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      <div className="relative w-full sm:max-w-md animate-slide-up transition-all duration-300">
        <div className="bg-white rounded-t-[1.5rem] sm:rounded-[2rem] shadow-[0_25px_50px_-12px_rgba(0,0,0,0.25)] overflow-hidden border border-slate-100 max-h-[85vh] overflow-y-auto">

          {/* Header */}
          <div className="px-5 sm:px-8 py-5 sm:py-6 bg-gradient-to-r from-emerald-600 to-teal-700 text-white shadow-md shadow-emerald-900/10">
            <div className="flex items-start justify-between">
              <div className="flex-1 min-w-0">
                <h2 className="text-xl sm:text-2xl font-black tracking-tight truncate">{booking.title}</h2>
                <p className="text-emerald-100 font-bold text-sm mt-0.5 truncate">{booking.churchName || 'بدون اسم كنيسة'}</p>
              </div>
              <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 text-white hover:scale-105 transition-all font-medium text-lg shrink-0 mr-2">&times;</button>
            </div>
          </div>

          {/* Body */}
          <div className="px-5 sm:px-8 py-5 sm:py-6 space-y-3 sm:space-y-4">

            {/* Role badge */}
            {canModify && (
              <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${isAdmin ? 'bg-purple-50 text-purple-700 border border-purple-200' : 'bg-emerald-50 text-emerald-700 border border-emerald-200'}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${isAdmin ? 'bg-purple-500' : 'bg-emerald-500'}`} />
                {isAdmin ? 'أنت المسؤول' : 'أنت منشئ هذا الحجز'}
              </div>
            )}

            {booking.requesterName && (
              <InfoRow label="قائد المجموعة" value={booking.requesterName} />
            )}
            {booking.teamName && (
              <InfoRow label="اسم الفريق" value={booking.teamName} />
            )}
            {booking.ageGroup && (
              <InfoRow label="المرحلة العمرية" value={booking.ageGroup} />
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

            {/* Team Members with IDs */}
            {members.length > 0 && (
              <div className="bg-slate-50 border border-slate-100 p-4 rounded-2xl shadow-inner">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">فريق العمل ({members.length})</p>
                <div className="space-y-2">
                  {members.map((member, i) => (
                    <div key={i} className="flex items-center justify-between bg-white border border-slate-200 px-3 py-2 rounded-xl">
                      <div className="flex items-center gap-2">
                        <span className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-xs font-black shrink-0">{i + 1}</span>
                        <span className="text-sm font-bold text-slate-700">{member.name}</span>
                      </div>
                      {member.id && member.id !== '—' && (
                        <span className="text-xs text-slate-400 font-medium">#{member.id}</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Actions — only for owner or admin */}
          {canModify && (
            <div className="px-5 sm:px-8 pb-5 sm:pb-6 space-y-3">
              {isAdmin && booking.status === 'pending' && (
                <button
                  onClick={handleApprove}
                  className="w-full py-3.5 px-6 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-bold rounded-2xl shadow-lg shadow-emerald-600/20 hover:-translate-y-0.5 transition-all flex items-center justify-center gap-2"
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
                  <button onClick={handleDelete} className="w-full py-3 px-6 border border-red-200 text-red-600 font-bold rounded-2xl hover:bg-red-50/50 hover:border-red-300 transition-all text-sm">
                    حذف الحجز
                  </button>
                )}
              </div>
            </div>
          )}

          {/* View-only notice for non-owners */}
          {!canModify && (
            <div className="px-5 sm:px-8 pb-5 sm:pb-6">
              <p className="text-center text-xs text-slate-400 bg-slate-50 border border-slate-100 rounded-2xl py-3">
                عرض فقط — لا يمكنك تعديل هذا الحجز
              </p>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center gap-3 bg-slate-50 border border-slate-100 p-4 rounded-2xl shadow-inner">
      <div className="flex-1">
        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">{label}</p>
        <p className="text-base font-black text-slate-800 mt-1">{value}</p>
      </div>
    </div>
  );
}
