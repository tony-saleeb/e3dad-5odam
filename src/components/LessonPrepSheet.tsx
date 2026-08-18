'use client';

import { useEffect, useRef, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useSchedulerStore } from '@/store/useSchedulerStore';
import { useLessonPrep } from '@/hooks/useLessonPrep';
import { useToast } from '@/components/Toast';

const PROMPTS = [
  {
    id: 'idea',
    label: 'الفكرة الرئيسية',
    hint: 'بماذا يتمحور الدرس؟',
    insert: 'الفكرة الرئيسية:\n',
  },
  {
    id: 'goal',
    label: 'هدف الدرس',
    hint: 'ماذا تريد أن يخرج به المستمع؟',
    insert: 'هدف الدرس:\n',
  },
  {
    id: 'steps',
    label: 'خطوات الشرح',
    hint: 'رتّب العرض من البداية للنهاية',
    insert: 'خطوات الشرح:\n1. \n2. \n3. \n',
  },
  {
    id: 'questions',
    label: 'أسئلة للنقاش',
    hint: 'أسئلة تفتح الحوار مع الحاضرين',
    insert: 'أسئلة للنقاش:\n• \n• \n',
  },
] as const;

export default function LessonPrepSheet() {
  const { user } = useAuth();
  const { isLessonPrepOpen, closeLessonPrep } = useSchedulerStore();
  const { toast } = useToast();
  const {
    text,
    setText,
    appendSection,
    clearDraft,
    updatedAt,
    saveState,
    wordCount,
    hasDraft,
    flush,
  } = useLessonPrep(user?.email);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [confirmClear, setConfirmClear] = useState(false);

  const isTeamLeader = user?.role === 'user';

  useEffect(() => {
    if (!isLessonPrepOpen) {
      setConfirmClear(false);
      return;
    }
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        flush();
        closeLessonPrep();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    const focusTimer = window.setTimeout(() => textareaRef.current?.focus(), 80);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.clearTimeout(focusTimer);
    };
  }, [isLessonPrepOpen, closeLessonPrep, flush]);

  if (!isLessonPrepOpen || !isTeamLeader || !user) return null;

  const projectTitle = user.teamDetails?.title;
  const teamName = user.teamDetails?.teamName;
  const savedLabel = updatedAt
    ? new Date(updatedAt).toLocaleString('ar-EG', {
        day: 'numeric',
        month: 'short',
        hour: 'numeric',
        minute: '2-digit',
      })
    : null;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success('تم نسخ نص التحضير');
    } catch {
      toast.error('تعذّر النسخ. يمكنك تحديد النص يدوياً');
    }
  };

  const handleClear = () => {
    if (!confirmClear) {
      setConfirmClear(true);
      return;
    }
    clearDraft();
    setConfirmClear(false);
    toast.info('تم مسح المسودة من هذا الجهاز');
  };

  const saveLabel =
    saveState === 'saving' ? 'جاري الحفظ…' : saveState === 'saved' ? 'حُفظ على جهازك' : 'يُحفظ تلقائياً';

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4" dir="rtl">
      <div
        className="absolute inset-0 bg-slate-900/45 backdrop-blur-sm"
        onClick={() => {
          flush();
          closeLessonPrep();
        }}
      />

      <div className="relative w-full sm:max-w-2xl max-h-[94vh] sm:max-h-[88vh] flex flex-col animate-slide-up sm:animate-scale-in z-10">
        <div className="bg-white dark:bg-slate-900 rounded-t-3xl sm:rounded-3xl border border-amber-200/70 dark:border-amber-900/40 overflow-hidden flex flex-col max-h-[94vh] sm:max-h-[88vh]">
          <div className="h-1.5 bg-linear-to-l from-amber-400 via-orange-300 to-amber-500 shrink-0" />

          <div className="px-5 sm:px-6 py-4 border-b border-amber-100 dark:border-slate-800 flex items-start justify-between gap-3 shrink-0">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="w-8 h-8 rounded-lg bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center">
                  <svg className="w-4 h-4 text-amber-700 dark:text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                  </svg>
                </span>
                <h2 className="text-lg font-black text-slate-800 dark:text-slate-100">دفتر تحضير الدرس</h2>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                مساحة خاصة لقائد الفريق — اكتب كيف ستشرح المشروع للحاضرين
              </p>
              {(projectTitle || teamName) && (
                <p className="text-[11px] font-bold text-amber-800 dark:text-amber-300 mt-1.5 truncate">
                  {[projectTitle, teamName].filter(Boolean).join(' · ')}
                </p>
              )}
            </div>
            <button
              type="button"
              onClick={() => {
                flush();
                closeLessonPrep();
              }}
              aria-label="إغلاق"
              className="w-9 h-9 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center justify-center cursor-pointer shrink-0"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.4}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="px-5 sm:px-6 py-3 border-b border-slate-100 dark:border-slate-800 shrink-0">
            <p className="text-[10px] font-bold text-slate-400 mb-2">بطاقات مساعدة — اضغط لإضافة عنوان في الدفتر</p>
            <div className="flex gap-2 overflow-x-auto pb-0.5 -mx-0.5 px-0.5">
              {PROMPTS.map((prompt) => (
                <button
                  key={prompt.id}
                  type="button"
                  title={prompt.hint}
                  onClick={() => {
                    appendSection(prompt.insert);
                    textareaRef.current?.focus();
                  }}
                  className="shrink-0 px-3 py-1.5 rounded-full text-[11px] font-bold bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border border-amber-200/80 dark:border-amber-800/50 hover:bg-amber-100 dark:hover:bg-amber-900/50 cursor-pointer"
                >
                  + {prompt.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex-1 min-h-0 overflow-hidden px-5 sm:px-6 py-3">
            <textarea
              ref={textareaRef}
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder={'اكتب هنا بحرّية…\n\nمثال: سأبدأ بمشكلة نواجهها في الخدمة، ثم أعرض فكرة المشروع، وبعدها خطوات التنفيذ، وأختم بسؤال للنقاش.'}
              className="w-full h-full min-h-64 resize-none rounded-2xl border border-amber-100 dark:border-slate-700 bg-amber-50/40 dark:bg-slate-800/60 text-slate-800 dark:text-slate-100 text-sm leading-7 px-4 py-3 outline-none focus:border-amber-300 dark:focus:border-amber-700 placeholder:text-slate-400"
            />
          </div>

          <div className="px-5 sm:px-6 py-3 border-t border-slate-100 dark:border-slate-800 shrink-0 space-y-3">
            <div className="flex items-center justify-between gap-2 text-[11px]">
              <span className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400 font-medium">
                <svg className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
                يُحفظ على هذا الجهاز فقط — لا يُرسل إلى السيرفر
              </span>
              <span className="text-slate-400 font-bold shrink-0">
                {wordCount} كلمة · {saveLabel}
              </span>
            </div>
            {savedLabel && hasDraft && (
              <p className="text-[10px] text-slate-400 -mt-1">آخر حفظ: {savedLabel}</p>
            )}

            <div className="flex gap-2">
            <button
              type="button"
              onClick={() => {
                flush();
                closeLessonPrep();
              }}
              className="flex-1 py-2.5 rounded-xl bg-slate-800 dark:bg-emerald-600 hover:bg-slate-900 dark:hover:bg-emerald-500 text-white text-sm font-black cursor-pointer"
            >
              تم
            </button>
              <button
                type="button"
                onClick={handleCopy}
                disabled={!hasDraft}
                className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 text-xs font-bold hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-40 cursor-pointer"
              >
                نسخ
              </button>
              <button
                type="button"
                onClick={handleClear}
                disabled={!hasDraft && !confirmClear}
                className={`px-4 py-2.5 rounded-xl text-xs font-bold cursor-pointer ${
                  confirmClear
                    ? 'bg-rose-50 text-rose-700 border border-rose-200'
                    : 'border border-slate-200 dark:border-slate-700 text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-40'
                }`}
              >
                {confirmClear ? 'تأكيد المسح' : 'مسح'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
