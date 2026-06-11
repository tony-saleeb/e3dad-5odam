import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import AdminDashboard from '@/components/AdminDashboard';
import React from 'react';

// Stable mock values to prevent React infinite render loops
const mockSettings = {
  timePeriods: [],
  bookingRange: { startMonth: 6, endMonth: 8, allowedDays: [0, 1, 2, 3, 4, 5, 6] },
  teamMemberLimits: { min: 3, max: 20 },
  allowUserCancellation: true,
  evaluationFields: [],
};

const mockUser = { email: 'admin@test.com', role: 'admin' as const };

const mockBookingsValue = {
  bookings: [] as unknown[],
  allBookingsIncludingCancelled: [] as unknown[],
  restoreBooking: vi.fn(),
};

// Define mock variables for firestore
const mockGetDocs = vi.fn(() => Promise.resolve({ docs: [] }));
const mockOnSnapshot = vi.fn(() => vi.fn());
const mockWriteBatch = vi.fn(() => ({
  set: vi.fn(),
  commit: vi.fn().mockResolvedValue(undefined),
}));
const mockDeleteDoc = vi.fn(() => Promise.resolve());
const mockSetDoc = vi.fn(() => Promise.resolve());
const mockUpdateDoc = vi.fn(() => Promise.resolve());

// Mock firebase/firestore
vi.mock('firebase/firestore', () => ({
  collection: vi.fn(),
  getDocs: (...args: any[]) => (mockGetDocs as any)(...args),
  setDoc: (...args: any[]) => (mockSetDoc as any)(...args),
  deleteDoc: (...args: any[]) => (mockDeleteDoc as any)(...args),
  doc: vi.fn(),
  onSnapshot: (...args: any[]) => (mockOnSnapshot as any)(...args),
  updateDoc: (...args: any[]) => (mockUpdateDoc as any)(...args),
  query: vi.fn(),
  where: vi.fn(),
  writeBatch: (...args: any[]) => (mockWriteBatch as any)(...args),
  getFirestore: vi.fn(() => ({})),
  initializeFirestore: vi.fn(() => ({})),
  persistentLocalCache: vi.fn(),
  persistentMultipleTabManager: vi.fn(),
}));

// Mock firebase/auth
vi.mock('firebase/auth', () => ({
  getAuth: vi.fn(() => ({
    currentUser: {
      getIdToken: vi.fn().mockResolvedValue('mock-token'),
    },
  })),
}));

// Mock contexts and hooks
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    user: mockUser,
    isAdmin: true,
  }),
}));

vi.mock('@/hooks/useBookings', () => ({
  useBookings: () => mockBookingsValue,
}));

vi.mock('@/hooks/useSettings', () => ({
  useSettings: () => ({
    settings: mockSettings,
    updateSettings: vi.fn(),
  }),
}));

vi.mock('@/store/useSchedulerStore', () => ({
  useSchedulerStore: () => ({
    isAdminDashboardOpen: true,
    closeAdminDashboard: vi.fn(),
  }),
}));

const mockToast = {
  success: vi.fn(),
  error: vi.fn(),
};
vi.mock('@/components/Toast', () => ({
  useToast: () => ({
    toast: mockToast,
  }),
}));

// Mock exceljs for testing Excel import
vi.mock('exceljs', () => {
  const mockWorkbookInstance = {
    xlsx: {
      load: vi.fn().mockResolvedValue(undefined),
    },
    getWorksheet: vi.fn(() => ({
      eachRow: (callback: (row: unknown, rowNum: number) => void) => {
        // Row 1 is header, skip
        // Row 2: Valid email and name
        callback({
          getCell: (col: number) => {
            if (col === 1) return { value: 'leader@church.com' };
            if (col === 2) return { value: 'شنودة خادم' };
            return null;
          }
        }, 2);
        // Row 3: Name with HTML tags (needs sanitization)
        callback({
          getCell: (col: number) => {
            if (col === 1) return { value: 'clean@church.com' };
            if (col === 2) return { value: '<script>alert("XSS")</script>أبانوب' };
            return null;
          }
        }, 3);
        // Row 4: Invalid email (should be skipped)
        callback({
          getCell: (col: number) => {
            if (col === 1) return { value: 'invalid-email' };
            if (col === 2) return { value: 'خادم غير صالح' };
            return null;
          }
        }, 4);
      }
    })),
  };

  return {
    default: {
      Workbook: function() {
        return mockWorkbookInstance;
      }
    }
  };
});

describe('AdminDashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders dashboard with tabs', () => {
    render(<AdminDashboard />);
    expect(screen.getByText('الاستيراد الجماعي من ملف Excel')).toBeInTheDocument();
    expect(screen.getByText('لوحة التحكم والمسؤول')).toBeInTheDocument();
  });

  it('handles user form validation', async () => {
    render(<AdminDashboard />);

    // Try adding empty email
    const addBtn = screen.getByText('+ إضافة');
    fireEvent.click(addBtn);

    expect(screen.getByText('البريد الإلكتروني مطلوب')).toBeInTheDocument();
  });

  it('performs Excel import, validating emails and sanitizing names', async () => {
    const { container } = render(<AdminDashboard />);

    // Find file input
    const fileInput = container.querySelector('input[type="file"]') as HTMLInputElement;
    expect(fileInput).toBeInTheDocument();

    const file = new File(['mock content'], 'test.xlsx', { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    file.arrayBuffer = vi.fn().mockResolvedValue(new ArrayBuffer(12));

    await waitFor(async () => {
      fireEvent.change(fileInput, { target: { files: [file] } });
    });

    await waitFor(() => {
      expect(mockWriteBatch).toHaveBeenCalled();
      expect(mockToast.success).toHaveBeenCalledWith(expect.stringContaining('تم استيراد عدد 2 من قادة الفرق بنجاح!'));
    });
  });
});
