'use client';

import { useState, useMemo } from 'react';
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  addDays,
  addMonths,
  subMonths,
  isSameMonth,
  isSameDay,
  isToday,
  isBefore,
  isAfter,
  startOfDay,
} from 'date-fns';
import { ar } from 'date-fns/locale';
// CHURCH ADAPTATION: Import date range and allowed days
import { ALLOWED_DAYS, getDateRange } from '@/data/initialData';

interface InlineCalendarProps {
  selectedDate: string; // Now treats as single date string
  onSelectDate: (date: string) => void;
  error?: string;
}

const dayNames = ['أ', 'ث', 'ث', 'ر', 'خ', 'ج', 'س'];

export default function InlineCalendar({ selectedDate, onSelectDate, error }: InlineCalendarProps) {
  // CHURCH ADAPTATION: Enforce a single date selection
  const selectedDates = useMemo(() => {
    if (!selectedDate) return [];
    // Treat purely as one date
    return [selectedDate];
  }, [selectedDate]);

  const dateRange = useMemo(() => getDateRange(), []);

  const [currentMonth, setCurrentMonth] = useState(() => {
    if (selectedDates.length > 0 && selectedDates[0]) {
      return new Date(selectedDates[0]);
    }
    return dateRange.start;
  });

  const today = startOfDay(new Date());

  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(monthStart);
    const calendarStart = startOfWeek(monthStart, { weekStartsOn: 0 });
    const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });

    const days: Date[] = [];
    let day = calendarStart;

    while (day <= calendarEnd) {
      days.push(day);
      day = addDays(day, 1);
    }

    return days;
  }, [currentMonth]);

  const weeks = useMemo(() => {
    const result: Date[][] = [];
    for (let i = 0; i < calendarDays.length; i += 7) {
      result.push(calendarDays.slice(i, i + 7));
    }
    return result;
  }, [calendarDays]);

  const monthStart = startOfMonth(currentMonth);

  const isDayDisabled = (day: Date) => {
    const dayOfWeek = day.getDay();
    const dayStart = startOfDay(day);
    if (!ALLOWED_DAYS.includes(dayOfWeek)) return true;
    if (isBefore(dayStart, startOfDay(dateRange.start))) return true;
    if (isAfter(dayStart, startOfDay(dateRange.end))) return true;
    return false;
  };

  const canGoNext = useMemo(() => {
    const nextMonth = addMonths(currentMonth, 1);
    return startOfMonth(nextMonth) <= startOfMonth(dateRange.end);
  }, [currentMonth, dateRange.end]);

  const canGoPrev = useMemo(() => {
    const prevMonth = subMonths(currentMonth, 1);
    return startOfMonth(prevMonth) >= startOfMonth(dateRange.start);
  }, [currentMonth, dateRange.start]);

  const handleDateClick = (dateStr: string) => {
    // CHURCH ADAPTATION: Replaced comma-separated multi-date selection with single date
    onSelectDate(dateStr);
  };

  return (
    <div className={`bg-white rounded-xl border-2 ${error ? 'border-red-300' : 'border-gray-100'} p-4`}>
      <div className="flex items-center justify-between mb-3">
        <button
          type="button"
          disabled={!canGoNext}
          onClick={() => canGoNext && setCurrentMonth(addMonths(currentMonth, 1))}
          className={`w-7 h-7 rounded-lg flex items-center justify-center transition-all ${
            canGoNext ? 'hover:bg-gray-100 text-gray-500' : 'text-gray-200 cursor-not-allowed'
          }`}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
             <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
        
        <span className="text-sm font-bold text-gray-800">
          {format(currentMonth, 'MMMM yyyy', { locale: ar })}
        </span>
        
        <button
          type="button"
          disabled={!canGoPrev}
          onClick={() => canGoPrev && setCurrentMonth(subMonths(currentMonth, 1))}
          className={`w-7 h-7 rounded-lg flex items-center justify-center transition-all ${
            canGoPrev ? 'hover:bg-gray-100 text-gray-500' : 'text-gray-200 cursor-not-allowed'
          }`}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1 mb-1">
        {dayNames.map((name, i) => (
          <div
            key={`day-name-${i}`}
            className="h-7 flex items-center justify-center text-xs font-semibold text-gray-400"
          >
            {name}
          </div>
        ))}
      </div>

      <div className="space-y-1">
        {weeks.map((week, weekIndex) => (
          <div key={`week-${weekIndex}`} className="grid grid-cols-7 gap-1">
            {week.map((day) => {
              const dateStr = format(day, 'yyyy-MM-dd');
              const isCurrentMonth = isSameMonth(day, monthStart);
              const isSelected = selectedDates.includes(dateStr);
              const isTodayDate = isToday(day);
              const isDisabled = isDayDisabled(day) || !isCurrentMonth;

              return (
                <button
                  key={dateStr}
                  type="button"
                  disabled={isDisabled}
                  onClick={() => !isDisabled && handleDateClick(dateStr)}
                  className={`
                    aspect-square rounded-lg text-sm font-medium transition-all flex items-center justify-center
                    ${!isCurrentMonth ? 'text-gray-300' : ''}
                    ${isCurrentMonth && !isSelected && !isDisabled ? 'text-gray-700 hover:bg-emerald-50 hover:text-emerald-600' : ''}
                    ${isDisabled && isCurrentMonth ? 'text-gray-300 cursor-not-allowed line-through' : ''}
                    ${isSelected ? 'bg-emerald-500 text-white shadow-sm' : ''}
                    ${isTodayDate && !isSelected ? 'ring-1 ring-emerald-500' : ''}
                  `}
                >
                  {format(day, 'd')}
                </button>
              );
            })}
          </div>
        ))}
      </div>

      {/* Selected Date Display */}
      {selectedDates.length > 0 && selectedDates[0] && (
        <div className="mt-3 pt-3 border-t border-gray-100 text-right">
           <p className="text-xs text-gray-400 mb-1">اليوم المختار</p>
           <div className="flex flex-wrap gap-1">
             <span className="inline-flex items-center px-2 py-1 rounded bg-emerald-50 text-emerald-700 text-xs font-medium border border-emerald-100 dir-ltr">
                {format(new Date(selectedDates[0]), 'd MMM yyyy', { locale: ar })}
             </span>
           </div>
        </div>
      )}
    </div>
  );
}
