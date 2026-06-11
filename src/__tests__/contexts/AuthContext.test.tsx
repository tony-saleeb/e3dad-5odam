import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import React from 'react';

// Mock firebase/auth
const mockOnAuthStateChanged = vi.fn();
const mockSignInWithPopup = vi.fn();
const mockSignOut = vi.fn();

vi.mock('firebase/auth', () => ({
  getAuth: vi.fn(() => ({})),
  GoogleAuthProvider: vi.fn(),
  onAuthStateChanged: (...args: unknown[]) => mockOnAuthStateChanged(...args),
  signInWithPopup: (...args: unknown[]) => mockSignInWithPopup(...args),
  signOut: (...args: unknown[]) => mockSignOut(...args),
}));

// Mock firebase/firestore
const mockOnSnapshot = vi.fn();
vi.mock('firebase/firestore', () => ({
  doc: vi.fn(),
  onSnapshot: (...args: unknown[]) => mockOnSnapshot(...args),
  setDoc: vi.fn(),
  updateDoc: vi.fn(),
  getFirestore: vi.fn(() => ({})),
  initializeFirestore: vi.fn(() => ({})),
  persistentLocalCache: vi.fn(),
  persistentMultipleTabManager: vi.fn(),
}));

// Consumer component that renders auth state
function AuthConsumer() {
  const auth = useAuth();
  return (
    <div>
      <span data-testid="loading">{String(auth.loading)}</span>
      <span data-testid="role">{auth.user?.role || 'none'}</span>
      <span data-testid="isAdmin">{String(auth.isAdmin)}</span>
      <span data-testid="isServant">{String(auth.isServant)}</span>
      <span data-testid="isChurchLeader">{String(auth.isChurchLeader)}</span>
      <span data-testid="canCreateBooking">{String(auth.canCreateBooking)}</span>
      <span data-testid="error">{auth.authError || 'none'}</span>
    </div>
  );
}

describe('AuthContext', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('exports AuthProvider as a function', () => {
    expect(typeof AuthProvider).toBe('function');
  });

  it('exports useAuth as a function', () => {
    expect(typeof useAuth).toBe('function');
  });

  it('throws when useAuth is used outside AuthProvider', () => {
    // Suppress console.error for expected error
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => {
      render(<AuthConsumer />);
    }).toThrow('useAuth must be used within an AuthProvider');
    spy.mockRestore();
  });

  it('starts in loading state', () => {
    // onAuthStateChanged doesn't call callback yet
    mockOnAuthStateChanged.mockImplementation(() => vi.fn());

    render(
      <AuthProvider>
        <AuthConsumer />
      </AuthProvider>
    );

    expect(screen.getByTestId('loading')).toHaveTextContent('true');
  });

  it('sets user to null when not authenticated', async () => {
    mockOnAuthStateChanged.mockImplementation((_auth: unknown, callback: (user: null) => void) => {
      callback(null);
      return vi.fn();
    });

    render(
      <AuthProvider>
        <AuthConsumer />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('loading')).toHaveTextContent('false');
      expect(screen.getByTestId('role')).toHaveTextContent('none');
    });
  });

  it('resolves admin role from Firestore snapshot', async () => {
    const mockUser = {
      uid: 'uid-1',
      email: 'admin@test.com',
      displayName: 'Admin User',
      photoURL: null,
    };

    mockOnAuthStateChanged.mockImplementation((_auth: unknown, callback: (user: typeof mockUser) => void) => {
      callback(mockUser);
      return vi.fn();
    });

    mockOnSnapshot.mockImplementation((_ref: unknown, onNext: (snap: { exists: () => boolean; data: () => Record<string, unknown> }) => void) => {
      onNext({
        exists: () => true,
        data: () => ({ role: 'admin', email: 'admin@test.com' }),
      });
      return vi.fn();
    });

    await act(async () => {
      render(
        <AuthProvider>
          <AuthConsumer />
        </AuthProvider>
      );
    });

    await waitFor(() => {
      expect(screen.getByTestId('role')).toHaveTextContent('admin');
      expect(screen.getByTestId('isAdmin')).toHaveTextContent('true');
      expect(screen.getByTestId('canCreateBooking')).toHaveTextContent('true');
    });
  });

  it('resolves church_leader role with booking permission', async () => {
    const mockUser = {
      uid: 'uid-2',
      email: 'leader@test.com',
      displayName: 'Church Leader',
      photoURL: null,
    };

    mockOnAuthStateChanged.mockImplementation((_auth: unknown, callback: (user: typeof mockUser) => void) => {
      callback(mockUser);
      return vi.fn();
    });

    mockOnSnapshot.mockImplementation((_ref: unknown, onNext: (snap: { exists: () => boolean; data: () => Record<string, unknown> }) => void) => {
      onNext({
        exists: () => true,
        data: () => ({ role: 'church_leader', email: 'leader@test.com', churchName: 'الكنيسة الأولى' }),
      });
      return vi.fn();
    });

    await act(async () => {
      render(
        <AuthProvider>
          <AuthConsumer />
        </AuthProvider>
      );
    });

    await waitFor(() => {
      expect(screen.getByTestId('role')).toHaveTextContent('church_leader');
      expect(screen.getByTestId('isChurchLeader')).toHaveTextContent('true');
      expect(screen.getByTestId('canCreateBooking')).toHaveTextContent('true');
    });
  });

  it('resolves servant role without booking permission', async () => {
    const mockUser = {
      uid: 'uid-3',
      email: 'servant@test.com',
      displayName: 'Servant',
      photoURL: null,
    };

    mockOnAuthStateChanged.mockImplementation((_auth: unknown, callback: (user: typeof mockUser) => void) => {
      callback(mockUser);
      return vi.fn();
    });

    mockOnSnapshot.mockImplementation((_ref: unknown, onNext: (snap: { exists: () => boolean; data: () => Record<string, unknown> }) => void) => {
      onNext({
        exists: () => true,
        data: () => ({ role: 'servant', email: 'servant@test.com' }),
      });
      return vi.fn();
    });

    await act(async () => {
      render(
        <AuthProvider>
          <AuthConsumer />
        </AuthProvider>
      );
    });

    await waitFor(() => {
      expect(screen.getByTestId('role')).toHaveTextContent('servant');
      expect(screen.getByTestId('isServant')).toHaveTextContent('true');
      expect(screen.getByTestId('canCreateBooking')).toHaveTextContent('false');
    });
  });

  it('resolves user role (team leader) without admin privileges', async () => {
    const mockUser = {
      uid: 'uid-4',
      email: 'user@test.com',
      displayName: 'Team Leader',
      photoURL: null,
    };

    mockOnAuthStateChanged.mockImplementation((_auth: unknown, callback: (user: typeof mockUser) => void) => {
      callback(mockUser);
      return vi.fn();
    });

    mockOnSnapshot.mockImplementation((_ref: unknown, onNext: (snap: { exists: () => boolean; data: () => Record<string, unknown> }) => void) => {
      onNext({
        exists: () => true,
        data: () => ({ role: 'user', email: 'user@test.com' }),
      });
      return vi.fn();
    });

    await act(async () => {
      render(
        <AuthProvider>
          <AuthConsumer />
        </AuthProvider>
      );
    });

    await waitFor(() => {
      expect(screen.getByTestId('role')).toHaveTextContent('user');
      expect(screen.getByTestId('isAdmin')).toHaveTextContent('false');
      expect(screen.getByTestId('isServant')).toHaveTextContent('false');
      expect(screen.getByTestId('isChurchLeader')).toHaveTextContent('false');
      expect(screen.getByTestId('canCreateBooking')).toHaveTextContent('false');
    });
  });

  it('shows error for unregistered users', async () => {
    const mockUser = {
      uid: 'uid-5',
      email: 'unknown@test.com',
      displayName: 'Unknown',
      photoURL: null,
    };

    mockOnAuthStateChanged.mockImplementation((_auth: unknown, callback: (user: typeof mockUser) => void) => {
      callback(mockUser);
      return vi.fn();
    });

    mockOnSnapshot.mockImplementation((_ref: unknown, onNext: (snap: { exists: () => boolean; data: () => null }) => void) => {
      onNext({
        exists: () => false,
        data: () => null,
      });
      return vi.fn();
    });

    await act(async () => {
      render(
        <AuthProvider>
          <AuthConsumer />
        </AuthProvider>
      );
    });

    await waitFor(() => {
      expect(screen.getByTestId('role')).toHaveTextContent('none');
      expect(screen.getByTestId('error')).not.toHaveTextContent('none');
    });
  });

  it('cleans up listeners on unmount', () => {
    const unsubAuth = vi.fn();
    const unsubSnapshot = vi.fn();

    mockOnAuthStateChanged.mockImplementation((_auth: unknown, callback: (user: { uid: string; email: string; displayName: string; photoURL: null }) => void) => {
      callback({ uid: '1', email: 'test@test.com', displayName: 'Test', photoURL: null });
      return unsubAuth;
    });

    mockOnSnapshot.mockImplementation(() => unsubSnapshot);

    const { unmount } = render(
      <AuthProvider>
        <AuthConsumer />
      </AuthProvider>
    );

    unmount();
    expect(unsubAuth).toHaveBeenCalled();
  });
});
