'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useBookings } from '@/hooks/useBookings';
import { useSettings } from '@/hooks/useSettings';
import { useSchedulerStore } from '@/store/useSchedulerStore';
import { churches, getChurchColor } from '@/data/initialData';
import { supabase } from '@/lib/supabase';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import { useToast } from './Toast';
import { TeamMember } from '@/types';

export default function BookingModal() {
  const { isAdmin, user } = useAuth();
  const { settings } = useSettings();
  const { timePeriods } = settings;
  const { addBooking, isPeriodBooked, hasUserAlreadyBooked } = useBookings();
  const {
    isBookingModalOpen,
    closeBookingModal,
    selectedDate,
    selectedStartTime,
    selectedEndTime,
    setSelectedStartTime,
    setSelectedEndTime
  } = useSchedulerStore();

  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const [formData, setFormData] = useState({
    churchName: '',
    title: '',
    teamName: '',
    ageGroup: '',
    teamMembers: [] as TeamMember[],
    date: selectedDate,
    startTime: '',
    endTime: '',
  });

  const [newMember, setNewMember] = useState({ name: '', id: '' });
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (isBookingModalOpen) {
      setStep(1);
      setErrors({});
      setFormData({
        churchName: '',
        title: '',
        teamName: '',
        ageGroup: '',
        teamMembers: [],
        date: selectedDate,
        startTime: selectedStartTime || '',
        endTime: selectedEndTime || '',
      });
      setNewMember({ name: '', id: '' });
    }
  }, [isBookingModalOpen, selectedDate, selectedStartTime, selectedEndTime]);

  const validateStep1 = () => {
    const newErrors: Record<string, string> = {};
    if (!formData.churchName.trim()) newErrors.churchName = 'اسم الكنيسة مطلوب';
    if (!formData.title.trim()) newErrors.title = 'عنوان المشروع مطلوب';
    if (!formData.teamName.trim()) newErrors.teamName = 'اسم الفريق مطلوب';
    if (!formData.ageGroup.trim()) newErrors.ageGroup = 'المرحلة العمرية مطلوبة';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateStep2 = () => {
    const newErrors: Record<string, string> = {};
    if (formData.teamMembers.length < 3) {
      newErrors.teamMembers = 'يجب إضافة 3 أعضاء على الأقل';
    }
    if (formData.teamMembers.length > 20) {
      newErrors.teamMembers = 'الحد الأقصى للمشاركين هو 20';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateStep3 = () => {
    const newErrors: Record<string, string> = {};
    if (!formData.date) newErrors.date = 'يرجى اختيار تاريخ';
    if (!formData.startTime) newErrors.startTime = 'يرجى اختيار فترة زمنية';

    if (formData.date && formData.startTime && formData.endTime) {
      if (isPeriodBooked(formData.date, formData.startTime, formData.endTime)) {
        newErrors.startTime = 'هذه الفترة محجوزة بالفعل، يرجى اختيار فترة أخرى';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (step === 1 && validateStep1()) setStep(2);
    else if (step === 2 && validateStep2()) setStep(3);
  };

  const handleBack = () => {
    if (step > 1) setStep(step - 1);
  };

  const { toast } = useToast();

  const handleSubmit = async () => {
    if (!validateStep3()) return;

    // 1. Local check (fast)
    if (!isAdmin && user?.email && hasUserAlreadyBooked(user.email)) {
      toast.error('عذراً، يسمح لكل مستخدم بحجز واحد فقط.');
      return;
    }

    setSubmitting(true);
    try {
      // 2. Server-side double check (secure)
      if (!isAdmin && user?.email) {
        const { data: existing, error: checkError } = await supabase
          .from('bookings')
          .select('id')
          .ilike('requesterEmail', user.email)
          .neq('status', 'rejected')
          .limit(1);

        if (checkError) {
          console.error('Check error:', checkError);
          throw new Error('فشل في التحقق من الحجوزات السابقة');
        }

        if (existing && existing.length > 0) {
          toast.error('عذراً، يسمح لكل مستخدم بحجز واحد فقط.');
          setSubmitting(false);
          return;
        }
      }

      const primaryLeader = formData.teamMembers[0]?.name || user?.displayName || 'مجهول';

      await addBooking({
        title: formData.title,
        requesterName: primaryLeader,
        requesterEmail: user?.email || '',
        serviceId: 'church-adaptation',
        roomId: 'church-adaptation',
        date: formData.date,
        startTime: formData.startTime,
        endTime: formData.endTime,
        churchName: formData.churchName,
        teamName: formData.teamName,
        ageGroup: formData.ageGroup,
        teammates: formData.teamMembers.map(m => m.name),
        teamMembers: formData.teamMembers,
      });

      toast.success(`تم تسجيل الحجز بنجاح`);
      closeBookingModal();
    } catch (error: any) {
      console.error('Error creating booking:', error);
      toast.error(error.message || 'فشل في إنشاء الحجز. يرجى المحاولة مرة أخرى.');
    } finally {
      setSubmitting(false);
    }
  };

  const addMember = () => {
    if (!newMember.name.trim()) {
      setErrors({ teamMembers: 'اسم العضو مطلوب' });
      return;
    }
    if (!newMember.id.trim()) {
      setErrors({ teamMembers: 'رقم الهوية مطلوب' });
      return;
    }
    if (formData.teamMembers.length >= 20) {
      setErrors({ teamMembers: 'الحد الأقصى للمشاركين هو 20' });
      return;
    }
    setFormData({
      ...formData,
      teamMembers: [...formData.teamMembers, { name: newMember.name.trim(), id: newMember.id.trim() }],
    });
    setNewMember({ name: '', id: '' });
    setErrors({});
  };

  const removeMember = (index: number) => {
    const updated = [...formData.teamMembers];
    updated.splice(index, 1);
    setFormData({ ...formData, teamMembers: updated });
  };

  if (!isBookingModalOpen) return null;

  const stepTitles = ['البيانات الأساسية', 'أعضاء الفريق', 'مراجعة وتأكيد'];

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={closeBookingModal} />

      <div className="relative w-full h-[92vh] sm:h-auto sm:max-h-[90vh] md:max-w-4xl transition-all duration-300">
        <div className="bg-white rounded-t-[1.5rem] sm:rounded-[2rem] shadow-[0_25px_50px_-12px_rgba(0,0,0,0.25)] flex flex-col h-full overflow-hidden border border-slate-100">

          {/* Header */}
          <div className="px-4 sm:px-8 py-4 sm:py-5 bg-gradient-to-r from-emerald-600 to-teal-700 text-white flex justify-between items-center shadow-md shadow-emerald-900/10" dir="rtl">
            <div>
              <h2 className="text-xl sm:text-2xl font-black tracking-tight">{stepTitles[step - 1]}</h2>
              <div className="flex items-center gap-2 mt-1">
                {[1, 2, 3].map(s => (
                  <div key={s} className={`h-1.5 rounded-full transition-all ${s === step ? 'w-6 bg-white' : s < step ? 'w-3 bg-white/60' : 'w-3 bg-white/30'}`} />
                ))}
              </div>
            </div>
            <button onClick={closeBookingModal} className="w-9 h-9 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 text-white hover:scale-105 transition-all font-medium text-xl">&times;</button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto" dir="rtl">

            {/* STEP 1: Basic Data */}
            {step === 1 && (
              <div className="p-4 sm:p-6 space-y-5 animate-fade-in">
                {/* Church Name */}
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">اسم الكنيسة *</label>
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                      className="w-full px-5 py-3.5 border border-slate-200 rounded-2xl bg-white shadow-sm font-medium text-slate-800 flex items-center justify-between cursor-pointer transition-all hover:border-slate-300"
                    >
                      <span className="flex items-center gap-2.5">
                        {formData.churchName ? (
                          <>
                            <span className={`w-3.5 h-3.5 rounded-full ${getChurchColor(formData.churchName).gradient} shadow-sm`} />
                            {formData.churchName}
                          </>
                        ) : (
                          <span className="text-slate-400">اختر اسم الكنيسة</span>
                        )}
                      </span>
                      <svg className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${isDropdownOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>

                    {isDropdownOpen && (
                      <div className="absolute z-50 mt-2 w-full bg-white border border-slate-200/60 rounded-2xl shadow-xl max-h-60 overflow-y-auto animate-fade-in p-1.5">
                        {churches.map((church, idx) => (
                          <div
                            key={idx}
                            onClick={() => {
                              setFormData({ ...formData, churchName: church });
                              setIsDropdownOpen(false);
                            }}
                            className={`flex items-center gap-3 px-4 py-3 rounded-xl cursor-pointer transition-all hover:bg-slate-50 text-slate-800 font-bold text-sm ${formData.churchName === church ? 'bg-slate-100/70 text-emerald-700' : ''}`}
                          >
                            <span className={`w-3 h-3 rounded-full ${getChurchColor(church).gradient} shrink-0`} />
                            {church}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  {errors.churchName && <p className="text-red-500 text-xs mt-1.5 font-bold">{errors.churchName}</p>}
                </div>

                {/* Project Title */}
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">عنوان المشروع *</label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    className="w-full px-5 py-3.5 border border-slate-200 rounded-2xl focus:outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 shadow-sm font-medium text-slate-800 placeholder-slate-400 transition-all"
                    placeholder="أدخل عنوان المشروع"
                  />
                  {errors.title && <p className="text-red-500 text-xs mt-1.5 font-bold">{errors.title}</p>}
                </div>

                {/* Team Name */}
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">اسم الفريق *</label>
                  <input
                    type="text"
                    value={formData.teamName}
                    onChange={(e) => setFormData({ ...formData, teamName: e.target.value })}
                    className="w-full px-5 py-3.5 border border-slate-200 rounded-2xl focus:outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 shadow-sm font-medium text-slate-800 placeholder-slate-400 transition-all"
                    placeholder="أدخل اسم الفريق"
                  />
                  {errors.teamName && <p className="text-red-500 text-xs mt-1.5 font-bold">{errors.teamName}</p>}
                </div>

                {/* Age Group */}
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">المرحلة العمرية *</label>
                  <input
                    type="text"
                    value={formData.ageGroup}
                    onChange={(e) => setFormData({ ...formData, ageGroup: e.target.value })}
                    className="w-full px-5 py-3.5 border border-slate-200 rounded-2xl focus:outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 shadow-sm font-medium text-slate-800 placeholder-slate-400 transition-all"
                    placeholder="أدخل المرحلة العمرية"
                  />
                  {errors.ageGroup && <p className="text-red-500 text-xs mt-1.5 font-bold">{errors.ageGroup}</p>}
                </div>
              </div>
            )}

            {/* STEP 2: Team Members with IDs */}
            {step === 2 && (
              <div className="p-4 sm:p-6 space-y-4 animate-fade-in">
                <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-3 text-sm text-emerald-700 font-medium">
                  أضف أعضاء الفريق مع رقم هوية كل عضو — الحد الأدنى 3 أعضاء.
                </div>

                {/* Add member form */}
                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-3">
                  <label className="block text-sm font-bold text-slate-700">
                    أعضاء الفريق ({formData.teamMembers.length}/20) *
                  </label>
                  <div className="flex flex-col sm:flex-row gap-2">
                    <input
                      type="text"
                      value={newMember.name}
                      onChange={(e) => setNewMember({ ...newMember, name: e.target.value })}
                      className="flex-1 px-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:border-emerald-500 bg-white text-sm"
                      placeholder="اسم العضو"
                      onKeyDown={(e) => e.key === 'Enter' && addMember()}
                    />
                    <input
                      type="text"
                      value={newMember.id}
                      onChange={(e) => setNewMember({ ...newMember, id: e.target.value })}
                      className="flex-1 px-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:border-emerald-500 bg-white text-sm"
                      placeholder="رقم الهوية"
                      onKeyDown={(e) => e.key === 'Enter' && addMember()}
                    />
                    <button
                      type="button"
                      onClick={addMember}
                      className="px-5 py-2.5 bg-emerald-600 text-white rounded-xl font-bold text-sm hover:bg-emerald-700 active:scale-95 transition-all shrink-0"
                    >
                      + إضافة
                    </button>
                  </div>
                  {errors.teamMembers && <p className="text-red-500 text-xs font-bold">{errors.teamMembers}</p>}
                </div>

                {/* Members list */}
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {formData.teamMembers.map((member, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-white border border-slate-200 rounded-xl shadow-sm">
                      <div className="flex items-center gap-3">
                        <span className="w-7 h-7 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-xs font-black">
                          {index + 1}
                        </span>
                        <div>
                          <p className="text-slate-800 text-sm font-bold">{member.name}</p>
                          <p className="text-slate-400 text-xs">الهوية: {member.id}</p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeMember(index)}
                        className="text-red-400 hover:text-red-600 text-xs font-bold px-2 py-1 rounded-lg hover:bg-red-50 transition-all"
                      >
                        حذف
                      </button>
                    </div>
                  ))}
                  {formData.teamMembers.length === 0 && (
                    <p className="text-center text-slate-400 text-sm py-6">لم يتم إضافة أعضاء بعد</p>
                  )}
                </div>
              </div>
            )}

            {/* STEP 3: Review + Confirmation */}
            {step === 3 && (
              <div className="p-4 sm:p-6 space-y-4 animate-fade-in">
                {/* Date/Time Pickers if missing */}
                {(!formData.date || !formData.startTime) && (
                  <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 space-y-4 mb-4">
                    <p className="text-sm font-bold text-amber-800 flex items-center gap-2">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      يرجى تحديد الموعد:
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="text-[11px] font-bold text-amber-700 block mb-1">التاريخ</label>
                        <input 
                          type="date" 
                          value={formData.date}
                          onChange={(e) => setFormData(prev => ({ ...prev, date: e.target.value }))}
                          className="w-full bg-white border border-amber-200 rounded-xl px-3 py-2 text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-amber-500"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] font-bold text-amber-700 block mb-1">الفترة الزمنية</label>
                        <select 
                          value={`${formData.startTime}|${formData.endTime}`}
                          onChange={(e) => {
                            const [start, end] = e.target.value.split('|');
                            setFormData(prev => ({ ...prev, startTime: start, endTime: end }));
                          }}
                          className="w-full bg-white border border-amber-200 rounded-xl px-3 py-2 text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-amber-500"
                        >
                          <option value="|">اختر فترة...</option>
                          {timePeriods.map(p => (
                            <option key={p.id} value={`${p.startTime}|${p.endTime}`}>
                              {p.label} ({p.startTime} - {p.endTime})
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                    {errors.startTime && <p className="text-xs text-red-600 font-bold">{errors.startTime}</p>}
                  </div>
                )}

                {formData.date && formData.startTime && (
                  <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center shadow-sm">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.3} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                      </div>
                      <div>
                        <p className="text-xs font-bold text-emerald-600/70">الموعد المختار</p>
                        <p className="text-sm font-black text-emerald-700">{formData.date}</p>
                      </div>
                    </div>
                    <div className="text-left">
                      <p className="text-xs font-bold text-emerald-600/70 text-left">الفترة الزمنية</p>
                      <p className="text-sm font-black text-emerald-700">{formData.startTime} – {formData.endTime}</p>
                    </div>
                  </div>
                )}

                {/* Compact Summary Card */}
                <div className="bg-slate-50 rounded-3xl p-5 border border-slate-100 shadow-inner">
                  <h3 className="text-base font-black text-slate-800 mb-4 flex items-center gap-2 border-b border-slate-200/60 pb-3">
                    <span className="w-2 h-5 rounded-full bg-teal-500 inline-block" />
                    مراجعة بيانات الحجز
                  </h3>
                  
                  <div className="grid grid-cols-2 gap-x-6 gap-y-4 text-sm">
                    {[
                      { label: 'الكنيسة', value: formData.churchName },
                      { label: 'المشروع', value: formData.title },
                      { label: 'الفريق', value: formData.teamName },
                      { label: 'المرحلة', value: formData.ageGroup },
                    ].map(({ label, value }) => (
                      <div key={label}>
                        <span className="text-[11px] font-bold text-slate-400 block uppercase tracking-wide mb-0.5">{label}</span>
                        <span className="text-slate-800 font-black text-sm">{value || '—'}</span>
                      </div>
                    ))}
                  </div>

                  <div className="mt-5 pt-4 border-t border-slate-200/60">
                    <span className="text-[11px] font-bold text-slate-400 block mb-2 uppercase tracking-wide">أعضاء الفريق ({formData.teamMembers.length})</span>
                    <div className="flex flex-wrap gap-1.5">
                      {formData.teamMembers.map((m, i) => (
                        <div key={i} className="bg-white border border-slate-200 text-slate-700 text-[10px] font-bold px-2.5 py-1.5 rounded-xl shadow-xs flex items-center gap-1.5">
                          <span className="w-1 h-1 rounded-full bg-emerald-400" />
                          {m.name}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
                
                <div className="px-2">
                  <p className="text-[11px] text-slate-400 text-center leading-relaxed font-medium">
                    يرجى مراجعة البيانات جيداً قبل التأكيد. سيتم تسجيل الحجز فور الضغط على الزر أدناه.
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Footer Buttons */}
          <div className="px-4 sm:px-8 py-4 sm:py-5 bg-slate-50 flex gap-3 border-t border-slate-100 shrink-0" dir="rtl">
            {step > 1 && (
              <button
                onClick={handleBack}
                disabled={submitting}
                className="flex-1 py-3.5 px-6 border border-slate-200 hover:bg-slate-100/80 rounded-2xl text-slate-700 font-bold transition-all disabled:opacity-50"
              >
                رجوع
              </button>
            )}
            {step < 3 ? (
              <button
                onClick={handleNext}
                className="flex-1 py-3.5 px-6 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-bold rounded-2xl shadow-lg shadow-emerald-600/20 hover:-translate-y-0.5 transition-all"
              >
                التالي
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                disabled={submitting || !formData.date || !formData.startTime}
                className="flex-1 py-3.5 px-6 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-bold rounded-2xl shadow-lg shadow-emerald-600/20 hover:-translate-y-0.5 transition-all disabled:opacity-50 disabled:translate-y-0 disabled:shadow-none flex items-center justify-center gap-2"
              >
                {submitting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    جاري الإرسال...
                  </>
                ) : 'تأكيد الحجز ✓'}
              </button>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}
