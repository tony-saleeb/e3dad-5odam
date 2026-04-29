import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import UpcomingEvents from '@/components/UpcomingEvents';

vi.mock('@/store/useSchedulerStore', () => ({
  useSchedulerStore: vi.fn(() => ({
    setSelectedDate: vi.fn(),
    setCurrentMonth: vi.fn(),
    openEventModal: vi.fn(),
  })),
}));

vi.mock('@/data/initialData', () => ({
  services: [
    { id: 'service1', name: 'Service 1', color: '#10B981' },
  ],
}));

vi.mock('@/hooks/useBookings', () => ({
  useBookings: vi.fn(() => ({
    bookings: [],
    loading: false,
  })),
}));

describe('UpcomingEvents', () => {
  it('renders the title', () => {
    render(<UpcomingEvents />);
    
    expect(screen.getByText('الأحداث القادمة')).toBeInTheDocument();
  });

  it('has RTL direction', () => {
    const { container } = render(<UpcomingEvents />);
    
    const rtlContainer = container.querySelector('[dir="rtl"]');
    expect(rtlContainer).toBeInTheDocument();
  });

  it('shows empty message when no upcoming events', () => {
    render(<UpcomingEvents />);
    
    expect(screen.getByText('لا توجد أحداث قادمة')).toBeInTheDocument();
  });

  it('shows event count badge', () => {
    render(<UpcomingEvents />);
    
    expect(screen.getByText('0 حدث')).toBeInTheDocument();
  });
});
