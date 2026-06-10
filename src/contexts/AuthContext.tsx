'use client';

import { createContext, useContext, ReactNode, useState, useEffect } from 'react';
import { onAuthStateChanged, signInWithPopup, signOut as firebaseSignOut, User } from 'firebase/auth';
import { auth, googleProvider, db } from '@/lib/firebase';
import { doc, updateDoc, onSnapshot, setDoc } from 'firebase/firestore';
import { TeamMember } from '@/types';

export interface TeamDetails {
  churchName: string;
  teamName: string;
  title: string;
  ageGroup: string;
  teamMembers: TeamMember[];
}

export interface UserData {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  role: 'admin' | 'user' | 'servant' | 'church_leader';
  teamDetails: TeamDetails | null;
  churchName?: string; // For church_leader: which church they represent
}

interface AuthContextType {
  user: UserData | null;
  loading: boolean;
  isAdmin: boolean;
  isServant: boolean;
  isChurchLeader: boolean;
  canCreateBooking: boolean;
  canSeePending: boolean;
  authError: string | null;
  lastFailedEmail: string | null;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  updateTeamDetails: (details: TeamDetails) => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Admin emails from env variable (comma-separated)
const ADMIN_EMAILS = (process.env.NEXT_PUBLIC_ADMIN_EMAILS || '')
  .split(',')
  .map(e => e.trim().toLowerCase())
  .filter(Boolean);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);
  const [lastFailedEmail, setLastFailedEmail] = useState<string | null>(null);

  useEffect(() => {
    let unsubUserDoc: (() => void) | null = null;

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser: User | null) => {
      if (!firebaseUser) {
        setUser(null);
        if (unsubUserDoc) {
          unsubUserDoc();
          unsubUserDoc = null;
        }
        setLoading(false);
        return;
      }

      const email = (firebaseUser.email || '').toLowerCase();

      // Real-time listener for the user's allowed document
      unsubUserDoc = onSnapshot(
        doc(db, 'allowed_users', email),
        async (snap) => {
          if (!snap.exists()) {
            // Check hardcoded admin fallback
            const isHardcodedAdmin = ADMIN_EMAILS.includes(email);
            if (!isHardcodedAdmin) {
              setLastFailedEmail(email);
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
              role: 'admin',
              teamDetails: null,
            });
            setLoading(false);

            // Auto-provision allowed_users document in Firestore so security rules and lists work seamlessly
            try {
              await setDoc(doc(db, 'allowed_users', email), {
                email,
                name: firebaseUser.displayName || email.split('@')[0],
                role: 'admin',
                created_at: new Date().toISOString(),
              });
            } catch (err) {
              console.error('[Auth] Failed to auto-provision hardcoded admin doc:', err);
            }
            return;
          }

          const data = snap.data();
          setAuthError(null);
          setUser({
            uid: firebaseUser.uid,
            email: firebaseUser.email,
            displayName: firebaseUser.displayName,
            photoURL: firebaseUser.photoURL,
            role: data.role as 'admin' | 'user' | 'servant' | 'church_leader',
            teamDetails: data.teamDetails || null,
            churchName: data.churchName || undefined,
          });
          setLoading(false);
        },
        (err) => {
          console.error('[Auth] Firestore listener error:', err);
          setLoading(false);
        }
      );
    });

    return () => {
      unsubscribe();
      if (unsubUserDoc) unsubUserDoc();
    };
  }, []);

  const signInWithGoogle = async () => {
    setLoading(true);
    setAuthError(null);
    try {
      await signInWithPopup(auth, googleProvider);
    } catch {
      setAuthError('فشل تسجيل الدخول. يرجى المحاولة مرة أخرى.');
      setLoading(false);
    }
  };

  const signOut = async () => {
    await firebaseSignOut(auth);
    setUser(null);
  };

  const updateTeamDetails = async (details: TeamDetails) => {
    if (!user || !user.email) return false;
    try {
      const email = user.email.toLowerCase();
      await updateDoc(doc(db, 'allowed_users', email), {
        teamDetails: details,
        updated_at: new Date().toISOString(),
      });
      return true;
    } catch (err) {
      console.error('[Auth] Error updating team details:', err);
      return false;
    }
  };

  const isAdmin = user?.role === 'admin';
  const isServant = user?.role === 'servant';
  const isChurchLeader = user?.role === 'church_leader';

  const value: AuthContextType = {
    user,
    loading,
    isAdmin,
    isServant,
    isChurchLeader,
    canCreateBooking: user?.role === 'church_leader' || user?.role === 'admin',
    canSeePending: isAdmin,
    authError,
    lastFailedEmail,
    signInWithGoogle,
    signOut,
    updateTeamDetails,
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
