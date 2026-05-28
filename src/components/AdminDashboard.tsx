'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useSchedulerStore } from '@/store/useSchedulerStore';
import { db } from '@/lib/firebase';
import { collection, getDocs, setDoc, deleteDoc, doc } from 'firebase/firestore';
import { useBookings } from '@/hooks/useBookings';
import { useSettings } from '@/hooks/useSettings';
import { getChurchColor } from '@/data/initialData';

interface AllowedUser {
  id: string;
  email: string;
  name: string;
  role: 'user' | 'admin' | 'servant';
  created_at: string;
}

interface Evaluation {
  id: string;
  bookingId: string;
  date: string;
  servantEmail: string;
  servantName: string;
  grades: { [fieldId: string]: number };
  comments?: string;
  createdAt: string;
}

export default function AdminDashboard() {
  const { isAdmin } = useAuth();
  const { isAdminDashboardOpen, closeAdminDashboard } = useSchedulerStore();
  const { bookings } = useBookings();
  const { settings, updateSettings } = useSettings();

  const [allowedUsers, setAllowedUsers] = useState<AllowedUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'users' | 'bookings' | 'settings' | 'evaluations'>('users');

  // Add user form
  const [newEmail, setNewEmail] = useState('');
  const [newName, setNewName] = useState('');
  const [newRole, setNewRole] = useState<'user' | 'admin' | 'servant'>('user');
  const [adding, setAdding] = useState(false);
  const [addError, setAddError] = useState('');
  const [removingId, setRemovingId] = useState<string | null>(null);

  // Settings local state for editing
  const [editingSettings, setEditingSettings] = useState(settings);
  const [savingSettings, setSavingSettings] = useState(false);

  // Evaluations state
  const [evaluations, setEvaluations] = useState<Evaluation[]>([]);
  const [loadingEvaluations, setLoadingEvaluations] = useState(false);
  const [expandedBookingId, setExpandedBookingId] = useState<string | null>(null);
  const [isDetailedExport, setIsDetailedExport] = useState(true);

  useEffect(() => {
    setEditingSettings(settings);
  }, [settings]);

  const fetchEvaluations = async () => {
    setLoadingEvaluations(true);
    try {
      const snap = await getDocs(collection(db, 'evaluations'));
      const evals = snap.docs.map(d => ({
        id: d.id,
        ...d.data(),
      })) as Evaluation[];
      setEvaluations(evals);
    } catch (err) {
      console.error('Error fetching evaluations:', err);
    } finally {
      setLoadingEvaluations(false);
    }
  };

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const snap = await getDocs(collection(db, 'allowed_users'));
      const users: AllowedUser[] = snap.docs.map(d => ({
        id: d.id,
        ...d.data(),
      })) as AllowedUser[];
      // Sort by created_at descending
      users.sort((a, b) => (b.created_at || '').localeCompare(a.created_at || ''));
      setAllowedUsers(users);
    } catch (err) {
      console.error('Error fetching allowed users:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAdminDashboardOpen && isAdmin) {
      fetchUsers();
      fetchEvaluations();
    }
  }, [isAdminDashboardOpen, isAdmin]);

  const handleAddUser = async () => {
    setAddError('');
    if (!newEmail.trim()) { setAddError('البريد الإلكتروني مطلوب'); return; }
    if (!newEmail.includes('@')) { setAddError('بريد إلكتروني غير صالح'); return; }
    if (!newName.trim()) { setAddError('الاسم مطلوب'); return; }

    setAdding(true);
    try {
      const email = newEmail.trim().toLowerCase();
      await setDoc(doc(db, 'allowed_users', email), {
        email,
        name: newName.trim(),
        role: newRole,
        created_at: new Date().toISOString(),
      });
      setNewEmail('');
      setNewName('');
      setNewRole('user');
      await fetchUsers();
    } catch (err) {
      setAddError(err instanceof Error ? err.message : 'حدث خطأ');
    } finally {
      setAdding(false);
    }
  };

  const handleRemoveUser = async (id: string) => {
    setRemovingId(id);
    try {
      await deleteDoc(doc(db, 'allowed_users', id));
      await fetchUsers();
    } catch (err) {
      console.error('Error removing user:', err);
    } finally {
      setRemovingId(null);
    }
  };

  const handleExportCSV = async () => {
    try {
      const res = await fetch('/api/export-bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          bookings,
          evaluations,
          evaluationFields: settings.evaluationFields || [],
          detailed: isDetailedExport
        }),
      });
      if (!res.ok) throw new Error('Export failed');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'church_bookings.xlsx';
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Export error:', err);
    }
  };

  const handleSaveSettings = async () => {
    setSavingSettings(true);
    try {
      await updateSettings('time_periods', editingSettings.timePeriods);
      await updateSettings('booking_range', editingSettings.bookingRange);
      await updateSettings('team_member_limits', editingSettings.teamMemberLimits);
      await updateSettings('allow_user_cancellation', editingSettings.allowUserCancellation !== false);
      await updateSettings('evaluation_fields', editingSettings.evaluationFields || []);
    } catch (err) {
      console.error('Error saving settings:', err);
    } finally {
      setSavingSettings(false);
    }
  };

  const dayNames = ["الأحد", "الاثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"];
  const monthNames = ["يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو", "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر"];

  if (!isAdminDashboardOpen || !isAdmin) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" dir="rtl">
      {/* Backdrop with elegant blur */}
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-md transition-opacity duration-300" onClick={closeAdminDashboard} />

      {/* Main card modal with premium scale-in animation */}
      <div className="relative w-full max-w-4xl max-h-[88vh] animate-scale-in transition-all duration-300 z-10">
        <div className="bg-white rounded-[28px] overflow-hidden border border-slate-100/80 shadow-2xl flex flex-col max-h-[88vh] scrollbar-hide">

          {/* Header styled with dynamic gradient */}
          <div className="relative px-6 py-5 bg-linear-to-r from-slate-800 to-slate-900 text-white shadow-lg overflow-hidden shrink-0">
            {/* Soft grid background overlay for header */}
            <div className="absolute inset-0 opacity-10 bg-[linear-gradient(to_right,#808080_1px,transparent_1px),linear-gradient(to_bottom,#808080_1px,transparent_1px)] bg-size-[14px_24px]" />
            <div className="relative flex justify-between items-center gap-3">
              <div>
                <h2 className="text-xl sm:text-2xl font-black tracking-tight leading-normal pb-0.5 drop-shadow-xs">لوحة التحكم والمسؤول</h2>
                <p className="text-white/80 font-bold text-xs leading-normal mt-0.5">إدارة قادة المجموعات، سجل الحجوزات، وإعدادات فترة الحجز</p>
              </div>
              <button 
                onClick={closeAdminDashboard} 
                className="w-8 h-8 flex items-center justify-center rounded-full bg-white/15 hover:bg-white/30 text-white font-medium text-lg shrink-0 transition-all duration-200 active:scale-90"
                aria-label="close"
              >
                &times;
              </button>
            </div>
          </div>

          {/* Tabs capsule styled control */}
          <div className="px-6 py-4 bg-white border-b border-slate-50 shrink-0 flex items-center justify-center">
            <div className="bg-slate-100/85 p-1 rounded-2xl flex gap-1 w-full max-w-xl">
              {(
                [
                  { id: 'users', label: 'المستخدمون' },
                  { id: 'bookings', label: 'سجل المشاريع' },
                  { id: 'evaluations', label: 'نتائج التقييم' },
                  { id: 'settings', label: 'إعدادات النظام' }
                ] as const
              ).map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex-1 py-2.5 text-xs font-black rounded-xl transition-all duration-200 cursor-pointer flex items-center justify-center gap-1.5 ${
                    activeTab === tab.id 
                      ? 'bg-white text-slate-800 shadow-sm border border-slate-200/40' 
                      : 'text-slate-500 hover:text-slate-800 hover:bg-white/40'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-5 scrollbar-hide">

            {/* USERS TAB */}
            {activeTab === 'users' && (
              <>
                {/* Add user form */}
                <div className="bg-slate-50/50 border border-slate-100 p-5 rounded-3xl space-y-4">
                  <h3 className="font-black text-slate-800 text-sm flex items-center gap-2 pb-2 border-b border-slate-150/40">
                    <span className="w-1.5 h-4 rounded-full bg-slate-700 inline-block" />
                    إضافة مستخدم مصرح له جديد
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <input
                      type="email"
                      value={newEmail}
                      onChange={e => setNewEmail(e.target.value)}
                      className="px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:border-slate-800 focus:ring-2 focus:ring-slate-800/10 bg-white text-slate-700 text-sm transition-all"
                      placeholder="البريد الإلكتروني"
                    />
                    <input
                      type="text"
                      value={newName}
                      onChange={e => setNewName(e.target.value)}
                      className="px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:border-slate-800 focus:ring-2 focus:ring-slate-800/10 bg-white text-slate-700 text-sm transition-all"
                      placeholder="الاسم الكامل"
                    />
                    <select
                      value={newRole}
                      onChange={e => setNewRole(e.target.value as 'user' | 'admin' | 'servant')}
                      className="px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:border-slate-800 focus:ring-2 focus:ring-slate-800/10 bg-white text-sm transition-all font-bold text-slate-700 cursor-pointer"
                    >
                      <option value="user">قائد فريق (User)</option>
                      <option value="servant">خادم مقيم / servant</option>
                      <option value="admin">مسؤول (Admin)</option>
                    </select>
                  </div>
                  {addError && <p className="text-red-500 text-xs font-bold">{addError}</p>}
                  <button
                    onClick={handleAddUser}
                    disabled={adding}
                    className="px-6 py-3 bg-slate-800 hover:bg-slate-900 text-white font-black rounded-xl text-sm disabled:opacity-50 transition-all shadow-md shadow-slate-800/10 active:scale-95 cursor-pointer shrink-0"
                  >
                    {adding ? 'جاري الإضافة...' : '+ إضافة'}
                  </button>
                </div>

                {loading ? (
                  <div className="text-center py-8">
                    <div className="w-8 h-8 border-4 border-slate-800 border-t-transparent rounded-full animate-spin mx-auto" />
                  </div>
                ) : allowedUsers.length === 0 ? (
                  <div className="text-center py-12 bg-slate-50/20 rounded-3xl border border-dashed border-slate-200 text-slate-400 text-sm font-bold">
                    لا يوجد مستخدمون مصرح لهم بعد
                  </div>
                ) : (
                  <div className="space-y-2.5 max-h-[35vh] overflow-y-auto pr-1 scrollbar-hide">
                    {allowedUsers.map(u => (
                      <div key={u.id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between bg-slate-50/50 hover:bg-slate-50 border border-slate-100 p-4 sm:px-4 sm:py-3 rounded-2xl transition-all duration-200 hover:shadow-2xs gap-3.5 sm:gap-3">
                        <div className="flex items-center gap-3">
                          <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-black shadow-sm shrink-0 ${
                            u.role === 'admin' 
                              ? 'bg-slate-700 text-white shadow-slate-700/10' 
                              : u.role === 'servant'
                                ? 'bg-indigo-650 text-white shadow-indigo-600/10'
                                : 'bg-slate-500 text-white shadow-slate-500/10'
                          }`}>
                            {u.name[0]}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className="font-black text-slate-800 text-sm leading-normal pb-0.5 truncate">{u.name}</p>
                              {/* Mobile-only Role Badge */}
                              <span className={`inline-block sm:hidden px-2 py-0.5 rounded-full text-[9px] font-black border shrink-0 ${
                                u.role === 'admin' 
                                  ? 'bg-slate-100 text-slate-700 border-slate-200/50' 
                                  : u.role === 'servant'
                                    ? 'bg-indigo-50 text-indigo-700 border-indigo-200/40'
                                    : 'bg-slate-50 text-slate-650 border-slate-150/60'
                              }`}>
                                {u.role === 'admin' ? 'مسؤول' : u.role === 'servant' ? 'خادم مقيم' : 'قائد فريق'}
                              </span>
                            </div>
                            <p className="text-slate-450 text-xs font-semibold leading-normal truncate" dir="ltr">{u.email}</p>
                          </div>
                        </div>
                        <div className="flex items-center justify-between sm:justify-end gap-3 border-t border-slate-100/50 pt-2.5 sm:pt-0 sm:border-0">
                          {/* Desktop-only Role Badge */}
                          <span className={`hidden sm:inline-block px-2.5 py-1 rounded-full text-[10px] font-black border shrink-0 ${
                            u.role === 'admin' 
                              ? 'bg-slate-100 text-slate-700 border-slate-200/50' 
                              : u.role === 'servant'
                                ? 'bg-indigo-50 text-indigo-700 border-indigo-200/40'
                                : 'bg-slate-50 text-slate-650 border-slate-150/60'
                          }`}>
                            {u.role === 'admin' ? 'مسؤول' : u.role === 'servant' ? 'خادم مقيم' : 'قائد فريق'}
                          </span>
                          <button
                            onClick={() => handleRemoveUser(u.id)}
                            disabled={removingId === u.id}
                            className="text-rose-600 hover:text-rose-700 hover:bg-rose-50 border border-transparent hover:border-rose-100 text-xs font-bold px-4 py-2 sm:px-3 sm:py-1.5 rounded-xl transition-all cursor-pointer w-full sm:w-auto text-center active:scale-95 shadow-2xs"
                          >
                            {removingId === u.id ? 'جاري الحذف...' : 'حذف'}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}

            {/* BOOKINGS TAB */}
            {activeTab === 'bookings' && (
              <>
                <div className="flex flex-col sm:flex-row justify-between sm:items-center bg-slate-50/50 p-5 rounded-3xl border border-slate-100 gap-4">
                  <div>
                    <h3 className="font-black text-slate-800 text-sm flex items-center gap-2">
                      <span className="w-1.5 h-4 rounded-full bg-slate-700 inline-block" />
                      سجل حجوزات المشاريع الكنسية
                    </h3>
                    <p className="text-xs text-slate-400 font-bold mt-1">إجمالي الحجوزات المسجلة بالنظام: {bookings.length} حجز</p>
                  </div>
                  <div className="flex flex-wrap items-center gap-3.5 mt-2 sm:mt-0">
                    {/* Toggle: Detailed vs Simple */}
                    <div className="flex items-center gap-3.5 bg-white border border-slate-200/80 px-4 py-2.5 rounded-2xl shadow-2xs select-none">
                      <span 
                        onClick={() => setIsDetailedExport(true)}
                        className={`text-[11px] font-black transition-colors duration-250 cursor-pointer ${
                          isDetailedExport ? 'text-slate-900 font-black' : 'text-slate-400'
                        }`}
                      >
                        تفصيلي
                      </span>
                      <button
                        dir="ltr"
                        type="button"
                        onClick={() => setIsDetailedExport(!isDetailedExport)}
                        className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-300 ease-in-out focus:outline-none ${
                          isDetailedExport ? 'bg-emerald-600' : 'bg-slate-800'
                        }`}
                        aria-label="Toggle export mode"
                      >
                        <span
                          className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-300 ease-in-out ${
                            isDetailedExport ? 'translate-x-5' : 'translate-x-0'
                          }`}
                        />
                      </button>
                      <span 
                        onClick={() => setIsDetailedExport(false)}
                        className={`text-[11px] font-black transition-colors duration-250 cursor-pointer ${
                          !isDetailedExport ? 'text-slate-900 font-black' : 'text-slate-400'
                        }`}
                      >
                        بسيط
                      </span>
                    </div>

                    <button
                      onClick={handleExportCSV}
                      className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded-xl shadow-md shadow-emerald-600/10 transition-all flex items-center justify-center gap-2 text-xs active:scale-95 cursor-pointer shrink-0"
                    >
                      <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                      </svg>
                      تصدير Excel ✓
                    </button>
                  </div>
                </div>

                {bookings.length === 0 ? (
                  <div className="text-center py-16 bg-slate-50/20 rounded-3xl border border-dashed border-slate-200 text-slate-400 font-bold text-sm">
                    لا توجد حجوزات مسجلة حتى الآن.
                  </div>
                ) : (
                  <div className="space-y-3 max-h-[45vh] overflow-y-auto pr-1 scrollbar-hide">
                    {bookings.map((b) => {
                      const memberCount = b.teamMembers ? b.teamMembers.length : (b.teammates || []).length;
                      return (
                        <div key={b.id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between bg-slate-50/50 hover:bg-slate-50 border border-slate-100 p-4 sm:px-4 sm:py-3.5 rounded-2xl transition-all duration-200 gap-3.5 sm:gap-4 hover:shadow-2xs">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="w-2 h-4 rounded-full bg-slate-700 shrink-0" />
                              <p className="font-black text-slate-800 text-sm leading-normal pb-0.5 truncate">{b.churchName}</p>
                            </div>
                            <p className="text-xs text-slate-500 mt-1 font-bold">
                              <span className="text-slate-450 font-black">المشروع:</span> {b.title}
                            </p>
                            <p className="text-[11px] text-slate-450 mt-1 font-bold flex flex-wrap items-center gap-1">
                              <span className="text-slate-400 font-bold">الحاجز:</span> 
                              <span className="text-slate-800 font-black">{b.requesterName}</span> 
                              <span className="text-slate-400 font-semibold" dir="ltr">({b.requesterEmail})</span>
                            </p>
                          </div>

                          <div className="flex items-center justify-between sm:justify-end gap-4 border-t border-slate-100/50 pt-3 sm:pt-0 sm:border-0 shrink-0">
                            {/* Date / Time */}
                            <div className="flex flex-col items-start sm:items-end text-right sm:text-right">
                              <p className="text-xs font-black text-slate-700 leading-none">{b.date}</p>
                              <span dir="ltr" className="inline-block text-[10px] font-bold mt-1 px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200/60 leading-none">
                                {b.startTime} - {b.endTime}
                              </span>
                            </div>

                            {/* Team size chip */}
                            <div className="bg-white border border-slate-150 px-3.5 py-2 rounded-xl flex flex-col items-center justify-center min-w-16 shadow-2xs">
                              <p className="text-[9px] font-bold text-slate-450 leading-none">الأعضاء</p>
                              <p className="text-xs font-black text-slate-800 mt-0.5 leading-none">
                                {memberCount}
                              </p>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </>
            )}

            {/* SETTINGS TAB */}
            {activeTab === 'settings' && (
              <div className="space-y-8 animate-fade-in">
                <div className="flex justify-between items-center bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
                  <div>
                    <h3 className="font-black text-slate-800">إعدادات النظام</h3>
                    <p className="text-xs text-slate-500">تحكم في مواعيد الحجز والفترات الزمنية</p>
                  </div>
                  <button
                    onClick={handleSaveSettings}
                    disabled={savingSettings}
                    className="px-8 py-2.5 bg-slate-800 hover:bg-slate-900 text-white font-black rounded-xl shadow-lg shadow-slate-200 transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
                  >
                    {savingSettings ? 'جاري الحفظ...' : 'حفظ التغييرات'}
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Months Selection */}
                  <div className="bg-slate-50 p-5 rounded-3xl border border-slate-100 space-y-4">
                    <h4 className="font-bold text-slate-700 flex items-center gap-2">
                      <span className="w-2 h-5 rounded-full bg-slate-700" />
                      فترة الحجز (الشهور)
                    </h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-xs font-bold text-slate-400 block mb-1.5">من شهر</label>
                        <select
                          value={editingSettings.bookingRange.startMonth}
                          onChange={e => setEditingSettings({
                            ...editingSettings,
                            bookingRange: { ...editingSettings.bookingRange, startMonth: parseInt(e.target.value) }
                          })}
                          className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm font-bold bg-white focus:ring-2 focus:ring-slate-800/10 focus:border-slate-800 outline-none"
                        >
                          {monthNames.map((m, i) => <option key={i} value={i}>{m}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="text-xs font-bold text-slate-400 block mb-1.5">إلى شهر</label>
                        <select
                          value={editingSettings.bookingRange.endMonth}
                          onChange={e => setEditingSettings({
                            ...editingSettings,
                            bookingRange: { ...editingSettings.bookingRange, endMonth: parseInt(e.target.value) }
                          })}
                          className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm font-bold bg-white focus:ring-2 focus:ring-slate-800/10 focus:border-slate-800 outline-none"
                        >
                          {monthNames.map((m, i) => <option key={i} value={i}>{m}</option>)}
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Days Selection */}
                  <div className="bg-slate-50 p-5 rounded-3xl border border-slate-100 space-y-4">
                    <h4 className="font-bold text-slate-700 flex items-center gap-2">
                      <span className="w-2 h-5 rounded-full bg-slate-700" />
                      الأيام المتاحة للحجز
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {dayNames.map((day, i) => {
                        const isSelected = editingSettings.bookingRange.allowedDays.includes(i);
                        return (
                          <button
                            key={i}
                            onClick={() => {
                              const newDays = isSelected
                                ? editingSettings.bookingRange.allowedDays.filter(d => d !== i)
                                : [...editingSettings.bookingRange.allowedDays, i].sort();
                              setEditingSettings({
                                ...editingSettings,
                                bookingRange: { ...editingSettings.bookingRange, allowedDays: newDays }
                              });
                            }}
                            className={`px-3 py-2 rounded-xl text-xs font-bold transition-all border ${
                              isSelected ? 'bg-slate-800 border-slate-800 text-white shadow-md' : 'bg-white border-slate-200 text-slate-400'
                            }`}
                          >
                            {day}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Time Periods */}
                <div className="bg-slate-50 p-5 rounded-3xl border border-slate-100 space-y-4">
                  <h4 className="font-bold text-slate-700 flex items-center gap-2">
                    <span className="w-2 h-5 rounded-full bg-slate-700" />
                    الفترات الزمنية
                  </h4>
                  <div className="space-y-3">
                    {editingSettings.timePeriods.map((period, idx) => (
                      <div key={period.id} className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-white p-4 rounded-2xl border border-slate-100 shadow-sm items-end">
                        <div>
                          <label className="text-[10px] font-bold text-slate-400 block mb-1">اسم الفترة</label>
                          <input
                            type="text"
                            value={period.label}
                            onChange={e => {
                              const newPeriods = [...editingSettings.timePeriods];
                              newPeriods[idx].label = e.target.value;
                              setEditingSettings({ ...editingSettings, timePeriods: newPeriods });
                            }}
                            className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm font-bold focus:ring-2 focus:ring-slate-800/10 focus:border-slate-800 outline-none"
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="text-[10px] font-bold text-slate-400 block mb-1">من</label>
                            <input
                              type="text"
                              value={period.startTime}
                              onChange={e => {
                                const newPeriods = [...editingSettings.timePeriods];
                                newPeriods[idx].startTime = e.target.value;
                                setEditingSettings({ ...editingSettings, timePeriods: newPeriods });
                              }}
                              className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm font-bold focus:ring-2 focus:ring-slate-800/10 focus:border-slate-800 outline-none"
                              placeholder="6:00 PM"
                            />
                          </div>
                          <div>
                            <label className="text-[10px] font-bold text-slate-400 block mb-1">إلى</label>
                            <input
                              type="text"
                              value={period.endTime}
                              onChange={e => {
                                const newPeriods = [...editingSettings.timePeriods];
                                newPeriods[idx].endTime = e.target.value;
                                setEditingSettings({ ...editingSettings, timePeriods: newPeriods });
                              }}
                              className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm font-bold focus:ring-2 focus:ring-slate-800/10 focus:border-slate-800 outline-none"
                            />
                          </div>
                        </div>
                        <button
                          onClick={() => {
                            const newPeriods = editingSettings.timePeriods.filter((_, i) => i !== idx);
                            setEditingSettings({ ...editingSettings, timePeriods: newPeriods });
                          }}
                          className="h-10 text-rose-600 hover:bg-rose-50 hover:border-rose-100 rounded-xl text-xs font-bold transition-all border border-transparent cursor-pointer px-3 active:scale-95"
                        >
                          حذف الفترة
                        </button>
                      </div>
                    ))}
                    <button
                      onClick={() => {
                        const newId = `period-${editingSettings.timePeriods.length + 1}`;
                        const newPeriods = [...editingSettings.timePeriods, { id: newId, label: 'فترة جديدة', startTime: '12:00 PM', endTime: '1:30 PM' }];
                        setEditingSettings({ ...editingSettings, timePeriods: newPeriods });
                      }}
                      className="w-full py-3 border-2 border-dashed border-slate-200 rounded-2xl text-slate-400 hover:text-slate-800 hover:border-slate-300 hover:bg-slate-50 transition-all text-xs font-bold cursor-pointer"
                    >
                      + إضافة فترة زمنية جديدة
                    </button>
                  </div>
                </div>

                {/* Team Member Limits */}
                <div className="bg-slate-50 p-5 rounded-3xl border border-slate-100 space-y-4">
                  <h4 className="font-bold text-slate-700 flex items-center gap-2">
                    <span className="w-2 h-5 rounded-full bg-slate-700" />
                    حدود أعضاء الفريق
                  </h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-bold text-slate-400 block mb-1.5">الحد الأدنى</label>
                      <input
                        type="number"
                        min={1}
                        max={editingSettings.teamMemberLimits.max}
                        value={editingSettings.teamMemberLimits.min}
                        onChange={e => setEditingSettings({
                          ...editingSettings,
                          teamMemberLimits: { ...editingSettings.teamMemberLimits, min: Math.max(1, parseInt(e.target.value) || 1) }
                        })}
                        className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm font-bold bg-white focus:ring-2 focus:ring-slate-800/10 focus:border-slate-800 outline-none text-center"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-slate-400 block mb-1.5">الحد الأقصى</label>
                      <input
                        type="number"
                        min={editingSettings.teamMemberLimits.min}
                        max={100}
                        value={editingSettings.teamMemberLimits.max}
                        onChange={e => setEditingSettings({
                          ...editingSettings,
                          teamMemberLimits: { ...editingSettings.teamMemberLimits, max: Math.max(editingSettings.teamMemberLimits.min, parseInt(e.target.value) || 1) }
                        })}
                        className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm font-bold bg-white focus:ring-2 focus:ring-slate-800/10 focus:border-slate-800 outline-none text-center"
                      />
                    </div>
                  </div>
                  <p className="text-xs text-slate-400 font-medium">
                    يجب أن يكون عدد أعضاء الفريق بين {editingSettings.teamMemberLimits.min} و {editingSettings.teamMemberLimits.max} عضو
                  </p>
                </div>

                {/* Booking Cancellation Toggle */}
                <div className="bg-slate-50 p-5 rounded-3xl border border-slate-100 space-y-4">
                  <h4 className="font-bold text-slate-700 flex items-center gap-2">
                    <span className="w-2 h-5 rounded-full bg-slate-700" />
                    إلغاء حجز المستخدمين
                  </h4>
                  <div className="flex items-center justify-between bg-white p-4 rounded-2xl border border-slate-100 shadow-xs gap-4">
                    <div className="flex-1">
                      <p className="text-sm font-bold text-slate-800">السماح للمستخدمين بحذف/إلغاء حجوزاتهم</p>
                      <p className="text-xs text-slate-400 mt-1">عند تفعيل هذا الخيار، سيتمكن قادة الفرق من إلغاء أو حذف حجوزاتهم. وإذا تم تعطيله، لن تظهر لهم أزرار الحذف (المسؤول يمكنه دائماً إلغاء الحجز).</p>
                    </div>
                    <button
                      dir="ltr"
                      onClick={() => setEditingSettings({
                        ...editingSettings,
                        allowUserCancellation: !editingSettings.allowUserCancellation
                      })}
                      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                        editingSettings.allowUserCancellation ? 'bg-slate-800' : 'bg-slate-200'
                      }`}
                    >
                      <span
                        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-xs ring-0 transition duration-200 ease-in-out ${
                          editingSettings.allowUserCancellation ? 'translate-x-5' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>
                </div>

                {/* Evaluation Fields Customization */}
                <div className="bg-slate-50 p-5 rounded-3xl border border-slate-100 space-y-4 col-span-1 md:col-span-2">
                  <h4 className="font-bold text-slate-700 flex items-center gap-2">
                    <span className="w-2 h-5 rounded-full bg-slate-700" />
                    معايير تقييم المشاريع
                  </h4>
                  <p className="text-xs text-slate-400 font-bold">
                    قم بإضافة أو تعديل معايير تقييم المشاريع التي سيستخدمها المقيمون/الخدام أثناء التقييم.
                  </p>
                  <div className="space-y-3">
                    {(editingSettings.evaluationFields || []).map((field, idx) => (
                      <div key={field.id} className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-white p-4 rounded-2xl border border-slate-100 shadow-xs items-end animate-fade-in">
                        <div>
                          <label className="text-[10px] font-bold text-slate-400 block mb-1">اسم المعيار</label>
                          <input
                            type="text"
                            value={field.name}
                            onChange={e => {
                              const newFields = [...(editingSettings.evaluationFields || [])];
                              newFields[idx].name = e.target.value;
                              setEditingSettings({ ...editingSettings, evaluationFields: newFields });
                            }}
                            className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm font-bold focus:ring-2 focus:ring-slate-800/10 focus:border-slate-800 outline-none bg-white text-slate-700"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] font-bold text-slate-400 block mb-1">الدرجة العظمى</label>
                          <input
                            type="number"
                            min={1}
                            max={100}
                            value={field.maxMark}
                            onChange={e => {
                              const newFields = [...(editingSettings.evaluationFields || [])];
                              newFields[idx].maxMark = Math.max(1, parseInt(e.target.value) || 1);
                              setEditingSettings({ ...editingSettings, evaluationFields: newFields });
                            }}
                            className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm font-bold focus:ring-2 focus:ring-slate-800/10 focus:border-slate-800 outline-none text-center bg-white text-slate-700"
                          />
                        </div>
                        <button
                          onClick={() => {
                            const newFields = (editingSettings.evaluationFields || []).filter((_, i) => i !== idx);
                            setEditingSettings({ ...editingSettings, evaluationFields: newFields });
                          }}
                          className="h-10 text-rose-600 hover:bg-rose-50 hover:border-rose-100 rounded-xl text-xs font-bold transition-all border border-transparent cursor-pointer flex items-center justify-center gap-1.5 active:scale-95 px-3"
                        >
                          حذف المعيار
                        </button>
                      </div>
                    ))}
                    <button
                      onClick={() => {
                        const newId = `eval-${Date.now()}`;
                        const newFields = [...(editingSettings.evaluationFields || []), { id: newId, name: 'معيار تقييم جديد', maxMark: 10 }];
                        setEditingSettings({ ...editingSettings, evaluationFields: newFields });
                      }}
                      className="w-full py-3 border-2 border-dashed border-slate-200 rounded-2xl text-slate-400 hover:text-slate-800 hover:border-slate-300 hover:bg-slate-50 transition-all text-xs font-bold cursor-pointer"
                    >
                      + إضافة معيار تقييم جديد
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* EVALUATIONS TAB */}
            {activeTab === 'evaluations' && (
              <div className="space-y-4 animate-fade-in">
                <div className="bg-slate-50/50 border border-slate-100 p-5 rounded-3xl space-y-2">
                  <h3 className="font-black text-slate-800 text-sm flex items-center gap-2">
                    <span className="w-1.5 h-4 rounded-full bg-slate-700 inline-block" />
                    لوحة نتائج وتقييمات المشاريع
                  </h3>
                  <p className="text-xs text-slate-400 font-bold">
                    عرض نتائج تقييمات الخدام المقيمين للمشاريع الكنسية والتقارير التفصيلية للدرجات.
                  </p>
                </div>

                {loadingEvaluations ? (
                  <div className="text-center py-12">
                    <div className="w-8 h-8 border-4 border-slate-800 border-t-transparent rounded-full animate-spin mx-auto" />
                  </div>
                ) : (() => {
                  // Group evaluations by bookingId
                  const evaluationsByBooking = evaluations.reduce((acc, ev) => {
                    if (!acc[ev.bookingId]) {
                      acc[ev.bookingId] = [];
                    }
                    acc[ev.bookingId].push(ev);
                    return acc;
                  }, {} as Record<string, Evaluation[]>);

                  const evaluatedBookings = bookings
                    .map(b => {
                      const evs = evaluationsByBooking[b.id] || [];
                      return {
                        ...b,
                        evaluationsList: evs,
                      };
                    })
                    .filter(b => b.evaluationsList.length > 0);

                  if (evaluatedBookings.length === 0) {
                    return (
                      <div className="text-center py-16 bg-slate-50/20 rounded-3xl border border-dashed border-slate-200 text-slate-400 font-bold text-sm">
                        لا توجد تقييمات مسجلة حتى الآن.
                      </div>
                    );
                  }

                  return (
                    <div className="space-y-4 max-h-[50vh] overflow-y-auto pr-1 scrollbar-hide">
                      {evaluatedBookings.map(b => {
                        const churchColor = getChurchColor(b.churchName || '');
                        const evsCount = b.evaluationsList.length;

                        // Calculate field-by-field averages
                        const fieldAverages = (settings.evaluationFields || []).map(f => {
                          const sum = b.evaluationsList.reduce((acc, ev) => acc + (ev.grades[f.id] || 0), 0);
                          const avg = evsCount > 0 ? parseFloat((sum / evsCount).toFixed(1)) : 0;
                          return {
                            ...f,
                            avg,
                          };
                        });

                        // Calculate overall total average score
                        const totalSum = fieldAverages.reduce((acc, f) => acc + f.avg, 0);
                        const totalMax = fieldAverages.reduce((acc, f) => acc + f.maxMark, 0);

                        const isExpanded = expandedBookingId === b.id;

                        return (
                          <div 
                            key={b.id} 
                            className="bg-white border border-slate-150/70 rounded-2xl overflow-hidden hover:shadow-xs transition-all duration-200"
                          >
                            {/* Card Header Summary */}
                            <div className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                              <div className="flex gap-3 min-w-0">
                                <span className={`w-1.5 h-11 rounded-full bg-linear-to-b ${churchColor.gradient || 'from-slate-700 to-slate-800'} shrink-0`} />
                                <div className="min-w-0 flex-1">
                                  <p className="font-black text-slate-800 text-sm leading-normal pb-0.5 truncate">{b.churchName}</p>
                                  <p className="text-xs text-slate-500 font-bold mt-1 leading-normal flex flex-wrap items-center gap-1.5">
                                    <span>اسم الفريق:</span> 
                                    <span className="text-slate-850 font-black">{b.teamName}</span> 
                                    <span className="text-slate-300">|</span> 
                                    <span>المشروع:</span> 
                                    <span className="text-slate-850 font-black">{b.title}</span>
                                  </p>
                                </div>
                              </div>

                              <div className="flex flex-wrap items-center justify-between sm:justify-end gap-3 border-t border-slate-100/50 pt-3 sm:pt-0 sm:border-0 shrink-0">
                                <div className="flex items-center gap-3">
                                  {/* Total score pill */}
                                  <div className="bg-slate-50 border border-slate-200 px-3.5 py-1.5 rounded-xl text-center shadow-3xs">
                                    <p className="text-[9px] font-bold text-slate-450 uppercase leading-none">مجموع التقييم</p>
                                    <p className="text-xs font-black text-slate-800 mt-1 leading-none">
                                      {totalSum} / {totalMax}
                                    </p>
                                  </div>

                                  {/* Servants evaluated count */}
                                  <div className="bg-indigo-50/50 border border-indigo-100 px-3.5 py-1.5 rounded-xl text-center shadow-3xs">
                                    <p className="text-[9px] font-bold text-indigo-500 uppercase leading-none">المقيمين</p>
                                    <p className="text-xs font-black text-indigo-700 mt-1 leading-none">
                                      {evsCount} خادم
                                    </p>
                                  </div>
                                </div>

                                <button
                                  onClick={() => setExpandedBookingId(isExpanded ? null : b.id)}
                                  className="px-3.5 py-2 border border-slate-200 hover:bg-slate-50 text-slate-700 font-black rounded-xl text-xs transition-all cursor-pointer flex items-center justify-center gap-1 active:scale-95 shadow-3xs w-full sm:w-auto mt-2 sm:mt-0"
                                >
                                  {isExpanded ? 'إخفاء التفاصيل' : 'تفاصيل التقييم'}
                                  <svg className={`w-3.5 h-3.5 text-slate-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
                                  </svg>
                                </button>
                              </div>
                            </div>

                            {/* Expanded Details Section */}
                            {isExpanded && (
                              <div className="bg-slate-50/40 border-t border-slate-100 p-4 space-y-4 animate-fade-in">
                                
                                {/* 1. Field by Field Averages Breakdown */}
                                <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-3xs">
                                  <h4 className="text-xs font-bold text-slate-700 mb-3 flex items-center gap-1.5">
                                    <span className="w-1.5 h-3.5 rounded-full bg-slate-700 inline-block" />
                                    متوسط الدرجات لكل معيار
                                  </h4>
                                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                                    {fieldAverages.map(f => (
                                      <div key={f.id} className="bg-slate-50/50 p-3 border border-slate-100 rounded-xl text-center">
                                        <p className="text-[10px] font-bold text-slate-450 truncate" title={f.name}>{f.name}</p>
                                        <p className="text-sm font-black text-slate-800 mt-1">{f.avg} <span className="text-[10px] text-slate-400 font-bold">/ {f.maxMark}</span></p>
                                      </div>
                                    ))}
                                  </div>
                                </div>

                                {/* 2. Servant Logs Details */}
                                <div className="space-y-2.5">
                                  <h4 className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                                    <span className="w-1.5 h-3.5 rounded-full bg-slate-700 inline-block" />
                                    تقييمات الخدام المنفردة
                                  </h4>
                                  {b.evaluationsList.map(ev => (
                                    <div key={ev.id} className="bg-white p-4 rounded-xl border border-slate-100 shadow-3xs space-y-3">
                                      <div className="flex items-center justify-between border-b border-slate-50 pb-2">
                                        <div className="flex items-center gap-2">
                                          <span className="w-7 h-7 rounded-full bg-slate-100 text-slate-650 flex items-center justify-center text-xs font-bold">👤</span>
                                          <div>
                                            <p className="text-slate-800 font-black text-xs">{ev.servantName}</p>
                                            <p className="text-slate-400 text-[10px] font-bold mt-0.5">{ev.servantEmail}</p>
                                          </div>
                                        </div>
                                        <span className="text-[9px] font-bold text-slate-450">{new Date(ev.createdAt).toLocaleString('ar-EG', { dateStyle: 'short', timeStyle: 'short' })}</span>
                                      </div>

                                      {/* Grades breakdown by this servant */}
                                      <div className="flex flex-wrap gap-2">
                                        {(settings.evaluationFields || []).map(f => (
                                          <span key={f.id} className="inline-block text-[11px] font-bold px-2.5 py-1 rounded-lg bg-slate-50 text-slate-700 border border-slate-150/40">
                                            {f.name}: <strong className="font-black text-slate-850">{ev.grades[f.id] || 0}</strong> / {f.maxMark}
                                          </span>
                                        ))}
                                      </div>

                                      {/* Servant Comment */}
                                      {ev.comments && (
                                        <div className="bg-slate-50/70 p-2.5 rounded-xl border border-slate-100/50 text-xs text-slate-650 leading-relaxed font-bold">
                                          <span className="text-[10px] text-slate-450 block mb-1">💬 تعليق الخادم:</span>
                                          &quot;{ev.comments}&quot;
                                        </div>
                                      )}
                                    </div>
                                  ))}
                                </div>

                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  );
                })()}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
