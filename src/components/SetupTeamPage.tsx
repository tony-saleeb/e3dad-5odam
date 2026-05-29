'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useSettings } from '@/hooks/useSettings';
import { useSchedulerStore } from '@/store/useSchedulerStore';
import { churches, getChurchColor } from '@/data/initialData';
import { TeamMember } from '@/types';

export default function SetupTeamPage() {
  const { user, updateTeamDetails, signOut } = useAuth();
  const { settings } = useSettings();
  const { teamMemberLimits } = settings;
  const { setIsEditingTeamDetails } = useSchedulerStore();

  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const [formData, setFormData] = useState({
    churchName: '',
    title: '',
    teamName: '',
    ageGroup: '',
    teamMembers: [] as TeamMember[],
  });

  const [newMember, setNewMember] = useState({ name: '', id: '' });
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Pre-fill form if team details already exist (edit mode)
  useEffect(() => {
    if (user?.teamDetails) {
      let active = true;
      Promise.resolve().then(() => {
        if (active && user?.teamDetails) {
          setFormData({
            churchName: user.teamDetails.churchName || '',
            title: user.teamDetails.title || '',
            teamName: user.teamDetails.teamName || '',
            ageGroup: user.teamDetails.ageGroup || '',
            teamMembers: user.teamDetails.teamMembers || [],
          });
        }
      });
      return () => {
        active = false;
      };
    }
  }, [user]);

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

  const addMember = () => {
    if (!newMember.name.trim()) {
      setErrors({ teamMembers: 'اسم العضو مطلوب' });
      return;
    }
    if (!newMember.id.trim()) {
      setErrors({ teamMembers: 'كود اعداد خدام مطلوب' });
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

  const handleSubmit = async () => {
    if (!validateStep2()) return;

    setSubmitting(true);
    const success = await updateTeamDetails({
      churchName: formData.churchName,
      title: formData.title,
      teamName: formData.teamName,
      ageGroup: formData.ageGroup,
      teamMembers: formData.teamMembers,
    });
    setSubmitting(false);

    if (success) {
      setIsEditingTeamDetails(false);
    } else {
      setErrors({ global: 'حدث خطأ أثناء حفظ البيانات، يرجى المحاولة مرة أخرى.' });
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-between" dir="rtl">
      {/* Header bar */}
      <header className="bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl overflow-hidden shadow-lg shrink-0">
            <img src="/church-logo.png" alt="Logo" className="w-full h-full object-cover" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-gray-800">بيانات الفريق والمسؤول</h1>
            <p className="text-xs text-gray-400">يرجى استكمال البيانات لبدء الحجز</p>
          </div>
        </div>

        <div className="flex gap-2">
          {user?.teamDetails && (
            <button 
              onClick={() => setIsEditingTeamDetails(false)}
              className="px-4 py-2 text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-all cursor-pointer"
            >
              إلغاء التعديل
            </button>
          )}
          <button 
            onClick={signOut}
            className="px-4 py-2 text-xs font-bold text-red-600 bg-red-50 hover:bg-red-100 rounded-xl transition-all cursor-pointer"
          >
            تسجيل الخروج
          </button>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 flex items-center justify-center p-4 sm:p-6 my-auto">
        <div className="w-full max-w-2xl bg-white border border-slate-100 rounded-3xl shadow-xl overflow-hidden flex flex-col">
          {/* Progress Indicator */}
          <div className="bg-slate-50 border-b border-slate-100 px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-7 h-7 rounded-full bg-emerald-100 text-emerald-700 font-black text-xs flex items-center justify-center">
                {step}
              </span>
              <h2 className="text-sm font-bold text-slate-800">
                {step === 1 ? 'الخطوة 1: بيانات المشروع الأساسية' : 'الخطوة 2: أسماء وأرقام هوية أعضاء الفريق'}
              </h2>
            </div>
            <div className="flex gap-1.5">
              {[1, 2].map(s => (
                <div key={s} className={`h-1.5 rounded-full transition-all ${s === step ? 'w-6 bg-emerald-500' : s < step ? 'w-3 bg-emerald-500/60' : 'w-3 bg-slate-200'}`} />
              ))}
            </div>
          </div>

          {/* Form Content */}
          <div className="p-6 flex-1 min-h-87.5">
            {errors.global && (
              <div className="mb-4 bg-red-50 border border-red-100 rounded-2xl p-3 text-sm text-red-600 font-bold text-center">
                {errors.global}
              </div>
            )}

            {/* STEP 1: Basic Project Details */}
            {step === 1 && (
              <div className="space-y-4 animate-fade-in">
                {/* Church Name */}
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">اسم الكنيسة *</label>
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                      className="w-full px-5 py-3.5 border border-slate-200 rounded-2xl bg-white shadow-sm font-medium text-slate-800 flex items-center justify-between cursor-pointer transition-all hover:border-slate-300 focus:outline-none"
                    >
                      <span className="flex items-center gap-2.5">
                        {formData.churchName ? (
                          <>
                            <span className={`w-3.5 h-3.5 rounded-full bg-linear-to-r ${getChurchColor(formData.churchName).gradient} shadow-sm`} />
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
                            <span className={`w-3 h-3 bg-linear-to-r rounded-full ${getChurchColor(church).gradient} shrink-0`} />
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
                    placeholder="أدخل عنوان مشروع التخرج الخاص بالفريق"
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
                    placeholder="أدخل اسم الفريق الخاص بكم"
                  />
                  {errors.teamName && <p className="text-red-500 text-xs mt-1.5 font-bold">{errors.teamName}</p>}
                </div>

                {/* Age Group */}
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">المرحلة العمرية للفريق *</label>
                  <input
                    type="text"
                    value={formData.ageGroup}
                    onChange={(e) => setFormData({ ...formData, ageGroup: e.target.value })}
                    className="w-full px-5 py-3.5 border border-slate-200 rounded-2xl focus:outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 shadow-sm font-medium text-slate-800 placeholder-slate-400 transition-all"
                    placeholder="مثال: خريجين، جامعة، ثانوي"
                  />
                  {errors.ageGroup && <p className="text-red-500 text-xs mt-1.5 font-bold">{errors.ageGroup}</p>}
                </div>
              </div>
            )}

            {/* STEP 2: Team Members Setup */}
            {step === 2 && (
              <div className="space-y-4 animate-fade-in">
                <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-3 text-sm text-emerald-700 font-medium">
                  يرجى إضافة كافة أعضاء فريقك مع أرقام هوياتهم القومية — الحد الأدنى {teamMemberLimits.min} أعضاء.
                </div>

                {/* Add member box */}
                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-3">
                  <label className="block text-sm font-bold text-slate-700">
                    إضافة عضو جديد ({formData.teamMembers.length}/{teamMemberLimits.max}) *
                  </label>
                  <div className="flex flex-col sm:flex-row gap-2">
                    <input
                      type="text"
                      value={newMember.name}
                      onChange={(e) => setNewMember({ ...newMember, name: e.target.value })}
                      className="flex-1 px-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:border-emerald-500 bg-white text-sm"
                      placeholder="اسم العضو الرباعي"
                      onKeyDown={(e) => e.key === 'Enter' && addMember()}
                    />
                    <input
                      type="text"
                      value={newMember.id}
                      onChange={(e) => setNewMember({ ...newMember, id: e.target.value })}
                      className="flex-1 px-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:border-emerald-500 bg-white text-sm"
                      placeholder="كود اعداد خدام"
                      onKeyDown={(e) => e.key === 'Enter' && addMember()}
                    />
                    <button
                      type="button"
                      onClick={addMember}
                      className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-sm active:scale-95 transition-all shrink-0 cursor-pointer"
                    >
                      + إضافة العضو
                    </button>
                  </div>
                  {errors.teamMembers && <p className="text-red-500 text-xs font-bold">{errors.teamMembers}</p>}
                </div>

                {/* Members list */}
                <div className="space-y-2 max-h-56 overflow-y-auto">
                  {formData.teamMembers.map((member, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-white border border-slate-200 rounded-xl shadow-sm">
                      <div className="flex items-center gap-3">
                        <span className="w-7 h-7 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-xs font-black">
                          {index + 1}
                        </span>
                        <div>
                          <p className="text-slate-800 text-sm font-bold">{member.name}</p>
                          <p className="text-slate-400 text-xs">كود اعداد خدام: {member.id}</p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeMember(index)}
                        className="text-red-400 hover:text-red-600 text-xs font-bold px-2 py-1 rounded-lg hover:bg-red-50 transition-all cursor-pointer"
                      >
                        حذف العضو
                      </button>
                    </div>
                  ))}
                  {formData.teamMembers.length === 0 && (
                    <p className="text-center text-slate-400 text-sm py-6">لم يتم إضافة أعضاء فريق بعد</p>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Navigation Controls */}
          <div className="bg-slate-50 border-t border-slate-100 p-4 flex gap-3">
            {step === 2 && (
              <button
                onClick={() => setStep(1)}
                disabled={submitting}
                className="flex-1 py-3 px-6 border border-slate-200 hover:bg-slate-100/80 rounded-2xl text-slate-700 font-bold transition-all disabled:opacity-50 cursor-pointer"
              >
                السابق
              </button>
            )}

            {step === 1 ? (
              <button
                onClick={() => validateStep1() && setStep(2)}
                className="flex-1 py-3 px-6 bg-linear-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-bold rounded-2xl shadow-lg shadow-emerald-600/20 hover:-translate-y-0.5 transition-all cursor-pointer text-center"
              >
                التالي: أعضاء الفريق
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                disabled={submitting || formData.teamMembers.length < teamMemberLimits.min}
                className="flex-1 py-3 px-6 bg-linear-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-bold rounded-2xl shadow-lg shadow-emerald-600/20 hover:-translate-y-0.5 transition-all disabled:opacity-50 disabled:translate-y-0 disabled:shadow-none flex items-center justify-center gap-2 cursor-pointer"
              >
                {submitting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    جاري حفظ البيانات...
                  </>
                ) : 'حفظ بيانات الفريق والبدء في الحجز ✓'}
              </button>
            )}
          </div>
        </div>
      </main>

      {/* Footer copyright */}
      <footer className="text-center py-4 text-xs text-slate-400 shrink-0">
        اعداد خدام كنائس وسط القاهرة &copy; {new Date().getFullYear()}
      </footer>
    </div>
  );
}
