'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useBookings } from '@/hooks/useBookings';
import { useSchedulerStore } from '@/store/useSchedulerStore';
import { services, rooms, timePeriods, churches, getChurchColor } from '@/data/initialData';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import InlineCalendar from './InlineCalendar';
import { useToast } from './Toast';

export default function BookingModal() {
  const { user } = useAuth();
  const { addBooking, isPeriodBooked } = useBookings();
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
  
  // CHURCH ADAPTATION: Form data modified based on new user prompt
  const [formData, setFormData] = useState({
    churchName: '',
    title: '', // Acts as Project Title
    teamName: '',
    ageGroup: '',
    requesterName: '', // Legacy support
    teammates: [] as string[],
    date: selectedDate,
    startTime: '',
    endTime: '',
  });

  const [newTeammate, setNewTeammate] = useState('');
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
        requesterName: '',
        teammates: [],
        date: selectedDate,
        startTime: selectedStartTime || '',
        endTime: selectedEndTime || '',
      });
      setNewTeammate('');
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

  // CHURCH ADAPTATION: Enforce minimum of 3 teammates
  const validateStep2 = () => {
    const newErrors: Record<string, string> = {};
    if (formData.teammates.length < 3) {
      newErrors.teammates = 'يجب إضافة 3 أعضاء على الأقل';
    }
    if (formData.teammates.length > 20) {
      newErrors.teammates = 'الحد الأقصى للمشاركين هو 20';
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
    else if (step === 3) handleSubmit();
  };

  const handleBack = () => {
    if (step > 1) setStep(step - 1);
  };

  const { toast } = useToast();

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      // Set the requesterName as the first teammate
      const primaryLeader = formData.teammates[0] || 'مجهول';

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
        teammates: formData.teammates,
      });

      toast.success(`تم تسجيل الحجز بنجاح`);
      closeBookingModal();
    } catch (error) {
      console.error('Error creating booking:', error);
      toast.error('فشل في إنشاء الحجز. يرجى المحاولة مرة أخرى.');
    } finally {
      setSubmitting(false);
    }
  };

  const addTeammate = () => {
    if (!newTeammate.trim()) return;
    if (formData.teammates.length >= 20) {
      setErrors({ teammates: 'الحد الأقصى للمشاركين هو 20' });
      return;
    }
    setFormData({
      ...formData,
      teammates: [...formData.teammates, newTeammate.trim()],
    });
    setNewTeammate('');
    setErrors({});
  };

  const removeTeammate = (index: number) => {
    const updated = [...formData.teammates];
    updated.splice(index, 1);
    setFormData({ ...formData, teammates: updated });
  };

  if (!isBookingModalOpen) return null;

  const stepTitles = ['البيانات الأساسية', 'أسماء المشاركين', 'مراجعة'];

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={closeBookingModal} />

      <div className="relative w-full h-[92vh] sm:h-auto sm:max-h-[85vh] md:max-w-4xl transition-all duration-300">
        <div className="bg-white rounded-t-[1.5rem] sm:rounded-[2rem] shadow-[0_25px_50px_-12px_rgba(0,0,0,0.25)] flex flex-col h-full overflow-hidden border border-slate-100">
          <div className="px-4 sm:px-8 py-4 sm:py-5 bg-gradient-to-r from-emerald-600 to-teal-700 text-white flex justify-between items-center shadow-md shadow-emerald-900/10" dir="rtl">
            <div>
              <h2 className="text-xl sm:text-2xl font-black tracking-tight">{stepTitles[step - 1]}</h2>
              <p className="text-emerald-100/80 text-[10px] sm:text-xs font-semibold mt-0.5 uppercase tracking-wide">إعداد حجز الكنائس</p>
            </div>
            <button onClick={closeBookingModal} className="w-8 h-8 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 text-white hover:scale-105 transition-all font-medium text-lg">&times;</button>
          </div>

          <div className="flex-1 p-4 sm:p-6 pb-24 sm:pb-20 overflow-y-auto" dir="rtl">
            {step === 1 && (
              <div className="space-y-6 animate-fade-in py-4 px-2">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2 tracking-wide">اسم الكنيسة *</label>
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                      className="w-full px-5 py-3.5 border border-slate-200 rounded-2xl focus:outline-none bg-white shadow-sm font-medium text-slate-800 flex items-center justify-between cursor-pointer transition-all hover:border-slate-300"
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
                  {errors.churchName && <p className="text-red-500 text-xs mt-1.5 font-bold flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-red-500 inline-block" />{errors.churchName}</p>}
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2 tracking-wide">عنوان المشروع *</label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    className="w-full px-5 py-3.5 border border-slate-200 rounded-2xl focus:outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 shadow-sm font-medium text-slate-800 placeholder-slate-400 transition-all"
                    placeholder="أدخل عنوان المشروع"
                  />
                  {errors.title && <p className="text-red-500 text-xs mt-1.5 font-bold flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-red-500 inline-block" />{errors.title}</p>}
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2 tracking-wide">اسم الفريق *</label>
                  <input
                    type="text"
                    value={formData.teamName}
                    onChange={(e) => setFormData({ ...formData, teamName: e.target.value })}
                    className="w-full px-5 py-3.5 border border-slate-200 rounded-2xl focus:outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 shadow-sm font-medium text-slate-800 placeholder-slate-400 transition-all"
                    placeholder="أدخل اسم الفريق"
                  />
                  {errors.teamName && <p className="text-red-500 text-xs mt-1.5 font-bold flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-red-500 inline-block" />{errors.teamName}</p>}
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2 tracking-wide">المرحلة العمرية *</label>
                  <input
                    type="text"
                    value={formData.ageGroup}
                    onChange={(e) => setFormData({ ...formData, ageGroup: e.target.value })}
                    className="w-full px-5 py-3.5 border border-slate-200 rounded-2xl focus:outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 shadow-sm font-medium text-slate-800 placeholder-slate-400 transition-all"
                    placeholder="أدخل المرحلة العمرية"
                  />
                  {errors.ageGroup && <p className="text-red-500 text-xs mt-1.5 font-bold flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-red-500 inline-block" />{errors.ageGroup}</p>}
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-4 animate-fade-in">
                <label className="block text-sm font-semibold text-gray-700 mb-1">أسماء المشاركين ({formData.teammates.length}/20) *</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newTeammate}
                    onChange={(e) => setNewTeammate(e.target.value)}
                    className="flex-1 px-4 py-2 border rounded-xl focus:outline-none focus:border-emerald-500"
                    placeholder="أدخل اسم المشارك"
                    onKeyDown={(e) => e.key === 'Enter' && addTeammate()}
                  />
                  <button type="button" onClick={addTeammate} className="px-4 bg-emerald-600 text-white rounded-xl">إضافة</button>
                </div>
                {errors.teammates && <p className="text-red-500 text-xs mt-1">{errors.teammates}</p>}

                <div className="mt-4 space-y-2">
                  {formData.teammates.map((name, index) => (
                    <div key={index} className="flex justify-between items-center p-2 bg-gray-50 rounded-xl">
                      <span className="text-gray-800 text-sm">{name}</span>
                      <button type="button" onClick={() => removeTeammate(index)} className="text-red-500 text-sm font-bold">حذف</button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="space-y-6 animate-fade-in py-4 px-2">
                <div className="bg-slate-50 rounded-[2rem] p-6 sm:p-8 border border-slate-100 shadow-inner">
                  <h3 className="text-xl font-black text-slate-800 mb-6 flex items-center gap-2 border-b border-slate-200/60 pb-3">
                    <span className="w-2.5 h-6 rounded-full bg-emerald-500 inline-block"></span>
                    ملخص الحجز
                  </h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6 text-sm text-slate-600">
                    <div className="space-y-1">
                      <span className="text-xs font-bold text-slate-400 block uppercase tracking-wider">اسم الكنيسة</span>
                      <span className="text-base font-black text-slate-800">{formData.churchName}</span>
                    </div>
                    
                    <div className="space-y-1">
                      <span className="text-xs font-bold text-slate-400 block uppercase tracking-wider">عنوان المشروع</span>
                      <span className="text-base font-black text-slate-800">{formData.title}</span>
                    </div>

                    <div className="space-y-1">
                      <span className="text-xs font-bold text-slate-400 block uppercase tracking-wider">اسم الفريق</span>
                      <span className="text-base font-black text-slate-800">{formData.teamName}</span>
                    </div>

                    <div className="space-y-1">
                      <span className="text-xs font-bold text-slate-400 block uppercase tracking-wider">المرحلة العمرية</span>
                      <span className="text-base font-black text-slate-800">{formData.ageGroup}</span>
                    </div>

                    <div className="space-y-1">
                      <span className="text-xs font-bold text-slate-400 block uppercase tracking-wider">التاريخ</span>
                      <span className="text-base font-bold text-emerald-700 bg-emerald-50/50 border border-emerald-200/50 px-3.5 py-1.5 rounded-xl inline-block mt-1">{formData.date}</span>
                    </div>

                    <div className="space-y-1">
                      <span className="text-xs font-bold text-slate-400 block uppercase tracking-wider">الفترة المحددة</span>
                      <span className="text-base font-bold text-teal-700 bg-teal-50/50 border border-teal-200/50 px-3.5 py-1.5 rounded-xl inline-block mt-1">{formData.startTime} – {formData.endTime}</span>
                    </div>
                  </div>

                  <div className="mt-8 pt-5 border-t border-slate-200/60 space-y-2">
                    <span className="text-xs font-bold text-slate-400 block uppercase tracking-wider mb-2">المشاركون ({formData.teammates.length})</span>
                    <div className="flex flex-wrap gap-2">
                      {formData.teammates.map((name, idx) => (
                        <span key={idx} className="bg-white border border-slate-200 text-slate-700 text-xs font-bold px-3.5 py-2 rounded-xl shadow-sm hover:border-slate-300 transition-all">{name}</span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="px-8 py-5 bg-slate-50 flex gap-4 border-t border-slate-100" dir="rtl">
            {step > 1 && (
              <button 
                onClick={handleBack} 
                disabled={submitting} 
                className="flex-1 py-3.5 px-6 border border-slate-200 hover:bg-slate-100/80 rounded-2xl text-slate-700 font-bold transition-all disabled:opacity-50"
              >
                رجوع
              </button>
            )}
            <button 
              onClick={handleNext} 
              disabled={submitting} 
              className="flex-1 py-3.5 px-6 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-bold rounded-2xl shadow-lg shadow-emerald-600/20 hover:shadow-xl hover:shadow-emerald-600/30 hover:-translate-y-0.5 transition-all disabled:opacity-50 disabled:translate-y-0 disabled:shadow-none"
            >
              {submitting ? 'جاري الإرسال...' : (step === 3 ? 'تأكيد الحجز' : 'التالي')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
