import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import Calendar from '@/components/Calendar';

vi.mock('@/store/useSchedulerStore', () => ({
  useSchedulerStore: vi.fn(() => ({
    currentMonth: new Date(2026, 0, 15),
    selectedDate: '2026-01-15',
    setSelectedDate: vi.fn(),
    openEventModal: vi.fn(),
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
}));

describe('Calendar', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('exports as a function component', () => {
    expect(typeof Calendar).toBe('function');
  });

  it('renders without crashing', () => {
    const { container } = render(<Calendar />);
    expect(container).toBeDefined();
  });
});
