'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useSchedulerStore } from '@/store/useSchedulerStore';
import { db } from '@/lib/firebase';
import { collection, getDocs, setDoc, deleteDoc, doc, writeBatch } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { useBookings } from '@/hooks/useBookings';
import { useSettings } from '@/hooks/useSettings';
import { getChurchColor, churches } from '@/data/initialData';
import { useToast } from '@/components/Toast';

interface AllowedUser {
  id: string;
  email: string;
  name: string;
  role: 'user' | 'admin' | 'servant' | 'church_leader';
  created_at: string;
  churchName?: string;
  teamDetails?: {
    churchName?: string;
    teamName?: string;
    title?: string;
    ageGroup?: string;
    teamMembers?: { name: string; id: string }[];
  };
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
  const {
    bookings,
    allBookingsIncludingCancelled,
    restoreBooking,
    deleteBooking
  } = useBookings();
  const { settings, updateSettings } = useSettings();

  const [allowedUsers, setAllowedUsers] = useState<AllowedUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'users' | 'bookings' | 'evaluations' | 'settings' | 'leaders' | 'leaderboard' | 'analytics' | 'db_records' | 'church_leaders'>('users');
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [userActionMode, setUserActionMode] = useState<'none' | 'add' | 'import'>('none');
  const { toast } = useToast();
  const [importing, setImporting] = useState(false);
  const [importRole, setImportRole] = useState<'user' | 'admin' | 'servant' | 'church_leader'>('user');
  const [userRoleFilter, setUserRoleFilter] = useState<'all' | 'user' | 'admin' | 'servant' | 'church_leader'>('all');
  const [expandedLeaderId, setExpandedLeaderId] = useState<string | null>(null);

  // Restoration and archive state
  const [restoringBookingId, setRestoringBookingId] = useState<string | null>(null);
  const [archiveError, setArchiveError] = useState('');
  const [archiveSuccess, setArchiveSuccess] = useState('');

  // Add user form
  const [newEmail, setNewEmail] = useState('');
  const [newName, setNewName] = useState('');
  const [newRole, setNewRole] = useState<'user' | 'admin' | 'servant' | 'church_leader'>('user');
  const [adding, setAdding] = useState(false);
  const [addError, setAddError] = useState('');
  const [newChurchName, setNewChurchName] = useState('');
  const [removingId, setRemovingId] = useState<string | null>(null);

  // Confirmation dialog state
  const [confirmDeleteUser, setConfirmDeleteUser] = useState<string | null>(null);
  const [confirmRestoreBooking, setConfirmRestoreBooking] = useState<string | null>(null);
  const [confirmHardDeleteBooking, setConfirmHardDeleteBooking] = useState<string | null>(null);
  const [hardDeletingBookingId, setHardDeletingBookingId] = useState<string | null>(null);
  const [dbRecordsFilter, setDbRecordsFilter] = useState<'all' | 'active' | 'cancelled'>('all');
  const [expandedChurchLeaderId, setExpandedChurchLeaderId] = useState<string | null>(null);



  // Leaderboard state
  const [leaderboardSort, setLeaderboardSort] = useState<string>('total');

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



  const handleExcelImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImporting(true);
    try {
      const ExcelJS = (await import('exceljs')).default;
      const arrayBuffer = await file.arrayBuffer();
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(arrayBuffer);
      
      const worksheet = workbook.getWorksheet(1);
      if (!worksheet) {
        toast.error('ملف Excel فارغ أو غير صالح');
        return;
      }

      const usersToImport: { email: string; name: string }[] = [];
      
      worksheet.eachRow((row, rowNumber) => {
        if (rowNumber === 1) return; // Skip header row
        
        const emailCell = row.getCell(1);
        const nameCell = row.getCell(2);

        let email = '';
        if (emailCell && emailCell.value !== null) {
          const val = emailCell.value;
          if (typeof val === 'object' && val !== null) {
            const obj = val as unknown as Record<string, unknown>;
            email = String(obj.text || obj.hyperlink || '').trim();
          } else {
            email = String(val).trim();
          }
        }

        let name = '';
        if (nameCell && nameCell.value !== null) {
          const val = nameCell.value;
          if (typeof val === 'object' && val !== null) {
            const obj = val as unknown as Record<string, unknown>;
            name = String(obj.text || '').trim();
          } else {
            name = String(val).trim();
          }
        }

        // Validate email format to prevent injection of invalid Firestore doc IDs
        const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
        // Sanitize name: strip any HTML tags
        const sanitizedName = name.replace(/<[^>]*>/g, '').trim();

        if (email && sanitizedName && emailRegex.test(email)) {
          usersToImport.push({
            email: email.toLowerCase(),
            name: sanitizedName
          });
        }
      });

      if (usersToImport.length === 0) {
        toast.error('لم يتم العثور على بيانات صالحة. تأكد من أن العمود الأول هو البريد الإلكتروني والعمود الثاني هو الاسم.');
        return;
      }

      // Bulk import whitelisted team leaders in batches of 500
      const batchLimit = 500;
      let count = 0;
      for (let i = 0; i < usersToImport.length; i += batchLimit) {
        const chunk = usersToImport.slice(i, i + batchLimit);
        const batch = writeBatch(db);
        chunk.forEach(user => {
          const docRef = doc(db, 'allowed_users', user.email);
          batch.set(docRef, {
            email: user.email,
            name: user.name,
            role: importRole,
            created_at: new Date().toISOString()
          });
        });
        await batch.commit();
        count += chunk.length;
      }

      const roleLabels: Record<string, string> = { user: 'قادة فرق', admin: 'مسؤولين', servant: 'خدام مقيمين', church_leader: 'مسؤولي كنائس' };
      toast.success(`تم استيراد عدد ${count} من ${roleLabels[importRole] || 'المستخدمين'} بنجاح!`);
      await fetchUsers();
    } catch (err) {
      console.error('[AdminDashboard] Excel import error:', err);
      toast.error('حدث خطأ أثناء استيراد ملف Excel. تأكد من صيغة الملف.');
    } finally {
      setImporting(false);
      e.target.value = '';
    }
  };

  const handleAddUser = async () => {
    setAddError('');
    if (!newEmail.trim()) { setAddError('البريد الإلكتروني مطلوب'); return; }
    if (!newEmail.includes('@')) { setAddError('بريد إلكتروني غير صالح'); return; }
    if (!newName.trim()) { setAddError('الاسم مطلوب'); return; }
    if (newRole === 'church_leader' && !newChurchName) { setAddError('يجب اختيار الكنيسة لمسؤول الكنيسة'); return; }

    setAdding(true);
    try {
      const email = newEmail.trim().toLowerCase();
      const userData: Record<string, unknown> = {
        email,
        name: newName.trim(),
        role: newRole,
        created_at: new Date().toISOString(),
      };
      if (newRole === 'church_leader' && newChurchName) {
        userData.churchName = newChurchName;
      }
      await setDoc(doc(db, 'allowed_users', email), userData);
      setNewEmail('');
      setNewName('');
      setNewRole('user');
      setNewChurchName('');
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
      setConfirmDeleteUser(null);
    }
  };

  const handleHardDeleteBooking = async (bookingId: string) => {
    setHardDeletingBookingId(bookingId);
    try {
      await deleteDoc(doc(db, 'bookings', bookingId));
      toast.success('تم حذف السجل نهائياً من قاعدة البيانات');
    } catch (err) {
      console.error('Error hard-deleting booking:', err);
      toast.error('حدث خطأ أثناء حذف السجل');
    } finally {
      setHardDeletingBookingId(null);
      setConfirmHardDeleteBooking(null);
    }
  };

  const handleUpdateChurch = async (userId: string, churchName: string) => {
    try {
      await setDoc(doc(db, 'allowed_users', userId), { churchName }, { merge: true });
      setAllowedUsers(prev => prev.map(u => u.id === userId ? { ...u, churchName } : u));
      toast.success('تم تحديث كنيسة المستخدم بنجاح');
    } catch (err) {
      console.error('Error updating user church:', err);
      toast.error('حدث خطأ أثناء تحديث الكنيسة');
    }
  };

  const handleExportCSV = async () => {
    try {
      const auth = getAuth();
      const token = await auth.currentUser?.getIdToken();
      if (!token) throw new Error('Not authenticated');

      const res = await fetch('/api/export-bookings', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
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
          <div className="px-4 sm:px-6 py-3.5 bg-slate-50/80 border-b border-slate-150/70 shrink-0">
            <div className="overflow-x-auto scrollbar-hide">
              <div className="inline-flex p-1.5 bg-slate-200/60 rounded-2xl gap-1.5 w-full sm:w-auto min-w-full sm:min-w-0 justify-start sm:justify-center">
                {(
                  [
                    { 
                      id: 'users', 
                      label: 'المستخدمون',
                      icon: (
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                        </svg>
                      )
                    },
                    { 
                      id: 'bookings', 
                      label: 'سجل المشاريع',
                      icon: (
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                        </svg>
                      )
                    },
                    { 
                      id: 'evaluations', 
                      label: 'نتائج التقييم',
                      icon: (
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                        </svg>
                      )
                    },
                    { 
                      id: 'leaders', 
                      label: 'بيانات القادة',
                      icon: (
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 012-2h2a2 2 0 012 2v1m-6 0h6" />
                        </svg>
                      )
                    },
                    { 
                      id: 'leaderboard', 
                      label: 'لوحة الصدارة',
                      icon: (
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                        </svg>
                      )
                    },
                    { 
                      id: 'analytics', 
                      label: 'إحصائيات الأداء',
                      icon: (
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                        </svg>
                      )
                    },

                    { 
                      id: 'db_records', 
                      label: 'سجلات قاعدة البيانات',
                      icon: (
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" />
                        </svg>
                      )
                    },
                    { 
                      id: 'church_leaders', 
                      label: 'مسؤولو الكنائس',
                      icon: (
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                        </svg>
                      )
                    },
                    { 
                      id: 'settings', 
                      label: 'إعدادات النظام',
                      icon: (
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                          <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                      )
                    }
                  ] as const
                ).map(tab => {
                  const isActive = activeTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`px-3.5 py-2.5 text-xs font-black rounded-xl transition-all duration-200 cursor-pointer flex items-center gap-2 shrink-0 whitespace-nowrap ${
                        isActive 
                          ? 'bg-slate-900 text-white shadow-md shadow-slate-900/20 scale-[1.02]' 
                          : 'text-slate-600 hover:text-slate-900 hover:bg-white/70'
                      }`}
                    >
                      <span className={`transition-transform duration-200 ${isActive ? 'scale-110 text-emerald-400' : 'text-slate-400'}`}>
                        {tab.icon}
                      </span>
                      <span>{tab.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-5 scrollbar-hide">

            {/* USERS TAB */}
            {activeTab === 'users' && (
              <div className="space-y-5 animate-fade-in">
                
                {/* 1. Header & Summary Quick Stats */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="bg-white border border-slate-100 p-4 rounded-2xl shadow-3xs flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center font-black text-lg shrink-0">
                      <svg className="w-5 h-5 text-slate-700" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-slate-400">إجمالي المصرح لهم</p>
                      <p className="text-lg font-black text-slate-800 leading-tight">{allowedUsers.length}</p>
                    </div>
                  </div>

                  <div className="bg-white border border-slate-100 p-4 rounded-2xl shadow-3xs flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-black text-lg shrink-0">
                      <svg className="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-slate-400">قادة الفرق</p>
                      <p className="text-lg font-black text-blue-700 leading-tight">
                        {allowedUsers.filter(u => u.role === 'user').length}
                      </p>
                    </div>
                  </div>

                  <div className="bg-white border border-slate-100 p-4 rounded-2xl shadow-3xs flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-black text-lg shrink-0">
                      <svg className="w-5 h-5 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-slate-400">مسؤولو الكنائس</p>
                      <p className="text-lg font-black text-emerald-700 leading-tight">
                        {allowedUsers.filter(u => u.role === 'church_leader').length}
                      </p>
                    </div>
                  </div>

                  <div className="bg-white border border-slate-100 p-4 rounded-2xl shadow-3xs flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-black text-lg shrink-0">
                      <svg className="w-5 h-5 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-slate-400">الخدام والمسؤولون</p>
                      <p className="text-lg font-black text-indigo-700 leading-tight">
                        {allowedUsers.filter(u => u.role === 'servant' || u.role === 'admin').length}
                      </p>
                    </div>
                  </div>
                </div>

                {/* 2. Control Toolbar: Search + Action Toggles */}
                <div className="bg-white border border-slate-150/70 p-4 rounded-3xl space-y-4 shadow-3xs">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                    
                    {/* Live Search Input */}
                    <div className="relative flex-1">
                      <input
                        type="text"
                        value={userSearchQuery}
                        onChange={e => setUserSearchQuery(e.target.value)}
                        placeholder="ابحث بالاسم، البريد الإلكتروني، أو اسم الكنيسة..."
                        className="w-full pl-9 pr-10 py-2.5 bg-slate-50 border border-slate-200/80 rounded-2xl text-xs font-bold text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-slate-800 focus:bg-white transition-all shadow-3xs"
                      />
                      <svg className="w-4 h-4 text-slate-400 absolute right-3.5 top-3 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                      </svg>
                      {userSearchQuery && (
                        <button
                          onClick={() => setUserSearchQuery('')}
                          className="absolute left-3 top-2.5 text-slate-400 hover:text-slate-600 font-black text-xs cursor-pointer"
                        >
                          ✕
                        </button>
                      )}
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => setUserActionMode(userActionMode === 'add' ? 'none' : 'add')}
                        className={`px-4 py-2.5 rounded-2xl text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 shadow-3xs ${
                          userActionMode === 'add'
                            ? 'bg-slate-900 text-white shadow-md shadow-slate-900/15'
                            : 'bg-slate-100 hover:bg-slate-200/70 text-slate-700'
                        }`}
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
                        </svg>
                        <span>إضافة مستخدم</span>
                      </button>

                      <button
                        onClick={() => setUserActionMode(userActionMode === 'import' ? 'none' : 'import')}
                        className={`px-4 py-2.5 rounded-2xl text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 shadow-3xs ${
                          userActionMode === 'import'
                            ? 'bg-emerald-700 text-white shadow-md shadow-emerald-700/15'
                            : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200/50'
                        }`}
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                        </svg>
                        <span>استيراد Excel</span>
                      </button>
                    </div>
                  </div>

                  {/* Collapsible Action Drawer 1: Add Single User */}
                  {userActionMode === 'add' && (
                    <div className="pt-4 border-t border-slate-100 space-y-4 animate-scale-in">
                      <div className="flex items-center justify-between">
                        <h4 className="font-black text-xs text-slate-800 flex items-center gap-1.5">
                          <span className="w-1.5 h-3.5 rounded-full bg-slate-800 inline-block" />
                          إضافة مستخدم مصرح له جديد
                        </h4>
                        <button onClick={() => setUserActionMode('none')} className="text-slate-400 hover:text-slate-600 text-xs font-bold cursor-pointer">إغلاق</button>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <input
                          type="email"
                          value={newEmail}
                          onChange={e => setNewEmail(e.target.value)}
                          className="px-3.5 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:border-slate-800 bg-slate-50/50 text-slate-800 text-xs font-bold transition-all"
                          placeholder="البريد الإلكتروني..."
                        />
                        <input
                          type="text"
                          value={newName}
                          onChange={e => setNewName(e.target.value)}
                          className="px-3.5 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:border-slate-800 bg-slate-50/50 text-slate-800 text-xs font-bold transition-all"
                          placeholder="الاسم الكامل..."
                        />
                        <select
                          value={newRole}
                          onChange={e => setNewRole(e.target.value as 'user' | 'admin' | 'servant' | 'church_leader')}
                          className="px-3.5 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:border-slate-800 bg-slate-50/50 text-xs transition-all font-black text-slate-700 cursor-pointer"
                        >
                          <option value="user">قائد فريق (User)</option>
                          <option value="church_leader">مسؤول كنيسة</option>
                          <option value="servant">خادم مقيم / Servant</option>
                          <option value="admin">مسؤول (Admin)</option>
                        </select>
                      </div>

                      {newRole === 'church_leader' && (
                        <div>
                          <select
                            value={newChurchName}
                            onChange={e => setNewChurchName(e.target.value)}
                            className="w-full px-3.5 py-2.5 border border-emerald-200 rounded-xl focus:outline-none focus:border-emerald-600 bg-emerald-50/30 text-xs transition-all font-bold text-slate-800 cursor-pointer"
                          >
                            <option value="">اختر الكنيسة التابع لها مسؤول الكنيسة...</option>
                            {churches.map((church, idx) => (
                              <option key={idx} value={church}>{church}</option>
                            ))}
                          </select>
                        </div>
                      )}

                      {addError && <p className="text-rose-500 text-xs font-bold">{addError}</p>}

                      <div className="flex justify-end">
                        <button
                          onClick={handleAddUser}
                          disabled={adding}
                          className="px-6 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-black rounded-xl text-xs disabled:opacity-50 transition-all shadow-md shadow-slate-900/10 active:scale-95 cursor-pointer flex items-center gap-2"
                        >
                          {adding ? (
                            <>
                              <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                              <span>جاري الإضافة...</span>
                            </>
                          ) : (
                            <span>+ تأكيد الإضافة</span>
                          )}
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Collapsible Action Drawer 2: Bulk Excel Import */}
                  {userActionMode === 'import' && (
                    <div className="pt-4 border-t border-slate-100 space-y-4 animate-scale-in">
                      <div className="flex items-center justify-between">
                        <h4 className="font-black text-xs text-emerald-800 flex items-center gap-1.5">
                          <span className="w-1.5 h-3.5 rounded-full bg-emerald-600 inline-block" />
                          الاستيراد الجماعي من ملف Excel
                        </h4>
                        <button onClick={() => setUserActionMode('none')} className="text-slate-400 hover:text-slate-600 text-xs font-bold cursor-pointer">إغلاق</button>
                      </div>

                      <p className="text-xs text-slate-500 font-bold leading-relaxed">
                        قم برفع ملف Excel يحتوي على: العمود الأول (البريد الإلكتروني) والعمود الثاني (الاسم الكامل). وسيتم منحهم الصلاحية بالدور المحدد.
                      </p>

                      <div className="flex flex-col sm:flex-row items-center gap-3">
                        <div className="flex-1 w-full flex items-center gap-2 bg-slate-50 border border-slate-200 p-2.5 rounded-xl">
                          <span className="text-xs font-bold text-slate-500 shrink-0">استيراد كـ:</span>
                          <select
                            value={importRole}
                            onChange={e => setImportRole(e.target.value as 'user' | 'admin' | 'servant' | 'church_leader')}
                            className="flex-1 px-3 py-1.5 border border-slate-200 rounded-lg focus:outline-none focus:border-slate-800 bg-white text-xs font-bold text-slate-800 cursor-pointer"
                          >
                            <option value="user">قائد فريق (User)</option>
                            <option value="church_leader">مسؤول كنيسة</option>
                            <option value="servant">خادم مقيم / Servant</option>
                            <option value="admin">مسؤول (Admin)</option>
                          </select>
                        </div>

                        <label className={`w-full sm:w-auto relative flex items-center justify-center gap-2 px-6 py-2.5 border border-emerald-500 bg-emerald-600 hover:bg-emerald-700 rounded-xl cursor-pointer text-white text-xs font-black transition-all shrink-0 shadow-md shadow-emerald-600/20 active:scale-95 ${importing ? 'pointer-events-none opacity-55' : ''}`}>
                          {importing ? (
                            <>
                              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                              <span>جاري الاستيراد...</span>
                            </>
                          ) : (
                            <>
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                              </svg>
                              <span>اختيار ملف Excel ورفع</span>
                            </>
                          )}
                          <input
                            type="file"
                            accept=".xlsx, .xls"
                            onChange={handleExcelImport}
                            className="hidden"
                            disabled={importing}
                          />
                        </label>
                      </div>
                    </div>
                  )}

                  {/* 3. Role Filter Sub-Tabs */}
                  <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide pt-2 border-t border-slate-100">
                    {([
                      { id: 'all' as const, label: 'الكل', count: allowedUsers.length },
                      { id: 'user' as const, label: 'قادة الفرق', count: allowedUsers.filter(u => u.role === 'user').length },
                      { id: 'church_leader' as const, label: 'مسؤولو الكنائس', count: allowedUsers.filter(u => u.role === 'church_leader').length },
                      { id: 'servant' as const, label: 'الخدام المقيمون', count: allowedUsers.filter(u => u.role === 'servant').length },
                      { id: 'admin' as const, label: 'المسؤولون', count: allowedUsers.filter(u => u.role === 'admin').length },
                    ]).map(filter => (
                      <button
                        key={filter.id}
                        onClick={() => setUserRoleFilter(filter.id)}
                        className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all duration-200 cursor-pointer shrink-0 flex items-center gap-1.5 ${
                          userRoleFilter === filter.id
                            ? 'bg-slate-900 text-white shadow-md shadow-slate-900/15'
                            : 'bg-slate-50 border border-slate-200/60 text-slate-500 hover:text-slate-700 hover:border-slate-300'
                        }`}
                      >
                        {filter.label}
                        <span className={`inline-flex items-center justify-center min-w-5 h-5 px-1.5 rounded-full text-[10px] font-black ${
                          userRoleFilter === filter.id
                            ? 'bg-white/20 text-white'
                            : 'bg-slate-200/70 text-slate-600'
                        }`}>
                          {filter.count}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* 4. Users Cards List */}
                {loading ? (
                  <div className="text-center py-12">
                    <div className="w-8 h-8 border-4 border-slate-800 border-t-transparent rounded-full animate-spin mx-auto" />
                  </div>
                ) : (() => {
                  const searchLower = userSearchQuery.toLowerCase().trim();
                  const filteredUsers = allowedUsers.filter(u => {
                    const matchesRole = userRoleFilter === 'all' || u.role === userRoleFilter;
                    const church = u.churchName || u.teamDetails?.churchName || '';
                    const matchesSearch = !searchLower || 
                      u.name.toLowerCase().includes(searchLower) ||
                      u.email.toLowerCase().includes(searchLower) ||
                      church.toLowerCase().includes(searchLower);
                    return matchesRole && matchesSearch;
                  });

                  if (filteredUsers.length === 0) {
                    return (
                      <div className="text-center py-16 bg-white rounded-3xl border border-dashed border-slate-200 text-slate-400 space-y-2">
                        <p className="text-sm font-bold">لا يوجد مستخدمون مطبقون لهذا البحث أو الفلتر.</p>
                        {userSearchQuery && (
                          <button
                            onClick={() => setUserSearchQuery('')}
                            className="text-xs font-black text-slate-700 underline cursor-pointer hover:text-slate-900"
                          >
                            إعادة ضبط البحث
                          </button>
                        )}
                      </div>
                    );
                  }

                  return (
                    <div className="space-y-3 max-h-[45vh] overflow-y-auto pr-1 scrollbar-hide">
                      <div className="flex items-center justify-between text-[11px] font-bold text-slate-400 px-1">
                        <span>عرض {filteredUsers.length} من أصل {allowedUsers.length} مستخدم</span>
                      </div>
                      
                      {filteredUsers.map(u => {
                        const userChurch = u.churchName || u.teamDetails?.churchName;
                        const churchColor = getChurchColor(userChurch || '');

                        return (
                          <div 
                            key={u.id} 
                            className="flex flex-col sm:flex-row sm:items-center justify-between bg-white hover:bg-slate-50/80 border border-slate-150/70 p-4 rounded-2xl transition-all duration-200 hover:shadow-xs hover:border-slate-300 gap-3.5"
                          >
                            {/* User Avatar + Details */}
                            <div className="flex items-center gap-3.5 min-w-0 flex-1">
                              {/* Avatar */}
                              <div className={`w-11 h-11 rounded-2xl flex items-center justify-center text-sm font-black shadow-xs shrink-0 ${
                                u.role === 'admin' 
                                  ? 'bg-slate-800 text-white shadow-slate-800/10' 
                                  : u.role === 'servant'
                                    ? 'bg-indigo-600 text-white shadow-indigo-600/10'
                                    : u.role === 'church_leader'
                                      ? 'bg-emerald-600 text-white shadow-emerald-600/10'
                                      : 'bg-sky-600 text-white shadow-sky-600/10'
                              }`}>
                                {u.name[0]}
                              </div>

                              {/* Details */}
                              <div className="min-w-0 flex-1 space-y-1">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <p className="font-black text-slate-800 text-sm leading-tight truncate">{u.name}</p>
                                  
                                  {/* Role Badge */}
                                  <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-black border shrink-0 ${
                                    u.role === 'admin' 
                                      ? 'bg-slate-100 text-slate-700 border-slate-200/50' 
                                      : u.role === 'servant'
                                        ? 'bg-indigo-50 text-indigo-700 border-indigo-200/40'
                                        : u.role === 'church_leader'
                                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200/40'
                                          : 'bg-sky-50 text-sky-700 border-sky-200/40'
                                  }`}>
                                    {u.role === 'admin' ? 'مسؤول' : u.role === 'servant' ? 'خادم مقيم' : u.role === 'church_leader' ? 'مسؤول كنيسة' : 'قائد فريق'}
                                  </span>
                                </div>

                                <p className="text-slate-450 text-xs font-semibold leading-normal py-0.5 truncate" dir="ltr">{u.email}</p>

                                {/* Church Tag */}
                                <div className="pt-0.5 flex items-center gap-2 flex-wrap">
                                  {userChurch ? (
                                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-black border border-slate-200/60 shadow-3xs ${churchColor.badge}`}>
                                      <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: churchColor.hex }} />
                                      <span>{userChurch}</span>
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-400 border border-slate-200/50">
                                      غير محدد الكنيسة
                                    </span>
                                  )}

                                  {u.teamDetails?.teamName && (
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-50 text-slate-600 border border-slate-150/50">
                                      <svg className="w-3 h-3 text-slate-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                                      </svg>
                                      <span>{u.teamDetails.teamName}</span>
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>

                            {/* Delete Action Button */}
                            <button
                              onClick={() => setConfirmDeleteUser(u.id)}
                              disabled={removingId === u.id}
                              className="px-3.5 py-1.5 border border-rose-200/60 text-rose-600 hover:text-rose-700 hover:bg-rose-50 font-bold text-xs rounded-xl transition-all cursor-pointer active:scale-95 shadow-3xs w-full sm:w-auto text-center shrink-0 flex items-center justify-center gap-1.5"
                            >
                              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                              <span>{removingId === u.id ? 'جاري...' : 'حذف'}</span>
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  );
                })()}

              </div>
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
                      const memberCount = b.teamMembers ? b.teamMembers.length : 0;
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

            {/* ANALYTICS TAB */}
            {activeTab === 'analytics' && (
              <div className="space-y-6 animate-fade-in">
                <div className="flex items-center gap-3 bg-white p-5 rounded-3xl border border-slate-100 shadow-sm">
                  <div className="w-12 h-12 rounded-2xl bg-slate-800 text-white flex items-center justify-center shadow-lg">
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="font-black text-slate-800 text-lg">إحصائيات الأداء</h3>
                    <p className="text-xs text-slate-500 font-bold mt-0.5">نظرة عامة على نشاط المشاريع والحجوزات</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Chart 1: Projects by Church */}
                  <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
                    <h4 className="font-black text-slate-700 mb-6 flex items-center gap-2">
                      <span className="w-2 h-5 rounded-full bg-emerald-500" />
                      توزيع المشاريع حسب الكنيسة
                    </h4>
                    
                    {(() => {
                      const churchCounts = bookings.reduce((acc, b) => {
                        const church = b.churchName || 'غير محدد';
                        acc[church] = (acc[church] || 0) + 1;
                        return acc;
                      }, {} as Record<string, number>);
                      
                      const maxCount = Math.max(...Object.values(churchCounts), 1);
                      const sortedChurches = Object.entries(churchCounts).sort((a, b) => b[1] - a[1]);
                      
                      if (sortedChurches.length === 0) return <p className="text-center text-slate-400 py-10">لا توجد بيانات</p>;
                      
                      return (
                        <div className="space-y-4">
                          {sortedChurches.map(([church, count], idx) => (
                            <div key={idx} className="space-y-1.5">
                              <div className="flex justify-between text-xs font-bold text-slate-600">
                                <span>{church}</span>
                                <span>{count} مشاريع</span>
                              </div>
                              <div className="h-3 w-full bg-slate-100 rounded-full overflow-hidden">
                                <div 
                                  className="h-full bg-linear-to-r from-emerald-400 to-emerald-600 rounded-full transition-all duration-1000"
                                  style={{ width: `${(count / maxCount) * 100}%` }}
                                />
                              </div>
                            </div>
                          ))}
                        </div>
                      );
                    })()}
                  </div>
                  
                  {/* Chart 2: Booking Status */}
                  <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
                    <h4 className="font-black text-slate-700 mb-6 flex items-center gap-2">
                      <span className="w-2 h-5 rounded-full bg-indigo-500" />
                      حالة الحجوزات
                    </h4>
                    
                    {(() => {
                      const stats = {
                        approved: bookings.filter(b => b.status === 'approved').length,
                        pending: bookings.filter(b => b.status === 'pending').length,
                        rejected: bookings.filter(b => b.status === 'rejected').length
                      };
                      
                      const total = bookings.length || 1;
                      
                      return (
                        <div className="flex flex-col items-center justify-center">
                          <div className="relative w-48 h-48 mb-6">
                            <svg viewBox="0 0 36 36" className="w-full h-full transform -rotate-90">
                              {/* Background Circle */}
                              <path
                                className="text-slate-100"
                                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="4"
                              />
                              {/* Approved */}
                              <path
                                className="text-emerald-500"
                                strokeDasharray={`${(stats.approved / total) * 100}, 100`}
                                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="4"
                              />
                              {/* Pending (Offset by Approved) */}
                              <path
                                className="text-amber-400"
                                strokeDasharray={`${(stats.pending / total) * 100}, 100`}
                                strokeDashoffset={`-${(stats.approved / total) * 100}`}
                                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="4"
                              />
                              {/* Rejected (Offset by Approved + Pending) */}
                              <path
                                className="text-rose-500"
                                strokeDasharray={`${(stats.rejected / total) * 100}, 100`}
                                strokeDashoffset={`-${((stats.approved + stats.pending) / total) * 100}`}
                                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="4"
                              />
                            </svg>
                            <div className="absolute inset-0 flex flex-col items-center justify-center">
                              <span className="text-3xl font-black text-slate-800">{bookings.length}</span>
                              <span className="text-[10px] font-bold text-slate-400">إجمالي الحجوزات</span>
                            </div>
                          </div>
                          
                          <div className="flex gap-4 w-full justify-center">
                            <div className="flex flex-col items-center">
                              <span className="w-3 h-3 rounded-full bg-emerald-500 mb-1"></span>
                              <span className="text-[10px] font-bold text-slate-500">معتمد ({stats.approved})</span>
                            </div>
                            <div className="flex flex-col items-center">
                              <span className="w-3 h-3 rounded-full bg-amber-400 mb-1"></span>
                              <span className="text-[10px] font-bold text-slate-500">الانتظار ({stats.pending})</span>
                            </div>
                            <div className="flex flex-col items-center">
                              <span className="w-3 h-3 rounded-full bg-rose-500 mb-1"></span>
                              <span className="text-[10px] font-bold text-slate-500">مرفوض ({stats.rejected})</span>
                            </div>
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                </div>
              </div>
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



            {/* LEADERS DATA TAB */}
            {activeTab === 'leaders' && (
              <div className="space-y-4 animate-fade-in">
                <div className="bg-slate-50/50 p-5 rounded-3xl border border-slate-100">
                  <h3 className="font-black text-slate-800 text-sm flex items-center gap-2">
                    <span className="w-1.5 h-4 rounded-full bg-slate-700 inline-block" />
                    بيانات القادة المسجلة
                  </h3>
                  <p className="text-xs text-slate-400 font-bold mt-1">
                    قادة الفرق الذين قاموا بتسجيل بيانات فرقهم. اضغط على أي بطاقة لعرض التفاصيل الكاملة.
                  </p>
                </div>

                {/* Summary Stats */}
                {(() => {
                  const leadersWithDetails = allowedUsers.filter(u => u.role === 'user' && u.teamDetails);
                  const leadersCount = leadersWithDetails.length;
                  const churchLeaderCounts = leadersWithDetails.reduce((acc, u) => {
                    const church = u.teamDetails?.churchName || 'غير محدد';
                    acc[church] = (acc[church] || 0) + 1;
                    return acc;
                  }, {} as Record<string, number>);
                  const sortedChurches = Object.entries(churchLeaderCounts).sort((a, b) => b[1] - a[1]);
                  const maxChurchCount = Math.max(...sortedChurches.map(([, c]) => c), 1);

                  return (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {/* Total Leaders Card */}
                      <div className="bg-white border border-slate-100 rounded-2xl p-4 flex items-center gap-3.5 shadow-sm hover:shadow-md transition-shadow duration-200">
                        <div className="w-11 h-11 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 shadow-sm">
                          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                          </svg>
                        </div>
                        <div>
                          <p className="text-[10px] font-bold text-slate-400 uppercase leading-none">إجمالي القادة المسجلين</p>
                          <p className="text-xl font-black text-slate-800 mt-1 leading-none">{leadersCount}</p>
                        </div>
                      </div>

                      {/* Churches Breakdown Card */}
                      <div className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm hover:shadow-md transition-shadow duration-200">
                        <div className="flex items-center gap-3 mb-3">
                          <div className="w-11 h-11 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0 shadow-sm">
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                            </svg>
                          </div>
                          <div>
                            <p className="text-[10px] font-bold text-slate-400 uppercase leading-none">الكنائس المسجلة</p>
                            <p className="text-xl font-black text-slate-800 mt-1 leading-none">{sortedChurches.length} <span className="text-xs font-bold text-slate-400">كنيسة</span></p>
                          </div>
                        </div>
                        {sortedChurches.length > 0 && (
                          <div className="space-y-2 max-h-32 overflow-y-auto scrollbar-hide pr-0.5">
                            {sortedChurches.map(([church, count]) => {
                              const churchColor = getChurchColor(church);
                              return (
                                <div key={church} className="flex items-center gap-2.5">
                                  <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: churchColor.hex }} />
                                  <span className="text-[11px] font-bold text-slate-600 truncate flex-1 min-w-0">{church}</span>
                                  <div className="w-20 h-1.5 bg-slate-100 rounded-full overflow-hidden shrink-0">
                                    <div
                                      className="h-full rounded-full transition-all duration-700"
                                      style={{ width: `${(count / maxChurchCount) * 100}%`, backgroundColor: churchColor.hex }}
                                    />
                                  </div>
                                  <span className="text-[11px] font-black text-slate-700 w-5 text-left shrink-0">{count}</span>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })()}

                {(() => {
                  // Filter users who have role 'user' and have teamDetails filled
                  const leadersWithData = allowedUsers.filter(
                    u => u.role === 'user' && u.teamDetails
                  );

                  if (loading) {
                    return (
                      <div className="text-center py-8">
                        <div className="w-8 h-8 border-4 border-slate-800 border-t-transparent rounded-full animate-spin mx-auto" />
                      </div>
                    );
                  }

                  if (leadersWithData.length === 0) {
                    return (
                      <div className="text-center py-16 bg-slate-50/20 rounded-3xl border border-dashed border-slate-200 text-slate-400 font-bold text-sm">
                        لا يوجد قادة قاموا بتسجيل بيانات فرقهم بعد.
                      </div>
                    );
                  }

                  return (
                    <div className="space-y-3 max-h-[50vh] overflow-y-auto pr-1 scrollbar-hide">
                      {leadersWithData.map(leader => {
                        const td = leader.teamDetails;
                        if (!td) return null;
                        const isExpanded = expandedLeaderId === leader.id;
                        const memberCount = td.teamMembers?.length || 0;
                        const churchColor = getChurchColor(td.churchName || '');

                        return (
                          <div
                            key={leader.id}
                            className="bg-white border border-slate-150/70 rounded-2xl overflow-hidden hover:shadow-xs transition-all duration-200"
                          >
                            {/* Leader Card Header */}
                            <button
                              onClick={() => setExpandedLeaderId(isExpanded ? null : leader.id)}
                              className="w-full p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 cursor-pointer text-right"
                            >
                              <div className="flex items-center gap-3 min-w-0 flex-1">
                                <span className={`w-1.5 h-11 rounded-full shrink-0`} style={{ background: `linear-gradient(to bottom, ${churchColor.hex}, ${churchColor.hex}cc)` }} />
                                <div className="min-w-0 flex-1">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <p className="font-black text-slate-800 text-sm leading-normal truncate">{leader.name}</p>
                                    <span className="px-2 py-0.5 rounded-full text-[9px] font-black bg-emerald-50 text-emerald-700 border border-emerald-200/50 leading-none shrink-0">
                                      مسجّل
                                    </span>
                                  </div>
                                  <p className="text-slate-450 text-xs font-semibold leading-normal truncate mt-0.5" dir="ltr">{leader.email}</p>
                                  <div className="flex flex-wrap items-center gap-2 mt-1.5 text-[11px] font-bold text-slate-500">
                                    <span className="flex items-center gap-1">
                                      <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: churchColor.hex }} />
                                      {td.churchName || 'غير محدد'}
                                    </span>
                                    <span className="text-slate-300">•</span>
                                    <span>{td.teamName || 'بدون فريق'}</span>
                                    <span className="text-slate-300">•</span>
                                    <span>{memberCount} أعضاء</span>
                                  </div>
                                </div>
                              </div>

                              <div className="flex items-center gap-3 shrink-0 border-t border-slate-100/50 pt-2.5 sm:pt-0 sm:border-0">
                                <div className="bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl text-center shadow-3xs">
                                  <p className="text-[9px] font-bold text-slate-450 uppercase leading-none">الأعضاء</p>
                                  <p className="text-xs font-black text-slate-800 mt-0.5 leading-none">{memberCount}</p>
                                </div>
                                <svg className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
                                </svg>
                              </div>
                            </button>

                            {/* Expanded Details */}
                            {isExpanded && (
                              <div className="bg-slate-50/40 border-t border-slate-100 p-4 space-y-4 animate-fade-in">
                                {/* Project Info */}
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                                  <div className="bg-white p-3 border border-slate-100 rounded-xl text-center">
                                    <p className="text-[10px] font-bold text-slate-450">الكنيسة</p>
                                    <p className="text-xs font-black text-slate-800 mt-1 truncate" title={td.churchName}>{td.churchName || '—'}</p>
                                  </div>
                                  <div className="bg-white p-3 border border-slate-100 rounded-xl text-center">
                                    <p className="text-[10px] font-bold text-slate-450">اسم الفريق</p>
                                    <p className="text-xs font-black text-slate-800 mt-1 truncate" title={td.teamName}>{td.teamName || '—'}</p>
                                  </div>
                                  <div className="bg-white p-3 border border-slate-100 rounded-xl text-center">
                                    <p className="text-[10px] font-bold text-slate-450">عنوان المشروع</p>
                                    <p className="text-xs font-black text-slate-800 mt-1 truncate" title={td.title}>{td.title || '—'}</p>
                                  </div>
                                  <div className="bg-white p-3 border border-slate-100 rounded-xl text-center">
                                    <p className="text-[10px] font-bold text-slate-450">المرحلة العمرية</p>
                                    <p className="text-xs font-black text-slate-800 mt-1 truncate" title={td.ageGroup}>{td.ageGroup || '—'}</p>
                                  </div>
                                </div>

                                {/* Team Members List */}
                                <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-3xs">
                                  <h4 className="text-xs font-bold text-slate-700 mb-3 flex items-center gap-1.5">
                                    <span className="w-1.5 h-3.5 rounded-full bg-slate-700 inline-block" />
                                    أعضاء الفريق ({memberCount})
                                  </h4>
                                  {(!td.teamMembers || td.teamMembers.length === 0) ? (
                                    <p className="text-center text-slate-400 text-xs py-4">لم يتم إضافة أعضاء بعد</p>
                                  ) : (
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                      {td.teamMembers.map((member, idx) => (
                                        <div key={idx} className="flex items-center gap-2.5 p-2.5 bg-slate-50/50 rounded-xl border border-slate-100/50">
                                          <span className="w-7 h-7 rounded-full bg-slate-200 text-slate-600 flex items-center justify-center text-[10px] font-black shrink-0">
                                            {idx + 1}
                                          </span>
                                          <div className="min-w-0 flex-1">
                                            <p className="text-xs font-bold text-slate-800 truncate">{member.name}</p>
                                            <p className="text-[10px] text-slate-400 font-semibold truncate">كود: {member.id}</p>
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  )}
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

            {/* LEADERBOARD TAB */}
            {activeTab === 'leaderboard' && (
              <div className="space-y-4 animate-fade-in">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between bg-slate-50/50 p-5 rounded-3xl border border-slate-100 gap-4">
                  <div>
                    <h3 className="font-black text-slate-800 text-sm flex items-center gap-2">
                      <span className="w-1.5 h-4 rounded-full bg-slate-700 inline-block" />
                      لوحة الصدارة (للمسؤولين فقط)
                    </h3>
                    <p className="text-xs text-slate-400 font-bold mt-1">
                      ترتيب الفرق بناءً على نقاط التقييم المتراكمة
                    </p>
                  </div>
                  <select
                    value={leaderboardSort}
                    onChange={(e) => setLeaderboardSort(e.target.value)}
                    className="px-4 py-2 border border-slate-200 rounded-xl focus:outline-none focus:border-slate-800 bg-white text-sm transition-all font-bold text-slate-700 cursor-pointer"
                  >
                    <option value="total">الترتيب بالمجموع الكلي</option>
                    {(settings.evaluationFields || []).map(f => (
                      <option key={f.id} value={f.id}>الترتيب بـ: {f.name}</option>
                    ))}
                  </select>
                </div>
                
                {(() => {
                  const teamScores: Record<string, { churchName: string, teamName: string, total: number, counts: number, fields: Record<string, number> }> = {};
                  bookings.forEach(b => {
                    if (b.status !== 'approved') return;
                    const evals = evaluations.filter(e => e.bookingId === b.id);
                    if (evals.length === 0) return;
                    
                    const churchName = b.churchName || 'غير معروف';
                    const teamName = b.title || 'بدون عنوان';
                    
                    const key = `${churchName} - ${teamName}`;
                    if (!teamScores[key]) {
                      teamScores[key] = { churchName, teamName, total: 0, counts: 0, fields: {} };
                    }
                    
                    // Average for this booking
                    const bookingAvgTotal = evals.reduce((sum, ev) => sum + Object.values(ev.grades).reduce((a,c)=>a+c,0), 0) / evals.length;
                    teamScores[key].total += bookingAvgTotal;
                    teamScores[key].counts += 1;
                    
                    (settings.evaluationFields || []).forEach(f => {
                      if (!teamScores[key].fields[f.id]) teamScores[key].fields[f.id] = 0;
                      const fieldAvg = evals.reduce((sum, ev) => sum + (ev.grades[f.id] || 0), 0) / evals.length;
                      teamScores[key].fields[f.id] += fieldAvg;
                    });
                  });
                  
                  const sortedTeams = Object.values(teamScores).sort((a, b) => {
                    if (leaderboardSort === 'total') return b.total - a.total;
                    return (b.fields[leaderboardSort] || 0) - (a.fields[leaderboardSort] || 0);
                  });

                  if (sortedTeams.length === 0) {
                    return (
                      <div className="text-center py-16 bg-slate-50/20 rounded-3xl border border-dashed border-slate-200 text-slate-400 font-bold text-sm">
                        لا توجد تقييمات كافية لعرض لوحة الصدارة.
                      </div>
                    );
                  }

                  const maxVal = Math.max(...sortedTeams.map(t => leaderboardSort === 'total' ? t.total : t.fields[leaderboardSort] || 0));

                  return (
                    <div className="space-y-3.5 max-h-[45vh] overflow-y-auto pr-1 scrollbar-hide">
                      {sortedTeams.map((team, idx) => {
                        const val = leaderboardSort === 'total' ? team.total : team.fields[leaderboardSort] || 0;
                        const churchColor = getChurchColor(team.churchName);
                        
                        let rankBadge = `#${idx + 1}`;
                        if (idx === 0) rankBadge = '#1';
                        else if (idx === 1) rankBadge = '#2';
                        else if (idx === 2) rankBadge = '#3';

                        return (
                          <div key={team.teamName} className="bg-white border border-slate-100 p-4 rounded-3xl hover:shadow-2xs transition-all flex flex-col gap-3 relative overflow-hidden">
                            <div className="flex items-center justify-between z-10 relative">
                              <div className="flex items-center gap-3">
                                <div className={`w-10 h-10 rounded-2xl flex items-center justify-center text-sm font-black shrink-0 ${idx < 3 ? 'bg-amber-50 text-amber-600 border border-amber-200/60' : 'bg-slate-50 text-slate-400 border border-slate-200/50'}`}>
                                  {rankBadge}
                                </div>
                                <div>
                                  <p className="font-black text-slate-800 text-sm leading-normal">{team.churchName}</p>
                                  <p className="text-slate-500 text-[11px] font-bold mt-0.5">{team.teamName} • {team.counts} مشاريع مقيمة</p>
                                </div>
                              </div>
                              <div className="text-left">
                                <p className="font-black text-lg" style={{ color: churchColor.bg }}>{val.toFixed(1)}</p>
                                <p className="text-[10px] text-slate-400 font-bold">نقطة</p>
                              </div>
                            </div>
                            
                            <div className="w-full bg-slate-50 rounded-full h-2.5 overflow-hidden z-10 relative">
                              <div 
                                className="h-full rounded-full transition-all duration-1000 ease-out"
                                style={{ 
                                  width: `${maxVal > 0 ? (val / maxVal) * 100 : 0}%`, 
                                  backgroundColor: churchColor.bg,
                                  boxShadow: `0 0 10px ${churchColor.bg}40`
                                }}
                              />
                            </div>
                            
                            <div className="absolute left-0 top-0 bottom-0 w-32 bg-linear-to-r from-transparent to-white/50 pointer-events-none z-0" />
                          </div>
                        );
                      })}
                    </div>
                  );
                })()}
              </div>
            )}

            {/* DB RECORDS TAB */}
            {activeTab === 'db_records' && (
              <div className="space-y-4 animate-fade-in">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between bg-slate-50/50 p-5 rounded-3xl border border-slate-100 gap-4">
                  <div>
                    <h3 className="font-black text-slate-800 text-sm flex items-center gap-2">
                      <span className="w-1.5 h-4 rounded-full bg-slate-700 inline-block" />
                      سجلات قاعدة البيانات
                    </h3>
                    <p className="text-xs text-slate-400 font-bold mt-1">
                      جميع سجلات الحجوزات في قاعدة البيانات (نشطة وملغاة). يمكنك حذف أي سجل نهائياً.
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {(['all', 'active', 'cancelled'] as const).map(f => (
                      <button
                        key={f}
                        onClick={() => setDbRecordsFilter(f)}
                        className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 ${
                          dbRecordsFilter === f
                            ? 'bg-slate-800 text-white shadow-md shadow-slate-800/15'
                            : 'bg-white border border-slate-200/60 text-slate-500 hover:text-slate-700 hover:border-slate-300'
                        }`}
                      >
                        {f === 'all' ? `الكل (${allBookingsIncludingCancelled.length})` : f === 'active' ? `نشط (${allBookingsIncludingCancelled.filter(b => b.status !== 'cancelled').length})` : `ملغى (${allBookingsIncludingCancelled.filter(b => b.status === 'cancelled').length})`}
                      </button>
                    ))}
                  </div>
                </div>

                {(() => {
                  const filtered = dbRecordsFilter === 'all'
                    ? allBookingsIncludingCancelled
                    : dbRecordsFilter === 'active'
                      ? allBookingsIncludingCancelled.filter(b => b.status !== 'cancelled')
                      : allBookingsIncludingCancelled.filter(b => b.status === 'cancelled');

                  if (filtered.length === 0) {
                    return (
                      <div className="text-center py-16 bg-slate-50/20 rounded-3xl border border-dashed border-slate-200 text-slate-400 font-bold text-sm">
                        لا توجد سجلات مطابقة.
                      </div>
                    );
                  }

                  return (
                    <div className="space-y-2.5 max-h-[50vh] overflow-y-auto pr-1 scrollbar-hide">
                      {filtered.map(b => {
                        const isCancelled = b.status === 'cancelled';
                        const churchColor = getChurchColor(b.churchName || '');
                        const isDeleting = hardDeletingBookingId === b.id;

                        return (
                          <div
                            key={b.id}
                            className={`bg-white border rounded-2xl p-4 transition-all duration-200 hover:shadow-sm ${
                              isCancelled ? 'border-rose-200/60 bg-rose-50/20' : 'border-slate-100 hover:border-slate-200/80'
                            }`}
                          >
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                              {/* Record Info */}
                              <div className="flex items-start gap-3 min-w-0 flex-1">
                                <span
                                  className="w-1.5 h-10 rounded-full shrink-0 mt-0.5"
                                  style={{ background: `linear-gradient(to bottom, ${churchColor.hex}, ${churchColor.hex}99)` }}
                                />
                                <div className="min-w-0 flex-1 space-y-1">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <p className="font-black text-slate-800 text-sm leading-tight truncate">{b.churchName || 'غير محدد'}</p>
                                    <span className={`px-2 py-0.5 rounded-full text-[9px] font-black border leading-none shrink-0 ${
                                      isCancelled
                                        ? 'bg-rose-50 text-rose-700 border-rose-200/50'
                                        : b.status === 'approved'
                                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200/50'
                                          : 'bg-amber-50 text-amber-700 border-amber-200/50'
                                    }`}>
                                      {isCancelled ? 'ملغى' : b.status === 'approved' ? 'نشط' : 'معلق'}
                                    </span>
                                  </div>
                                  <p className="text-xs text-slate-500 font-bold">
                                    <span className="text-slate-400">المشروع:</span> {b.title} <span className="text-slate-300">|</span> <span className="text-slate-400">الفريق:</span> {b.teamName}
                                  </p>
                                  <div className="flex flex-wrap items-center gap-3 text-[10px] font-bold text-slate-400">
                                    <span>تاريخ: {b.date}</span>
                                    <span dir="ltr">وقت: {b.startTime} - {b.endTime}</span>
                                    <span>القائد: {b.requesterName}</span>
                                    <span className="text-slate-300" dir="ltr">ID: {b.id}</span>
                                  </div>
                                  {isCancelled && b.cancelledAt && (
                                    <p className="text-[10px] text-rose-500 font-bold">
                                      ألغي بواسطة: {b.cancelledBy || '—'} في {new Date(b.cancelledAt).toLocaleString('ar-EG', { dateStyle: 'short', timeStyle: 'short' })}
                                    </p>
                                  )}
                                </div>
                              </div>

                              {/* Delete Button */}
                              <button
                                onClick={() => setConfirmHardDeleteBooking(b.id)}
                                disabled={isDeleting}
                                className="px-4 py-2 bg-rose-50 hover:bg-rose-100 text-rose-600 hover:text-rose-700 border border-rose-200/50 hover:border-rose-300 font-bold text-xs rounded-xl transition-all cursor-pointer active:scale-95 disabled:opacity-50 shrink-0 flex items-center gap-1.5"
                              >
                                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                                {isDeleting ? 'جاري...' : 'حذف نهائي'}
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  );
                })()}
              </div>
            )}

            {/* CHURCH LEADERS TAB */}
            {activeTab === 'church_leaders' && (
              <div className="space-y-4 animate-fade-in">
                <div className="bg-slate-50/50 p-5 rounded-3xl border border-slate-100">
                  <h3 className="font-black text-slate-800 text-sm flex items-center gap-2">
                    <span className="w-1.5 h-4 rounded-full bg-emerald-600 inline-block" />
                    مسؤولو الكنائس
                  </h3>
                  <p className="text-xs text-slate-400 font-bold mt-1">
                    عرض مسؤولي الكنائس وتفاصيل كنائسهم وحالة حجز فرقهم.
                  </p>
                </div>

                {(() => {
                  const churchLeaders = allowedUsers.filter(u => u.role === 'church_leader');

                  if (loading) {
                    return (
                      <div className="text-center py-8">
                        <div className="w-8 h-8 border-4 border-slate-800 border-t-transparent rounded-full animate-spin mx-auto" />
                      </div>
                    );
                  }

                  if (churchLeaders.length === 0) {
                    return (
                      <div className="text-center py-16 bg-slate-50/20 rounded-3xl border border-dashed border-slate-200 text-slate-400 font-bold text-sm">
                        لا يوجد مسؤولو كنائس مسجلون بعد.
                      </div>
                    );
                  }

                  return (
                    <div className="space-y-3 max-h-[50vh] overflow-y-auto pr-1 scrollbar-hide">
                      {churchLeaders.map(leader => {
                        const leaderChurch = leader.churchName;
                        const churchColor = getChurchColor(leaderChurch || '');
                        const isExpanded = expandedChurchLeaderId === leader.id;

                        // Find team leaders (users) belonging to this church leader's church
                        const churchTeamLeaders = allowedUsers.filter(
                          u => u.role === 'user' && (u.teamDetails?.churchName === leaderChurch || u.churchName === leaderChurch)
                        );

                        // Check which team leaders have bookings
                        const teamLeadersWithBookingStatus = churchTeamLeaders.map(tl => {
                          const hasBooking = allBookingsIncludingCancelled.some(
                            b => b.requesterEmail === tl.email && b.status !== 'cancelled'
                          );
                          const booking = allBookingsIncludingCancelled.find(
                            b => b.requesterEmail === tl.email && b.status !== 'cancelled'
                          );
                          return { ...tl, hasBooking, booking };
                        });

                        const bookedCount = teamLeadersWithBookingStatus.filter(tl => tl.hasBooking).length;
                        const totalTeamLeaders = churchTeamLeaders.length;

                        return (
                          <div
                            key={leader.id}
                            className="bg-white border border-slate-150/70 rounded-2xl overflow-hidden hover:shadow-xs transition-all duration-200"
                          >
                            {/* Church Leader Card Header */}
                            <button
                              onClick={() => setExpandedChurchLeaderId(isExpanded ? null : leader.id)}
                              className="w-full p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 cursor-pointer text-right"
                            >
                              <div className="flex items-center gap-3.5 min-w-0 flex-1">
                                <div
                                  className="w-11 h-11 rounded-2xl flex items-center justify-center text-sm font-black text-white shadow-sm shrink-0"
                                  style={{ backgroundColor: churchColor.hex || '#10B981' }}
                                >
                                  {leader.name[0]}
                                </div>
                                <div className="min-w-0 flex-1">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <p className="font-black text-slate-800 text-sm leading-tight truncate">{leader.name}</p>
                                    <span className="px-2 py-0.5 rounded-full text-[9px] font-black bg-emerald-50 text-emerald-700 border border-emerald-200/50 leading-none shrink-0">
                                      مسؤول كنيسة
                                    </span>
                                  </div>
                                  <p className="text-slate-450 text-xs font-semibold leading-normal py-0.5 truncate mt-0.5" dir="ltr">{leader.email}</p>
                                  <div className="flex items-center gap-2 mt-1.5">
                                    {leaderChurch ? (
                                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-black border border-slate-200/60 shadow-3xs ${churchColor.badge}`}>
                                        <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: churchColor.hex }} />
                                        {leaderChurch}
                                      </span>
                                    ) : (
                                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200/50">
                                        لم يتم تحديد الكنيسة
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>

                              <div className="flex items-center gap-3 shrink-0 border-t border-slate-100/50 pt-2.5 sm:pt-0 sm:border-0">
                                {/* Booking Progress Chip */}
                                <div className="bg-slate-50 border border-slate-200 px-3.5 py-2 rounded-xl text-center shadow-3xs min-w-[70px]">
                                  <p className="text-[9px] font-bold text-slate-450 uppercase leading-none">حجزوا</p>
                                  <p className="text-xs font-black mt-0.5 leading-none">
                                    <span className={bookedCount > 0 ? 'text-emerald-600' : 'text-slate-400'}>{bookedCount}</span>
                                    <span className="text-slate-300"> / </span>
                                    <span className="text-slate-600">{totalTeamLeaders}</span>
                                  </p>
                                </div>
                                <svg className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
                                </svg>
                              </div>
                            </button>

                            {/* Expanded: Team Leaders List */}
                            {isExpanded && (
                              <div className="bg-slate-50/40 border-t border-slate-100 p-4 space-y-3 animate-fade-in">
                                {!leaderChurch ? (
                                  <p className="text-center text-sm text-amber-600 font-bold py-4">لا يمكن عرض الفرق — لم يتم تحديد الكنيسة لهذا المسؤول.</p>
                                ) : totalTeamLeaders === 0 ? (
                                  <p className="text-center text-slate-400 text-xs font-bold py-6">لا يوجد قادة فرق مسجلون في هذه الكنيسة بعد.</p>
                                ) : (
                                  <>
                                    {/* Progress Bar */}
                                    <div className="bg-white p-3 rounded-xl border border-slate-100 shadow-3xs">
                                      <div className="flex items-center justify-between mb-2">
                                        <span className="text-[11px] font-bold text-slate-500">نسبة الحجز</span>
                                        <span className="text-[11px] font-black text-slate-700">{totalTeamLeaders > 0 ? Math.round((bookedCount / totalTeamLeaders) * 100) : 0}%</span>
                                      </div>
                                      <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                                        <div
                                          className="h-full rounded-full transition-all duration-700"
                                          style={{ width: `${totalTeamLeaders > 0 ? (bookedCount / totalTeamLeaders) * 100 : 0}%`, backgroundColor: churchColor.hex }}
                                        />
                                      </div>
                                    </div>

                                    {/* Team Leaders List */}
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                      {teamLeadersWithBookingStatus.map(tl => (
                                        <div
                                          key={tl.id}
                                          className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${
                                            tl.hasBooking
                                              ? 'bg-emerald-50/40 border-emerald-200/50'
                                              : 'bg-white border-slate-100'
                                          }`}
                                        >
                                          <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-xs font-black shrink-0 ${
                                            tl.hasBooking
                                              ? 'bg-emerald-500 text-white'
                                              : 'bg-slate-200 text-slate-500'
                                          }`}>
                                            {tl.hasBooking ? '✓' : tl.name[0]}
                                          </div>
                                          <div className="min-w-0 flex-1">
                                            <p className="text-xs font-black text-slate-800 truncate">{tl.name}</p>
                                            <p className="text-[10px] text-slate-400 font-semibold truncate" dir="ltr">{tl.email}</p>
                                            {tl.hasBooking && tl.booking && (
                                              <p className="text-[10px] font-bold text-emerald-600 mt-0.5">
                                                📅 {tl.booking.date} • {tl.booking.title}
                                              </p>
                                            )}
                                            {!tl.hasBooking && (
                                              <p className="text-[10px] font-bold text-slate-400 mt-0.5">لم يحجز بعد</p>
                                            )}
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  </>
                                )}
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

      {/* Delete User Confirmation Modal */}
      {confirmDeleteUser && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setConfirmDeleteUser(null)} />
          <div className="relative bg-white rounded-3xl p-6 w-full max-w-sm shadow-2xl animate-scale-in">
            <div className="w-12 h-12 rounded-full bg-rose-50 text-rose-500 flex items-center justify-center mb-4 mx-auto">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h3 className="text-center text-lg font-black text-slate-800 mb-2">تأكيد حذف المستخدم</h3>
            <p className="text-center text-sm text-slate-500 font-bold mb-6">هل أنت متأكد من رغبتك في حذف هذا المستخدم؟ لن يتمكن من الوصول للنظام بعد الآن.</p>
            <div className="flex gap-3">
              <button onClick={() => setConfirmDeleteUser(null)} className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-bold text-sm hover:bg-slate-50 transition-all cursor-pointer">إلغاء</button>
              <button onClick={() => handleRemoveUser(confirmDeleteUser)} className="flex-1 px-4 py-2.5 rounded-xl bg-rose-600 text-white font-black text-sm hover:bg-rose-700 transition-all shadow-md shadow-rose-600/20 active:scale-95 cursor-pointer">
                {removingId === confirmDeleteUser ? 'جاري...' : 'نعم، احذف'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Restore Booking Confirmation Modal */}
      {confirmRestoreBooking && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setConfirmRestoreBooking(null)} />
          <div className="relative bg-white rounded-3xl p-6 w-full max-w-sm shadow-2xl animate-scale-in">
            <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-500 flex items-center justify-center mb-4 mx-auto">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </div>
            <h3 className="text-center text-lg font-black text-slate-800 mb-2">استعادة الحجز</h3>
            <p className="text-center text-sm text-slate-500 font-bold mb-6">هل أنت متأكد من رغبتك في استعادة هذا الحجز إلى المخطط الأسبوعي؟</p>
            <div className="flex gap-3">
              <button onClick={() => setConfirmRestoreBooking(null)} className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-bold text-sm hover:bg-slate-50 transition-all cursor-pointer">إلغاء</button>
              <button 
                onClick={async () => {
                  const bId = confirmRestoreBooking;
                  setConfirmRestoreBooking(null);
                  setRestoringBookingId(bId);
                  setArchiveError('');
                  setArchiveSuccess('');
                  try {
                    await restoreBooking(bId);
                    setArchiveSuccess('تمت استعادة الحجز بنجاح وإعادته إلى المخطط الأسبوعي.');
                  } catch (err) {
                    setArchiveError(err instanceof Error ? err.message : 'فشلت استعادة الحجز.');
                  } finally {
                    setRestoringBookingId(null);
                  }
                }} 
                className="flex-1 px-4 py-2.5 rounded-xl bg-emerald-600 text-white font-black text-sm hover:bg-emerald-700 transition-all shadow-md shadow-emerald-600/20 active:scale-95 cursor-pointer"
              >
                نعم، استعد
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Hard Delete Booking Confirmation Modal */}
      {confirmHardDeleteBooking && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setConfirmHardDeleteBooking(null)} />
          <div className="relative bg-white rounded-3xl p-6 w-full max-w-sm shadow-2xl animate-scale-in">
            <div className="w-12 h-12 rounded-full bg-rose-50 text-rose-500 flex items-center justify-center mb-4 mx-auto">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </div>
            <h3 className="text-center text-lg font-black text-slate-800 mb-2">حذف نهائي من قاعدة البيانات</h3>
            <p className="text-center text-sm text-slate-500 font-bold mb-2">هل أنت متأكد من رغبتك في حذف هذا السجل نهائياً؟</p>
            <p className="text-center text-xs text-rose-500 font-bold mb-6">⚠️ هذا الإجراء لا يمكن التراجع عنه!</p>
            <div className="flex gap-3">
              <button onClick={() => setConfirmHardDeleteBooking(null)} className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-bold text-sm hover:bg-slate-50 transition-all cursor-pointer">إلغاء</button>
              <button onClick={() => handleHardDeleteBooking(confirmHardDeleteBooking)} className="flex-1 px-4 py-2.5 rounded-xl bg-rose-600 text-white font-black text-sm hover:bg-rose-700 transition-all shadow-md shadow-rose-600/20 active:scale-95 cursor-pointer">
                {hardDeletingBookingId === confirmHardDeleteBooking ? 'جاري الحذف...' : 'نعم، احذف نهائياً'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
