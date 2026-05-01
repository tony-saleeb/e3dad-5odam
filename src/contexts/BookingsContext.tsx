'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { db } from '@/lib/firebase';
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  serverTimestamp,
} from 'firebase/firestore';
import { Booking, BookingStatus } from '@/types';

interface BookingsContextType {
  bookings: Booking[];
  loading: boolean;
  error: string | null;
  addBooking: (bookingData: any) => Promise<void>;
  updateBookingStatus: (id: string, status: BookingStatus, rejectionReason?: string) => Promise<void>;
  deleteBooking: (id: string) => Promise<void>;
  refreshBookings: () => Promise<void>;
}

const BookingsContext = createContext<BookingsContextType | undefined>(undefined);

const parseBooking = (id: string, data: any): Booking => {
  if (!data) return { id } as Booking;

  // Firestore stores in camelCase directly — no snake_case mapping needed
  let teamMembers = data.teamMembers;
  if (typeof teamMembers === 'string') {
    try { teamMembers = JSON.parse(teamMembers); } catch { teamMembers = undefined; }
  }

  let teammates = data.teammates || [];
  if (typeof teammates === 'string') {
    teammates = teammates.split(',').map((s: string) => s.trim()).filter(Boolean);
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
    teammates,
    createdAt: data.createdAt?.toDate?.()?.toISOString?.() || data.createdAt || new Date().toISOString(),
  };
};

export const BookingsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Real-time listener — Firestore onSnapshot replaces polling + Supabase channels
  useEffect(() => {
    const q = query(collection(db, 'bookings'), orderBy('date', 'asc'));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const parsed = snapshot.docs.map((d) => parseBooking(d.id, d.data()));
        setBookings(parsed);
        setLoading(false);
        setError(null);
      },
      (err) => {
        console.error('[BookingsContext] Firestore listener error:', err);
        setError(err.message);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  // Manual refresh (mostly unnecessary with onSnapshot, but kept for API compat)
  const fetchBookings = useCallback(async () => {
    // onSnapshot handles this automatically — this is a no-op kept for interface compat
  }, []);

  const addBooking = useCallback(async (bookingData: any) => {
    try {
      const docData = {
        title: bookingData.title || '',
        requesterName: bookingData.requesterName || '',
        requesterEmail: (bookingData.requesterEmail || '').toLowerCase(),
        serviceId: bookingData.serviceId || '',
        roomId: bookingData.roomId || '',
        date: bookingData.date || '',
        startTime: bookingData.startTime || '',
        endTime: bookingData.endTime || '',
        churchName: bookingData.churchName || '',
        teamName: bookingData.teamName || '',
        ageGroup: bookingData.ageGroup || '',
        teamMembers: bookingData.teamMembers || [],
        teammates: Array.isArray(bookingData.teammates) ? bookingData.teammates : [],
        status: 'approved',
        createdAt: serverTimestamp(),
      };

      await addDoc(collection(db, 'bookings'), docData);
      // onSnapshot will automatically pick up the new document

      // Sync to Google Sheets
      const webhookUrl = process.env.NEXT_PUBLIC_GOOGLE_SHEETS_WEBHOOK;
      if (webhookUrl) {
        fetch(webhookUrl, {
          method: 'POST',
          body: JSON.stringify({
            action: 'ADD',
            ...docData,
            members: Array.isArray(bookingData.teamMembers)
              ? bookingData.teamMembers.map((m: any) => `${m.name} (${m.id})`).join(', ')
              : '',
          }),
        }).catch((err) => console.error('Webhook error:', err));
      }
    } catch (err: any) {
      console.error('[BookingsContext] Error adding booking:', err);
      throw err;
    }
  }, []);

  const updateBookingStatus = useCallback(
    async (id: string, status: BookingStatus, rejectionReason?: string) => {
      try {
        const target = bookings.find((b) => b.id === id);
        const ref = doc(db, 'bookings', id);
        await updateDoc(ref, { status, rejectionReason: rejectionReason || null });
        // onSnapshot will automatically update the list

        // Sync to Google Sheets
        const webhookUrl = process.env.NEXT_PUBLIC_GOOGLE_SHEETS_WEBHOOK;
        if (webhookUrl && target) {
          fetch(webhookUrl, {
            method: 'POST',
            body: JSON.stringify({ action: 'UPDATE', ...target, status, rejectionReason }),
          }).catch((err) => console.error('Webhook error:', err));
        }
      } catch (err: any) {
        console.error('[BookingsContext] Error updating status:', err);
        throw err;
      }
    },
    [bookings]
  );

  const deleteBooking = useCallback(
    async (id: string) => {
      try {
        const target = bookings.find((b) => b.id === id);
        const ref = doc(db, 'bookings', id);
        await deleteDoc(ref);
        // onSnapshot will automatically remove it from the list

        // Sync to Google Sheets
        const webhookUrl = process.env.NEXT_PUBLIC_GOOGLE_SHEETS_WEBHOOK;
        if (webhookUrl && target) {
          fetch(webhookUrl, {
            method: 'POST',
            body: JSON.stringify({
              action: 'DELETE',
              churchName: target.churchName,
              date: target.date,
              startTime: target.startTime,
              requesterName: target.requesterName,
            }),
          }).catch((err) => console.error('Webhook error:', err));
        }
      } catch (err: any) {
        console.error('[BookingsContext] Error deleting booking:', err);
        throw err;
      }
    },
    [bookings]
  );

  const value = useMemo(
    () => ({
      bookings,
      loading,
      error,
      addBooking,
      updateBookingStatus,
      deleteBooking,
      refreshBookings: fetchBookings,
    }),
    [bookings, loading, error, addBooking, updateBookingStatus, deleteBooking, fetchBookings]
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
