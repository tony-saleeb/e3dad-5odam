'use client';

import { useSchedulerStore } from '@/store/useSchedulerStore';
import { useBookings } from '@/hooks/useBookings';
import { useAuth } from '@/contexts/AuthContext';
import { services, rooms } from '@/data/initialData';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';

export default function DayDetails() {
  const { selectedDate } = useSchedulerStore();
  const { bookings } = useBookings();
  const { canSeePending } = useAuth();

  const dayBookings = bookings.filter((b) => {
    if (b.date !== selectedDate) return false;
    if (b.status === 'rejected') return false;
    // Hide pending from regular users
    if (b.status === 'pending' && !canSeePending) return false;
    return true;
  });

  const getService = (serviceId: string) => services.find((s) => s.id === serviceId);
  const getRoom = (roomId: string) => rooms.find((r) => r.id === roomId);

  const formattedDate = selectedDate
    ? format(new Date(selectedDate), 'EEEE, d MMMM', { locale: ar })
    : 'اختر تاريخ';

  return (
    <div className="w-80 shrink-0 p-6 pr-0" dir="rtl">
      <div className="h-full bg-slate-800/50 backdrop-blur-xl rounded-3xl border border-white/10 overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-5 border-b border-white/10">
          <h2 className="text-lg font-bold text-white">{formattedDate}</h2>
          <p className="text-sm text-slate-400 mt-1">
            {dayBookings.length} حجز مجدول
          </p>
        </div>

        {/* Bookings List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {dayBookings.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center py-8">
              <div className="w-16 h-16 rounded-2xl bg-slate-700/50 flex items-center justify-center mb-4">
                <svg
                  className="w-8 h-8 text-slate-500"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                  />
                </svg>
              </div>
              <p className="text-slate-400 text-sm">لا توجد حجوزات لهذا اليوم</p>
              <p className="text-slate-500 text-xs mt-1">
                اضغط على + لإضافة حجز
              </p>
            </div>
          ) : (
            dayBookings.map((booking) => {
              const service = getService(booking.serviceId);
              const room = getRoom(booking.roomId);

              return (
                <div
                  key={booking.id}
                  className={`
                    p-4 rounded-2xl transition-all duration-200 hover:scale-[1.02]
                    ${booking.status === 'pending'
                      ? 'border-2 border-dashed'
                      : 'border border-white/10'
                    }
                  `}
                  style={{
                    backgroundColor: `${service?.color}10`,
                    borderColor: booking.status === 'pending' ? service?.color : undefined,
                  }}
                >
                  {/* Status Badge */}
                  <div className="flex items-center justify-between mb-2">
                    <span
                      className="px-2 py-0.5 rounded-full text-xs font-medium"
                      style={{
                        backgroundColor: `${service?.color}20`,
                        color: service?.color,
                      }}
                    >
                      {service?.name}
                    </span>
                    {booking.status === 'pending' && (
                      <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-amber-500/20 text-amber-400">
                        قيد الانتظار
                      </span>
                    )}
                  </div>

                  {/* Title */}
                  <h3 className="font-semibold text-white text-sm mb-1">
                    {booking.title}
                  </h3>

                  {/* Time */}
                  <div className="flex items-center gap-2 text-xs text-slate-400 mb-2">
                    <svg
                      className="w-3.5 h-3.5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                    {booking.startTime} - {booking.endTime}
                  </div>

                  {/* Room & Requester */}
                  <div className="flex items-center gap-2 text-xs text-slate-400">
                    <svg
                      className="w-3.5 h-3.5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
                      />
                    </svg>
                    {room?.name}
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    بواسطة {booking.requesterName}
                  </p>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
