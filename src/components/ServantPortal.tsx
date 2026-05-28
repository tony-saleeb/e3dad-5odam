'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useBookings } from '@/hooks/useBookings';
import { useSettings } from '@/hooks/useSettings';
import { useSchedulerStore } from '@/store/useSchedulerStore';
import { db } from '@/lib/firebase';
import { collection, query, where, onSnapshot, doc, setDoc } from 'firebase/firestore';
import { useToast } from './Toast';
import { TeamEvaluation, Booking } from '@/types';

const getFieldIcon = (name: string) => {
  const n = name.toLowerCase();
  if (n.includes('الوقت') || n.includes('حضور') || n.includes('التزام') || n.includes('time')) {
    return (
      <svg className="w-5 h-5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    );
  }
  if (n.includes('تعاون') || n.includes('فريق') || n.includes('روح') || n.includes('team')) {
    return (
      <svg className="w-5 h-5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
      </svg>
    );
  }
  if (n.includes('ابتكار') || n.includes('فكرة') || n.includes('ابداع') || n.includes('idea') || n.includes('creativ')) {
    return (
      <svg className="w-5 h-5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
      </svg>
    );
  }
  if (n.includes('عرض') || n.includes('تقديم') || n.includes('القاء') || n.includes('present')) {
    return (
      <svg className="w-5 h-5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M7 12l3-3 3 3 4-4M8 21h8m-9-3h10a2 2 0 002-2V4a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
    );
  }
  return (
    <svg className="w-5 h-5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
};



export default function ServantPortal() {
  const { user, isServant } = useAuth();
  const { settings } = useSettings();
  const { evaluationFields } = settings;
  const { bookings } = useBookings();
  const { isServantPortalOpen, closeServantPortal, gradingBooking, setGradingBooking } = useSchedulerStore();
  const { toast } = useToast();

  const [filterDate, setFilterDate] = useState('');
  const [evaluations, setEvaluations] = useState<TeamEvaluation[]>([]);
  const [, setLoadingEvals] = useState(true);

  // Grading form state
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [isGradingOpen, setIsGradingOpen] = useState(false);
  const [grades, setGrades] = useState<Record<string, number>>({});
  const [comments, setComments] = useState('');
  const [saving, setSaving] = useState(false);

  // Initialize filter date to today's date or a sensible default
  useEffect(() => {
    if (isServantPortalOpen) {
      // Default to "2026-07-01" (allowed scheduling start date) or today's date if it fits
      const today = new Date().toISOString().split('T')[0];
      if (today.startsWith('2026-07') || today.startsWith('2026-08') || today.startsWith('2026-09')) {
        setFilterDate(today);
      } else {
        setFilterDate('2026-07-01');
      }
    }
  }, [isServantPortalOpen]);

  // Real-time listener for evaluations on the selected date
  useEffect(() => {
    if (!isServantPortalOpen || !filterDate) return;

    setLoadingEvals(true);
    const q = query(
      collection(db, 'evaluations'),
      where('date', '==', filterDate)
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const evalsList = snapshot.docs.map((d) => ({
          id: d.id,
          ...d.data(),
        })) as TeamEvaluation[];
        setEvaluations(evalsList);
        setLoadingEvals(false);
      },
      (err) => {
        console.error('Error listening to evaluations:', err);
        setLoadingEvals(false);
      }
    );

    return () => unsubscribe();
  }, [isServantPortalOpen, filterDate]);

  // Helper to check if a booking has been evaluated by the current servant
  const getServantEvaluation = useCallback((bookingId: string) => {
    if (!user || !user.email) return undefined;
    const email = user.email.toLowerCase();
    return evaluations.find(
      (e) => e.bookingId === bookingId && e.servantEmail.toLowerCase() === email
    );
  }, [user, evaluations]);

  const handleOpenGrading = useCallback((booking: Booking) => {
    setSelectedBooking(booking);
    const existingEval = getServantEvaluation(booking.id);

    // Seed grades with existing values or max/2 as default
    const initialGrades: Record<string, number> = {};
    (evaluationFields || []).forEach((field) => {
      initialGrades[field.id] = existingEval?.grades?.[field.id] !== undefined
        ? existingEval.grades[field.id]
        : Math.round(field.maxMark / 2);
    });

    setGrades(initialGrades);
    setComments(existingEval?.comments || '');
    setIsGradingOpen(true);
  }, [evaluationFields, getServantEvaluation]);

  // Listen for deep-linked bookings from the calendar EventModal
  useEffect(() => {
    if (gradingBooking) {
      setFilterDate(gradingBooking.date);
      handleOpenGrading(gradingBooking);
      setGradingBooking(null); // Clear trigger
    }
  }, [gradingBooking, setGradingBooking, handleOpenGrading]);

  if (!isServantPortalOpen || !isServant || !user) return null;

  // Filter approved bookings for the selected date
  const filteredBookings = bookings.filter(
    (b) => b.date === filterDate && b.status === 'approved'
  );

  // Calculate total max score possible
  const totalMaxScore = (evaluationFields || []).reduce((sum, f) => sum + f.maxMark, 0);

  const handleSaveEvaluation = async () => {
    if (!selectedBooking || !user.email) return;

    const email = user.email.toLowerCase();
    setSaving(true);
    try {
      const existingEval = getServantEvaluation(selectedBooking.id);
      const evalId = `${selectedBooking.id}_${email}`;
      const docRef = doc(db, 'evaluations', evalId);

      const evaluationData: TeamEvaluation = {
        id: evalId,
        bookingId: selectedBooking.id,
        date: filterDate,
        servantEmail: email,
        servantName: user.displayName || email.split('@')[0],
        grades,
        comments: comments.trim(),
        createdAt: existingEval?.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      await setDoc(docRef, evaluationData);
      toast.success(existingEval ? 'تم تعديل تقييم الفريق بنجاح' : 'تم تسجيل تقييم الفريق بنجاح');
      setIsGradingOpen(false);
      setSelectedBooking(null);
    } catch (err) {
      console.error('Error saving evaluation:', err);
      toast.error('حدث خطأ أثناء حفظ التقييم، يرجى المحاولة مرة أخرى');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center z-50 p-4 overflow-y-auto animate-fade-in" dir="rtl">
      <div className="bg-white rounded-3xl w-full max-w-4xl shadow-[0_20px_50px_rgba(0,0,0,0.3)] border border-slate-100 flex flex-col max-h-[90vh] overflow-hidden transform transition-all duration-300 scale-100 animate-scale-in">
        
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center shrink-0 border border-indigo-100/50">
              <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
              </svg>
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-800 leading-relaxed pb-0.5">لوحة تقييم مشاريع فرق العمل</h2>
              <p className="text-xs text-slate-500 font-semibold leading-relaxed">قم بتقييم وتقدير الدرجات للفرق المشاركة في اليوم المحدد</p>
            </div>
          </div>
          <button
            onClick={closeServantPortal}
            className="w-9 h-9 rounded-xl bg-slate-100 border border-slate-200/50 text-slate-500 hover:text-slate-700 hover:bg-slate-200 flex items-center justify-center transition-all cursor-pointer"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Filters / Date Selector */}
        <div className="p-6 border-b border-slate-100 bg-slate-50/20 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="text-sm font-bold text-slate-700">تاريخ التقييم:</span>
            <div className="relative">
              <input
                type="date"
                value={filterDate}
                onChange={(e) => setFilterDate(e.target.value)}
                className="pl-3 pr-10 py-2 border border-slate-200 rounded-xl text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm font-bold shadow-sm"
              />
              <svg className="w-4 h-4 text-slate-400 absolute right-3 top-3 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
          </div>
          <div className="text-xs text-slate-500 font-bold bg-indigo-50/50 border border-indigo-100 px-3 py-1.5 rounded-lg">
            تم تقييم {evaluations.length} فريق من أصل {filteredBookings.length} فرق نشطة اليوم
          </div>
        </div>

        {/* Content Panel */}
        <div className="flex-1 overflow-y-auto p-6 bg-slate-50/30">
          {filteredBookings.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
              <div className="w-16 h-16 rounded-2xl bg-indigo-50 border border-indigo-100/50 flex items-center justify-center text-indigo-500 mb-4">
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <h3 className="text-base font-bold text-slate-800 mb-1 leading-relaxed">لا توجد فرق عمل مجدولة في هذا اليوم</h3>
              <p className="text-xs text-slate-500 max-w-sm mb-6 leading-relaxed">تأكد من اختيار تاريخ صحيح يحتوي على حجوزات ومشاريع معتمدة من قبل المسؤولين.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredBookings.map((booking) => {
                const servantEval = getServantEvaluation(booking.id);
                const hasEvaluated = !!servantEval;

                // Calculate current grade sum
                const currentScore = hasEvaluated
                  ? Object.values(servantEval.grades).reduce((a, b) => a + b, 0)
                  : 0;

                return (
                  <div
                    key={booking.id}
                    className={`bg-white border rounded-2xl p-5 shadow-sm transition-all hover:shadow-md flex flex-col justify-between ${
                      hasEvaluated ? 'border-emerald-200 bg-emerald-50/10' : 'border-slate-200'
                    }`}
                  >
                    <div>
                      {/* Badge / Status row */}
                      <div className="flex items-center justify-between mb-3.5">
                        <span
                          className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${
                            hasEvaluated
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${hasEvaluated ? 'bg-emerald-600' : 'bg-slate-500'}`} />
                          {hasEvaluated ? 'تم التقييم' : 'لم يتم التقييم'}
                        </span>
                        
                        {/* Time slot indicator */}
                        <span className="text-xs font-bold text-slate-400 bg-slate-50 border border-slate-100 px-2 py-1 rounded-md" dir="ltr">
                          {booking.startTime} - {booking.endTime}
                        </span>
                      </div>

                      {/* Project info */}
                      <h4 className="text-base font-bold text-slate-800 mb-1 leading-relaxed pb-0.5">{booking.title}</h4>
                      <p className="text-xs text-slate-500 font-semibold mb-3 leading-relaxed">
                        الكنيسة: <span className="text-slate-800 font-bold">{booking.churchName}</span>
                      </p>

                      {/* Team details */}
                      <div className="bg-slate-50 rounded-xl p-3.5 border border-slate-100 mb-4">
                        <p className="text-xs text-slate-700 font-bold mb-2 leading-relaxed">
                          اسم الفريق: <span className="text-indigo-600">{booking.teamName}</span>
                        </p>
                        <p className="text-xs text-slate-500 leading-relaxed font-semibold">
                          الأعضاء: <span className="text-slate-700 font-bold">{booking.teamMembers?.map(m => m.name).join('، ') || 'لا يوجد أعضاء'}</span>
                        </p>
                      </div>

                      {/* Servant evaluations list breakdown */}
                      {(() => {
                        const bookingEvaluations = evaluations.filter(e => e.bookingId === booking.id);
                        if (bookingEvaluations.length === 0) return null;
                        return (
                          <div className="mt-2 mb-4 pt-3 border-t border-slate-100/70 space-y-2">
                            <span className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider block">تقييمات المقيمين ({bookingEvaluations.length}):</span>
                            <div className="space-y-1.5 max-h-24 overflow-y-auto pr-0.5">
                              {bookingEvaluations.map((ev) => {
                                const score = Object.values(ev.grades).reduce((a, b) => a + b, 0);
                                const isSelf = ev.servantEmail.toLowerCase() === user.email?.toLowerCase();
                                return (
                                  <div key={ev.id} className={`flex items-center justify-between text-xs p-2 rounded-xl border ${
                                    isSelf 
                                      ? 'bg-indigo-50/50 border-indigo-150 text-indigo-950 font-bold' 
                                      : 'bg-slate-50/60 border-slate-150/70 text-slate-700'
                                  }`}>
                                    <div className="flex items-center gap-1.5 min-w-0">
                                      <span className="w-5 h-5 rounded-full bg-slate-200/70 text-slate-650 flex items-center justify-center text-[9px] font-black shrink-0">👤</span>
                                      <span className="truncate">{ev.servantName} {isSelf && '(أنت)'}</span>
                                    </div>
                                    <span className="font-black shrink-0">{score} <span className="text-[10px] font-normal text-slate-400">/ {totalMaxScore}</span></span>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })()}
                    </div>

                    {/* Action buttons */}
                    <div className="flex items-center justify-between gap-3 mt-2">
                      {hasEvaluated ? (
                        <div className="text-right">
                          <span className="text-xs text-slate-500 font-bold leading-none block">الدرجة المسجلة:</span>
                          <span className="text-sm font-black text-emerald-700 block leading-tight">
                            {currentScore} <span className="text-xs font-normal text-slate-400">/ {totalMaxScore}</span>
                          </span>
                        </div>
                      ) : (
                        <span className="text-xs text-slate-400 font-semibold leading-relaxed">بانتظار رصد الدرجات...</span>
                      )}

                      <button
                        onClick={() => handleOpenGrading(booking)}
                        disabled={hasEvaluated}
                        className={`px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0 ${
                          hasEvaluated
                            ? 'bg-slate-100 border border-slate-200 text-slate-400 cursor-not-allowed'
                            : 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-[0_4px_12px_rgba(79,70,229,0.2)] cursor-pointer'
                        }`}
                      >
                        {hasEvaluated ? 'تم التقييم ✓' : 'تقييم الفريق'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex items-center justify-end">
          <button
            onClick={closeServantPortal}
            className="px-5 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 transition-all font-bold text-sm cursor-pointer shadow-sm"
          >
            إغلاق
          </button>
        </div>
      </div>

      {/* Internal Grading Overlay */}
      {isGradingOpen && selectedBooking && (() => {
        const currentSum = Object.values(grades).reduce((a, b) => a + b, 0);
        const maxPossible = (evaluationFields || []).reduce((sum, f) => sum + f.maxMark, 0);

        return (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center z-55 p-4 overflow-y-auto animate-fade-in" dir="rtl">
            <div className="bg-white rounded-3xl w-full max-w-xl shadow-[0_20px_50px_rgba(0,0,0,0.15)] border border-slate-100 flex flex-col max-h-[85vh] overflow-hidden animate-scale-in">
              
              {/* Overlay Header */}
              <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-white">
                <div className="space-y-0.5">
                  <h3 className="text-base font-bold text-slate-900 leading-relaxed pb-0.5">
                    تقييم مشروع: <span className="text-slate-800 font-extrabold">{selectedBooking.title}</span>
                  </h3>
                  <p className="text-xs text-slate-500 font-semibold leading-relaxed">
                    الفريق: <span className="text-slate-700 font-bold">{selectedBooking.teamName}</span> | الكنيسة: <span className="text-slate-700 font-bold">{selectedBooking.churchName}</span>
                  </p>
                </div>
                <button
                  onClick={() => {
                    setIsGradingOpen(false);
                    setSelectedBooking(null);
                  }}
                  className="w-8 h-8 rounded-lg bg-slate-50 border border-slate-200/60 text-slate-500 hover:text-slate-700 hover:bg-slate-100 flex items-center justify-center transition-all cursor-pointer shadow-sm hover:scale-102"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Dynamic Real-Time Scorecard Banner */}
              <div className="px-6 py-4 bg-slate-50/60 border-b border-slate-100 flex items-center justify-center">
                <div className="flex flex-col items-center justify-center bg-white border border-slate-200/60 px-6 py-3 rounded-2xl shadow-sm text-center">
                  <span className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider block mb-1">الدرجة الإجمالية</span>
                  <div className="flex items-baseline justify-center gap-1">
                    <span className="text-3xl font-black text-slate-950 leading-none">{currentSum}</span>
                    <span className="text-sm text-slate-400 font-bold">/ {maxPossible}</span>
                  </div>
                </div>
              </div>

              {/* Evaluation Fields Container */}
              <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-slate-50/20">
                {evaluationFields && evaluationFields.length > 0 ? (
                  evaluationFields.map((field) => {
                    const currentValue = grades[field.id] !== undefined ? grades[field.id] : 0;
                    
                    return (
                      <div key={field.id} className="bg-white border border-slate-200/60 rounded-2xl p-5 shadow-sm hover:shadow-md hover:border-slate-250 transition-all duration-200 space-y-4">
                        {/* Field Label and Icon */}
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-lg bg-slate-50 border border-slate-200/50 flex items-center justify-center shrink-0">
                              {getFieldIcon(field.name)}
                            </div>
                            <div>
                              <span className="text-sm font-bold text-slate-800 leading-relaxed block pb-0.5">{field.name}</span>
                              <span className="text-[10px] text-slate-400 font-semibold leading-relaxed">الدرجة العظمى المتاحة: {field.maxMark}</span>
                            </div>
                          </div>
                          <div className="bg-slate-50 border border-slate-200/60 px-3 py-1 rounded-xl flex items-baseline gap-0.5">
                            <span className="text-base font-black text-slate-900 leading-none">{currentValue}</span>
                            <span className="text-[10px] text-slate-400 font-bold">/ {field.maxMark}</span>
                          </div>
                        </div>

                        {/* Segmented Progress Bar (Fills up segment-by-segment as score grows) */}
                        <div className="space-y-3.5">
                          <div className="flex gap-1 h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                            {Array.from({ length: field.maxMark }).map((_, idx) => {
                              const step = idx + 1;
                              const isActive = currentValue >= step;
                              return (
                                <div
                                  key={idx}
                                  className={`flex-1 h-full rounded-full transition-all duration-300 ${
                                    isActive ? 'bg-slate-900' : 'bg-slate-200/65'
                                  }`}
                                />
                              );
                            })}
                          </div>

                          {/* Responsive 6-column Button Grid (0 to maxMark) */}
                          <div className="grid grid-cols-6 gap-2">
                            {Array.from({ length: field.maxMark + 1 }).map((_, idx) => {
                              const num = idx;
                              const isSelected = currentValue === num;
                              return (
                                <button
                                  key={num}
                                  type="button"
                                  onClick={() => setGrades({ ...grades, [field.id]: num })}
                                  className={`h-11 rounded-xl text-xs font-black transition-all flex items-center justify-center border cursor-pointer select-none active:scale-95 ${
                                    isSelected
                                      ? 'bg-slate-900 text-white border-slate-900 shadow-sm scale-105'
                                      : 'bg-white text-slate-600 hover:text-slate-900 hover:bg-slate-50 border-slate-200'
                                  }`}
                                >
                                  {num}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="text-center py-4 text-xs font-bold text-amber-600 bg-amber-50 rounded-xl border border-amber-200/50">
                    تحذير: لا توجد معايير تقييم معرفة من قبل المسؤولين حالياً.
                  </div>
                )}

                {/* Qualitative Comments Card */}
                <div className="bg-white border border-slate-200/60 rounded-2xl p-5 shadow-sm space-y-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-slate-50 border border-slate-200/50 flex items-center justify-center shrink-0">
                      <svg className="w-4.5 h-4.5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                      </svg>
                    </div>
                    <div>
                      <span className="text-sm font-bold text-slate-800 leading-relaxed block pb-0.5">ملاحظات وتقييم وصفي (اختياري)</span>
                      <span className="text-[10px] text-slate-400 font-semibold leading-relaxed">أضف ملخصاً عن أداء الفريق أو نصائح للتحسين</span>
                    </div>
                  </div>
                  <textarea
                    value={comments}
                    onChange={(e) => setComments(e.target.value)}
                    placeholder="اكتب هنا نقاط القوة، الإبداع الملاحظ، أو التوصيات لتطوير المشروع مستقبلاً..."
                    rows={3}
                    className="w-full border border-slate-200 rounded-xl p-3.5 text-xs text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-500 focus:border-slate-500 shadow-sm leading-relaxed transition-all"
                  />
                </div>
              </div>

              {/* Overlay Footer */}
              <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/80 flex items-center justify-between gap-3 shadow-[0_-4px_12px_rgba(0,0,0,0.02)]">
                <button
                  type="button"
                  onClick={() => {
                    setIsGradingOpen(false);
                    setSelectedBooking(null);
                  }}
                  className="px-5 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 font-bold text-sm cursor-pointer transition-all hover:scale-102 hover:shadow-sm"
                >
                  إلغاء
                </button>
                
                <button
                  type="button"
                  onClick={handleSaveEvaluation}
                  disabled={saving}
                  className="px-6 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-sm cursor-pointer shadow-sm disabled:opacity-50 transition-all hover:scale-102 flex items-center gap-2"
                >
                  {saving ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      جاري الحفظ...
                    </>
                  ) : (
                    <>حفظ التقييم ✓</>
                  )}
                </button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
