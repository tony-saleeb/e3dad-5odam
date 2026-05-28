import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import MiniCalendar from '@/components/MiniCalendar';

const mockSetSelectedDate = vi.fn();
const mockSetCurrentMonth = vi.fn();

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: vi.fn(() => ({
    user: { email: 'test@example.com', role: 'user' },
    isAdmin: false,
    isServant: false,
    canSeePending: false,
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

vi.mock('@/store/useSchedulerStore', () => ({
  useSchedulerStore: vi.fn(() => ({
    currentMonth: new Date(2026, 6, 15),
    selectedDate: '2026-07-15',
    setSelectedDate: mockSetSelectedDate,
    setCurrentMonth: mockSetCurrentMonth,
  })),
}));

vi.mock('@/hooks/useBookings', () => ({
  useBookings: vi.fn(() => ({
    bookings: [
      { id: '1', date: '2026-07-20', status: 'approved' },
    ],
    loading: false,
  })),
}));

describe('MiniCalendar', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the calendar', () => {
    render(<MiniCalendar />);
    
    expect(screen.getByText('الذهاب لبداية الفترة')).toBeInTheDocument();
  });

  it('displays month and year', () => {
    render(<MiniCalendar />);
    
    expect(screen.getByText('يوليو 2026')).toBeInTheDocument();
  });

  it('renders day numbers', () => {
    render(<MiniCalendar />);
    
    expect(screen.getByText('15')).toBeInTheDocument();
  });

  it('calls setSelectedDate when clicking a date', () => {
    render(<MiniCalendar />);
    
    const dayButton = screen.getAllByText('20')[0];
    fireEvent.click(dayButton);
    
    expect(mockSetSelectedDate).toHaveBeenCalled();
  });
});
