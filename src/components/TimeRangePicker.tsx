'use client';

interface TimeRangePickerProps {
  startTime: string;
  endTime: string;
  onStartChange: (time: string) => void;
  onEndChange: (time: string) => void;
}

function formatTimeDisplay(time: string): string {
  if (!time) return '';
  const [h, m] = time.split(':').map(Number);
  const hour = h % 12 || 12;
  const ampm = h >= 12 ? 'م' : 'ص';
  return `${hour}:${m.toString().padStart(2, '0')} ${ampm}`;
}

function getDuration(start: string, end: string): string {
  if (!start || !end) return '';
  const [sh, sm] = start.split(':').map(Number);
  const [eh, em] = end.split(':').map(Number);
  const diff = (eh * 60 + em) - (sh * 60 + sm);
  if (diff <= 0) return 'غير صالح';
  const hours = Math.floor(diff / 60);
  const mins = diff % 60;
  if (hours === 0) return `${mins} دقيقة`;
  if (mins === 0) return `${hours} ساعة`;
  return `${hours} ساعة ${mins} دقيقة`;
}

export default function TimeRangePicker({ startTime, endTime, onStartChange, onEndChange }: TimeRangePickerProps) {
  const duration = getDuration(startTime, endTime);

  return (
    <div className="space-y-4" dir="rtl">
      <div className="flex items-center gap-4">
        {/* Start Time */}
        <div className="flex-1">
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
            البداية
          </label>
          <input
            type="time"
            value={startTime}
            onChange={(e) => onStartChange(e.target.value)}
            className="w-full px-4 py-4 text-xl font-bold text-emerald-600 bg-emerald-50 border-2 border-emerald-200 rounded-2xl focus:outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/20 transition-all cursor-pointer"
          />
        </div>

        {/* Arrow */}
        <div className="pt-6">
          <svg className="w-6 h-6 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16l-4-4m0 0l4-4m-4 4h18" />
          </svg>
        </div>

        {/* End Time */}
        <div className="flex-1">
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
            النهاية
          </label>
          <input
            type="time"
            value={endTime}
            onChange={(e) => onEndChange(e.target.value)}
            className="w-full px-4 py-4 text-xl font-bold text-teal-600 bg-teal-50 border-2 border-teal-200 rounded-2xl focus:outline-none focus:border-teal-500 focus:ring-4 focus:ring-teal-500/20 transition-all cursor-pointer"
          />
        </div>
      </div>

      {/* Duration Badge */}
      {startTime && endTime && (
        <div className="flex justify-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gray-100">
            <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="text-sm font-semibold text-gray-600">{duration}</span>
          </div>
        </div>
      )}
    </div>
  );
}
