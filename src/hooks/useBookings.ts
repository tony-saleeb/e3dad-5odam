'use client';

import { useCallback, useState, useEffect } from 'react';
import { useBookingsContext } from '@/contexts/BookingsContext';
import { db } from '@/lib/firebase';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { useAuth } from '@/contexts/AuthContext';

export function useBookings() {
  const {
    bookings,
    allBookingsIncludingCancelled,
    loading,
    error,
    addBooking,
    updateBookingStatus,
    deleteBooking,
    restoreBooking,
    refreshBookings
  } = useBookingsContext();

  const { user, isAdmin, isChurchLeader } = useAuth();

  // Cache for group counts per church (fetched from allowed_users)
  const [churchGroupCounts, setChurchGroupCounts] = useState<Record<string, number>>({});

  useEffect(() => {
    const fetchGroupCounts = async () => {
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

        const counts: Record<string, number> = {};
        snap.docs.forEach(d => {
          const data = d.data();
          if (data.role === 'user' && data.teamDetails?.churchName) {
            const church = data.teamDetails.churchName;
            counts[church] = (counts[church] || 0) + 1;
          }
        });
        setChurchGroupCounts(counts);
      } catch (err) {
        console.error('[useBookings] Error fetching group counts:', err);
      }
    };
    if (user) {
      fetchGroupCounts();
    }
  }, [user, isAdmin, isChurchLeader]);

  const getBookingsForDate = useCallback(
    (date: string) => {
      return bookings.filter((b) => b.date === date);
    },
    [bookings]
  );

  const getPendingBookings = useCallback(() => {
    return bookings.filter((b) => b.status === 'pending');
  }, [bookings]);

  const getUserBookings = useCallback(
    (email: string) => {
      return bookings.filter((b) => b.requesterEmail === email);
    },
    [bookings]
  );

  const isPeriodBooked = useCallback(
    (date: string, startTime: string, endTime: string) => {
      return bookings.some(
         (b) =>
          b.date === date &&
          b.startTime === startTime &&
          b.endTime === endTime &&
          b.status !== 'rejected'
      );
    },
    [bookings]
  );

  const hasUserAlreadyBooked = useCallback(
    (email: string) => {
      const lowerEmail = email.toLowerCase();
      return bookings.some(b => 
        (b.requesterEmail || '').toLowerCase() === lowerEmail && 
        b.status !== 'rejected'
      );
    },
    [bookings]
  );

  // Get unique dates where a church has active (approved) bookings
  const getChurchBookedDays = useCallback(
    (churchName: string): string[] => {
      const dates = new Set<string>();
      bookings.forEach(b => {
        if (b.churchName === churchName && b.status !== 'rejected' && b.status !== 'cancelled') {
          dates.add(b.date);
        }
      });
      return Array.from(dates);
    },
    [bookings]
  );

  // Get number of groups (team leaders) for a church
  const getChurchGroupCount = useCallback(
    (churchName: string): number => {
      return churchGroupCounts[churchName] || 0;
    },
    [churchGroupCounts]
  );

  return {
    bookings,
    allBookingsIncludingCancelled,
    loading,
    error,
    addBooking,
    updateBookingStatus,
    deleteBooking,
    restoreBooking,
    getBookingsForDate,
    getPendingBookings,
    getUserBookings,
    isPeriodBooked,
    hasUserAlreadyBooked,
    getChurchBookedDays,
    getChurchGroupCount,
    refreshBookings
  };
}
