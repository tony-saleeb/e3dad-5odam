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
  let teamName = b.team_name || b.teamName || '';
  let ageGroup = b.age_group || b.ageGroup || '';
  let churchName = b.church_name || b.churchName || '';
  let requesterEmail = b.requester_email || b.requesterEmail || '';
  let requesterName = b.requester_name || b.requesterName || '';
  let teamMembers = b.team_members || b.teamMembers;
  
  if (title.startsWith('{') && title.endsWith('}')) {
    try {
      const parsed = JSON.parse(title);
      title = parsed.t || title;
      teamName = parsed.tn || teamName;
      ageGroup = parsed.ag || ageGroup;
    } catch (e) {
      // Not JSON, use as-is
    }
  }

  if (typeof teamMembers === 'string') {
    try { teamMembers = JSON.parse(teamMembers); } catch { teamMembers = undefined; }
  }
  
  return {
    ...b,
    title,
    teamName,
    ageGroup,
    churchName,
    requesterEmail,
    requesterName,
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
          title: bookingData.title,
          requester_name: bookingData.requesterName,
          requester_email: (bookingData.requesterEmail || '').toLowerCase(),
          service_id: bookingData.serviceId,
          room_id: bookingData.roomId,
          date: bookingData.date,
          start_time: bookingData.startTime,
          end_time: bookingData.endTime,
          church_name: bookingData.churchName,
          team_name: bookingData.teamName,
          age_group: bookingData.ageGroup,
          team_members: bookingData.teamMembers ? JSON.stringify(bookingData.teamMembers) : null,
          teammates: Array.isArray(bookingData.teammates) ? bookingData.teammates.join(', ') : bookingData.teammates,
          status: 'approved',
        }])
        .select();

      if (error) throw error;
      
      if (data && data.length > 0) {
        const newBooking = parseBooking(data[0]);
        setBookings(prev => [...prev, newBooking]);

        // Sync to Google Sheets
        const webhookUrl = process.env.NEXT_PUBLIC_GOOGLE_SHEETS_WEBHOOK;
        if (webhookUrl) {
          fetch(webhookUrl, {
            method: 'POST',
            body: JSON.stringify({
              action: 'ADD',
              ...newBooking,
              // Flatten members for sheet
              members: Array.isArray(bookingData.teamMembers) 
                ? bookingData.teamMembers.map((m: any) => `${m.name} (${m.id})`).join(', ') 
                : ''
            })
          }).catch(err => console.error('Webhook error:', err));
        }
      }
    } catch (err: any) {
      console.error('Error adding booking to Supabase:', err);
      throw err;
    }
  }, []);

  const updateBookingStatus = useCallback(async (id: string, status: BookingStatus, rejectionReason?: string) => {
    try {
      const target = bookings.find(b => b.id === id);
      const { error } = await supabase
        .from('bookings')
        .update({ status, rejectionReason })
        .eq('id', id);

      if (error) throw error;
      
      setBookings(prev => prev.map(b => b.id === id ? { ...b, status, rejectionReason } : b));

      // Sync to Google Sheets
      const webhookUrl = process.env.NEXT_PUBLIC_GOOGLE_SHEETS_WEBHOOK;
      if (webhookUrl && target) {
        fetch(webhookUrl, {
          method: 'POST',
          body: JSON.stringify({
            action: 'UPDATE',
            ...target,
            status,
            rejectionReason
          })
        }).catch(err => console.error('Webhook error:', err));
      }
    } catch (err: any) {
      console.error('Error updating status:', err);
      throw err;
    }
  }, [bookings]);

  const deleteBooking = useCallback(async (id: string) => {
    try {
      const target = bookings.find(b => b.id === id);
      const { error } = await supabase
        .from('bookings')
        .delete()
        .eq('id', id);

      if (error) throw error;
      
      setBookings(prev => prev.filter(b => b.id !== id));

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
            requesterName: target.requesterName
          })
        }).catch(err => console.error('Webhook error:', err));
      }
    } catch (err: any) {
      console.error('Error deleting booking:', err);
      throw err;
    }
  }, [bookings]);

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
