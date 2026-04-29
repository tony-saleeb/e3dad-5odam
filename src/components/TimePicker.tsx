'use client';

import { useState, useRef, useEffect } from 'react';

interface TimePickerProps {
  label: string;
  value: string;
  onChange: (time: string) => void;
  minTime?: string;
}

// Common church event times
const QUICK_TIMES = [
  { label: '8:00 AM', value: '08:00' },
  { label: '9:00 AM', value: '09:00' },
  { label: '10:00 AM', value: '10:00' },
  { label: '11:00 AM', value: '11:00' },
  { label: '12:00 PM', value: '12:00' },
  { label: '1:00 PM', value: '13:00' },
  { label: '2:00 PM', value: '14:00' },
  { label: '3:00 PM', value: '15:00' },
  { label: '4:00 PM', value: '16:00' },
  { label: '5:00 PM', value: '17:00' },
  { label: '6:00 PM', value: '18:00' },
  { label: '7:00 PM', value: '19:00' },
  { label: '8:00 PM', value: '20:00' },
];

export default function TimePicker({ label, value, onChange, minTime }: TimePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const formatDisplayTime = (time: string) => {
    if (!time) return '';
    const [h, m] = time.split(':').map(Number);
    const hour = h % 12 || 12;
    const ampm = h >= 12 ? 'PM' : 'AM';
    return `${hour}:${m.toString().padStart(2, '0')} ${ampm}`;
  };

  const isDisabled = (timeValue: string) => {
    if (!minTime) return false;
    return timeValue <= minTime;
  };

  const handleSelect = (timeValue: string) => {
    onChange(timeValue);
    setIsOpen(false);
  };

  return (
    <div ref={containerRef} className="relative">
      <label className="block text-sm font-semibold text-gray-700 mb-2">
        {label}
      </label>

      {/* Display Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full px-4 py-3.5 rounded-xl border-2 text-left transition-all flex items-center justify-between ${
          isOpen
            ? 'border-emerald-500 ring-4 ring-emerald-500/20 bg-emerald-50'
            : value
              ? 'border-emerald-200 bg-emerald-50'
              : 'border-gray-200 hover:border-gray-300'
        }`}
      >
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
            value ? 'bg-emerald-500' : 'bg-gray-100'
          }`}>
            <svg className={`w-5 h-5 ${value ? 'text-white' : 'text-gray-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div>
            <span className={`text-lg font-bold ${value ? 'text-gray-800' : 'text-gray-400'}`}>
              {value ? formatDisplayTime(value) : 'Select time'}
            </span>
          </div>
        </div>
        <svg
          className={`w-5 h-5 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute z-50 mt-2 w-full bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden animate-slide-up">
          {/* Header */}
          <div className="px-4 py-3 bg-linear-to-r from-emerald-500 to-teal-500">
            <p className="text-sm font-medium text-white/80">Quick Select</p>
            <p className="text-xs text-white/60 mt-0.5">Tap a time below</p>
          </div>

          {/* Time Grid */}
          <div className="p-3 max-h-64 overflow-y-auto">
            <div className="grid grid-cols-3 gap-2">
              {QUICK_TIMES.map((time) => {
                const disabled = isDisabled(time.value);
                const selected = value === time.value;

                return (
                  <button
                    key={time.value}
                    type="button"
                    onClick={() => !disabled && handleSelect(time.value)}
                    disabled={disabled}
                    className={`py-3 px-2 rounded-xl text-sm font-semibold transition-all ${
                      selected
                        ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/30 scale-105'
                        : disabled
                          ? 'bg-gray-50 text-gray-300 cursor-not-allowed'
                          : 'bg-gray-50 text-gray-700 hover:bg-emerald-50 hover:text-emerald-600 hover:scale-102'
                    }`}
                  >
                    {time.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Custom Time Input */}
          <div className="p-3 border-t border-gray-100 bg-gray-50">
            <p className="text-xs font-medium text-gray-500 mb-2">Or enter custom time:</p>
            <div className="flex gap-2">
              <input
                type="time"
                value={value}
                onChange={(e) => {
                  if (!isDisabled(e.target.value)) {
                    onChange(e.target.value);
                  }
                }}
                className="flex-1 px-3 py-2 rounded-lg border border-gray-200 text-gray-800 text-sm focus:outline-none focus:border-emerald-500"
              />
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="px-4 py-2 rounded-lg bg-emerald-500 text-white text-sm font-semibold hover:bg-emerald-600 transition-all"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
