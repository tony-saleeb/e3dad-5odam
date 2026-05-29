'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { db } from '@/lib/firebase';
import {
  collection,
  query,
  orderBy,
  where,
  onSnapshot,
  updateDoc,
  doc,
  serverTimestamp,
  DocumentData,
  runTransaction,
} from 'firebase/firestore';
import { Booking, BookingStatus, TeamMember } from '@/types';
import { useGlobalSettings } from '@/contexts/SettingsContext';
import { useAuth } from '@/contexts/AuthContext';

interface BookingsContextType {
  bookings: Booking[];
  allBookingsIncludingCancelled: Booking[];
  loading: boolean;
  error: string | null;
  syncQueueSize: number;
  addBooking: (bookingData: Omit<Booking, 'id' | 'createdAt' | 'status'>) => Promise<void>;
  updateBookingStatus: (id: string, status: BookingStatus, rejectionReason?: string) => Promise<void>;
  deleteBooking: (id: string) => Promise<void>;
  restoreBooking: (id: string) => Promise<void>;
  syncAllBookingsToSheets: () => Promise<void>;
  refreshBookings: () => Promise<void>;
}

const BookingsContext = createContext<BookingsContextType | undefined>(undefined);

const parseBooking = (id: string, data: DocumentData): Booking => {
  if (!data) return { id } as Booking;

  // Firestore stores in camelCase directly — no snake_case mapping needed
  let teamMembers = data.teamMembers;
  if (typeof teamMembers === 'string') {
    try { teamMembers = JSON.parse(teamMembers); } catch { teamMembers = undefined; }
  }
  return {
    id,
    title: data.title || '',
    requesterName: data.requesterName || '',
    requesterEmail: data.requesterEmail || '',
    serviceId: data.serviceId || '',
    roomId: data.roomId || '',
    date: data.date || '',
    startTime: data.startTime || '',
    endTime: data.endTime || '',
    status: data.status || 'approved',
    rejectionReason: data.rejectionReason,
    churchName: data.churchName || '',
    teamName: data.teamName || '',
    ageGroup: data.ageGroup || '',
    teamMembers,
    createdAt: data.createdAt?.toDate?.()?.toISOString?.() || data.createdAt || new Date().toISOString(),
    cancelledAt: data.cancelledAt || undefined,
    cancelledBy: data.cancelledBy || undefined,
  };
};

export const BookingsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [allBookingsIncludingCancelled, setAllBookingsIncludingCancelled] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [syncQueueSize, setSyncQueueSize] = useState(0);
  const { settings } = useGlobalSettings();
  const { user } = useAuth();
  const { startMonth, endMonth } = settings.bookingRange;

  // Standardized webhook sync utility with offline resilience, retries, and local storage buffering
  const flushSyncQueue = useCallback(async () => {
    const webhookUrl = process.env.NEXT_PUBLIC_GOOGLE_SHEETS_WEBHOOK;
    if (!webhookUrl || !webhookUrl.startsWith('http') || !navigator.onLine) return;

    let queue: { id: string; payload: Record<string, unknown>; attempts: number }[] = [];
    try {
      const stored = localStorage.getItem('bookings_sync_queue');
      if (stored) {
        queue = JSON.parse(stored);
        setSyncQueueSize(queue.length);
      } else {
        setSyncQueueSize(0);
      }
    } catch (e) {
      console.error('[BookingsContext] Failed to parse sync queue:', e);
    }

    if (queue.length === 0) return;

    const remainingQueue: typeof queue = [];

    for (const item of queue) {
      try {
        const response = await fetch(webhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(item.payload),
        });

        if (!response.ok && response.status >= 500) {
          throw new Error(`Server returned temporary error: ${response.status}`);
        }
      } catch (err) {
        console.warn(`[BookingsContext] Failed sync attempt ${item.attempts + 1} for item ${item.id}:`, err);
        if (item.attempts < 3) {
          remainingQueue.push({
            ...item,
            attempts: item.attempts + 1,
          });
        } else {
          console.error(`[BookingsContext] Permanent sync failure for item ${item.id} after 3 attempts.`);
        }
        continue;
      }
    }

    try {
      localStorage.setItem('bookings_sync_queue', JSON.stringify(remainingQueue));
      setSyncQueueSize(remainingQueue.length);
    } catch (e) {
      console.error('[BookingsContext] Failed to save remaining sync queue:', e);
    }
  }, []);

  const triggerSyncWebhook = useCallback((payload: Record<string, unknown>) => {
    const webhookUrl = process.env.NEXT_PUBLIC_GOOGLE_SHEETS_WEBHOOK;
    if (!webhookUrl || !webhookUrl.startsWith('http')) return;

    const syncItem = {
      id: `${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      payload,
      attempts: 0,
    };

    if (!navigator.onLine) {
      let queue: typeof syncItem[] = [];
      try {
        const stored = localStorage.getItem('bookings_sync_queue');
        if (stored) queue = JSON.parse(stored);
      } catch (e) {
        console.error(e);
      }
      queue.push(syncItem);
      localStorage.setItem('bookings_sync_queue', JSON.stringify(queue));
      setSyncQueueSize(queue.length);
      return;
    }

    fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    }).then(async (response) => {
      if (!response.ok && response.status >= 500) {
        throw new Error(`Server error: ${response.status}`);
      }
    }).catch((err) => {
      console.warn('[BookingsContext] Primary sync request failed, queuing locally:', err);
      let queue: typeof syncItem[] = [];
      try {
        const stored = localStorage.getItem('bookings_sync_queue');
        if (stored) queue = JSON.parse(stored);
      } catch (e) {
        console.error(e);
      }
      queue.push(syncItem);
      localStorage.setItem('bookings_sync_queue', JSON.stringify(queue));
      setSyncQueueSize(queue.length);
    });
  }, []);

  // Flush sync queue on mount or when coming back online
  useEffect(() => {
    let active = true;
    Promise.resolve().then(() => {
      if (active) {
        try {
          const stored = localStorage.getItem('bookings_sync_queue');
          if (stored) {
            const queue = JSON.parse(stored);
            setSyncQueueSize(queue.length);
          }
        } catch {}
        flushSyncQueue();
      }
    });

    const handleOnline = () => {
      if (active) flushSyncQueue();
    };

    window.addEventListener('online', handleOnline);
    return () => {
      active = false;
      window.removeEventListener('online', handleOnline);
    };
  }, [flushSyncQueue]);

  // Real-time listener — Firestore onSnapshot replaces polling + Supabase channels
  useEffect(() => {
    let active = true;
    Promise.resolve().then(() => {
      if (active) setLoading(true);
    });

    const year = new Date().getFullYear();
    const startDateStr = `${year}-${String(startMonth + 1).padStart(2, '0')}-01`;
    const lastDay = new Date(year, endMonth + 1, 0).getDate();
    const endDateStr = `${year}-${String(endMonth + 1).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;

    const q = query(
      collection(db, 'bookings'),
      where('date', '>=', startDateStr),
      where('date', '<=', endDateStr),
      orderBy('date', 'asc')
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        if (active) {
          const parsed = snapshot.docs.map((d) => parseBooking(d.id, d.data()));
          // Exclude soft-deleted bookings from calendar schedule rendering
          const activeBookings = parsed.filter(b => b.status !== 'cancelled');
          setBookings(activeBookings);
          setAllBookingsIncludingCancelled(parsed);
          setLoading(false);
          setError(null);
        }
      },
      (err) => {
        console.error('[BookingsContext] Firestore listener error:', err);
        if (active) {
          setError(err.message);
          setLoading(false);
        }
      }
    );

    return () => {
      active = false;
      unsubscribe();
    };
  }, [startMonth, endMonth]);

  // Manual refresh (mostly unnecessary with onSnapshot, but kept for API compat)
  const fetchBookings = useCallback(async () => {
    // onSnapshot handles this automatically — this is a no-op kept for interface compat
  }, []);

  const addBooking = useCallback(async (bookingData: Omit<Booking, 'id' | 'createdAt' | 'status'>) => {
    try {
      const docData = {
        title: bookingData.title || '',
        requesterName: bookingData.requesterName || '',
        requesterEmail: (bookingData.requesterEmail || '').toLowerCase(),
        serviceId: bookingData.serviceId || 'church-adaptation',
        roomId: bookingData.roomId || 'church-adaptation',
        date: bookingData.date || '',
        startTime: bookingData.startTime || '',
        endTime: bookingData.endTime || '',
        churchName: bookingData.churchName || '',
        teamName: bookingData.teamName || '',
        ageGroup: bookingData.ageGroup || '',
        teamMembers: bookingData.teamMembers || [],
        status: 'approved' as BookingStatus,
        createdAt: serverTimestamp(),
      };

      const slotId = `${bookingData.date}_${bookingData.startTime.replace(/[^a-zA-Z0-9]/g, '-')}`;
      const ref = doc(db, 'bookings', slotId);

      await runTransaction(db, async (transaction) => {
        const docSnap = await transaction.get(ref);
        if (docSnap.exists() && docSnap.data().status !== 'cancelled') {
          throw new Error('عذراً، هذا الموعد تم حجزه بالفعل من قبل فريق آخر.');
        }
        transaction.set(ref, docData);
      });

      // Sync to Google Sheets
      triggerSyncWebhook({
        action: 'ADD',
        ...docData,
        createdAt: new Date().toISOString(), // Webhook friendly string timestamp
        members: Array.isArray(bookingData.teamMembers)
          ? bookingData.teamMembers.map((m: TeamMember) => `${m.name} (${m.id})`).join(', ')
          : '',
      });
    } catch (err) {
      console.error('[BookingsContext] Error adding booking:', err);
      throw err;
    }
  }, [triggerSyncWebhook]);

  const updateBookingStatus = useCallback(
    async (id: string, status: BookingStatus, rejectionReason?: string) => {
      try {
        const target = allBookingsIncludingCancelled.find((b) => b.id === id) || bookings.find((b) => b.id === id);
        const ref = doc(db, 'bookings', id);
        await updateDoc(ref, { status, rejectionReason: rejectionReason || null });

        // Sync to Google Sheets
        if (target) {
          triggerSyncWebhook({
            action: 'UPDATE',
            ...target,
            status,
            rejectionReason,
          });
        }
      } catch (err) {
        console.error('[BookingsContext] Error updating status:', err);
        throw err;
      }
    },
    [bookings, allBookingsIncludingCancelled, triggerSyncWebhook]
  );

  const deleteBooking = useCallback(
    async (id: string) => {
      try {
        const target = allBookingsIncludingCancelled.find((b) => b.id === id) || bookings.find((b) => b.id === id);
        if (!target) throw new Error('لم يتم العثور على الحجز المحدد.');

        const ref = doc(db, 'bookings', id);
        // Soft delete booking in Firestore
        await updateDoc(ref, {
          status: 'cancelled' as BookingStatus,
          cancelledAt: new Date().toISOString(),
          cancelledBy: user?.email || 'unknown',
        });

        // Sync to Google Sheets
        triggerSyncWebhook({
          action: 'DELETE',
          churchName: target.churchName,
          date: target.date,
          startTime: target.startTime,
          requesterName: target.requesterName,
        });
      } catch (err) {
         console.error('[BookingsContext] Error deleting booking:', err);
        throw err;
      }
    },
    [bookings, allBookingsIncludingCancelled, triggerSyncWebhook, user]
  );

  const restoreBooking = useCallback(
    async (id: string) => {
      try {
        const target = allBookingsIncludingCancelled.find((b) => b.id === id);
        if (!target) throw new Error('لم يتم العثور على الحجز المحدد.');

        const ref = doc(db, 'bookings', id);

        await runTransaction(db, async (transaction) => {
          const docSnap = await transaction.get(ref);
          if (docSnap.exists() && docSnap.data().status !== 'cancelled') {
            throw new Error('عذراً، تم حجز هذا الموعد بالفعل من قبل فريق آخر ولا يمكن استعادته.');
          }
          transaction.update(ref, {
            status: 'approved' as BookingStatus,
            cancelledAt: null,
            cancelledBy: null,
          });
        });

        // Sync to Google Sheets
        triggerSyncWebhook({
          action: 'ADD',
          title: target.title || '',
          requesterName: target.requesterName || '',
          requesterEmail: (target.requesterEmail || '').toLowerCase(),
          serviceId: target.serviceId || 'church-adaptation',
          roomId: target.roomId || 'church-adaptation',
          date: target.date || '',
          startTime: target.startTime || '',
          endTime: target.endTime || '',
          churchName: target.churchName || '',
          teamName: target.teamName || '',
          ageGroup: target.ageGroup || '',
          status: 'approved',
          createdAt: new Date().toISOString(),
          members: Array.isArray(target.teamMembers)
            ? target.teamMembers.map((m: TeamMember) => `${m.name} (${m.id})`).join(', ')
            : '',
        });
      } catch (err) {
        console.error('[BookingsContext] Error restoring booking:', err);
        throw err;
      }
    },
    [allBookingsIncludingCancelled, triggerSyncWebhook]
  );

  const syncAllBookingsToSheets = useCallback(async () => {
    const webhookUrl = process.env.NEXT_PUBLIC_GOOGLE_SHEETS_WEBHOOK;
    if (!webhookUrl || !webhookUrl.startsWith('http')) {
      throw new Error('لم يتم تكوين عنوان Google Sheets Webhook الخاص بالمزامنة.');
    }

    const activeBookings = bookings.filter((b) => b.status !== 'cancelled');
    const payload = {
      action: 'SYNC_ALL',
      bookings: activeBookings.map((b) => ({
        ...b,
        members: Array.isArray(b.teamMembers)
          ? b.teamMembers.map((m) => `${m.name} (${m.id})`).join(', ')
          : '',
      })),
    };

    try {
      const res = await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        throw new Error(`فشلت مزامنة الويب هوك: code ${res.status}`);
      }
    } catch (err) {
      if (err instanceof Error && (err.message.includes('fetch') || err.message === 'Failed to fetch')) {
        throw new Error('عذراً، فشل الاتصال بخادم المزامنة. يرجى التحقق من اتصالك بالإنترنت أو التأكد من إعدادات الويب هوك.');
      }
      throw err;
    }
  }, [bookings]);

  const value = useMemo(
    () => ({
      bookings,
      allBookingsIncludingCancelled,
      loading,
      error,
      syncQueueSize,
      addBooking,
      updateBookingStatus,
      deleteBooking,
      restoreBooking,
      syncAllBookingsToSheets,
      refreshBookings: fetchBookings,
    }),
    [
      bookings,
      allBookingsIncludingCancelled,
      loading,
      error,
      syncQueueSize,
      addBooking,
      updateBookingStatus,
      deleteBooking,
      restoreBooking,
      syncAllBookingsToSheets,
      fetchBookings,
    ]
  );

  return <BookingsContext.Provider value={value}>{children}</BookingsContext.Provider>;
};

export const useBookingsContext = () => {
  const context = useContext(BookingsContext);
  if (context === undefined) {
    throw new Error('useBookingsContext must be used within a BookingsProvider');
  }
  return context;
};
