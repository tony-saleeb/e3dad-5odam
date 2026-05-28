import { renderHook, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useBookings } from '@/hooks/useBookings';

// Mock BookingsContext
vi.mock('@/contexts/BookingsContext', () => ({
  useBookingsContext: vi.fn(() => ({
    bookings: [
      {
        id: '1',
        title: 'Test Event',
        date: '2026-01-15',
        status: 'approved',
        serviceId: 'service1',
        roomId: 'room1',
        startTime: '10:00',
        endTime: '12:00',
        requesterName: 'John',
        requesterEmail: 'john@example.com',
      },
    ],
    loading: false,
    error: null,
    addBooking: vi.fn(),
    updateBookingStatus: vi.fn(),
    deleteBooking: vi.fn(),
    refreshBookings: vi.fn(),
  })),
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
