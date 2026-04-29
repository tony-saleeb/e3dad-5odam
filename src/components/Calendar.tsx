'use client';

import { useSchedulerStore } from '@/store/useSchedulerStore';
import { useBookings } from '@/hooks/useBookings';
import { services } from '@/data/initialData';
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameMonth,
  isToday,
} from 'date-fns';

export default function Calendar() {
  const { currentMonth, selectedDate, setSelectedDate } = useSchedulerStore();
  const { bookings } = useBookings();

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(monthStart);
  const calendarStart = startOfWeek(monthStart);
  const calendarEnd = endOfWeek(monthEnd);

  const days = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

  const getBookingsForDay = (date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    return bookings.filter((b) => b.date === dateStr && b.status !== 'rejected');
  };

  const getServiceColor = (serviceId: string) => {
    const service = services.find((s) => s.id === serviceId);
    return service?.color || '#6B7280';
  };

  const weekDays = ['أحد', 'اثنين', 'ثلاثاء', 'أربعاء', 'خميس', 'جمعة', 'سبت'];

  return (
    <div className="flex-1 p-6">
      {/* Calendar Container */}
      <div className="bg-slate-800/50 backdrop-blur-xl rounded-3xl border border-white/10 overflow-hidden shadow-2xl">
        {/* Weekday Headers */}
        <div className="grid grid-cols-7 bg-slate-900/50 border-b border-white/10">
          {weekDays.map((day) => (
            <div
              key={day}
              className="py-4 text-center text-sm font-semibold text-slate-400"
            >
              {day}
            </div>
          ))}
        </div>

        {/* Calendar Grid */}
        <div className="grid grid-cols-7">
          {days.map((day, index) => {
            const dayBookings = getBookingsForDay(day);
            const isCurrentMonth = isSameMonth(day, currentMonth);
            const isSelected = selectedDate === format(day, 'yyyy-MM-dd');
            const isTodayDate = isToday(day);

            return (
              <div
                key={index}
                onClick={() => setSelectedDate(format(day, 'yyyy-MM-dd'))}
                className={`
                  min-h-28 p-2 border-b border-r border-white/5 cursor-pointer
                  transition-all duration-200 hover:bg-white/5
                  ${!isCurrentMonth ? 'bg-slate-900/30' : ''}
                  ${isSelected ? 'bg-purple-500/10 ring-2 ring-purple-500/50 ring-inset' : ''}
                `}
              >
                {/* Day Number */}
                <div className="flex items-center justify-between mb-2">
                  <span
                    className={`
                      w-8 h-8 flex items-center justify-center rounded-full text-sm font-medium
                      transition-all duration-200
                      ${!isCurrentMonth ? 'text-slate-600' : 'text-slate-300'}
                      ${isTodayDate ? 'bg-linear-to-br from-purple-500 to-pink-500 text-white shadow-lg shadow-purple-500/25' : ''}
                      ${isSelected && !isTodayDate ? 'bg-purple-500/20 text-purple-300' : ''}
                    `}
                  >
                    {format(day, 'd')}
                  </span>
                  {dayBookings.length > 3 && (
                    <span className="text-xs text-slate-500 bg-slate-700/50 px-2 py-0.5 rounded-full">
                      +{dayBookings.length - 3}
                    </span>
                  )}
                </div>

                {/* Booking Pills */}
                <div className="space-y-1">
                  {dayBookings.slice(0, 3).map((booking) => (
                    <div
                      key={booking.id}
                      className={`
                        text-xs px-2 py-1 rounded-lg truncate font-medium
                        transition-all duration-200 hover:scale-[1.02]
                        ${booking.status === 'pending'
                          ? 'border-2 border-dashed'
                          : 'shadow-sm'
                        }
                      `}
                      style={{
                        backgroundColor: `${getServiceColor(booking.serviceId)}20`,
                        borderColor: getServiceColor(booking.serviceId),
                        color: getServiceColor(booking.serviceId),
                      }}
                    >
                      {booking.title}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
