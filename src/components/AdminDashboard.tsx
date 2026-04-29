'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useModal } from '@/contexts/ModalContext';
import { useSchedulerStore } from '@/store/useSchedulerStore';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { Booking } from '@/types';

export default function AdminDashboard() {
  const { user, isAdmin } = useAuth();
  const { showAlert } = useModal();
  const { isAdminDashboardOpen, closeAdminDashboard } = useSchedulerStore();
  
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);

  // Load data from Supabase
  useEffect(() => {
    const loadData = async () => {
      if (!isSupabaseConfigured) {
        setLoading(false);
        return;
      }
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('bookings')
          .select('*')
          .order('date', { ascending: true });

        if (error) throw error;
        setBookings(data || []);
      } catch (error) {
        console.error('Error loading Supabase data into AdminPanel:', error);
      } finally {
        setLoading(false);
      }
    };

    if (isAdminDashboardOpen) {
      loadData();
    }
  }, [isAdminDashboardOpen]);

  // CSV Export implementation
  const handleExportCSV = () => {
    window.location.href = '/api/export-bookings';
  };

  if (!isAdminDashboardOpen || !isAdmin) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" dir="rtl">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm animate-fade-in" onClick={closeAdminDashboard} />

      <div className="relative w-full max-w-4xl max-h-[90vh] animate-slide-up">
        <div className="bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
          {/* Header */}
          <div className="px-4 sm:px-6 py-4 sm:py-5 border-b border-gray-100 shrink-0 bg-linear-to-r from-emerald-500 to-teal-500 flex justify-between items-center text-white">
            <div>
              <h2 className="text-xl font-bold">لوحة التحكم</h2>
              <p className="text-sm text-white/80 mt-0.5">تصدير وعرض بيانات الحجز</p>
            </div>
            <button onClick={closeAdminDashboard} className="text-2xl font-bold hover:text-emerald-100 transition-all">&times;</button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            <div className="flex flex-col sm:flex-row justify-between sm:items-center bg-emerald-50 p-4 rounded-2xl border border-emerald-200 gap-4">
              <div>
                <h3 className="font-bold text-emerald-900">سجل حجوزات المشاريع</h3>
                <p className="text-xs text-emerald-700">تنزيل جميع البيانات بصيغة Excel/CSV المتوافقة</p>
              </div>
              <button
                onClick={handleExportCSV}
                className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-md transition-all flex items-center justify-center gap-2"
              >
                تصدير ملف Excel
              </button>
            </div>

            {loading ? (
              <div className="text-center py-12">
                <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto" />
                <p className="text-gray-500 mt-2 text-sm">جاري تحميل البيانات...</p>
              </div>
            ) : bookings.length === 0 ? (
              <div className="text-center py-16 bg-gray-50 rounded-2xl border border-dashed text-gray-400">
                لا توجد حجوزات مسجلة على قاعدة البيانات السحابية حتى الآن.
              </div>
            ) : (
              <div className="overflow-x-auto border border-gray-100 rounded-2xl shadow-sm">
                <table className="w-full text-right border-collapse text-sm">
                  <thead>
                    <tr className="bg-gray-100 text-gray-700 font-bold border-b border-gray-200">
                      <th className="p-4">اسم الكنيسة</th>
                      <th className="p-4">عنوان المشروع</th>
                      <th className="p-4">التاريخ</th>
                      <th className="p-4">الفترة</th>
                      <th className="p-4">المشاركون</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y text-gray-800">
                    {bookings.map((b) => (
                      <tr key={b.id} className="hover:bg-gray-50/50 transition-colors">
                        <td className="p-4 font-semibold text-gray-900">{b.churchName}</td>
                        <td className="p-4">{b.title}</td>
                        <td className="p-4">{b.date}</td>
                        <td className="p-4">{b.startTime} - {b.endTime}</td>
                        <td className="p-4 max-w-xs truncate text-xs text-gray-500" title={(b.teammates || []).join(', ')}>
                          {(b.teammates || []).join(', ')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
