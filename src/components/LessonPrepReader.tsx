'use client';

import { useState } from 'react';
import { useLessonPrepReader } from '@/hooks/useLessonPrep';

interface LessonPrepReaderProps {
  leaderEmail?: string | null;
  leaderName?: string;
  projectTitle?: string;
  /** Compact envelope on a card vs. a taller sheet beside the grading form */
  variant?: 'envelope' | 'sheet';
  defaultOpen?: boolean;
}

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

export default function LessonPrepReader({
  leaderEmail,
  leaderName,
  projectTitle,
  variant = 'envelope',
  defaultOpen = false,
}: LessonPrepReaderProps) {
  const { text, updatedAt, hasDraft, loaded } = useLessonPrepReader(leaderEmail);
  const [open, setOpen] = useState(defaultOpen);
  const savedLabel = formatSavedAt(updatedAt);
  const fromLabel = leaderName || 'قائد الفريق';

  if (!loaded) return null;

  if (!hasDraft) {
    return (
      <div
        className={`rounded-2xl border border-dashed border-slate-200 dark:border-[var(--border-color)] bg-slate-50/80 dark:bg-[var(--bg-inset)] px-4 py-3 ${
          variant === 'sheet' ? 'mb-1' : ''
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start gap-3">
          <span className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 flex items-center justify-center shrink-0">
            <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </span>
          <div className="min-w-0">
            <p className="text-[12px] font-black text-slate-600 dark:text-slate-300">لا يوجد دفتر تحضير</p>
            <p className="text-[10px] text-slate-400 font-medium leading-relaxed mt-0.5">
              قائد الفريق لم يكتب ملاحظات على هذا الجهاز بعد
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className="rounded-2xl overflow-hidden border border-amber-200/80 dark:border-amber-800/40 bg-linear-to-br from-amber-50 via-orange-50/40 to-white dark:from-amber-950/30 dark:via-slate-900 dark:to-slate-900"
      onClick={(e) => e.stopPropagation()}
    >
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full text-right px-4 py-3 flex items-center gap-3 cursor-pointer hover:bg-amber-100/40 dark:hover:bg-amber-900/20 transition-colors"
      >
        <span className="relative w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-900/50 border border-amber-200 dark:border-amber-700/40 flex items-center justify-center shrink-0">
          <svg className="w-5 h-5 text-amber-800 dark:text-amber-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.7}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
          <span className="absolute -top-1 -left-1 w-4 h-4 rounded-full bg-rose-600 border-2 border-white dark:border-slate-900 shadow-sm" title="مختوم" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-[12px] font-black text-amber-950 dark:text-amber-100">دفتر تحضير الدرس</p>
            <span className="text-[9px] font-black px-1.5 py-0.5 rounded-md bg-white/80 dark:bg-slate-800 text-amber-800 dark:text-amber-300 border border-amber-200/80 dark:border-amber-800/50">
              عرض فقط
            </span>
          </div>
          <p className="text-[10px] text-amber-800/80 dark:text-amber-300/80 font-medium mt-0.5 truncate">
            من {fromLabel}
            {projectTitle ? ` · ${projectTitle}` : ''}
          </p>
        </div>
        <span className="text-[10px] font-black text-amber-800 dark:text-amber-300 shrink-0">
          {open ? 'إخفاء' : 'عرض'}
        </span>
      </button>

      {open && (
        <div className="px-4 pb-4">
          <div
            className={`relative rounded-xl border border-amber-200/70 dark:border-amber-800/40 bg-amber-50/80 dark:bg-slate-800/50 px-4 py-3 ${
              variant === 'sheet' ? 'max-h-56 overflow-y-auto' : 'max-h-40 overflow-y-auto'
            }`}
            style={{
              backgroundImage:
                'repeating-linear-gradient(to bottom, transparent 0, transparent 27px, rgba(180, 83, 9, 0.08) 28px)',
              backgroundSize: '100% 28px',
            }}
          >
            <p className="text-[13px] leading-7 text-slate-800 dark:text-slate-100 whitespace-pre-wrap select-text font-medium">
              {text}
            </p>
          </div>
          <div className="mt-2 flex items-center justify-between gap-2">
            <span className="text-[10px] text-slate-400 font-medium flex items-center gap-1">
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
              للقراءة فقط — لا يمكن التعديل
            </span>
            {savedLabel && (
              <span className="text-[10px] text-slate-400">كُتب {savedLabel}</span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
