'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useSchedulerStore } from '@/store/useSchedulerStore';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { useBookings } from '@/hooks/useBookings';
import { useSettings } from '@/hooks/useSettings';

interface AllowedUser {
  id: string;
  email: string;
  name: string;
  role: 'user' | 'admin';
  created_at: string;
}

export default function AdminDashboard() {
  const { user, isAdmin } = useAuth();
  const { isAdminDashboardOpen, closeAdminDashboard } = useSchedulerStore();
  const { bookings } = useBookings();
  const { settings, updateSettings } = useSettings();

  const [allowedUsers, setAllowedUsers] = useState<AllowedUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'users' | 'bookings' | 'settings'>('users');

  // Add user form
  const [newEmail, setNewEmail] = useState('');
  const [newName, setNewName] = useState('');
  const [newRole, setNewRole] = useState<'user' | 'admin'>('user');
  const [adding, setAdding] = useState(false);
  const [addError, setAddError] = useState('');
  const [removingId, setRemovingId] = useState<string | null>(null);

  // Settings local state for editing
  const [editingSettings, setEditingSettings] = useState(settings);
  const [savingSettings, setSavingSettings] = useState(false);

  useEffect(() => {
    setEditingSettings(settings);
  }, [settings]);

  const fetchUsers = async () => {
    if (!isSupabaseConfigured) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('allowed_users')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      setAllowedUsers(data || []);
    } catch (err) {
      console.error('Error fetching allowed users:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAdminDashboardOpen && isAdmin) {
      fetchUsers();
    }
  }, [isAdminDashboardOpen, isAdmin]);

  const handleAddUser = async () => {
    setAddError('');
    if (!newEmail.trim()) { setAddError('البريد الإلكتروني مطلوب'); return; }
    if (!newEmail.includes('@')) { setAddError('بريد إلكتروني غير صالح'); return; }
    if (!newName.trim()) { setAddError('الاسم مطلوب'); return; }

    setAdding(true);
    try {
      const { error } = await supabase
        .from('allowed_users')
        .insert([{ email: newEmail.trim().toLowerCase(), name: newName.trim(), role: newRole }]);
      if (error) {
        if (error.code === '23505') setAddError('هذا البريد الإلكتروني مضاف بالفعل');
        else throw error;
      } else {
        setNewEmail('');
        setNewName('');
        setNewRole('user');
        await fetchUsers();
      }
    } catch (err: any) {
      setAddError(err.message || 'حدث خطأ');
    } finally {
      setAdding(false);
    }
  };

  const handleRemoveUser = async (id: string) => {
    setRemovingId(id);
    try {
      const { error } = await supabase.from('allowed_users').delete().eq('id', id);
      if (error) throw error;
      await fetchUsers();
    } catch (err) {
      console.error('Error removing user:', err);
    } finally {
      setRemovingId(null);
    }
  };

  const handleExportCSV = () => {
    window.location.href = '/api/export-bookings';
  };

  const handleSaveSettings = async () => {
    setSavingSettings(true);
    try {
      await updateSettings('time_periods', editingSettings.timePeriods);
      await updateSettings('booking_range', editingSettings.bookingRange);
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
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm animate-fade-in" onClick={closeAdminDashboard} />

      <div className="relative w-full max-w-4xl max-h-[90vh] animate-slide-up">
        <div className="bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">

          {/* Header */}
          <div className="px-4 sm:px-6 py-4 sm:py-5 border-b border-gray-100 shrink-0 bg-gradient-to-r from-emerald-600 to-teal-600 flex justify-between items-center text-white">
            <div>
              <h2 className="text-xl font-bold">لوحة التحكم</h2>
              <p className="text-sm text-white/80 mt-0.5">إدارة المستخدمين والحجوزات والإعدادات</p>
            </div>
            <button onClick={closeAdminDashboard} className="text-2xl font-bold hover:text-emerald-100 transition-all w-8 h-8 flex items-center justify-center">&times;</button>
          </div>

          {/* Tabs */}
          <div className="flex border-b border-gray-100 shrink-0 bg-gray-50">
            {[
              { id: 'users', label: '👥 المستخدمون' },
              { id: 'bookings', label: '📅 سجل الحجوزات' },
              { id: 'settings', label: '⚙️ الإعدادات' }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex-1 py-3 text-sm font-bold transition-all ${activeTab === tab.id ? 'text-emerald-600 border-b-2 border-emerald-500 bg-white' : 'text-gray-500 hover:text-gray-700'}`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5">

            {/* USERS TAB */}
            {activeTab === 'users' && (
              <>
                {!isSupabaseConfigured && (
                  <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl text-amber-800 text-sm font-medium">
                    ⚠️ Supabase غير متصل — لا يمكن إدارة المستخدمين حالياً
                  </div>
                )}

                {/* Add user form */}
                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-3">
                  <h3 className="font-bold text-slate-800 text-sm">إضافة مستخدم جديد</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <input
                      type="email"
                      value={newEmail}
                      onChange={e => setNewEmail(e.target.value)}
                      className="px-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:border-emerald-500 bg-white text-sm"
                      placeholder="البريد الإلكتروني"
                    />
                    <input
                      type="text"
                      value={newName}
                      onChange={e => setNewName(e.target.value)}
                      className="px-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:border-emerald-500 bg-white text-sm"
                      placeholder="الاسم الكامل"
                    />
                    <select
                      value={newRole}
                      onChange={e => setNewRole(e.target.value as 'user' | 'admin')}
                      className="px-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:border-emerald-500 bg-white text-sm"
                    >
                      <option value="user">قائد فريق (User)</option>
                      <option value="admin">مسؤول (Admin)</option>
                    </select>
                  </div>
                  {addError && <p className="text-red-500 text-xs font-bold">{addError}</p>}
                  <button
                    onClick={handleAddUser}
                    disabled={adding || !isSupabaseConfigured}
                    className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-sm disabled:opacity-50 transition-all"
                  >
                    {adding ? 'جاري الإضافة...' : '+ إضافة'}
                  </button>
                </div>

                {/* Users list */}
                {loading ? (
                  <div className="text-center py-8">
                    <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto" />
                  </div>
                ) : allowedUsers.length === 0 ? (
                  <div className="text-center py-12 bg-gray-50 rounded-2xl border border-dashed text-gray-400 text-sm">
                    لا يوجد مستخدمون مصرح لهم بعد
                  </div>
                ) : (
                  <div className="space-y-2">
                    {allowedUsers.map(u => (
                      <div key={u.id} className="flex items-center justify-between bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
                        <div className="flex items-center gap-3">
                          <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-black ${u.role === 'admin' ? 'bg-purple-100 text-purple-700' : 'bg-emerald-100 text-emerald-700'}`}>
                            {u.name[0]}
                          </div>
                          <div>
                            <p className="font-bold text-slate-800 text-sm">{u.name}</p>
                            <p className="text-slate-400 text-xs">{u.email}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className={`px-2.5 py-1 rounded-lg text-xs font-bold ${u.role === 'admin' ? 'bg-purple-50 text-purple-700' : 'bg-emerald-50 text-emerald-700'}`}>
                            {u.role === 'admin' ? 'مسؤول' : 'قائد فريق'}
                          </span>
                          <button
                            onClick={() => handleRemoveUser(u.id)}
                            disabled={removingId === u.id}
                            className="text-red-400 hover:text-red-600 text-xs font-bold px-2 py-1 rounded-lg hover:bg-red-50 transition-all disabled:opacity-50"
                          >
                            {removingId === u.id ? '...' : 'حذف'}
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
                <div className="flex flex-col sm:flex-row justify-between sm:items-center bg-emerald-50 p-4 rounded-2xl border border-emerald-200 gap-4">
                  <div>
                    <h3 className="font-bold text-emerald-900">سجل حجوزات المشاريع</h3>
                    <p className="text-xs text-emerald-700">إجمالي: {bookings.length} حجز</p>
                  </div>
                  <button
                    onClick={handleExportCSV}
                    className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-md transition-all flex items-center justify-center gap-2"
                  >
                    ↓ تصدير Excel
                  </button>
                </div>

                {bookings.length === 0 ? (
                  <div className="text-center py-16 bg-gray-50 rounded-2xl border border-dashed text-gray-400">
                    لا توجد حجوزات مسجلة حتى الآن.
                  </div>
                ) : (
                  <div className="overflow-x-auto border border-gray-100 rounded-2xl shadow-sm">
                    <table className="w-full text-right border-collapse text-sm">
                      <thead>
                        <tr className="bg-gray-100 text-gray-700 font-bold border-b border-gray-200">
                          <th className="p-3">الكنيسة</th>
                          <th className="p-3">عنوان المشروع</th>
                          <th className="p-3">التاريخ</th>
                          <th className="p-3">الفترة</th>
                          <th className="p-3">الأعضاء</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y text-gray-800">
                        {bookings.map((b) => (
                          <tr key={b.id} className="hover:bg-gray-50/50 transition-colors">
                            <td className="p-3 font-semibold text-gray-900">{b.churchName}</td>
                            <td className="p-3">{b.title}</td>
                            <td className="p-3">{b.date}</td>
                            <td className="p-3">{b.startTime} - {b.endTime}</td>
                            <td className="p-3 max-w-xs">
                              {b.teamMembers ? (
                                <div className="text-xs text-gray-500 space-y-0.5">
                                  {b.teamMembers.slice(0, 3).map((m, i) => (
                                    <div key={i}>{m.name} ({m.id})</div>
                                  ))}
                                  {b.teamMembers.length > 3 && <div>+{b.teamMembers.length - 3} آخرون</div>}
                                </div>
                              ) : (
                                <span className="text-xs text-gray-500 truncate block" title={(b.teammates || []).join(', ')}>
                                  {(b.teammates || []).join(', ')}
                                </span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
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
                    className="px-8 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded-xl shadow-lg shadow-emerald-200 transition-all active:scale-95 disabled:opacity-50"
                  >
                    {savingSettings ? 'جاري الحفظ...' : 'حفظ التغييرات'}
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Months Selection */}
                  <div className="bg-slate-50 p-5 rounded-3xl border border-slate-100 space-y-4">
                    <h4 className="font-bold text-slate-700 flex items-center gap-2">
                      <span className="w-2 h-5 rounded-full bg-blue-500" />
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
                          className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm font-bold bg-white focus:ring-2 focus:ring-emerald-500 outline-none"
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
                          className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm font-bold bg-white focus:ring-2 focus:ring-emerald-500 outline-none"
                        >
                          {monthNames.map((m, i) => <option key={i} value={i}>{m}</option>)}
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Days Selection */}
                  <div className="bg-slate-50 p-5 rounded-3xl border border-slate-100 space-y-4">
                    <h4 className="font-bold text-slate-700 flex items-center gap-2">
                      <span className="w-2 h-5 rounded-full bg-purple-500" />
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
                              isSelected ? 'bg-emerald-600 border-emerald-600 text-white shadow-md' : 'bg-white border-slate-200 text-slate-400'
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
                    <span className="w-2 h-5 rounded-full bg-emerald-500" />
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
                            className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm font-bold focus:border-emerald-500 outline-none"
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
                              className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm font-bold focus:border-emerald-500 outline-none"
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
                              className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm font-bold focus:border-emerald-500 outline-none"
                              placeholder="7:30 PM"
                            />
                          </div>
                        </div>
                        <button
                          onClick={() => {
                            const newPeriods = editingSettings.timePeriods.filter((_, i) => i !== idx);
                            setEditingSettings({ ...editingSettings, timePeriods: newPeriods });
                          }}
                          className="h-10 text-red-500 hover:bg-red-50 rounded-xl text-xs font-bold transition-all border border-transparent hover:border-red-100"
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
                      className="w-full py-3 border-2 border-dashed border-slate-200 rounded-2xl text-slate-400 hover:text-emerald-600 hover:border-emerald-200 hover:bg-emerald-50/30 transition-all text-xs font-bold"
                    >
                      + إضافة فترة زمنية جديدة
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
