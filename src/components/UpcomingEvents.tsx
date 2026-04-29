'use client';

import { useBookings } from '@/hooks/useBookings';
import { useSchedulerStore } from '@/store/useSchedulerStore';
import { useAuth } from '@/contexts/AuthContext';
import { services } from '@/data/initialData';
import { format, parseISO, isAfter, startOfDay } from 'date-fns';
import { Booking } from '@/types';

export default function UpcomingEvents() {
  const { bookings, loading } = useBookings();
  const { setSelectedDate, setCurrentMonth, openBookingModal } = useSchedulerStore();
  const { canCreateBooking } = useAuth();

  const today = startOfDay(new Date());
  const upcomingBookings = bookings
    .filter((b) => {
      const bookingDate = startOfDay(parseISO(b.date));
      return b.status === 'approved' && (isAfter(bookingDate, today) || bookingDate.getTime() === today.getTime());
    })
    .sort((a, b) => {
      const dateCompare = a.date.localeCompare(b.date);
      if (dateCompare !== 0) return dateCompare;
      return a.startTime.localeCompare(b.startTime);
    })
    .slice(0, 4);

  const getService = (serviceId: string) => services.find((s) => s.id === serviceId);

  const handleEventClick = (booking: Booking) => {
    // Navigate to the event's date in the calendar
    const eventDate = parseISO(booking.date);
    setCurrentMonth(eventDate);
    setSelectedDate(booking.date);
  };

  if (loading) {
    return (
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
        <div className="animate-pulse">
          <div className="h-5 bg-gray-200 rounded w-1/2 mb-4" />
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex gap-3">
                <div className="w-12 h-12 bg-gray-200 rounded-xl" />
                <div className="flex-1">
                  <div className="h-4 bg-gray-200 rounded w-3/4 mb-2" />
                  <div className="h-3 bg-gray-200 rounded w-1/2" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-3 sm:p-5" dir="rtl">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-base font-bold text-gray-800">الأحداث القادمة</h3>
        <span className="text-xs font-medium text-gray-400 bg-gray-100 px-2 py-1 rounded-lg">
          {upcomingBookings.length} حدث
        </span>
      </div>

      <div className="space-y-2">
        {upcomingBookings.length === 0 ? (
          <div className="text-center py-8">
            <div className="w-16 h-16 rounded-2xl bg-linear-to-br from-emerald-50 to-teal-50 flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <p className="text-sm font-medium text-gray-700 mb-1">لا توجد أحداث قادمة</p>
            <p className="text-xs text-gray-400 mb-4">ستظهر الحجوزات الموافق عليها هنا</p>
            {canCreateBooking && (
              <button
                onClick={openBookingModal}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-50 text-emerald-600 text-sm font-medium hover:bg-emerald-100 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                إضافة حجز جديد
              </button>
            )}
          </div>
        ) : (
          upcomingBookings.map((booking) => {
            const service = getService(booking.serviceId);

            return (
              <div
                key={booking.id}
                onClick={() => handleEventClick(booking)}
                className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 transition-all cursor-pointer group"
              >
                {/* Date Badge */}
                <div className="flex flex-col items-center justify-center w-12 h-12 rounded-xl bg-linear-to-br from-emerald-50 to-teal-50 border border-emerald-100 group-hover:from-emerald-100 group-hover:to-teal-100 transition-all">
                  <span className="text-[10px] font-bold text-emerald-600 uppercase">
                    {format(parseISO(booking.date), 'EEE')}
                  </span>
                  <span className="text-lg font-bold text-emerald-700 leading-none">
                    {format(parseISO(booking.date), 'd')}
                  </span>
                </div>

                {/* Event Details */}
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-800 text-sm truncate group-hover:text-emerald-700 transition-colors">
                    {booking.title}
                  </p>
                  <div className="flex items-center gap-2 text-xs text-gray-400 mt-1">
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span>{booking.startTime} - {booking.endTime}</span>
                  </div>
                </div>

                {/* Ministry Color */}
                <div
                  className="w-2 h-8 rounded-full shrink-0"
                  style={{ backgroundColor: service?.color }}
                />
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
