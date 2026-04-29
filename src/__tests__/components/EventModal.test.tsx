import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import EventModal from '@/components/EventModal';

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

vi.mock('@/data/initialData', () => ({
  services: [
    { id: 'service1', name: 'Service 1', color: '#10B981' },
  ],
  rooms: [
    { id: 'room1', name: 'Main Hall' },
  ],
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

  it('displays service name', () => {
    render(<EventModal booking={mockBooking} isOpen={true} onClose={mockOnClose} />);
    
    expect(screen.getByText('Service 1')).toBeInTheDocument();
  });

  it('displays room name', () => {
    render(<EventModal booking={mockBooking} isOpen={true} onClose={mockOnClose} />);
    
    expect(screen.getByText('Main Hall')).toBeInTheDocument();
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
