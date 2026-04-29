import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import MiniCalendar from '@/components/MiniCalendar';

const mockSetSelectedDate = vi.fn();
const mockSetCurrentMonth = vi.fn();

vi.mock('@/store/useSchedulerStore', () => ({
  useSchedulerStore: vi.fn(() => ({
    currentMonth: new Date(2026, 0, 15),
    selectedDate: '2026-01-15',
    setSelectedDate: mockSetSelectedDate,
    setCurrentMonth: mockSetCurrentMonth,
  })),
}));

vi.mock('@/hooks/useBookings', () => ({
  useBookings: vi.fn(() => ({
    bookings: [
      { id: '1', date: '2026-01-20', status: 'approved' },
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
    
    expect(screen.getByText('الذهاب لليوم')).toBeInTheDocument();
  });

  it('displays month and year', () => {
    render(<MiniCalendar />);
    
    expect(screen.getByText('January 2026')).toBeInTheDocument();
  });

  it('renders day numbers', () => {
    render(<MiniCalendar />);
    
    expect(screen.getByText('15')).toBeInTheDocument();
  });

  it('calls setSelectedDate when clicking a date', () => {
    render(<MiniCalendar />);
    
    const dayButton = screen.getByText('20');
    fireEvent.click(dayButton);
    
    expect(mockSetSelectedDate).toHaveBeenCalled();
  });
});
