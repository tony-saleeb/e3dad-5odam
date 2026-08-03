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
import BookingReviewCard from './BookingReviewCard';

interface AllowedUser {
  email: string;
  name: string;
  role: 'user' | 'admin';
  teamDetails?: {
    churchName: string;
    teamName: string;
    title: string;
    ageGroup: string;
    teamMembers: TeamMember[];
  };
}

// Persistent caching layer to minimize Firestore read operations and reduce billing costs
let cachedAllowedUsers: AllowedUser[] | null = null;
let cacheExpirationTime = 0;

export default function BookingModal() {
  const { isAdmin, isChurchLeader, user } = useAuth();
  const { settings } = useSettings();
  const { teamMemberLimits } = settings;
  const { addBooking, isPeriodBooked, hasUserAlreadyBooked, bookings } = useBookings();
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

  // Admin-only auto-fill states
  const [allowedUsers, setAllowedUsers] = useState<AllowedUser[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [selectedUser, setSelectedUser] = useState<AllowedUser | null>(null);
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [isUserDropdownOpen, setIsUserDropdownOpen] = useState(false);

  const filteredAllowedUsers = allowedUsers.filter(u => {
    if (!u.teamDetails) return false;
    // For church leaders, only show teams from their own church
    if (isChurchLeader && u.teamDetails.churchName !== user?.churchName) {
      return false;
    }
    const alreadyBooked = bookings.some(b => 
      (b.requesterEmail || '').toLowerCase() === u.email.toLowerCase() && 
      b.status !== 'rejected'
    );
    return !alreadyBooked;
  });

  useEffect(() => {
    const fetchAllowedUsers = async () => {
      if (!isBookingModalOpen || (!isAdmin && !isChurchLeader)) return;

      const now = Date.now();
      if (cachedAllowedUsers && now < cacheExpirationTime) {
        setAllowedUsers(cachedAllowedUsers);
        return;
      }

      setLoadingUsers(true);
      try {
        let snap;
        if (isAdmin) {
          snap = await getDocs(collection(db, 'allowed_users'));
        } else if (isChurchLeader && user?.churchName) {
          const q = query(
            collection(db, 'allowed_users'),
            where('role', '==', 'user'),
            where('teamDetails.churchName', '==', user.churchName)
          );
          snap = await getDocs(q);
        } else {
          return;
        }

        const users = snap.docs.map(d => ({
          email: d.id,
          ...d.data(),
        })) as AllowedUser[];
        // Filter users who have teamDetails
        const usersWithDetails = users.filter(u => u.teamDetails);

        // Cache the result for 3 minutes
        cachedAllowedUsers = usersWithDetails;
        cacheExpirationTime = now + 3 * 60 * 1000;

        setAllowedUsers(usersWithDetails);
      } catch (err) {
        console.error('Error fetching allowed users in BookingModal:', err);
      } finally {
        setLoadingUsers(false);
      }
    };

    fetchAllowedUsers();
  }, [isBookingModalOpen, isAdmin, isChurchLeader, user?.churchName]);

  useEffect(() => {
    if (isBookingModalOpen) {
      const isNormalUser = user?.role === 'user' && user?.teamDetails;
      const isChurchLeaderUser = user?.role === 'church_leader';
      setStep(isNormalUser ? 3 : 1);
      setErrors({});
      setFormData({
        churchName: isChurchLeaderUser ? (user?.churchName || '') : (user?.teamDetails?.churchName || ''),
        title: isNormalUser ? (user?.teamDetails?.title || '') : '',
        teamName: isNormalUser ? (user?.teamDetails?.teamName || '') : '',
        ageGroup: isNormalUser ? (user?.teamDetails?.ageGroup || '') : '',
        teamMembers: isNormalUser ? (user?.teamDetails?.teamMembers || []) : [],
        date: selectedDate,
        startTime: selectedStartTime || '',
        endTime: selectedEndTime || '',
      });
      setNewMember({ name: '', id: '' });
      setSelectedUser(null);
      setUserSearchQuery('');
      setIsUserDropdownOpen(false);
    }
  }, [isBookingModalOpen, selectedDate, selectedStartTime, selectedEndTime, user]);

  // Escape key listener for accessibility
  useEffect(() => {
    if (!isBookingModalOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        closeBookingModal();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isBookingModalOpen, closeBookingModal]);

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
    if (selectedUser) {
      setSelectedUser(null);
      setFormData({
        ...formData,
        churchName: '',
        title: '',
        teamName: '',
        ageGroup: '',
        teamMembers: [],
      });
      setStep(1);
    } else if (step > 1) {
      setStep(step - 1);
    }
  };

  const { toast } = useToast();

  const handleSubmit = async () => {
    if (!validateStep3()) return;

    // 1. Local check (fast) — skip for admins and church leaders (they book on behalf of others)
    if (!isAdmin && !isChurchLeader && user?.email && hasUserAlreadyBooked(user.email)) {
      toast.error('عذراً، يسمح لكل مستخدم بحجز واحد فقط.');
      return;
    }

    setSubmitting(true);
    try {
      // 2. Server-side double check (secure via Firestore) — skip for admins and church leaders
      if (!isAdmin && !isChurchLeader && user?.email) {
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

      const requesterEmail = ((isAdmin || isChurchLeader) && selectedUser) ? selectedUser.email.toLowerCase() : (user?.email || '');
      const primaryLeader = formData.teamMembers[0]?.name || ((isAdmin || isChurchLeader) && selectedUser ? selectedUser.name : '') || user?.displayName || 'مجهول';

      await addBooking({
        title: formData.title,
        requesterName: primaryLeader,
        requesterEmail: requesterEmail,
        serviceId: 'church-adaptation',
        roomId: 'church-adaptation',
        date: formData.date,
        startTime: formData.startTime,
        endTime: formData.endTime,
        churchName: formData.churchName,
        teamName: formData.teamName,
        ageGroup: formData.ageGroup,
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

  if (!isBookingModalOpen) return null;

  const stepTitles = ['البيانات الأساسية', 'أعضاء الفريق', 'مراجعة وتأكيد'];
  const churchColor = getChurchColor(formData.churchName);

  if (isAdmin || isChurchLeader) {
    const headerGradient = isChurchLeader 
      ? (getChurchColor(user?.churchName || '').gradient || 'bg-linear-to-r from-emerald-500 to-teal-600')
      : 'bg-linear-to-r from-slate-800 to-slate-900';
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4" dir="rtl">
        {/* Backdrop with modern glassmorphism blur */}
        <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-md" onClick={closeBookingModal} />

        {/* Main card modal with premium scale-in animation */}
        <div 
          className="relative w-full max-w-2xl sm:max-h-[90vh] animate-scale-in transition-all duration-300 z-10 shadow-2xl"
        >
          <div className="bg-white rounded-[28px] overflow-hidden border border-slate-100/80 max-h-[85vh] sm:max-h-[88vh] flex flex-col scrollbar-hide shadow-xl">

            {/* Premium Slate Header */}
            <div className={`relative px-6 py-5 ${headerGradient} text-white shadow-lg overflow-hidden shrink-0`}>
              <div className="absolute inset-0 opacity-10 bg-[linear-gradient(to_right,#808080_1px,transparent_1px),linear-gradient(to_bottom,#808080_1px,transparent_1px)] bg-size-[14px_24px]" />
              <div className="relative flex justify-between items-center gap-3">
                <div>
                  <h2 className="text-xl sm:text-2xl font-black tracking-tight leading-normal pb-1 drop-shadow-xs">
                    {selectedUser 
                      ? (isChurchLeader ? "تحديد موعد الحجز للمجموعة" : "تحديد موعد الحجز للخادم") 
                      : (isChurchLeader ? "اختيار مجموعة لحجز موعد لها" : "اختيار خادم لحجز موعد له")}
                  </h2>
                  <p className="text-slate-300 text-[11px] font-bold mt-0.5">
                    {selectedUser 
                      ? (isChurchLeader ? `حجز موعد للمجموعة: ${selectedUser.name}` : `حجز موعد للخادم: ${selectedUser.name}`) 
                      : (isChurchLeader ? "اختر مجموعة مسجلة من كنيستك لتأكيد حجز موعد لها مباشرة" : "اختر خادماً مسجلاً من القائمة لتأكيد حجز موعد له مباشرة")}
                  </p>
                </div>
                <button 
                  onClick={closeBookingModal} 
                  className="w-8 h-8 flex items-center justify-center rounded-full bg-white/15 hover:bg-white/30 text-white font-medium text-lg shrink-0 transition-all duration-200 active:scale-90 cursor-pointer"
                  aria-label="close"
                >
                  &times;
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto scrollbar-hide" dir="rtl">
              {!selectedUser ? (
                /* 1. LIST OF USERS STATE */
                <div className="p-6 space-y-4 animate-fade-in flex flex-col h-full max-h-[60vh]">
                  <div className="relative">
                    <input
                      type="text"
                      value={userSearchQuery}
                      onChange={(e) => setUserSearchQuery(e.target.value)}
                      className="w-full px-5 py-3.5 border border-slate-200 rounded-2xl focus:outline-none focus:border-slate-800 focus:ring-4 focus:ring-slate-800/5 shadow-sm font-medium text-slate-800 placeholder-slate-400 transition-all text-sm pl-10"
                      placeholder={loadingUsers 
                        ? (isChurchLeader ? "جاري تحميل قائمة مجموعات الكنيسة..." : "جاري تحميل قائمة الخدام...") 
                        : (isChurchLeader ? "ابحث عن اسم المسؤول أو اسم المجموعة..." : "ابحث عن خادم بالاسم أو البريد الإلكتروني...")}
                      disabled={loadingUsers}
                    />
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                      </svg>
                    </div>
                  </div>

                  <div className="flex-1 overflow-y-auto space-y-2.5 pr-1 max-h-[42vh] scrollbar-hide mt-1">
                    {loadingUsers ? (
                      <div className="text-center py-12">
                        <div className="w-8 h-8 border-4 border-slate-800 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                        <p className="text-slate-400 text-xs font-bold">جاري تحميل القائمة...</p>
                      </div>
                    ) : filteredAllowedUsers.filter(u => 
                      u.name.toLowerCase().includes(userSearchQuery.toLowerCase()) || 
                      u.email.toLowerCase().includes(userSearchQuery.toLowerCase()) ||
                      (u.teamDetails?.teamName || '').toLowerCase().includes(userSearchQuery.toLowerCase())
                    ).length === 0 ? (
                      <div className="text-center py-16 border border-dashed border-slate-200 rounded-3xl bg-slate-50/50">
                        <svg className="w-10 h-10 text-slate-300 mx-auto mb-3 animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.109A11.978 11.978 0 0112 20.25a11.962 11.962 0 01-3-1.013v-.11c0-1.113.285-2.16.786-3.07M7 10.375a3 3 0 11-6 0 3 3 0 016 0zM1.499 15.3a2.5 2.5 0 014.5-1.5M10.25 6.25a2.625 2.625 0 115.25 0 2.625 2.625 0 01-5.25 0zM16.5 10.25a2.625 2.625 0 115.25 0 2.625 2.625 0 01-5.25 0z" />
                        </svg>
                        <p className="text-slate-500 text-sm font-black">
                          {isChurchLeader ? "لا يوجد مجموعات غير محجوزة متاحين حالياً لكنيستك" : "لا يوجد خدام متاحين للحجز حالياً"}
                        </p>
                        <p className="text-slate-400 text-xs font-bold mt-1">
                          {isChurchLeader 
                            ? "جميع مجموعات كنيستك المسجلة لديها حجز مفعل بالفعل، أو لم تقم بتعبئة بياناتها بعد." 
                            : "جميع الخدام المسجلين لديهم حجز مفعل بالفعل، أو لم يقوموا بتعبئة بياناتهم بعد."}
                        </p>
                      </div>
                    ) : (
                      filteredAllowedUsers
                        .filter(u => 
                          u.name.toLowerCase().includes(userSearchQuery.toLowerCase()) || 
                          u.email.toLowerCase().includes(userSearchQuery.toLowerCase()) ||
                          (u.teamDetails?.teamName || '').toLowerCase().includes(userSearchQuery.toLowerCase())
                        )
                        .map((u) => (
                          <div
                            key={u.email}
                            onClick={() => {
                              setSelectedUser(u);
                              if (u.teamDetails) {
                                setFormData({
                                  ...formData,
                                  churchName: u.teamDetails.churchName || '',
                                  title: u.teamDetails.title || '',
                                  teamName: u.teamDetails.teamName || '',
                                  ageGroup: u.teamDetails.ageGroup || '',
                                  teamMembers: u.teamDetails.teamMembers || [],
                                });
                              }
                            }}
                            className="flex items-center justify-between p-4 bg-white border border-slate-100 rounded-2xl cursor-pointer hover:border-slate-350 hover:bg-slate-50/50 transition-all duration-200 shadow-2xs hover:shadow-xs active:scale-[0.99]"
                          >
                            <div className="flex items-center gap-3.5">
                              <span className="w-10 h-10 rounded-full bg-slate-750 text-white flex items-center justify-center text-sm font-bold shadow-xs">👤</span>
                              <div>
                                <p className="text-slate-800 font-black text-sm leading-normal pb-0.5">{u.name}</p>
                                <p className="text-slate-400 text-xs font-bold leading-none">{u.email}</p>
                              </div>
                            </div>
                            <div className="text-left shrink-0 flex flex-col gap-1 items-end">
                              {u.teamDetails?.churchName && (
                                <span className="inline-block text-[10px] font-black px-2.5 py-1 rounded-lg bg-slate-100 text-slate-750 border border-slate-200/60 leading-none shadow-3xs">
                                  {u.teamDetails.churchName}
                                </span>
                              )}
                              {u.teamDetails?.teamName && (
                                <p className="text-[11px] font-bold text-slate-500 leading-none">{u.teamDetails.teamName}</p>
                              )}
                            </div>
                          </div>
                        ))
                    )}
                  </div>
                </div>
              ) : (
                /* 2. DATE/TIME SELECTOR & DETAILS VIEW STATE */
                <div className="p-5 sm:p-6 space-y-5 animate-fade-in">
                  
                  {/* Selected User Header Banner */}
                  <div className="flex items-center justify-between p-4 bg-slate-800 text-white rounded-2xl shadow-md border border-slate-700/30">
                    <div className="flex items-center gap-3">
                      <span className="w-10 h-10 rounded-full bg-white/15 text-white flex items-center justify-center text-sm font-bold shadow-xs">👤</span>
                      <div>
                        <p className="text-white text-sm font-black leading-normal pb-0.5">{selectedUser.name}</p>
                        <p className="text-white/70 text-xs font-bold leading-none">{selectedUser.email}</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedUser(null);
                        setFormData({
                          ...formData,
                          churchName: '',
                          title: '',
                          teamName: '',
                          ageGroup: '',
                          teamMembers: [],
                        });
                      }}
                      className="text-white hover:text-white/80 text-xs font-black px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 transition-all border border-white/15 cursor-pointer active:scale-95 leading-none shadow-3xs"
                    >
                      تغيير
                    </button>
                  </div>

                  {/* Creative Date/Time Ticket Badge */}
                  {formData.date && (
                    <div className="flex items-center justify-between p-4 bg-white border border-slate-150 rounded-2xl shadow-2xs hover:border-slate-250 transition-all">
                      <div className="flex items-center gap-3.5">
                        <div className={`w-11 h-11 rounded-xl bg-linear-to-r from-slate-700 to-slate-800 text-white flex items-center justify-center shadow-md shrink-0`}>
                          <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                        </div>
                        <div>
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">الموعد المختار</p>
                          <p className="text-sm font-black text-slate-800 mt-0.5">{formData.date}</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Date & Time Interactive Block Visualizer */}
                  <div className="bg-slate-50 border border-slate-200/60 rounded-2xl p-5 space-y-5 shadow-3xs animate-fade-in">
                    <p className="text-sm font-black text-slate-800 flex items-center gap-2 border-b border-slate-200/60 pb-3">
                      <svg className="w-5 h-5 text-slate-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      تحديد موعد الحجز
                    </p>
                    
                    <div>
                      <label className="text-[11px] font-black text-slate-650 block mb-2">1. حدد التاريخ</label>
                      <input 
                        type="date" 
                        value={formData.date}
                        onChange={(e) => setFormData(prev => ({ ...prev, date: e.target.value, startTime: '', endTime: '' }))}
                        className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-800 focus:outline-none focus:border-slate-800 focus:ring-4 focus:ring-slate-800/5 transition-all cursor-pointer shadow-3xs"
                      />
                    </div>
                  </div>

                  {/* Registered Details Card */}
                  {selectedUser.teamDetails && (
                    <BookingReviewCard
                      churchName={selectedUser.teamDetails.churchName}
                      title={selectedUser.teamDetails.title}
                      teamName={selectedUser.teamDetails.teamName}
                      ageGroup={selectedUser.teamDetails.ageGroup}
                      teamMembers={selectedUser.teamDetails.teamMembers}
                      titleText={isChurchLeader ? "بيانات المشروع المسجلة للمجموعة" : "بيانات المشروع المسجلة للخادم"}
                    />
                  )}
                </div>
              )}
            </div>

            {/* Footer Actions (Only visible in Selected state for Admins/Church Leaders) */}
            {selectedUser && (
              <div className="px-6 py-4 bg-slate-50/40 flex gap-3 border-t border-slate-100 shrink-0 animate-fade-in" dir="rtl">
                <button
                  onClick={() => {
                    setSelectedUser(null);
                    setFormData({
                      ...formData,
                      churchName: '',
                      title: '',
                      teamName: '',
                      ageGroup: '',
                      teamMembers: [],
                    });
                  }}
                  disabled={submitting}
                  className="flex-1 py-3.5 px-6 border border-slate-200 bg-white hover:bg-slate-50 rounded-xl text-slate-650 font-bold transition-all disabled:opacity-50 cursor-pointer active:scale-95 text-xs text-center shadow-3xs"
                >
                  إلغاء وتغيير
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={submitting || !formData.date}
                  className={`flex-1 py-3.5 px-6 ${
                    isChurchLeader 
                      ? (getChurchColor(user?.churchName || '').gradient || 'bg-linear-to-r from-emerald-600 to-teal-600 hover:brightness-105')
                      : 'bg-linear-to-r from-slate-800 to-slate-900 hover:brightness-105'
                  } text-white font-black rounded-xl shadow-lg disabled:opacity-50 disabled:brightness-100 disabled:shadow-none transition-all flex items-center justify-center gap-2 text-xs cursor-pointer active:scale-95`}
                >
                  {submitting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      جاري الإرسال...
                    </>
                  ) : (isChurchLeader ? 'تأكيد حجز المجموعة ✓' : 'تأكيد الحجز للخادم ✓')}
                </button>
              </div>
            )}

          </div>
        </div>
      </div>
    );
  }

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
                {/* Admin Select User to Autofill */}
                {isAdmin && (
                  <div className="bg-slate-50 border border-slate-200/60 rounded-2xl p-4.5 space-y-3.5 shadow-2xs">
                    <label className="block text-sm font-black text-slate-700">اختيار خادم مسجل لتعبئة البيانات تلقائياً</label>
                    <div className="relative">
                      {selectedUser ? (
                        <div className="flex items-center justify-between p-3.5 bg-white border border-slate-200 rounded-2xl shadow-sm">
                          <div className="flex items-center gap-3">
                            <span className="w-9 h-9 rounded-full bg-slate-700 text-white flex items-center justify-center text-sm font-bold">👤</span>
                            <div>
                              <p className="text-slate-800 text-sm font-black">{selectedUser.name}</p>
                              <p className="text-slate-500 text-xs font-bold mt-0.5">{selectedUser.email}</p>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedUser(null);
                              setFormData({
                                ...formData,
                                churchName: '',
                                title: '',
                                teamName: '',
                                ageGroup: '',
                                teamMembers: [],
                              });
                            }}
                            className="text-slate-600 hover:text-slate-800 text-xs font-black px-3.5 py-2 rounded-xl hover:bg-slate-50 border border-slate-200 transition-all cursor-pointer shadow-3xs active:scale-95"
                          >
                            تغيير / تعبئة يدوية
                          </button>
                        </div>
                      ) : (
                        <div className="relative">
                          <div className="relative">
                            <input
                              type="text"
                              value={userSearchQuery}
                              onChange={(e) => {
                                setUserSearchQuery(e.target.value);
                                setIsUserDropdownOpen(true);
                              }}
                              onFocus={() => setIsUserDropdownOpen(true)}
                              className="w-full px-5 py-3.5 border border-slate-200 rounded-2xl focus:outline-none focus:border-slate-800 focus:ring-4 focus:ring-slate-800/5 shadow-sm font-medium text-slate-800 placeholder-slate-400 transition-all text-sm pl-10"
                              placeholder={loadingUsers ? "جاري تحميل قائمة الخدام..." : "ابحث عن خادم بالاسم أو البريد الإلكتروني..."}
                              disabled={loadingUsers}
                            />
                            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                              </svg>
                            </div>
                          </div>

                          {/* Users dropdown list */}
                          {isUserDropdownOpen && (
                            <>
                              <div className="fixed inset-0 z-40" onClick={() => setIsUserDropdownOpen(false)} />
                              <div className="absolute z-50 mt-2 w-full bg-white border border-slate-200 rounded-2xl shadow-xl max-h-60 overflow-y-auto animate-scale-in p-1.5">
                                {filteredAllowedUsers.filter(u => 
                                  u.name.toLowerCase().includes(userSearchQuery.toLowerCase()) || 
                                  u.email.toLowerCase().includes(userSearchQuery.toLowerCase())
                                ).length === 0 ? (
                                  <div className="text-center py-6 text-slate-400 text-sm font-bold">
                                    لا يوجد خدام مسجلين يطابقون البحث
                                  </div>
                                ) : (
                                  filteredAllowedUsers
                                    .filter(u => 
                                      u.name.toLowerCase().includes(userSearchQuery.toLowerCase()) || 
                                      u.email.toLowerCase().includes(userSearchQuery.toLowerCase())
                                    )
                                    .map((u, idx) => (
                                      <div
                                        key={idx}
                                        onClick={() => {
                                          setSelectedUser(u);
                                          setIsUserDropdownOpen(false);
                                          setUserSearchQuery('');
                                          if (u.teamDetails) {
                                            setFormData({
                                              ...formData,
                                              churchName: u.teamDetails.churchName || '',
                                              title: u.teamDetails.title || '',
                                              teamName: u.teamDetails.teamName || '',
                                              ageGroup: u.teamDetails.ageGroup || '',
                                              teamMembers: u.teamDetails.teamMembers || [],
                                            });
                                            // Jump directly to Step 3 for quick booking!
                                            setStep(3);
                                          }
                                        }}
                                        className="flex items-center justify-between px-4 py-3.5 rounded-xl cursor-pointer transition-all hover:bg-slate-50 text-slate-800"
                                      >
                                        <div className="flex items-center gap-3">
                                          <span className="w-8 h-8 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center text-xs font-bold">👤</span>
                                          <div>
                                            <p className="text-slate-800 font-black text-sm">{u.name}</p>
                                            <p className="text-slate-400 text-[11px] font-bold mt-0.5">{u.email}</p>
                                          </div>
                                        </div>
                                        <div className="text-left shrink-0">
                                          {u.teamDetails?.churchName && (
                                            <span className="inline-block text-[10px] font-black px-2.5 py-1 rounded-lg bg-slate-100 text-slate-650 border border-slate-200/60">
                                              {u.teamDetails.churchName}
                                            </span>
                                          )}
                                        </div>
                                      </div>
                                    ))
                                )}
                              </div>
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Church Name */}
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">اسم الكنيسة *</label>
                  <div className="relative">
                    <button
                      type="button"
                      disabled={isChurchLeader && !isAdmin}
                      onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                      className={`w-full px-5 py-3.5 border border-slate-200 rounded-2xl bg-white shadow-sm font-medium text-slate-800 flex items-center justify-between cursor-pointer transition-all hover:border-slate-300 ${
                        isChurchLeader && !isAdmin ? 'opacity-85 bg-slate-50/80 cursor-not-allowed border-slate-200/50' : ''
                      }`}
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
                      {(!isChurchLeader || isAdmin) && (
                        <svg className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${isDropdownOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      )}
                    </button>

                    {isDropdownOpen && (!isChurchLeader || isAdmin) && (
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
                            <span className={`w-3.5 h-3.5 rounded-full bg-linear-to-r ${getChurchColor(church).gradient} shrink-0`} />
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
                      placeholder="كود اعداد خدام"
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
                          <p className="text-slate-400 text-xs font-bold mt-0.5">كود اعداد خدام: {member.id}</p>
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
                {(!formData.date) && (
                  <div className="bg-amber-50 border border-amber-200/60 rounded-2xl p-5 space-y-5 shadow-3xs animate-fade-in mb-4">
                    <p className="text-sm font-black text-amber-800 flex items-center gap-2 border-b border-amber-200/60 pb-3">
                      <svg className="w-5 h-5 text-amber-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      يرجى تحديد التاريخ
                    </p>
                    
                    <div>
                      <label className="text-[11px] font-black text-amber-800 block mb-2">اختر التاريخ</label>
                      <input 
                        type="date" 
                        value={formData.date}
                        onChange={(e) => setFormData(prev => ({ ...prev, date: e.target.value }))}
                        className="w-full bg-white border border-amber-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-800 focus:outline-none focus:border-amber-500 focus:ring-4 focus:ring-amber-500/10 transition-all cursor-pointer shadow-3xs"
                      />
                    </div>
                  </div>
                )}

                {/* Date Display */}
                {formData.date && (
                  <div className="flex items-center justify-between p-4 bg-white border border-slate-150 rounded-2xl shadow-2xs hover:border-slate-250 transition-all mb-4">
                    <div className="flex items-center gap-3.5">
                      <div className={`w-11 h-11 rounded-xl ${
                        churchColor.gradient || 'bg-linear-to-r from-emerald-600 to-teal-700'
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
                  </div>
                )}

                {/* Premium Dashboard Summary Card */}
                <BookingReviewCard
                  churchName={formData.churchName}
                  title={formData.title}
                  teamName={formData.teamName}
                  ageGroup={formData.ageGroup}
                  teamMembers={formData.teamMembers}
                  titleText="مراجعة بيانات الحجز"
                  accentGradient={churchColor.gradient || 'bg-linear-to-r from-emerald-500 to-teal-500'}
                  accentBarColor={churchColor.gradient || 'bg-teal-500'}
                />
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
                disabled={submitting || !formData.date}
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
