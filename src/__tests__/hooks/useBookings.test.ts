import { renderHook, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useBookings } from '@/hooks/useBookings';
import React from 'react';

// Mock Firebase
vi.mock('firebase/firestore', () => ({
  collection: vi.fn(),
  query: vi.fn(),
  orderBy: vi.fn(),
  onSnapshot: vi.fn((q, onSuccess) => {
    onSuccess({
      docs: [
        {
          id: '1',
          data: () => ({
            title: 'Test Event',
            date: '2026-01-15',
            status: 'approved',
            serviceId: 'service1',
            roomId: 'room1',
            startTime: '10:00',
            endTime: '12:00',
            requesterName: 'John',
            requesterEmail: 'john@example.com',
          }),
        },
      ],
    });
    return vi.fn();
  }),
  addDoc: vi.fn(),
  updateDoc: vi.fn(),
  deleteDoc: vi.fn(),
  doc: vi.fn(),
  serverTimestamp: vi.fn(),
  Timestamp: {
    fromDate: vi.fn(),
  },
  where: vi.fn(),
}));

vi.mock('@/lib/firebase', () => ({
  db: {},
}));

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: vi.fn(() => ({
    user: {
      uid: 'test-user-id',
      email: 'test@example.com',
      displayName: 'Test User',
    },
  })),
}));

describe('useBookings', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('provides addBooking function', () => {
    const { result } = renderHook(() => useBookings());
    
    expect(typeof result.current.addBooking).toBe('function');
  });

  it('provides updateBookingStatus function', () => {
    const { result } = renderHook(() => useBookings());
    
    expect(typeof result.current.updateBookingStatus).toBe('function');
  });

  it('provides deleteBooking function', () => {
    const { result } = renderHook(() => useBookings());
    
    expect(typeof result.current.deleteBooking).toBe('function');
  });

  it('provides getBookingsForDate function', () => {
    const { result } = renderHook(() => useBookings());
    
    expect(typeof result.current.getBookingsForDate).toBe('function');
  });

  it('provides getPendingBookings function', () => {
    const { result } = renderHook(() => useBookings());
    
    expect(typeof result.current.getPendingBookings).toBe('function');
  });

  it('provides getUserBookings function', () => {
    const { result } = renderHook(() => useBookings());
    
    expect(typeof result.current.getUserBookings).toBe('function');
  });

  it('returns bookings array', async () => {
    const { result } = renderHook(() => useBookings());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(Array.isArray(result.current.bookings)).toBe(true);
  });
});
