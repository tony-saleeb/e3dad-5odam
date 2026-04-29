import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import DayDetails from '@/components/DayDetails';

vi.mock('@/store/useSchedulerStore', () => ({
  useSchedulerStore: vi.fn(() => ({
    selectedDate: '2026-01-15',
  })),
}));

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: vi.fn(() => ({
    canSeePending: true,
  })),
}));

vi.mock('@/data/initialData', () => ({
  services: [
    { id: 'service1', name: 'Youth Service', color: '#10B981' },
  ],
  rooms: [
    { id: 'room1', name: 'Main Hall' },
  ],
}));

vi.mock('@/hooks/useBookings', () => ({
  useBookings: vi.fn(() => ({
    bookings: [],
    loading: false,
  })),
}));

describe('DayDetails', () => {
  it('renders the component', () => {
    render(<DayDetails />);
    
    expect(screen.getByText(/حجز مجدول/)).toBeInTheDocument();
  });

  it('has RTL direction', () => {
    const { container } = render(<DayDetails />);
    
    const rtlContainer = container.querySelector('[dir="rtl"]');
    expect(rtlContainer).toBeInTheDocument();
  });

  it('shows empty message when no bookings', () => {
    render(<DayDetails />);
    
    expect(screen.getByText('لا توجد حجوزات لهذا اليوم')).toBeInTheDocument();
  });
});
