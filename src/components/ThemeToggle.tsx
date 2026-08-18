'use client';

import { useTheme } from '@/contexts/ThemeContext';

export default function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === 'dark';

  return (
    <button
      type="button"
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        toggleTheme();
      }}
      className={`relative z-30 inline-flex items-center gap-2 px-3 py-1.5 rounded-full border transition-all duration-300 cursor-pointer select-none active:scale-95 group ${
        isDark
          ? 'bg-[var(--bg-inset)] border-[var(--border-subtle)] text-[var(--text-primary)] hover:bg-[var(--bg-surface-hover)] hover:border-amber-400/30'
          : 'bg-slate-100 border-slate-300/80 text-slate-800 hover:bg-slate-200/80 hover:border-slate-400/80'
      }`}
      title={isDark ? 'التحويل للوضع الفاتح' : 'التحويل للوضع الداكن'}
      aria-label="Toggle theme"
    >
      {/* Icon Capsule with Glow Effect */}
      <div
        className={`w-5 h-5 rounded-full flex items-center justify-center transition-all duration-300 shrink-0 ${
          isDark
            ? 'bg-amber-400/20 border border-amber-400/40 text-amber-400 group-hover:scale-110 group-hover:bg-amber-400/30'
            : 'bg-indigo-100 border border-indigo-200 text-indigo-600 group-hover:scale-110 group-hover:bg-indigo-200'
        }`}
      >
        {isDark ? (
          <svg className="w-3 h-3 transform transition-transform duration-500 rotate-0 group-hover:rotate-90" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
          </svg>
        ) : (
          <svg className="w-3 h-3 transform transition-transform duration-500 -rotate-12 group-hover:rotate-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
          </svg>
        )}
      </div>

      {/* Label Text with High Contrast */}
      <span className={`text-xs font-black tracking-tight ${isDark ? 'text-slate-100' : 'text-slate-800'}`}>
        {isDark ? 'فاتح' : 'داكن'}
      </span>
    </button>
  );
}
