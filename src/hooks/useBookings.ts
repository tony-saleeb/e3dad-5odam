'use client';

import { useMemo, useCallback } from 'react';
import { useBookingsContext } from '@/contexts/BookingsContext';
import { BookingStatus } from '@/types';

export function useBookings() {
  const {
    bookings,
    loading,
    error,
    addBooking,
    updateBookingStatus,
    deleteBooking,
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
      return bookings.some(b => b.requesterEmail === email && b.status !== 'rejected');
    },
    [bookings]
  );

  return {
    bookings,
    loading,
    error,
    addBooking,
    updateBookingStatus,
    deleteBooking,
    getBookingsForDate,
    getPendingBookings,
    getUserBookings,
    isPeriodBooked,
    hasUserAlreadyBooked,
    refreshBookings
  };
}
