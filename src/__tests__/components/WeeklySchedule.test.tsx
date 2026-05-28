import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import WeeklySchedule from '@/components/WeeklySchedule';

vi.mock('@/store/useSchedulerStore', () => ({
  useSchedulerStore: vi.fn(() => ({
    currentMonth: new Date(2026, 6, 15),
    selectedDate: '2026-07-15',
    setSelectedDate: vi.fn(),
    openEventModal: vi.fn(),
  })),
}));

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: vi.fn(() => ({
    isAdmin: true,
    canSeePending: true,
  })),
}));

vi.mock('@/hooks/useBookings', () => ({
  useBookings: vi.fn(() => ({
    bookings: [],
    loading: false,
  })),
}));

vi.mock('@/hooks/useSettings', () => ({
  useSettings: vi.fn(() => ({
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
      teamMemberLimits: { min: 3, max: 20 },
      allowUserCancellation: true,
      evaluationFields: [],
    },
    loading: false,
    updateSettings: vi.fn(),
    refreshSettings: vi.fn(),
  })),
}));

vi.mock('@/data/initialData', () => ({
  services: [
    { id: 'service1', name: 'Service 1', color: '#10B981' },
  ],
  rooms: [
    { id: 'room1', name: 'Main Hall' },
  ],
  timePeriods: [
    { id: 'p1', label: 'الفترة الأولى', startTime: '08:00', endTime: '11:00' },
    { id: 'p2', label: 'الفترة الثانية', startTime: '11:30', endTime: '14:30' },
    { id: 'p3', label: 'الفترة الثالثة', startTime: '15:00', endTime: '18:00' },
  ],
  ALLOWED_DAYS: [0, 1, 2, 3, 4, 5, 6],
  getDateRange: () => ({ start: new Date(2026, 6, 1), end: new Date(2026, 8, 30) }),
  churches: [],
  getChurchColor: () => 'bg-slate-100 text-slate-800',
}));

describe('WeeklySchedule', () => {
  it('renders the component', () => {
    const { container } = render(<WeeklySchedule />);
    expect(container).toBeDefined();
  });

  it('shows navigation buttons', () => {
    render(<WeeklySchedule />);
    
    const buttons = screen.getAllByRole('button');
    expect(buttons.length).toBeGreaterThan(0);
  });

  it('renders time column', () => {
    const { container } = render(<WeeklySchedule />);
    
    const timeElements = container.querySelectorAll('.text-xs');
    expect(timeElements.length).toBeGreaterThan(0);
  });
});
