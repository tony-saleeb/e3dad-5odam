import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { 
  collection, 
  query, 
  orderBy, 
  onSnapshot, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc,
  Timestamp
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
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

const parseBooking = (id: string, b: any): Booking => {
  if (!b) return {} as Booking;

  let title = b.title || '';
  let teamName = b.team_name || b.teamName || '';
  let ageGroup = b.age_group || b.ageGroup || '';
  let churchName = b.church_name || b.churchName || '';
  let requesterEmail = b.requester_email || b.requesterEmail || '';
  let requesterName = b.requester_name || b.requesterName || '';
  let teamMembers = b.team_members || b.teamMembers;
  let teammates = b.teammates || [];
  
  if (typeof title === 'string' && title.startsWith('{') && title.endsWith('}')) {
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

  if (typeof teammates === 'string') {
    teammates = (teammates as string).split(',').map((s: string) => s.trim()).filter(Boolean);
  }
  
  return {
    ...b,
    id,
    title,
    teamName,
    ageGroup,
    churchName,
    requesterEmail,
    requesterName,
    teamMembers,
    teammates,
  };
};

export const BookingsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    const q = query(collection(db, 'bookings'), orderBy('date', 'asc'));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const bookingsData = snapshot.docs.map(doc => parseBooking(doc.id, doc.data()));
      setBookings(bookingsData);
      setLoading(false);
    }, (err) => {
      console.error('Firestore Error:', err);
      setError(err.message);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const addBooking = useCallback(async (bookingData: any) => {
    try {
      const docData = {
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
        team_members: bookingData.teamMembers || null,
        teammates: Array.isArray(bookingData.teammates) ? bookingData.teammates : (bookingData.teammates ? [bookingData.teammates] : []),
        status: 'approved',
        createdAt: Timestamp.now(),
      };

      const docRef = await addDoc(collection(db, 'bookings'), docData);
      
      // Sync to Google Sheets
      const webhookUrl = process.env.NEXT_PUBLIC_GOOGLE_SHEETS_WEBHOOK;
      if (webhookUrl) {
        const newBooking = parseBooking(docRef.id, docData);
        fetch(webhookUrl, {
          method: 'POST',
          body: JSON.stringify({
            action: 'ADD',
            ...newBooking,
            members: Array.isArray(bookingData.teamMembers) 
              ? bookingData.teamMembers.map((m: any) => `${m.name} (${m.id})`).join(', ') 
              : ''
          })
        }).catch(err => console.error('Webhook error:', err));
      }
    } catch (err: any) {
      console.error('Error adding booking to Firestore:', err);
      throw err;
    }
  }, []);

  const updateBookingStatus = useCallback(async (id: string, status: BookingStatus, rejectionReason?: string) => {
    try {
      const target = bookings.find(b => b.id === id);
      const docRef = doc(db, 'bookings', id);
      
      await updateDoc(docRef, { status, rejectionReason });

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
      const docRef = doc(db, 'bookings', id);
      
      await deleteDoc(docRef);

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
    refreshBookings: async () => {}, // No-op since we use onSnapshot
  }), [bookings, loading, error, addBooking, updateBookingStatus, deleteBooking]);

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
