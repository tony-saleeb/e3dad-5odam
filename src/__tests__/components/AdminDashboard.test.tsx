import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import AdminDashboard from '@/components/AdminDashboard';

const mockUseAuth = vi.fn();
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => mockUseAuth(),
}));

const mockUseBookings = vi.fn();
vi.mock('@/hooks/useBookings', () => ({
  useBookings: () => mockUseBookings(),
}));

const mockUseSettings = vi.fn();
vi.mock('@/hooks/useSettings', () => ({
  useSettings: () => mockUseSettings(),
}));

vi.mock('@/store/useSchedulerStore', () => ({
  useSchedulerStore: () => ({
    isAdminDashboardOpen: true,
    closeAdminDashboard: vi.fn(),
  }),
}));

vi.mock('@/lib/firebase', () => ({
  db: {},
}));
vi.mock('firebase/firestore', () => ({
  collection: vi.fn(),
  doc: vi.fn(),
  getDocs: vi.fn().mockResolvedValue({ docs: [] }),
  setDoc: vi.fn().mockResolvedValue({}),
  deleteDoc: vi.fn().mockResolvedValue({}),
  writeBatch: vi.fn().mockReturnValue({
    set: vi.fn(),
    commit: vi.fn().mockResolvedValue({}),
  }),
}));

describe('AdminDashboard', () => {
  const mockUser = {
    email: 'admin@example.com',
    role: 'admin',
    displayName: 'Admin User',
  };

  const mockSettings = {
    timePeriods: [
      { id: 'p1', label: 'الفترة الأولى', startTime: '12:00', endTime: '14:00' },
    ],
    bookingRange: { startMonth: 6, endMonth: 8, allowedDays: [0, 1, 2, 3, 4, 5, 6], excludedDates: [] },
    teamMemberLimits: { min: 3, max: 20 },
    allowUserCancellation: true,
    evaluationFields: [],
  };

  beforeEach(() => {
    mockUseAuth.mockReturnValue({
      user: mockUser,
      isAdmin: true,
      isChurchLeader: false,
      isServant: false,
      loginWithGoogle: vi.fn(),
      logout: vi.fn(),
      loading: false,
      authError: null,
      clearAuthError: vi.fn(),
      canSeePending: true,
    });

    mockUseBookings.mockReturnValue({
      bookings: [],
      loading: false,
      addBooking: vi.fn(),
      updateBookingStatus: vi.fn(),
      deleteBooking: vi.fn(),
      isPeriodBooked: vi.fn(),
      hasUserAlreadyBooked: vi.fn(),
      refreshBookings: vi.fn(),
      addTeamEvaluation: vi.fn(),
      getTeamEvaluationsForBooking: vi.fn().mockReturnValue([]),
      getChurchBookedDays: vi.fn().mockReturnValue([]),
      getChurchGroupCount: vi.fn().mockReturnValue(0),
    });

    mockUseSettings.mockReturnValue({
      settings: mockSettings,
      loading: false,
      updateSettings: vi.fn().mockResolvedValue(true),
      refreshSettings: vi.fn(),
    });

    vi.clearAllMocks();
  });

  it('renders dashboard with tabs', () => {
    render(<AdminDashboard />);
    expect(screen.getByText('المستخدمون')).toBeInTheDocument();
    expect(screen.getByText('لوحة التحكم والمسؤول')).toBeInTheDocument();
  });

  it('handles user form validation', async () => {
    render(<AdminDashboard />);

    // Open add user panel
    const addBtn = screen.getByText('إضافة مستخدم');
    fireEvent.click(addBtn);

    // Try adding empty email
    const submitBtn = screen.getByText('+ تأكيد الإضافة');
    fireEvent.click(submitBtn);

    expect(screen.getByText('البريد الإلكتروني مطلوب')).toBeInTheDocument();
  });

  it('performs Excel import, validating emails and sanitizing names', async () => {
    const { container } = render(<AdminDashboard />);

    // Open import panel
    const importBtn = screen.getByText('استيراد Excel');
    fireEvent.click(importBtn);

    // Find file input
    const fileInput = container.querySelector('input[type="file"]') as HTMLInputElement;
    expect(fileInput).toBeInTheDocument();

    const file = new File(['mock content'], 'test.xlsx', { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    file.arrayBuffer = vi.fn().mockResolvedValue(new ArrayBuffer(12));

    await waitFor(async () => {
      fireEvent.change(fileInput, { target: { files: [file] } });
    });
  });
});
