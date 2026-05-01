'use client';

import { createContext, useContext, ReactNode, useState, useEffect } from 'react';
import { onAuthStateChanged, signInWithPopup, signOut as firebaseSignOut, User } from 'firebase/auth';
import { auth, googleProvider } from '@/lib/firebase';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';

export interface UserData {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  role: 'admin' | 'user';
}

interface AuthContextType {
  user: UserData | null;
  loading: boolean;
  isAdmin: boolean;
  canCreateBooking: boolean;
  canSeePending: boolean;
  authError: string | null;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Admin emails from env variable (comma-separated)
const ADMIN_EMAILS = (process.env.NEXT_PUBLIC_ADMIN_EMAILS || '')
  .split(',')
  .map(e => e.trim().toLowerCase())
  .filter(Boolean);

async function getUserRole(email: string): Promise<'admin' | 'user' | null> {
  const lowerEmail = email.toLowerCase();

  // Check if hardcoded admin
  if (ADMIN_EMAILS.includes(lowerEmail)) return 'admin';

  // Check allowed_users table in Supabase
  if (!isSupabaseConfigured) return null;

  const { data, error } = await supabase
    .from('allowed_users')
    .select('role')
    .eq('email', lowerEmail)
    .single();

  if (error || !data) return null;
  return data.role as 'admin' | 'user';
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser: User | null) => {
      if (!firebaseUser) {
        setUser(null);
        setLoading(false);
        return;
      }

      const email = firebaseUser.email || '';
      const role = await getUserRole(email);

      if (!role) {
        // Not authorized — sign out immediately
        await firebaseSignOut(auth);
        setAuthError('هذا البريد الإلكتروني غير مصرح له بالدخول. يرجى التواصل مع المسؤول.');
        setUser(null);
        setLoading(false);
        return;
      }

      setAuthError(null);
      setUser({
        uid: firebaseUser.uid,
        email: firebaseUser.email,
        displayName: firebaseUser.displayName,
        photoURL: firebaseUser.photoURL,
        role,
      });
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const signInWithGoogle = async () => {
    setLoading(true);
    setAuthError(null);
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error: any) {
      setAuthError('فشل تسجيل الدخول. يرجى المحاولة مرة أخرى.');
      setLoading(false);
    }
  };

  const signOut = async () => {
    await firebaseSignOut(auth);
    setUser(null);
  };

  const isAdmin = user?.role === 'admin';

  const value: AuthContextType = {
    user,
    loading,
    isAdmin,
    canCreateBooking: !!user,
    canSeePending: isAdmin,
    authError,
    signInWithGoogle,
    signOut,
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
