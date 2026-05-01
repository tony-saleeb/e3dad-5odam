'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
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

export const BookingsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
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
      const parsed = (data || []).map(parseBooking);
      setBookings(parsed);
      
      // Update fallback cache
      localStorage.setItem('supabase_bookings_fallback', JSON.stringify(parsed));
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

    const channel = supabase
      .channel('bookings_changes_global')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'bookings' },
        () => {
          fetchBookings();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchBookings]);

  const addBooking = useCallback(async (bookingData: any) => {
    try {
      const { data, error } = await supabase
        .from('bookings')
        .insert([{
          ...bookingData,
          requesterEmail: (bookingData.requesterEmail || '').toLowerCase(),
          status: 'approved',
        }])
        .select();

      if (error) throw error;
      
      if (data && data.length > 0) {
        setBookings(prev => [...prev, parseBooking(data[0])]);
      }
    } catch (err: any) {
      console.error('Error adding booking:', err);
      throw err;
    }
  }, []);

  const updateBookingStatus = useCallback(async (id: string, status: BookingStatus, rejectionReason?: string) => {
    try {
      const { error } = await supabase
        .from('bookings')
        .update({ status, rejectionReason })
        .eq('id', id);

      if (error) throw error;
      
      setBookings(prev => prev.map(b => b.id === id ? { ...b, status, rejectionReason } : b));
    } catch (err: any) {
      console.error('Error updating status:', err);
      throw err;
    }
  }, []);

  const deleteBooking = useCallback(async (id: string) => {
    try {
      const { error } = await supabase
        .from('bookings')
        .delete()
        .eq('id', id);

      if (error) throw error;
      
      setBookings(prev => prev.filter(b => b.id !== id));
    } catch (err: any) {
      console.error('Error deleting booking:', err);
      throw err;
    }
  }, []);

  const value = useMemo(() => ({
    bookings,
    loading,
    error,
    addBooking,
    updateBookingStatus,
    deleteBooking,
    refreshBookings: fetchBookings,
  }), [bookings, loading, error, addBooking, updateBookingStatus, deleteBooking, fetchBookings]);

  return (
    <BookingsContext.Provider value={value}>
      {children}
    </BookingsContext.Provider>
  );
};

export const useBookingsContext = () => {
  const context = useContext(BookingsContext);
  if (context === undefined) {
    throw new Error('useBookingsContext must be used within a BookingsProvider');
  }
  return context;
};
