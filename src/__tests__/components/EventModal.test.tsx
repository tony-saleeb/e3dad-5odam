import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import EventModal from '@/components/EventModal';

vi.mock('firebase/firestore', () => ({
  doc: vi.fn(),
  onSnapshot: vi.fn(() => vi.fn()),
}));

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: vi.fn(() => ({
    isAdmin: true,
  })),
}));

vi.mock('@/hooks/useBookings', () => ({
  useBookings: vi.fn(() => ({
    updateBookingStatus: vi.fn(),
    deleteBooking: vi.fn(),
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

const mockBooking = {
  id: '1',
  title: 'Test Event',
  date: '2026-01-15',
  startTime: '10:00',
  endTime: '12:00',
  serviceId: 'service1',
  roomId: 'room1',
  roomIds: ['room1'],
  status: 'approved' as const,
  requesterName: 'John Doe',
  requesterEmail: 'john@example.com',
  notes: 'Some notes',
  createdAt: '2026-01-01T00:00:00.000Z',
  churchName: 'الكنيسة الأولى',
  teamName: 'فريق النور',
  ageGroup: 'إعدادي',
};

describe('EventModal', () => {
  const mockOnClose = vi.fn();

  it('renders the modal when open', () => {
    render(<EventModal booking={mockBooking} isOpen={true} onClose={mockOnClose} />);
    
    expect(screen.getByText('Test Event')).toBeInTheDocument();
  });

  it('displays event time', () => {
    render(<EventModal booking={mockBooking} isOpen={true} onClose={mockOnClose} />);
    
    expect(screen.getByText(/10:00/)).toBeInTheDocument();
  });

  it('displays church name', () => {
    render(<EventModal booking={mockBooking} isOpen={true} onClose={mockOnClose} />);
    
    expect(screen.getByText('الكنيسة الأولى')).toBeInTheDocument();
  });

  it('displays team name', () => {
    render(<EventModal booking={mockBooking} isOpen={true} onClose={mockOnClose} />);
    
    expect(screen.getByText('فريق النور')).toBeInTheDocument();
  });

  it('returns null when not open', () => {
    const { container } = render(<EventModal booking={mockBooking} isOpen={false} onClose={mockOnClose} />);
    
    expect(container.firstChild).toBeNull();
  });

  it('returns null when booking is null', () => {
    const { container } = render(<EventModal booking={null} isOpen={true} onClose={mockOnClose} />);
    
    expect(container.firstChild).toBeNull();
  });
});
