import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import EventModal from '@/components/EventModal';
import React from 'react';

// Mock firebase/firestore
vi.mock('firebase/firestore', () => ({
  doc: vi.fn(),
  onSnapshot: vi.fn(() => vi.fn()),
}));

// Mock contexts and hooks
const mockUseAuth = vi.fn();
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => mockUseAuth(),
}));

const mockDeleteBooking = vi.fn();
const mockUpdateBookingStatus = vi.fn();
vi.mock('@/hooks/useBookings', () => ({
  useBookings: () => ({
    deleteBooking: mockDeleteBooking,
    updateBookingStatus: mockUpdateBookingStatus,
  }),
}));

const mockAllowUserCancellation = { value: true };
vi.mock('@/hooks/useSettings', () => ({
  useSettings: () => ({
    settings: {
      allowUserCancellation: mockAllowUserCancellation.value,
    },
  }),
}));

const mockOpenServantPortal = vi.fn();
const mockSetGradingBooking = vi.fn();
vi.mock('@/store/useSchedulerStore', () => ({
  useSchedulerStore: () => ({
    openServantPortal: mockOpenServantPortal,
    setGradingBooking: mockSetGradingBooking,
  }),
}));

const mockBooking = {
  id: 'booking-1',
  title: 'مشروع التخرج التجريبي',
  date: '2026-07-15',
  startTime: '08:00',
  endTime: '11:00',
  serviceId: 'service-1',
  roomId: 'room-1',
  status: 'approved' as const,
  requesterName: 'خادم حجز',
  requesterEmail: 'leader@church.com',
  churchName: 'كنيسة العذراء',
  teamName: 'فريق الشهيد',
  ageGroup: 'شباب',
  teamMembers: [
    { name: 'عضو 1', id: '101' },
    { name: 'عضو 2', id: '102' },
  ],
  createdAt: '2026-07-01T00:00:00.000Z',
};

describe('EventModal', () => {
  const mockOnClose = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mockAllowUserCancellation.value = true;
    // Default mock implementation (Admin)
    mockUseAuth.mockReturnValue({
      user: { email: 'admin@test.com', role: 'admin' },
      isAdmin: true,
      isServant: false,
      isChurchLeader: false,
    });
  });

  it('renders nothing when closed or booking is missing', () => {
    const { container: c1 } = render(
      <EventModal booking={mockBooking} isOpen={false} onClose={mockOnClose} />
    );
    expect(c1.firstChild).toBeNull();

    const { container: c2 } = render(
      <EventModal booking={null} isOpen={true} onClose={mockOnClose} />
    );
    expect(c2.firstChild).toBeNull();
  });

  it('renders booking details correctly when open', () => {
    render(<EventModal booking={mockBooking} isOpen={true} onClose={mockOnClose} />);

    expect(screen.getByText('مشروع التخرج التجريبي')).toBeInTheDocument();
    expect(screen.getByText('كنيسة العذراء')).toBeInTheDocument();
    expect(screen.getByText('فريق الشهيد')).toBeInTheDocument();
    expect(screen.getByText('خادم حجز')).toBeInTheDocument();
    expect(screen.getByText('leader@church.com')).toBeInTheDocument();
    expect(screen.getByText('عضو 1')).toBeInTheDocument();
    expect(screen.getByText('#101')).toBeInTheDocument();
  });

  it('allows Admin to see the delete and approve options', () => {
    mockUseAuth.mockReturnValue({
      user: { email: 'admin@test.com', role: 'admin' },
      isAdmin: true,
      isServant: false,
      isChurchLeader: false,
    });

    const pendingBooking = { ...mockBooking, status: 'pending' as const };
    render(<EventModal booking={pendingBooking} isOpen={true} onClose={mockOnClose} />);

    // Admin should see approval button for pending booking
    expect(screen.getByText('الموافقة على الطلب')).toBeInTheDocument();
    // Admin should see delete booking
    expect(screen.getByText('حذف الحجز')).toBeInTheDocument();
  });

  it('allows Church Leader of the same church to delete if cancellation is enabled', () => {
    mockUseAuth.mockReturnValue({
      user: { email: 'leader@church.com', role: 'church_leader', churchName: 'كنيسة العذراء' },
      isAdmin: false,
      isServant: false,
      isChurchLeader: true,
    });
    mockAllowUserCancellation.value = true;

    render(<EventModal booking={mockBooking} isOpen={true} onClose={mockOnClose} />);

    expect(screen.getByText('حذف الحجز')).toBeInTheDocument();
  });

  it('shows view-only note to Church Leader if cancellation is disabled', () => {
    mockUseAuth.mockReturnValue({
      user: { email: 'leader@church.com', role: 'church_leader', churchName: 'كنيسة العذراء' },
      isAdmin: false,
      isServant: false,
      isChurchLeader: true,
    });
    mockAllowUserCancellation.value = false;

    render(<EventModal booking={mockBooking} isOpen={true} onClose={mockOnClose} />);

    expect(screen.queryByText('حذف الحجز')).not.toBeInTheDocument();
    expect(
      screen.getByText('تم إيقاف إلغاء الحجز من قبل المسؤول. يرجى التواصل معه لإجراء أي تعديل.')
    ).toBeInTheDocument();
  });

  it('shows view-only note to a normal user or other leader', () => {
    mockUseAuth.mockReturnValue({
      user: { email: 'other@church.com', role: 'church_leader', churchName: 'كنيسة أخرى' },
      isAdmin: false,
      isServant: false,
      isChurchLeader: true,
    });

    render(<EventModal booking={mockBooking} isOpen={true} onClose={mockOnClose} />);

    expect(screen.queryByText('حذف الحجز')).not.toBeInTheDocument();
    expect(screen.getByText('عرض فقط — لا يمكنك تعديل هذا الحجز')).toBeInTheDocument();
  });

  it('shows grading/evaluation button for Servant if approved and not yet evaluated', () => {
    mockUseAuth.mockReturnValue({
      user: { email: 'servant@test.com', role: 'servant' },
      isAdmin: false,
      isServant: true,
      isChurchLeader: false,
    });

    render(<EventModal booking={mockBooking} isOpen={true} onClose={mockOnClose} />);

    const evalBtn = screen.getByText(/رصد وتقييم درجات هذا/);
    fireEvent.click(evalBtn);
    expect(mockSetGradingBooking).toHaveBeenCalledWith(mockBooking);
    expect(mockOpenServantPortal).toHaveBeenCalled();
    expect(mockOnClose).toHaveBeenCalled();
  });

  it('closes when clicking ESC key', () => {
    render(<EventModal booking={mockBooking} isOpen={true} onClose={mockOnClose} />);

    fireEvent.keyDown(window, { key: 'Escape' });
    expect(mockOnClose).toHaveBeenCalled();
  });

  it('handles delete confirmation workflow', async () => {
    mockUseAuth.mockReturnValue({
      user: { email: 'admin@test.com', role: 'admin' },
      isAdmin: true,
      isServant: false,
      isChurchLeader: false,
    });

    render(<EventModal booking={mockBooking} isOpen={true} onClose={mockOnClose} />);

    const deleteBtn = screen.getByText('حذف الحجز');
    fireEvent.click(deleteBtn);

    // Should prompt for confirmation
    expect(screen.getByText('تأكيد الحذف')).toBeInTheDocument();
    expect(screen.getByText('تراجع')).toBeInTheDocument();

    // Confirm click
    fireEvent.click(screen.getByText('تأكيد الحذف'));
    expect(mockDeleteBooking).toHaveBeenCalledWith(mockBooking.id);
  });
});
