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
import { Booking, BookingStatus } from '@/types';
import { useGlobalSettings } from '@/contexts/SettingsContext';
import { useAuth } from '@/contexts/AuthContext';

interface BookingsContextType {
  bookings: Booking[];
  allBookingsIncludingCancelled: Booking[];
  loading: boolean;
  error: string | null;
  addBooking: (bookingData: Omit<Booking, 'id' | 'createdAt' | 'status'>) => Promise<void>;
  updateBookingStatus: (id: string, status: BookingStatus, rejectionReason?: string) => Promise<void>;
  deleteBooking: (id: string) => Promise<void>;
  restoreBooking: (id: string) => Promise<void>;
  refreshBookings: () => Promise<void>;
}

const BookingsContext = createContext<BookingsContextType | undefined>(undefined);

const parseBooking = (id: string, data: DocumentData): Booking => {
  if (!data) return { id } as Booking;

  // Firestore stores in camelCase directly — no snake_case mapping needed
  let { teamMembers } = data;
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
  const { settings } = useGlobalSettings();
  const { user } = useAuth();
  const { startMonth, endMonth } = settings.bookingRange;



  // Real-time listener — Firestore onSnapshot replaces polling + Supabase channels
  useEffect(() => {
    if (!user) {
      const timer = setTimeout(() => {
        setBookings([]);
        setAllBookingsIncludingCancelled([]);
        setLoading(false);
        setError(null);
      }, 0);
      return () => clearTimeout(timer);
    }

    setLoading(true);
    let active = true;

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
  }, [user, startMonth, endMonth]);

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
    } catch (err) {
      console.error('[BookingsContext] Error adding booking:', err);
      throw err;
    }
  }, []);

  const updateBookingStatus = useCallback(
    async (id: string, status: BookingStatus, rejectionReason?: string) => {
      try {
        const ref = doc(db, 'bookings', id);

        await updateDoc(ref, { status, rejectionReason: rejectionReason || null });

        // Notifications disabled
      } catch (err) {
        console.error('[BookingsContext] Error updating status:', err);
        throw err;
      }
    },
    []
  );

  const deleteBooking = useCallback(
    async (id: string) => {
      try {
        const ref = doc(db, 'bookings', id);
        // Soft delete booking in Firestore
        await updateDoc(ref, {
          status: 'cancelled' as BookingStatus,
          cancelledAt: new Date().toISOString(),
          cancelledBy: user?.email || 'unknown',
        });
      } catch (err) {
        console.error('[BookingsContext] Error deleting booking:', err);
        throw err;
      }
    },
    [user]
  );

  const restoreBooking = useCallback(
    async (id: string) => {
      try {
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
      } catch (err) {
        console.error('[BookingsContext] Error restoring booking:', err);
        throw err;
      }
    },
    []
  );


  const value = useMemo(
    () => ({
      bookings,
      allBookingsIncludingCancelled,
      loading,
      error,
      addBooking,
      updateBookingStatus,
      deleteBooking,
      restoreBooking,
      refreshBookings: fetchBookings,
    }),
    [
      bookings,
      allBookingsIncludingCancelled,
      loading,
      error,
      addBooking,
      updateBookingStatus,
      deleteBooking,
      restoreBooking,
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
