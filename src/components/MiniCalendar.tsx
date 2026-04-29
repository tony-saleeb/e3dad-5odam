'use client';

import { useState, useEffect, useMemo } from 'react';
import { useBookings } from '@/hooks/useBookings';
import { useSchedulerStore } from '@/store/useSchedulerStore';
import { useAuth } from '@/contexts/AuthContext';
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameMonth,
  isToday,
  addMonths,
  subMonths,
  isSameWeek,
  getMonth,
  getYear,
  setMonth,
  isBefore,
  isAfter,
  startOfDay,
} from 'date-fns';
import { ar } from 'date-fns/locale';
// CHURCH ADAPTATION: Import restrictions
import { ALLOWED_DAYS, getDateRange, getChurchColor, timePeriods } from '@/data/initialData';

export default function MiniCalendar() {
  const { bookings } = useBookings();
  const { canSeePending } = useAuth();
  const { currentMonth, setCurrentMonth, selectedDate, setSelectedDate } = useSchedulerStore();
  
  // View mode: 'days' or 'months'
  const [viewMode, setViewMode] = useState<'days' | 'months'>('days');
  
  // Prevent hydration mismatch by only checking isToday after mount
  const [isMounted, setIsMounted] = useState(false);

  // CHURCH ADAPTATION: Get date range
  const dateRange = useMemo(() => getDateRange(), []);
  
  useEffect(() => {
    setIsMounted(true);
  }, []);

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(monthStart);
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 0 });
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });

  const days = eachDayOfInterval({ start: calendarStart, end: calendarEnd });
  const weekDays = ['أ', 'ا', 'ث', 'ر', 'خ', 'ج', 'س'];
  
  // Arabic month names
  const monthNames = [
    'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
    'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'
  ];

  const validStartTimes = timePeriods.map(p => p.startTime);

  const hasBookingsOnDay = (date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    const dayBookings = bookings.filter((b) => {
      if (b.date !== dateStr) return false;
      if (b.status === 'rejected') return false;
      if (b.status === 'pending' && !canSeePending) return false;
      if (!validStartTimes.includes(b.startTime)) return false;
      return true;
    });
    return dayBookings.length >= 3;
  };

  const getBookingForDay = (date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    return bookings.find((b) => {
      if (b.date !== dateStr) return false;
      if (b.status === 'rejected') return false;
      if (b.status === 'pending' && !canSeePending) return false;
      if (!validStartTimes.includes(b.startTime)) return false;
      return true;
    });
  };

  // Check if a month has any bookings
  const hasBookingsInMonth = (monthIndex: number) => {
    const year = getYear(currentMonth);
    return bookings.some((b) => {
      const bookingDate = new Date(b.date);
      return getMonth(bookingDate) === monthIndex && getYear(bookingDate) === year && b.status !== 'rejected';
    });
  };

  const isInCurrentWeek = (date: Date) => {
    return isSameWeek(date, currentMonth, { weekStartsOn: 0 });
  };

  // CHURCH ADAPTATION: Check if a day is disabled (Thu-Sat or outside Jul-Sep)
  const isDayDisabled = (day: Date) => {
    const dayOfWeek = day.getDay();
    const dayStart = startOfDay(day);
    if (!ALLOWED_DAYS.includes(dayOfWeek)) return true;
    if (isBefore(dayStart, startOfDay(dateRange.start))) return true;
    if (isAfter(dayStart, startOfDay(dateRange.end))) return true;
    return false;
  };

  // CHURCH ADAPTATION: Check if navigation should be blocked
  const canGoNextMonth = useMemo(() => {
    const nextMonth = addMonths(currentMonth, 1);
    return startOfMonth(nextMonth) <= startOfMonth(dateRange.end);
  }, [currentMonth, dateRange.end]);

  const canGoPrevMonth = useMemo(() => {
    const prevMonth = subMonths(currentMonth, 1);
    return startOfMonth(prevMonth) >= startOfMonth(dateRange.start);
  }, [currentMonth, dateRange.start]);

  const handleDateClick = (date: Date) => {
    // CHURCH ADAPTATION: Block clicks on disabled days
    if (isDayDisabled(date)) return;
    const dateStr = format(date, 'yyyy-MM-dd');
    setSelectedDate(dateStr);
    setCurrentMonth(date);
  };

  const handleMonthClick = (monthIndex: number) => {
    // CHURCH ADAPTATION: Only allow July(6), August(7), September(8)
    if (monthIndex < 6 || monthIndex > 8) return;
    const newDate = setMonth(currentMonth, monthIndex);
    setCurrentMonth(newDate);
    setViewMode('days');
  };

  const handlePrev = () => {
    if (viewMode === 'days') {
      // CHURCH ADAPTATION: Block if can't go prev
      if (!canGoPrevMonth) return;
      setCurrentMonth(subMonths(currentMonth, 1));
    }
    // CHURCH ADAPTATION: Removed year navigation in months view since we restrict to one year
  };

  const handleNext = () => {
    if (viewMode === 'days') {
      // CHURCH ADAPTATION: Block if can't go next
      if (!canGoNextMonth) return;
      setCurrentMonth(addMonths(currentMonth, 1));
    }
    // CHURCH ADAPTATION: Removed year navigation in months view since we restrict to one year
  };

  const toggleViewMode = () => {
    setViewMode(viewMode === 'days' ? 'months' : 'days');
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
      {/* Navigation Header */}
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={handleNext}
          // CHURCH ADAPTATION: Disable if at boundary
          disabled={viewMode === 'days' && !canGoNextMonth}
          className={`p-1.5 rounded-lg transition-colors ${
            viewMode === 'days' && !canGoNextMonth
              ? 'text-gray-200 cursor-not-allowed'
              : 'hover:bg-gray-100 text-gray-400 hover:text-gray-600'
          }`}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
        
        {/* Clickable Month/Year Header */}
        <button
          onClick={toggleViewMode}
          className="px-3 py-1.5 rounded-lg border border-gray-200 hover:border-emerald-400 hover:bg-emerald-50 transition-all text-base font-semibold text-gray-800"
        >
          {viewMode === 'days' 
            ? format(currentMonth, 'MMMM yyyy', { locale: ar })
            : format(currentMonth, 'yyyy')
          }
        </button>
        
        <button
          onClick={handlePrev}
          // CHURCH ADAPTATION: Disable if at boundary
          disabled={viewMode === 'days' && !canGoPrevMonth}
          className={`p-1.5 rounded-lg transition-colors ${
            viewMode === 'days' && !canGoPrevMonth
              ? 'text-gray-200 cursor-not-allowed'
              : 'hover:bg-gray-100 text-gray-400 hover:text-gray-600'
          }`}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
      </div>

      {viewMode === 'days' ? (
        <>
          {/* Weekday Headers */}
          <div className="grid grid-cols-7 mb-2">
            {weekDays.map((day) => (
              <div key={day} className="text-center text-xs font-medium text-gray-400 py-1">
                {day}
              </div>
            ))}
          </div>

          {/* Days Grid */}
          <div className="grid grid-cols-7 gap-1">
            {days.map((day, index) => {
              const isCurrentMonth = isSameMonth(day, currentMonth);
              const isSelected = selectedDate === format(day, 'yyyy-MM-dd');
              const isTodayDate = isMounted && isToday(day);
              const dayBooking = getBookingForDay(day);
              const hasEvents = hasBookingsOnDay(day);
              const isWeekHighlighted = isInCurrentWeek(day) && isCurrentMonth;
              // CHURCH ADAPTATION: Check if day is disabled
              const isDisabled = isDayDisabled(day);

              return (
                <button
                  key={index}
                  onClick={() => handleDateClick(day)}
                  // CHURCH ADAPTATION: Disable non-allowed days
                  disabled={isDisabled || !isCurrentMonth}
                  className={`
                    relative aspect-square flex items-center justify-center text-sm rounded-lg select-none transition-all
                    ${!isCurrentMonth ? 'text-gray-300' : ''}
                    ${isCurrentMonth && !isDisabled && !isSelected && !dayBooking ? 'text-gray-700 hover:bg-emerald-50 hover:text-emerald-700 cursor-pointer active:bg-emerald-100' : ''}
                    ${isTodayDate && !isSelected ? 'text-amber-600 font-bold' : ''}
                    ${dayBooking && !isSelected && isCurrentMonth ? `${getChurchColor(dayBooking.churchName).gradient} text-white shadow-sm font-medium hover:brightness-110` : ''}
                    ${isSelected ? 'bg-slate-800 text-white font-black hover:bg-slate-900 shadow-md scale-105 border-2 border-white' : ''}
                    ${isDisabled && isCurrentMonth ? 'text-gray-300/60 cursor-not-allowed bg-gray-50/20' : ''}
                  `}
                >
                  {format(day, 'd')}
                  {hasEvents && !isSelected && (
                    <span className="absolute bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-white animate-pulse" />
                  )}
                </button>
              );
            })}
          </div>
        </>
      ) : (
        /* Months Grid */
        <div className="grid grid-cols-3 gap-2">
          {monthNames.map((month, index) => {
            const isCurrentMonthSelected = getMonth(currentMonth) === index;
            const hasEvents = hasBookingsInMonth(index);
            // CHURCH ADAPTATION: Only allow July(6), August(7), September(8)
            const isAllowedMonth = index >= 6 && index <= 8;

            return (
              <button
                key={index}
                onClick={() => handleMonthClick(index)}
                // CHURCH ADAPTATION: Disable months outside Jul-Sep
                disabled={!isAllowedMonth}
                className={`
                  relative py-3 px-2 rounded-xl text-sm font-medium transition-all
                  ${isCurrentMonthSelected 
                    ? 'bg-emerald-500 text-white hover:bg-emerald-600' 
                    : isAllowedMonth 
                      ? 'text-gray-700 hover:bg-gray-100'
                      : 'text-gray-300 cursor-not-allowed'
                  }
                `}
              >
                {month}
                {hasEvents && !isCurrentMonthSelected && (
                  <span className="absolute bottom-1.5 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-emerald-500" />
                )}
              </button>
            );
          })}
        </div>
      )}

      {/* CHURCH ADAPTATION: Navigate to July 1 instead of today */}
      <button
        onClick={() => {
          const range = getDateRange();
          handleDateClick(range.start);
          setViewMode('days');
        }}
        className="w-full mt-4 py-2 text-sm font-medium text-emerald-600 hover:bg-emerald-50 rounded-lg transition-all"
      >
        الذهاب لبداية الفترة
      </button>
    </div>
  );
}
