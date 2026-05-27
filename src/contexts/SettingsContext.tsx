'use client';

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { db } from '@/lib/firebase';
import { doc, setDoc, onSnapshot } from 'firebase/firestore';
import { AppSettings } from '@/types';
import { timePeriods as defaultTimePeriods, ALLOWED_DAYS } from '@/data/initialData';

const defaultSettings: AppSettings = {
  timePeriods: defaultTimePeriods,
  bookingRange: {
    startMonth: 6, // July
    endMonth: 8,   // September
    allowedDays: ALLOWED_DAYS,
  },
  teamMemberLimits: {
    min: 3,
    max: 20,
  },
  allowUserCancellation: true,
};

interface SettingsContextType {
  settings: AppSettings;
  loading: boolean;
  updateSettings: (
    key: 'time_periods' | 'booking_range' | 'team_member_limits' | 'allow_user_cancellation',
    value: unknown
  ) => Promise<boolean>;
  refreshSettings: () => Promise<void>;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<AppSettings>(defaultSettings);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Listen to time_periods document
    const unsubscribeTP = onSnapshot(
      doc(db, 'settings', 'time_periods'),
      (snap) => {
        if (snap.exists()) {
          const data = snap.data();
          setSettings(prev => ({
            ...prev,
            timePeriods: data.value || defaultTimePeriods,
          }));
        }
        setLoading(false);
      },
      (err) => {
        console.error('Error listening to time_periods:', err);
        setLoading(false);
      }
    );

    // Listen to booking_range document
    const unsubscribeBR = onSnapshot(
      doc(db, 'settings', 'booking_range'),
      (snap) => {
        const val = snap.exists() ? snap.data().value : defaultSettings.bookingRange;
        setSettings(prev => ({
          ...prev,
          bookingRange: val || defaultSettings.bookingRange,
        }));
      },
      (err) => {
        console.error('Error listening to booking_range:', err);
      }
    );

    // Listen to team_member_limits document
    const unsubscribeTML = onSnapshot(
      doc(db, 'settings', 'team_member_limits'),
      (snap) => {
        const val = snap.exists() ? snap.data().value : defaultSettings.teamMemberLimits;
        setSettings(prev => ({
          ...prev,
          teamMemberLimits: val || defaultSettings.teamMemberLimits,
        }));
      },
      (err) => {
        console.error('Error listening to team_member_limits:', err);
      }
    );

    // Listen to allow_user_cancellation document
    const unsubscribeAUC = onSnapshot(
      doc(db, 'settings', 'allow_user_cancellation'),
      (snap) => {
        const val = snap.exists() ? snap.data().value : defaultSettings.allowUserCancellation;
        setSettings(prev => ({
          ...prev,
          allowUserCancellation: val !== undefined ? !!val : defaultSettings.allowUserCancellation,
        }));
      },
      (err) => {
        console.error('Error listening to allow_user_cancellation:', err);
      }
    );

    return () => {
      unsubscribeTP();
      unsubscribeBR();
      unsubscribeTML();
      unsubscribeAUC();
    };
  }, []);

  const updateSettings = async (
    key: 'time_periods' | 'booking_range' | 'team_member_limits' | 'allow_user_cancellation',
    value: unknown
  ) => {
    try {
      await setDoc(doc(db, 'settings', key), {
        value,
        updated_at: new Date().toISOString(),
      });
      return true;
    } catch (err) {
      console.error('Error updating settings:', err);
      return false;
    }
  };

  const refreshSettings = useCallback(async () => {
    // handled by onSnapshot
  }, []);

  return (
    <SettingsContext.Provider value={{ settings, loading, updateSettings, refreshSettings }}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useGlobalSettings() {
  const context = useContext(SettingsContext);
  if (context === undefined) {
    throw new Error('useGlobalSettings must be used within a SettingsProvider');
  }
  return context;
}
