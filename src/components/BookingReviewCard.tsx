'use client';

import React from 'react';
import { TeamMember } from '@/types';

interface BookingReviewCardProps {
  churchName: string;
  title: string;
  teamName: string;
  ageGroup: string;
  teamMembers: TeamMember[];
  titleText: string;
  accentGradient?: string;
  accentBarColor?: string;
}

export default function BookingReviewCard({
  churchName,
  title,
  teamName,
  ageGroup,
  teamMembers = [],
  titleText,
  accentGradient = 'bg-linear-to-r from-slate-700 to-slate-800',
  accentBarColor = 'bg-slate-700',
}: BookingReviewCardProps) {
  const fields = [
    { 
      label: 'الكنيسة', 
      value: churchName,
      icon: (
        <svg className="w-4 h-4 text-slate-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
        </svg>
      )
    },
    { 
      label: 'المشروع', 
      value: title,
      icon: (
        <svg className="w-4 h-4 text-slate-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.364l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 113.536 0V21h2v-2.243a5 5 0 013.536 0z" />
        </svg>
      )
    },
    { 
      label: 'الفريق', 
      value: teamName,
      icon: (
        <svg className="w-4 h-4 text-slate-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
      )
    },
    { 
      label: 'المرحلة العمرية', 
      value: ageGroup,
      icon: (
        <svg className="w-4 h-4 text-slate-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
        </svg>
      )
    },
  ];

  return (
    <div className="bg-white rounded-3xl p-5 border border-slate-100 shadow-2xs">
      <h3 className="text-sm font-black text-slate-700 mb-4 flex items-center gap-2 border-b border-slate-50 pb-2">
        <span className={`w-2 h-5 rounded-full ${accentBarColor} inline-block`} />
        {titleText}
      </h3>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
        {fields.map(({ label, value, icon }) => (
          <div key={label} className="flex items-center gap-3 bg-white border border-slate-100 p-3 rounded-2xl shadow-2xs hover:border-slate-200 transition-all">
            <div className="w-8 h-8 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center shrink-0">
              {icon}
            </div>
            <div className="min-w-0 flex-1">
              <span className="text-[10px] font-bold text-slate-400 block uppercase tracking-wide leading-normal">{label}</span>
              <span className="text-slate-800 font-black text-xs sm:text-sm truncate block mt-0.5 pb-1 leading-normal">{value || '—'}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Team Members List */}
      <div className="mt-5 pt-4 border-t border-slate-100">
        <div className="flex items-center gap-1.5 mb-3">
          <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
          <span className="text-xs font-black text-slate-700 tracking-wider">أعضاء الفريق ({teamMembers.length})</span>
        </div>
        <div className="flex flex-wrap gap-2 max-h-30 overflow-y-auto pr-1">
          {teamMembers.map((m, i) => (
            <div key={m.id || i} className="bg-slate-50/70 border border-slate-100 text-slate-700 text-xs font-bold pl-3 pr-2 py-1.5 rounded-xl shadow-2xs flex items-center gap-2 hover:bg-slate-50 hover:border-slate-200 transition-all duration-200 cursor-default">
              <span className={`w-5 h-5 rounded-full ${accentGradient} text-white flex items-center justify-center text-[10px] font-black shrink-0 shadow-sm`}>
                {i + 1}
              </span>
              <span>{m.name}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
