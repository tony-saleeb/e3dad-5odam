'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { Booking, BookingStatus } from '@/types';

const parseBooking = (b: any): Booking => {
  let title = b.title || '';
  let teamName = '';
  let ageGroup = '';
  
  if (title.startsWith('{') && title.endsWith('}')) {
    try {
      const parsed = JSON.parse(title);
      title = parsed.t || title;
      teamName = parsed.tn || '';
      ageGroup = parsed.ag || '';
    } catch (e) {
      // Not JSON, use as-is
    }
  }

  let teamMembers = b.teamMembers;
  if (typeof teamMembers === 'string') {
    try { teamMembers = JSON.parse(teamMembers); } catch { teamMembers = undefined; }
  }
  
  return {
    ...b,
    title,
    teamName,
    ageGroup,
    teamMembers,
  };
};

export function useBookings() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchBookings = useCallback(async () => {
    if (!isSupabaseConfigured) {
      try {
        const localData = localStorage.getItem('supabase_bookings_fallback');
        if (localData) {
          setBookings(JSON.parse(localData));
        }
      } catch (err) {
        console.error('Error reading fallback cache:', err);
      } finally {
        setLoading(false);
      }
      return;
    }

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('bookings')
        .select('*')
        .order('date', { ascending: true });

      if (error) throw error;
      setBookings((data || []).map(parseBooking));
    } catch (err: any) {
      console.error('Error fetching from Supabase:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBookings();

    if (!isSupabaseConfigured) return;

    // 1. Supabase Realtime Channel
    const channel = supabase
      .channel('bookings-realtime-' + Math.random().toString())
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'bookings' },
        (payload) => {
          fetchBookings();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchBookings]);

  const addBooking = useCallback(
    async (bookingData: Omit<Booking, 'id' | 'status' | 'createdAt'>) => {
      if (!isSupabaseConfigured) {
        const localMock: Booking = {
          ...bookingData,
          id: `local_mock_${Date.now()}`,
          status: 'approved',
          createdAt: new Date().toISOString(),
        };
        const updated = [...bookings, localMock];
        localStorage.setItem('supabase_bookings_fallback', JSON.stringify(updated));
        setBookings(updated);
        return;
      }
      try {
        const { data, error } = await supabase
          .from('bookings')
          .insert([
            {
              title: JSON.stringify({
                t: bookingData.title,
                tn: bookingData.teamName,
                ag: bookingData.ageGroup
              }),
              churchName: bookingData.churchName,
              date: bookingData.date,
              startTime: bookingData.startTime,
              endTime: bookingData.endTime,
              teammates: bookingData.teammates,
              teamMembers: bookingData.teamMembers ? JSON.stringify(bookingData.teamMembers) : null,
              requesterEmail: bookingData.requesterEmail,
              requesterName: bookingData.requesterName,
              status: 'approved', // Auto approve
            },
          ])
          .select();

        if (error) throw error;

        // Sync with Google Sheets Webhook if provided
        const webhookUrl = process.env.NEXT_PUBLIC_GOOGLE_SHEETS_WEBHOOK;
        if (webhookUrl) {
          fetch(webhookUrl, {
            method: 'POST',
            body: JSON.stringify({
              churchName: bookingData.churchName,
              teamName: bookingData.teamName,
              ageGroup: bookingData.ageGroup,
              title: bookingData.title,
              date: bookingData.date,
              period: `${bookingData.startTime} - ${bookingData.endTime}`,
              teammates: (bookingData.teammates || []).join(', ')
            })
          }).catch(e => console.error('Google Sheets Sync Failed:', e));
        }

        if (data && data.length > 0) {
          setBookings((prev) => [...prev, parseBooking(data[0])]);
        }
      } catch (err: any) {
        console.error('Error adding booking to Supabase:', err);
        throw err;
      }
    },
    [fetchBookings]
  );

  const deleteBooking = useCallback(
    async (id: string) => {
      try {
        const target = bookings.find((b) => b.id === id);

        const { error } = await supabase
          .from('bookings')
          .delete()
          .eq('id', id);

        if (error) throw error;

        if (target) {
          const webhookUrl = process.env.NEXT_PUBLIC_GOOGLE_SHEETS_WEBHOOK;
          if (webhookUrl) {
            fetch(webhookUrl, {
              method: 'POST',
              body: JSON.stringify({
                action: 'DELETE',
                churchName: target.churchName,
                date: target.date,
                period: `${target.startTime} - ${target.endTime}`
              })
            }).catch(e => console.error('Google Sheets Delete Failed:', e));
          }
        }

        await fetchBookings();
      } catch (err: any) {
        console.error('Error deleting from Supabase:', err);
        throw err;
      }
    },
    [fetchBookings]
  );

  const updateBookingStatus = useCallback(
    async (id: string, status: BookingStatus) => {
      try {
        const { error } = await supabase
          .from('bookings')
          .update({ status })
          .eq('id', id);

        if (error) throw error;
        await fetchBookings();
      } catch (err: any) {
        console.error('Error updating status on Supabase:', err);
        throw err;
      }
    },
    [fetchBookings]
  );

  const getBookingsForDate = useCallback(
    (date: string) => {
      return bookings.filter((b) => b.date === date);
    },
    [bookings]
  );

  const isPeriodBooked = useCallback(
    (date: string, startTime: string, endTime: string) => {
      return bookings.some(
        (b) => b.date === date && b.startTime === startTime && b.endTime === endTime && b.status !== 'rejected'
      );
    },
    [bookings]
  );

  const getPendingBookings = useCallback(() => {
    return bookings.filter((b) => b.status === 'pending');
  }, [bookings]);

  const getUserBookings = useCallback(() => {
    return bookings;
  }, [bookings]);

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
  };
}
