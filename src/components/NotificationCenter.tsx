'use client';

import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { db } from '@/lib/firebase';
import { collection, query, where, orderBy, onSnapshot, updateDoc, doc, limit } from 'firebase/firestore';

export interface AppNotification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: 'success' | 'warning' | 'info';
  read: boolean;
  createdAt: string;
}

export default function NotificationCenter() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!user?.email) return;

    const q = query(
      collection(db, 'notifications'),
      where('userId', '==', user.email.toLowerCase()),
      orderBy('createdAt', 'desc'),
      limit(20)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const notifs = snapshot.docs.map(d => ({ id: d.id, ...d.data() })) as AppNotification[];
      setNotifications(notifs);
    });

    return () => unsubscribe();
  }, [user]);

  useEffect(() => {
    const handleEvents = (e: Event) => {
      if (isOpen && containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleEvents);
    return () => document.removeEventListener('mousedown', handleEvents);
  }, [isOpen]);

  const unreadCount = notifications.filter(n => !n.read).length;

  const markAsRead = async (id: string) => {
    try {
      await updateDoc(doc(db, 'notifications', id), { read: true });
    } catch (err) {
      console.error('Error marking notification as read:', err);
    }
  };

  const markAllAsRead = async () => {
    const unread = notifications.filter(n => !n.read);
    for (const notif of unread) {
      await markAsRead(notif.id);
    }
  };

  if (!user) return null;

  return (
    <div className="relative" ref={containerRef} dir="rtl">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 rounded-full hover:bg-slate-100 transition-colors cursor-pointer text-slate-500 hover:text-slate-700"
      >
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 w-4 h-4 bg-rose-500 border-2 border-white rounded-full flex items-center justify-center text-[9px] font-black text-white">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute left-0 sm:left-auto sm:right-0 mt-2 w-80 sm:w-96 bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden z-50 animate-scale-in">
          <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between bg-slate-50">
            <h3 className="font-black text-slate-800 text-sm">الإشعارات</h3>
            {unreadCount > 0 && (
              <button onClick={markAllAsRead} className="text-xs text-indigo-600 font-bold hover:text-indigo-700 cursor-pointer transition-colors">
                تحديد الكل كمقروء
              </button>
            )}
          </div>
          
          <div className="max-h-[60vh] overflow-y-auto scrollbar-hide">
            {notifications.length === 0 ? (
              <div className="p-8 text-center text-slate-400">
                <svg className="w-10 h-10 mx-auto mb-2 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
                <p className="text-sm font-bold">لا توجد إشعارات حالياً</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-50">
                {notifications.map((notif) => (
                  <div 
                    key={notif.id} 
                    onClick={() => !notif.read && markAsRead(notif.id)}
                    className={`p-4 transition-colors cursor-pointer hover:bg-slate-50 flex gap-3 ${!notif.read ? 'bg-indigo-50/30' : ''}`}
                  >
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${
                      notif.type === 'success' ? 'bg-emerald-100 text-emerald-600' :
                      notif.type === 'warning' ? 'bg-rose-100 text-rose-600' :
                      'bg-indigo-100 text-indigo-600'
                    }`}>
                      {notif.type === 'success' ? (
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
                      ) : notif.type === 'warning' ? (
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                      ) : (
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm mb-0.5 leading-tight ${!notif.read ? 'font-black text-slate-800' : 'font-bold text-slate-700'}`}>
                        {notif.title}
                      </p>
                      <p className="text-xs text-slate-500 font-medium leading-relaxed">{notif.message}</p>
                      <span className="text-[10px] text-slate-400 font-bold block mt-1.5" dir="ltr">
                        {new Date(notif.createdAt).toLocaleString('ar-EG', { dateStyle: 'short', timeStyle: 'short' })}
                      </span>
                    </div>
                    {!notif.read && (
                      <div className="w-2 h-2 rounded-full bg-indigo-500 mt-1.5 shrink-0" />
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
