'use client';

import { useCallback } from 'react';
import { useBookingsContext } from '@/contexts/BookingsContext';

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
    syncAllBookingsToSheets,
    syncQueueSize,
    refreshBookings
  } = useBookingsContext();

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

  return {
    bookings,
    allBookingsIncludingCancelled,
    loading,
    error,
    addBooking,
    updateBookingStatus,
    deleteBooking,
    restoreBooking,
    syncAllBookingsToSheets,
    syncQueueSize,
    getBookingsForDate,
    getPendingBookings,
    getUserBookings,
    isPeriodBooked,
    hasUserAlreadyBooked,
    refreshBookings
  };
}
