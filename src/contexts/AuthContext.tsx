'use client';

import { createContext, useContext, ReactNode } from 'react';

// CHURCH ADAPTATION: Removed all actual auth, providing mock authorized user
interface UserData {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  role: 'admin' | 'servant' | 'user';
}

interface AuthContextType {
  user: UserData | null;
  loading: boolean;
  isAdmin: boolean;
  isServant: boolean;
  canCreateBooking: boolean;
  canSeePending: boolean;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// CHURCH ADAPTATION: Providing constant mock user
const MOCK_USER: UserData = {
  uid: 'church_admin',
  email: 'admin@church.org',
  displayName: 'قائد الخدمة',
  photoURL: null,
  role: 'admin',
};

export function AuthProvider({ children }: { children: ReactNode }) {

  const value = {
    user: MOCK_USER,
    loading: false,
    isAdmin: true,
    isServant: false,
    canCreateBooking: true,
    canSeePending: true,
    signInWithGoogle: async () => {},
    signOut: async () => {},
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
