'use client';

import { useState } from 'react';
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
  startOfDay,
} from 'date-fns';
import { ar } from 'date-fns/locale';

interface DatePickerProps {
  selectedDate: string;
  onSelectDate: (date: string) => void;
}

const dayNames = ['أحد', 'اثنين', 'ثلاثاء', 'أربعاء', 'خميس', 'جمعة', 'سبت'];

export default function DatePicker({ selectedDate, onSelectDate }: DatePickerProps) {
  const [currentMonth, setCurrentMonth] = useState(
    selectedDate ? new Date(selectedDate) : new Date()
  );

  const today = startOfDay(new Date());
  const selected = selectedDate ? new Date(selectedDate) : null;

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(monthStart);
  const startDate = startOfWeek(monthStart, { weekStartsOn: 0 });
  const endDate = endOfWeek(monthEnd, { weekStartsOn: 0 });

  const rows = [];
  let days = [];
  let day = startDate;

  while (day <= endDate) {
    for (let i = 0; i < 7; i++) {
      const currentDay = day;
      const isCurrentMonth = isSameMonth(day, monthStart);
      const isSelected = selected && isSameDay(day, selected);
      const isTodayDate = isToday(day);
      const isPast = isBefore(day, today);
      const dateStr = format(day, 'yyyy-MM-dd');

      days.push(
        <button
          key={dateStr}
          type="button"
          disabled={isPast}
          onClick={() => !isPast && onSelectDate(dateStr)}
          className={`
            relative w-10 h-10 rounded-xl text-sm font-medium transition-all
            ${!isCurrentMonth ? 'text-gray-300' : ''}
            ${isCurrentMonth && !isSelected && !isPast ? 'text-gray-700 hover:bg-emerald-50 hover:text-emerald-600' : ''}
            ${isPast && isCurrentMonth ? 'text-gray-300 cursor-not-allowed' : ''}
            ${isSelected ? 'bg-linear-to-r from-emerald-500 to-teal-500 text-white shadow-md shadow-emerald-500/25' : ''}
            ${isTodayDate && !isSelected ? 'ring-2 ring-emerald-500 ring-offset-2' : ''}
          `}
        >
          {format(day, 'd')}
          {isTodayDate && !isSelected && (
            <span className="absolute bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-emerald-500" />
          )}
        </button>
      );
      day = addDays(day, 1);
    }
    rows.push(
      <div key={day.toString()} className="grid grid-cols-7 gap-1">
        {days}
      </div>
    );
    days = [];
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-lg p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <button
          type="button"
          onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
          className="w-8 h-8 rounded-lg hover:bg-gray-100 flex items-center justify-center text-gray-500 transition-all"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        
        <h3 className="text-base font-bold text-gray-800">
          {format(currentMonth, 'MMMM yyyy', { locale: ar })}
        </h3>
        
        <button
          type="button"
          onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
          className="w-8 h-8 rounded-lg hover:bg-gray-100 flex items-center justify-center text-gray-500 transition-all"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>

      {/* Day Names */}
      <div className="grid grid-cols-7 gap-1 mb-2">
        {dayNames.map((name) => (
          <div
            key={name}
            className="w-10 h-8 flex items-center justify-center text-xs font-semibold text-gray-400"
          >
            {name.slice(0, 1)}
          </div>
        ))}
      </div>

      {/* Calendar Grid */}
      <div className="space-y-1">
        {rows}
      </div>

      {/* Today Button */}
      <button
        type="button"
        onClick={() => {
          setCurrentMonth(new Date());
          onSelectDate(format(new Date(), 'yyyy-MM-dd'));
        }}
        className="w-full mt-4 py-2 text-sm font-medium text-emerald-600 hover:bg-emerald-50 rounded-xl transition-all"
      >
        الذهاب لليوم
      </button>

      {/* Selected Date Display */}
      {selected && (
        <div className="mt-3 pt-3 border-t border-gray-100 text-center">
          <p className="text-sm text-gray-500">التاريخ المختار</p>
          <p className="text-base font-bold text-gray-800">
            {format(selected, 'EEEE، d MMMM yyyy', { locale: ar })}
          </p>
        </div>
      )}
    </div>
  );
}
