import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import WeeklySchedule from '@/components/WeeklySchedule';

vi.mock('@/store/useSchedulerStore', () => ({
  useSchedulerStore: vi.fn(() => ({
    currentMonth: new Date(2026, 0, 15),
    selectedDate: '2026-01-15',
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

vi.mock('@/data/initialData', () => ({
  services: [
    { id: 'service1', name: 'Service 1', color: '#10B981' },
  ],
  rooms: [
    { id: 'room1', name: 'Main Hall' },
  ],
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
