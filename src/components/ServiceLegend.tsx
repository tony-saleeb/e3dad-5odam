'use client';

import { services } from '@/data/initialData';

export default function ServiceLegend() {
  return (
    <div className="px-6 py-4" dir="rtl">
      <div className="bg-slate-800/50 backdrop-blur-xl rounded-2xl border border-white/10 p-4">
        <h3 className="text-sm font-semibold text-slate-400 mb-3">الخدمات</h3>
        <div className="flex flex-wrap gap-2">
          {services.map((service) => (
            <div
              key={service.id}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 transition-all hover:bg-white/10"
            >
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: service.color }}
              />
              <span className="text-sm text-slate-300">{service.name}</span>
            </div>
          ))}
        </div>

        {/* Legend for status */}
        <div className="mt-4 pt-4 border-t border-white/10">
          <h3 className="text-sm font-semibold text-slate-400 mb-3">حالة الحجز</h3>
          <div className="flex gap-4">
            <div className="flex items-center gap-2">
              <div className="w-6 h-4 rounded border-2 border-dashed border-purple-500 bg-purple-500/10" />
              <span className="text-sm text-slate-300">قيد الانتظار</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-6 h-4 rounded border border-purple-500 bg-purple-500/20" />
              <span className="text-sm text-slate-300">موافق عليه</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
