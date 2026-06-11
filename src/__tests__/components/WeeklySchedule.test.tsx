import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import WeeklySchedule from '@/components/WeeklySchedule';
import React from 'react';

// Mock scheduler store
const mockSetCurrentMonth = vi.fn();
const mockSetSelectedDate = vi.fn();
const mockOpenBookingModal = vi.fn();
const mockOpenEventModal = vi.fn();
const mockSetSelectedStartTime = vi.fn();
const mockSetSelectedEndTime = vi.fn();

const mockStore = {
  currentMonth: new Date(2026, 6, 15), // July 15, 2026
  setCurrentMonth: mockSetCurrentMonth,
  setSelectedDate: mockSetSelectedDate,
  openBookingModal: mockOpenBookingModal,
  openEventModal: mockOpenEventModal,
  setSelectedStartTime: mockSetSelectedStartTime,
  setSelectedEndTime: mockSetSelectedEndTime,
};

vi.mock('@/store/useSchedulerStore', () => ({
  useSchedulerStore: () => mockStore,
}));

// Mock AuthContext
const mockUseAuth = vi.fn();
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => mockUseAuth(),
}));

// Mock useBookings
const mockHasUserAlreadyBooked = vi.fn(() => false);
const mockGetChurchBookedDays = vi.fn(() => [] as string[]);
const mockGetChurchGroupCount = vi.fn(() => 0);
const mockBookings = [
  {
    id: 'booking-1',
    title: 'مشروع أولي',
    requesterName: 'بيشوي',
    requesterEmail: 'peshoy@test.com',
    date: '2026-07-15',
    startTime: '08:00',
    endTime: '11:00',
    status: 'approved' as const,
    churchName: 'كنيسة الملاك',
    serviceId: 'service-1',
    roomId: 'room-1',
    createdAt: '2026-07-01T00:00:00.000Z',
  },
];

vi.mock('@/hooks/useBookings', () => ({
  useBookings: () => ({
    bookings: mockBookings,
    loading: false,
    hasUserAlreadyBooked: mockHasUserAlreadyBooked,
    getChurchBookedDays: mockGetChurchBookedDays,
    getChurchGroupCount: mockGetChurchGroupCount,
  }),
}));

// Mock useSettings
vi.mock('@/hooks/useSettings', () => ({
  useSettings: () => ({
    settings: {
      timePeriods: [
        { id: 'p1', label: 'الفترة الأولى', startTime: '08:00', endTime: '11:00' },
        { id: 'p2', label: 'الفترة الثانية', startTime: '11:30', endTime: '14:30' },
        { id: 'p3', label: 'الفترة الثالثة', startTime: '15:00', endTime: '18:00' },
      ],
      bookingRange: {
        startMonth: 6, // July
        endMonth: 8,   // September
        allowedDays: [0, 1, 2, 3, 4, 5, 6],
      },
    },
    loading: false,
  }),
}));

// Mock initialData
vi.mock('@/data/initialData', () => ({
  getChurchColor: () => ({
    gradient: 'bg-gradient-to-br from-emerald-500 to-teal-600',
    border: 'border-emerald-500',
    hex: '#059669',
    badge: 'bg-emerald-50 text-emerald-700',
  }),
}));

describe('WeeklySchedule', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockStore.currentMonth = new Date(2026, 6, 15);
    mockUseAuth.mockReturnValue({
      user: { email: 'admin@test.com', role: 'admin' },
      isAdmin: true,
      canSeePending: true,
      canCreateBooking: true,
      isChurchLeader: false,
    } as any);
  });

  it('renders correctly and shows weekly headings', () => {
    render(<WeeklySchedule />);
    expect(screen.getAllByText('الجدول الأسبوعي').length).toBeGreaterThan(0);
    expect(screen.getAllByText('الفترة الأولى').length).toBeGreaterThan(0);
  });

  it('renders booking cards inside correct day and period slots', () => {
    render(<WeeklySchedule />);

    // Since mock booking is on 2026-07-15 at 08:00 (which corresponds to "الفترة الأولى" or "08:00 - 11:00")
    // It should render "كنيسة الملاك" and "مشروع أولي"
    expect(screen.getAllByText('كنيسة الملاك').length).toBeGreaterThan(0);
    expect(screen.getAllByText(/مشروع أولي/).length).toBeGreaterThan(0);
  });

  it('navigates weeks using Next and Prev buttons', () => {
    render(<WeeklySchedule />);

    // Week Start in our mock is 2026-07-12 (Sunday of July 15)
    // Find next week button (Desktop view or mobile view)
    const nextBtns = screen.getAllByLabelText('الأسبوع التالي');
    expect(nextBtns.length).toBeGreaterThan(0);

    fireEvent.click(nextBtns[0]);
    // Should call setCurrentMonth with next week (July 22, 2026)
    expect(mockSetCurrentMonth).toHaveBeenCalled();
    const calledDate = mockSetCurrentMonth.mock.calls[0][0];
    expect(calledDate.getDate()).toBe(22);
  });

  it('allows clicking an empty slot to create a booking if authorized', () => {
    // Empty slot: 2026-07-15 at 11:30 (Period 2)
    mockUseAuth.mockReturnValue({
      user: { email: 'leader@test.com', role: 'church_leader', churchName: 'كنيسة الملاك' },
      isAdmin: false,
      canSeePending: true,
      canCreateBooking: true,
      isChurchLeader: true,
    } as any);

    render(<WeeklySchedule />);

    // Under desktop view, find "حجز الفترة الثانية" or "+ حجز" button/container
    const bookingSlots = screen.getAllByText(/حجز/);
    expect(bookingSlots.length).toBeGreaterThan(0);

    // Let's filter for "+ حجز" button
    const scheduleBtn = screen.getAllByText(/\+ حجز/)[0];
    fireEvent.click(scheduleBtn);

    expect(mockSetSelectedDate).toHaveBeenCalledWith('2026-07-12');
    expect(mockOpenBookingModal).toHaveBeenCalled();
  });

  it('does not allow booking creation if user already booked and not admin/leader', () => {
    mockUseAuth.mockReturnValue({
      user: { email: 'servant@test.com', role: 'user' },
      isAdmin: false,
      canSeePending: false,
      canCreateBooking: true,
      isChurchLeader: false,
    } as any);
    mockHasUserAlreadyBooked.mockReturnValue(true);

    render(<WeeklySchedule />);

    // Since user has already booked, they should not see "+" or "+ حجز" buttons on empty slots
    expect(screen.queryByText(/\+ حجز/)).not.toBeInTheDocument();
  });

  it('applies day locking logic for Church Leader with multiple bookings', () => {
    mockUseAuth.mockReturnValue({
      user: { email: 'leader@test.com', role: 'church_leader', churchName: 'كنيسة الملاك' },
      isAdmin: false,
      canSeePending: true,
      canCreateBooking: true,
      isChurchLeader: true,
    } as any);
    // Reached max allowed days (church leader has booked max days already)
    mockGetChurchBookedDays.mockReturnValue(['2026-07-14']);
    mockGetChurchGroupCount.mockReturnValue(1); // maxBookingDays = 1 because count <= 3

    render(<WeeklySchedule />);

    // Slots on other days (like 2026-07-15) should be rendered as "مغلق"
    expect(screen.getAllByText('مغلق').length).toBeGreaterThan(0);
  });
});
