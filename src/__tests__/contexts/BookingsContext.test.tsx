import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, act, waitFor } from '@testing-library/react';
import { BookingsProvider, useBookingsContext } from '@/contexts/BookingsContext';
import React from 'react';

// Mock firebase/firestore
const mockOnSnapshot = vi.fn();
const mockRunTransaction = vi.fn();
const mockUpdateDoc = vi.fn();

vi.mock('firebase/firestore', () => ({
  collection: vi.fn(),
  query: vi.fn(),
  orderBy: vi.fn(),
  where: vi.fn(),
  doc: vi.fn(),
  onSnapshot: (...args: unknown[]) => mockOnSnapshot(...args),
  updateDoc: (...args: unknown[]) => mockUpdateDoc(...args),
  runTransaction: (...args: unknown[]) => mockRunTransaction(...args),
  serverTimestamp: vi.fn(() => new Date().toISOString()),
  getFirestore: vi.fn(() => ({})),
  initializeFirestore: vi.fn(() => ({})),
  persistentLocalCache: vi.fn(),
  persistentMultipleTabManager: vi.fn(),
}));

// Mock AuthContext
const mockUser = { email: 'admin@test.com', role: 'admin' as const };
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: vi.fn(() => ({
    user: mockUser,
    isAdmin: true,
  })),
}));

// Mock SettingsContext
vi.mock('@/contexts/SettingsContext', () => ({
  useGlobalSettings: vi.fn(() => ({
    settings: {
      timePeriods: [],
      bookingRange: { startMonth: 6, endMonth: 8, allowedDays: [0, 1, 2, 3, 4, 5, 6] },
      teamMemberLimits: { min: 3, max: 20 },
      allowUserCancellation: true,
      evaluationFields: [],
    },
    loading: false,
  })),
}));

// Consumer to expose context values
function BookingsConsumer({ onRender }: { onRender: (ctx: ReturnType<typeof useBookingsContext>) => void }) {
  const ctx = useBookingsContext();
  onRender(ctx);
  return (
    <div>
      <span data-testid="count">{ctx.bookings.length}</span>
      <span data-testid="loading">{String(ctx.loading)}</span>
      <span data-testid="error">{ctx.error || 'none'}</span>
    </div>
  );
}

describe('BookingsContext', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('exports BookingsProvider and useBookingsContext', () => {
    expect(typeof BookingsProvider).toBe('function');
    expect(typeof useBookingsContext).toBe('function');
  });

  it('throws when useBookingsContext is used outside provider', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => {
      render(<BookingsConsumer onRender={() => {}} />);
    }).toThrow('useBookingsContext must be used within a BookingsProvider');
    spy.mockRestore();
  });

  it('starts in loading state and subscribes to Firestore', async () => {
    // Simulate Firestore returning empty docs
    mockOnSnapshot.mockImplementation((_q: unknown, onNext: (snap: { docs: never[] }) => void) => {
      onNext({ docs: [] });
      return vi.fn();
    });

    let capturedCtx: ReturnType<typeof useBookingsContext> | null = null;

    await act(async () => {
      render(
        <BookingsProvider>
          <BookingsConsumer onRender={(ctx) => { capturedCtx = ctx; }} />
        </BookingsProvider>
      );
    });

    await waitFor(() => {
      expect(capturedCtx).not.toBeNull();
      expect(capturedCtx!.bookings).toEqual([]);
      expect(capturedCtx!.loading).toBe(false);
    });
  });

  it('parses bookings from Firestore snapshot', async () => {
    const mockDocs = [
      {
        id: '2026-07-15_08-00',
        data: () => ({
          title: 'مشروع التخرج',
          requesterName: 'يوحنا',
          requesterEmail: 'john@test.com',
          date: '2026-07-15',
          startTime: '08:00',
          endTime: '11:00',
          status: 'approved',
          churchName: 'الكنيسة الأولى',
          teamName: 'فريق النور',
          ageGroup: 'إعدادي',
          createdAt: { toDate: () => new Date('2026-07-01') },
        }),
      },
    ];

    mockOnSnapshot.mockImplementation((_q: unknown, onNext: (snap: { docs: typeof mockDocs }) => void) => {
      onNext({ docs: mockDocs });
      return vi.fn();
    });

    let capturedCtx: ReturnType<typeof useBookingsContext> | null = null;

    await act(async () => {
      render(
        <BookingsProvider>
          <BookingsConsumer onRender={(ctx) => { capturedCtx = ctx; }} />
        </BookingsProvider>
      );
    });

    await waitFor(() => {
      expect(capturedCtx!.bookings).toHaveLength(1);
      expect(capturedCtx!.bookings[0].title).toBe('مشروع التخرج');
      expect(capturedCtx!.bookings[0].churchName).toBe('الكنيسة الأولى');
    });
  });

  it('filters out cancelled bookings from active list', async () => {
    const mockDocs = [
      {
        id: 'booking-active',
        data: () => ({
          title: 'Active',
          date: '2026-07-15',
          startTime: '08:00',
          endTime: '11:00',
          status: 'approved',
          createdAt: { toDate: () => new Date() },
        }),
      },
      {
        id: 'booking-cancelled',
        data: () => ({
          title: 'Cancelled',
          date: '2026-07-16',
          startTime: '08:00',
          endTime: '11:00',
          status: 'cancelled',
          cancelledAt: '2026-07-10T00:00:00Z',
          cancelledBy: 'admin@test.com',
          createdAt: { toDate: () => new Date() },
        }),
      },
    ];

    mockOnSnapshot.mockImplementation((_q: unknown, onNext: (snap: { docs: typeof mockDocs }) => void) => {
      onNext({ docs: mockDocs });
      return vi.fn();
    });

    let capturedCtx: ReturnType<typeof useBookingsContext> | null = null;

    await act(async () => {
      render(
        <BookingsProvider>
          <BookingsConsumer onRender={(ctx) => { capturedCtx = ctx; }} />
        </BookingsProvider>
      );
    });

    await waitFor(() => {
      // Active bookings should exclude cancelled
      expect(capturedCtx!.bookings).toHaveLength(1);
      expect(capturedCtx!.bookings[0].title).toBe('Active');

      // allBookingsIncludingCancelled should have both
      expect(capturedCtx!.allBookingsIncludingCancelled).toHaveLength(2);
    });
  });

  it('deleteBooking performs soft-delete via updateDoc', async () => {
    mockOnSnapshot.mockImplementation((_q: unknown, onNext: (snap: { docs: never[] }) => void) => {
      onNext({ docs: [] });
      return vi.fn();
    });
    mockUpdateDoc.mockResolvedValue(undefined);

    let capturedCtx: ReturnType<typeof useBookingsContext> | null = null;

    await act(async () => {
      render(
        <BookingsProvider>
          <BookingsConsumer onRender={(ctx) => { capturedCtx = ctx; }} />
        </BookingsProvider>
      );
    });

    await act(async () => {
      await capturedCtx!.deleteBooking('booking-123');
    });

    expect(mockUpdateDoc).toHaveBeenCalledWith(
      undefined, // doc ref (mocked)
      expect.objectContaining({
        status: 'cancelled',
        cancelledBy: 'admin@test.com',
      })
    );
  });

  it('restoreBooking uses runTransaction to prevent conflicts', async () => {
    mockOnSnapshot.mockImplementation((_q: unknown, onNext: (snap: { docs: never[] }) => void) => {
      onNext({ docs: [] });
      return vi.fn();
    });
    mockRunTransaction.mockImplementation(async (_db: unknown, callback: (tx: { get: () => Promise<{ exists: () => boolean; data: () => { status: string } }>; update: () => void }) => Promise<void>) => {
      await callback({
        get: async () => ({ exists: () => true, data: () => ({ status: 'cancelled' }) }),
        update: vi.fn(),
      });
    });

    let capturedCtx: ReturnType<typeof useBookingsContext> | null = null;

    await act(async () => {
      render(
        <BookingsProvider>
          <BookingsConsumer onRender={(ctx) => { capturedCtx = ctx; }} />
        </BookingsProvider>
      );
    });

    await act(async () => {
      await capturedCtx!.restoreBooking('booking-123');
    });

    expect(mockRunTransaction).toHaveBeenCalled();
  });

  it('handles Firestore listener errors gracefully', async () => {
    mockOnSnapshot.mockImplementation((_q: unknown, _onNext: unknown, onError: (err: Error) => void) => {
      onError(new Error('Missing or insufficient permissions'));
      return vi.fn();
    });

    let capturedCtx: ReturnType<typeof useBookingsContext> | null = null;

    await act(async () => {
      render(
        <BookingsProvider>
          <BookingsConsumer onRender={(ctx) => { capturedCtx = ctx; }} />
        </BookingsProvider>
      );
    });

    await waitFor(() => {
      expect(capturedCtx!.error).toBe('Missing or insufficient permissions');
      expect(capturedCtx!.loading).toBe(false);
    });
  });

  it('cleans up Firestore listener on unmount', async () => {
    const unsubscribe = vi.fn();
    mockOnSnapshot.mockImplementation((_q: unknown, onNext: (snap: { docs: never[] }) => void) => {
      onNext({ docs: [] });
      return unsubscribe;
    });

    let result: ReturnType<typeof render>;

    await act(async () => {
      result = render(
        <BookingsProvider>
          <BookingsConsumer onRender={() => {}} />
        </BookingsProvider>
      );
    });

    act(() => {
      result!.unmount();
    });

    expect(unsubscribe).toHaveBeenCalled();
  });
});
