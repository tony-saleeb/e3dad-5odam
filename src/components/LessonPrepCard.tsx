'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useSchedulerStore } from '@/store/useSchedulerStore';
import { useLessonPrep } from '@/hooks/useLessonPrep';

function formatSavedAt(iso: string | null) {
  if (!iso) return null;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleString('ar-EG', {
    day: 'numeric',
    month: 'short',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export default function LessonPrepCard() {
  const { user } = useAuth();
  const { isLessonPrepOpen, openLessonPrep } = useSchedulerStore();
  const { hasDraft, wordCount, updatedAt, loaded } = useLessonPrep(user?.email, isLessonPrepOpen);

  if (user?.role !== 'user') return null;

  const projectTitle = user.teamDetails?.title;
  const savedLabel = formatSavedAt(updatedAt);

  return (
    <button
      type="button"
      onClick={openLessonPrep}
      className="w-full text-right rounded-2xl border border-amber-200/80 dark:border-amber-800/50 bg-linear-to-br from-amber-50 via-white to-orange-50 dark:from-amber-950/40 dark:via-slate-900 dark:to-slate-900 overflow-hidden hover:border-amber-300 dark:hover:border-amber-700 transition-all cursor-pointer group"
    >
      <div className="relative px-4 pt-4 pb-3">
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-linear-to-l from-amber-400 via-orange-300 to-amber-500" />

        <div className="flex items-start gap-3">
          <span className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-900/50 border border-amber-200/80 dark:border-amber-700/40 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
            <svg className="w-5 h-5 text-amber-700 dark:text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-black text-slate-800 dark:text-slate-100">دفتر التحضير</p>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed mt-0.5">
              اكتب شرح الدرس الذي ستقدّمه يوم العرض
            </p>
          </div>
        </div>

        {projectTitle && (
          <p className="mt-3 text-[11px] font-bold text-amber-800 dark:text-amber-300 bg-amber-100/70 dark:bg-amber-900/30 border border-amber-200/70 dark:border-amber-800/40 rounded-lg px-2.5 py-1.5 truncate">
            {projectTitle}
          </p>
        )}

        <div className="mt-3 flex items-center justify-between gap-2">
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
            loaded && hasDraft
              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800/50'
              : 'bg-white/80 text-slate-500 border border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700'
          }`}>
            {loaded && hasDraft ? `${wordCount} كلمة محفوظة` : 'لم يبدأ بعد — اختياري'}
          </span>
          <span className="text-[11px] font-black text-amber-700 dark:text-amber-400 group-hover:underline">
            {hasDraft ? 'متابعة الكتابة' : 'ابدأ الكتابة'}
          </span>
        </div>

        {savedLabel && hasDraft && (
          <p className="mt-2 text-[10px] text-slate-400">آخر حفظ: {savedLabel}</p>
        )}
      </div>
    </button>
  );
}
