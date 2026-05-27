'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useBookings } from '@/hooks/useBookings';
import { useSettings } from '@/hooks/useSettings';
import { useSchedulerStore } from '@/store/useSchedulerStore';
import { churches, getChurchColor } from '@/data/initialData';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { useToast } from './Toast';
import { TeamMember } from '@/types';

export default function BookingModal() {
  const { isAdmin, user } = useAuth();
  const { settings } = useSettings();
  const { timePeriods, teamMemberLimits } = settings;
  const { addBooking, isPeriodBooked, hasUserAlreadyBooked } = useBookings();
  const {
    isBookingModalOpen,
    closeBookingModal,
    selectedDate,
    selectedStartTime,
    selectedEndTime
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
      const isNormalUser = user?.role === 'user' && user?.teamDetails;
      setStep(isNormalUser ? 3 : 1);
      setErrors({});
      setFormData({
        churchName: user?.teamDetails?.churchName || '',
        title: user?.teamDetails?.title || '',
        teamName: user?.teamDetails?.teamName || '',
        ageGroup: user?.teamDetails?.ageGroup || '',
        teamMembers: user?.teamDetails?.teamMembers || [],
        date: selectedDate,
        startTime: selectedStartTime || '',
        endTime: selectedEndTime || '',
      });
      setNewMember({ name: '', id: '' });
    }
  }, [isBookingModalOpen, selectedDate, selectedStartTime, selectedEndTime, user]);

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
    if (formData.teamMembers.length < teamMemberLimits.min) {
      newErrors.teamMembers = `يجب إضافة ${teamMemberLimits.min} أعضاء على الأقل`;
    }
    if (formData.teamMembers.length > teamMemberLimits.max) {
      newErrors.teamMembers = `الحد الأقصى للمشاركين هو ${teamMemberLimits.max}`;
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateStep3 = () => {
    const newErrors: Record<string, string> = {};
    if (!formData.date) newErrors.date = 'يرجى اختيار تاريخ';
    if (!formData.startTime) newErrors.startTime = 'يرجى اختيار فترة زمنية';

    if (formData.date && formData.startTime && formData.endTime && isPeriodBooked(formData.date, formData.startTime, formData.endTime)) {
      newErrors.startTime = 'هذه الفترة محجوزة بالفعل، يرجى اختيار فترة أخرى';
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
      // 2. Server-side double check (secure via Firestore)
      if (!isAdmin && user?.email) {
        try {
          const q = query(
            collection(db, 'bookings'),
            where('requesterEmail', '==', user.email.toLowerCase())
          );
          const snap = await getDocs(q);
          const activeBookings = snap.docs.filter(d => d.data().status !== 'rejected');

          if (activeBookings.length > 0) {
            toast.error('عذراً، يسمح لكل مستخدم بحجز واحد فقط.');
            setSubmitting(false);
            return;
          }
        } catch (checkErr) {
          console.error('Check error:', checkErr);
          throw new Error('فشل في التحقق من الحجوزات السابقة');
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
    } catch (error) {
      console.error('Error creating booking:', error);
      toast.error(error instanceof Error ? error.message : 'فشل في إنشاء الحجز. يرجى المحاولة مرة أخرى.');
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
    if (formData.teamMembers.length >= teamMemberLimits.max) {
      setErrors({ teamMembers: `الحد الأقصى للمشاركين هو ${teamMemberLimits.max}` });
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
  const churchColor = getChurchColor(formData.churchName);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" dir="rtl">
      {/* Backdrop with modern glassmorphism blur */}
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-md" onClick={closeBookingModal} />

      {/* Main card modal with premium scale-in animation */}
      <div 
        className="relative w-full max-w-2xl sm:max-h-[90vh] animate-scale-in transition-all duration-300 z-10"
        style={{
          boxShadow: formData.churchName ? `0 25px 50px -12px rgba(0,0,0,0.15), 0 0 40px -5px ${churchColor.hex}15` : undefined
        }}
      >
        <div className="bg-white rounded-[28px] overflow-hidden border border-slate-100/80 max-h-[85vh] sm:max-h-[88vh] flex flex-col scrollbar-hide shadow-xl">

          {/* Header styled dynamically with Church Brand Gradient */}
          <div className={`relative px-6 py-5 ${churchColor.gradient || 'bg-linear-to-r from-emerald-500 to-teal-600'} text-white shadow-lg overflow-hidden shrink-0`}>
            {/* Soft grid background overlay for header */}
            <div className="absolute inset-0 opacity-10 bg-[linear-gradient(to_right,#808080_1px,transparent_1px),linear-gradient(to_bottom,#808080_1px,transparent_1px)] bg-size-[14px_24px]" />
            <div className="relative flex justify-between items-center gap-3">
              <div>
                <h2 className="text-xl sm:text-2xl font-black tracking-tight leading-normal pb-1 drop-shadow-xs">{stepTitles[step - 1]}</h2>
              </div>
              <button 
                onClick={closeBookingModal} 
                className="w-8 h-8 flex items-center justify-center rounded-full bg-white/15 hover:bg-white/30 text-white font-medium text-lg shrink-0 transition-all duration-200 active:scale-90"
                aria-label="close"
              >
                &times;
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto scrollbar-hide" dir="rtl">

            {/* STEP 1: Basic Data */}
            {step === 1 && (
              <div className="p-5 sm:p-6 space-y-5 animate-fade-in">
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
                            <span className={`w-3.5 h-3.5 rounded-full bg-linear-to-r ${getChurchColor(formData.churchName).gradient} shadow-sm`} />
                            {formData.churchName}
                          </>
                        ) : (
                          <span className="text-slate-400 text-sm">اختر اسم الكنيسة</span>
                        )}
                      </span>
                      <svg className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${isDropdownOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>

                    {isDropdownOpen && (
                      <div className="absolute z-50 mt-2 w-full bg-white border border-slate-200/60 rounded-2xl shadow-xl max-h-60 overflow-y-auto animate-scale-in p-1.5">
                        {churches.map((church, idx) => (
                          <div
                            key={idx}
                            onClick={() => {
                              setFormData({ ...formData, churchName: church });
                              setIsDropdownOpen(false);
                            }}
                            className={`flex items-center gap-3 px-4 py-3 rounded-xl cursor-pointer transition-all hover:bg-slate-50 text-slate-800 font-bold text-sm ${
                              formData.churchName === church ? 'bg-slate-100/70 text-slate-900' : ''
                            }`}
                          >
                            <span className={`w-3 h-3 rounded-full bg-linear-to-r ${getChurchColor(church).gradient} shrink-0`} />
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
                    className="w-full px-5 py-3.5 border border-slate-200 rounded-2xl focus:outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/5 shadow-sm font-medium text-slate-800 placeholder-slate-400 transition-all text-sm"
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
                    className="w-full px-5 py-3.5 border border-slate-200 rounded-2xl focus:outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/5 shadow-sm font-medium text-slate-800 placeholder-slate-400 transition-all text-sm"
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
                    className="w-full px-5 py-3.5 border border-slate-200 rounded-2xl focus:outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/5 shadow-sm font-medium text-slate-800 placeholder-slate-400 transition-all text-sm"
                    placeholder="أدخل المرحلة العمرية"
                  />
                  {errors.ageGroup && <p className="text-red-500 text-xs mt-1.5 font-bold">{errors.ageGroup}</p>}
                </div>
              </div>
            )}

            {/* STEP 2: Team Members with IDs */}
            {step === 2 && (
              <div className="p-5 sm:p-6 space-y-4 animate-fade-in">
                <div className={`border rounded-2xl p-3 text-sm font-black flex items-center gap-2 ${
                  churchColor.badge ? `${churchColor.badge} border-current/15` : 'bg-emerald-50 text-emerald-700 border-emerald-100'
                }`}>
                  <span>💡</span>
                  <span>أضف أعضاء الفريق مع رقم هوية كل عضو — الحد الأدنى {teamMemberLimits.min} أعضاء.</span>
                </div>

                {/* Add member form */}
                <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 space-y-3 shadow-2xs">
                  <label className="block text-xs font-black text-slate-600 uppercase tracking-wider">
                    أعضاء الفريق ({formData.teamMembers.length}/{teamMemberLimits.max}) *
                  </label>
                  <div className="flex flex-col sm:flex-row gap-2">
                    <input
                      type="text"
                      value={newMember.name}
                      onChange={(e) => setNewMember({ ...newMember, name: e.target.value })}
                      className="flex-1 px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:border-emerald-500 bg-white text-sm"
                      placeholder="اسم العضو"
                      onKeyDown={(e) => e.key === 'Enter' && addMember()}
                    />
                    <input
                      type="text"
                      value={newMember.id}
                      onChange={(e) => setNewMember({ ...newMember, id: e.target.value })}
                      className="flex-1 px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:border-emerald-500 bg-white text-sm"
                      placeholder="رقم الهوية"
                      onKeyDown={(e) => e.key === 'Enter' && addMember()}
                    />
                    <button
                      type="button"
                      onClick={addMember}
                      className={`px-5 py-3 ${
                        churchColor.gradient || 'bg-linear-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700'
                      } text-white rounded-xl font-black text-sm hover:scale-[1.02] active:scale-95 transition-all shrink-0 cursor-pointer shadow-sm`}
                    >
                      + إضافة
                    </button>
                  </div>
                  {errors.teamMembers && <p className="text-red-500 text-xs font-bold">{errors.teamMembers}</p>}
                </div>

                {/* Members list */}
                <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                  {formData.teamMembers.map((member, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-white border border-slate-100 rounded-xl shadow-xs transition-all hover:border-slate-200">
                      <div className="flex items-center gap-3">
                        <span className={`w-7 h-7 rounded-full ${
                          churchColor.gradient || 'bg-linear-to-r from-emerald-500 to-teal-500'
                        } text-white flex items-center justify-center text-xs font-black shadow-sm`}>
                          {index + 1}
                        </span>
                        <div>
                          <p className="text-slate-800 text-sm font-black">{member.name}</p>
                          <p className="text-slate-400 text-xs font-bold mt-0.5">الهوية: {member.id}</p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeMember(index)}
                        className="text-rose-500 hover:text-rose-700 text-xs font-bold px-3 py-1.5 rounded-lg hover:bg-rose-50/50 transition-all border border-rose-100/40 hover:border-rose-200/50 cursor-pointer"
                      >
                        حذف
                      </button>
                    </div>
                  ))}
                  {formData.teamMembers.length === 0 && (
                    <div className="text-center text-slate-400 py-10 border border-dashed border-slate-200 rounded-2xl bg-slate-50/30">
                      <svg className="w-8 h-8 text-slate-350 mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                      </svg>
                      <p className="text-sm font-bold">لم يتم إضافة أعضاء بعد</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* STEP 3: Review + Confirmation */}
            {step === 3 && (
              <div className="p-5 sm:p-6 space-y-4 animate-fade-in">
                {/* Date/Time Pickers if missing */}
                {(!formData.date || !formData.startTime) && (
                  <div className="bg-amber-50 border border-amber-100 rounded-2xl p-4 space-y-4 mb-4">
                    <p className="text-sm font-bold text-amber-850 flex items-center gap-2">
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

                {/* Creative Date/Time Ticket Badge */}
                {formData.date && formData.startTime && (
                  <div className="flex items-center justify-between p-4 bg-white border border-slate-100 rounded-2xl shadow-2xs hover:border-slate-200 transition-all">
                    <div className="flex items-center gap-3.5">
                      <div className={`w-11 h-11 rounded-xl ${
                        churchColor.gradient || 'bg-linear-to-r from-emerald-500 to-teal-600'
                      } text-white flex items-center justify-center shadow-md shrink-0`}>
                        <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                      </div>
                      <div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">الموعد المختار</p>
                        <p className="text-sm font-black text-slate-800 mt-0.5">{formData.date}</p>
                      </div>
                    </div>
                    <div className="text-left">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">الفترة الزمنية</p>
                      <span 
                        dir="ltr"
                        className={`inline-block text-xs font-black mt-1 px-3 py-1 rounded-full ${
                          churchColor.badge || 'bg-emerald-50 text-emerald-700'
                        } border border-current/10`}
                      >
                        {formData.startTime} – {formData.endTime}
                      </span>
                    </div>
                  </div>
                )}

                {/* Premium Dashboard Summary Card */}
                <div className="bg-white rounded-3xl p-5 border border-slate-100 shadow-xs">
                  <h3 className="text-sm font-black text-slate-700 mb-4 flex items-center gap-2 border-b border-slate-50 pb-2">
                    <span className={`w-2 h-5 rounded-full ${churchColor.gradient || 'bg-teal-500'} inline-block`} />
                    مراجعة بيانات الحجز
                  </h3>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
                    {[
                      { 
                        label: 'الكنيسة', 
                        value: formData.churchName,
                        icon: (
                          <svg className="w-4 h-4 text-slate-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                          </svg>
                        )
                      },
                      { 
                        label: 'المشروع', 
                        value: formData.title,
                        icon: (
                          <svg className="w-4 h-4 text-slate-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.364l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 113.536 0V21h2v-2.243a5 5 0 013.536 0z" />
                          </svg>
                        )
                      },
                      { 
                        label: 'الفريق', 
                        value: formData.teamName,
                        icon: (
                          <svg className="w-4 h-4 text-slate-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                          </svg>
                        )
                      },
                      { 
                        label: 'المرحلة العمرية', 
                        value: formData.ageGroup,
                        icon: (
                          <svg className="w-4 h-4 text-slate-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                          </svg>
                        )
                      },
                    ].map(({ label, value, icon }) => (
                      <div key={label} className="flex items-center gap-3 bg-white border border-slate-100 p-3 rounded-2xl shadow-2xs hover:border-slate-200 transition-all">
                        <div className="w-8 h-8 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center">
                          {icon}
                        </div>
                        <div className="min-w-0 flex-1">
                          <span className="text-[10px] font-bold text-slate-400 block uppercase tracking-wide leading-normal">{label}</span>
                          <span className="text-slate-800 font-black text-xs sm:text-sm truncate block mt-0.5 pb-1 leading-normal">{value || '—'}</span>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Team Members List inside Step 3 */}
                  <div className="mt-5 pt-4 border-t border-slate-100">
                    <div className="flex items-center gap-1.5 mb-3">
                      <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                      </svg>
                      <span className="text-xs font-black text-slate-700 tracking-wider">أعضاء الفريق ({formData.teamMembers.length})</span>
                    </div>
                    <div className="flex flex-wrap gap-2 max-h-30 overflow-y-auto pr-1">
                      {formData.teamMembers.map((m, i) => (
                        <div key={i} className="bg-slate-50/70 border border-slate-100 text-slate-700 text-xs font-bold pl-3 pr-2 py-1.5 rounded-xl shadow-2xs flex items-center gap-2 hover:bg-slate-50 hover:border-slate-200 transition-all duration-200 cursor-default">
                          <span className={`w-5 h-5 rounded-full ${
                            churchColor.gradient || 'bg-linear-to-r from-emerald-500 to-teal-500'
                          } text-white flex items-center justify-center text-[10px] font-black shrink-0 shadow-sm`}>
                            {i + 1}
                          </span>
                          <span>{m.name}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Footer Buttons */}
          <div className="px-6 py-4 bg-slate-50/40 flex gap-3 border-t border-slate-100 shrink-0" dir="rtl">
            {step > 1 && !(user?.role === 'user' && user?.teamDetails) && (
              <button
                onClick={handleBack}
                disabled={submitting}
                className="flex-1 py-3.5 px-6 border border-slate-200 bg-white hover:bg-slate-50 rounded-xl text-slate-600 font-bold transition-all disabled:opacity-50 cursor-pointer active:scale-95 text-xs text-center"
              >
                رجوع
              </button>
            )}
            {step < 3 ? (
              <button
                onClick={handleNext}
                className={`flex-1 py-3.5 px-6 ${
                  churchColor.gradient || 'bg-linear-to-r from-emerald-600 to-teal-600'
                } hover:brightness-105 text-white font-bold rounded-xl shadow-md transition-all cursor-pointer active:scale-95 text-xs text-center`}
              >
                التالي
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                disabled={submitting || !formData.date || !formData.startTime}
                className={`flex-1 py-3.5 px-6 ${
                  churchColor.gradient || 'bg-linear-to-r from-emerald-600 to-teal-600'
                } hover:brightness-105 text-white font-black rounded-xl shadow-lg disabled:opacity-50 disabled:brightness-100 disabled:shadow-none transition-all flex items-center justify-center gap-2 text-xs cursor-pointer active:scale-95`}
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
