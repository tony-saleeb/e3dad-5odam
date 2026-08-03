'use client';

import { createContext, useContext, useState, useEffect, useCallback, ReactNode, useRef } from 'react';
import { db } from '@/lib/firebase';
import { doc, setDoc, onSnapshot } from 'firebase/firestore';
import { AppSettings, EvaluationField } from '@/types';
import { timePeriods as defaultTimePeriods, ALLOWED_DAYS } from '@/data/initialData';

const defaultEvaluationFields: EvaluationField[] = [
  { id: 'eval-1', name: 'الالتزام بالوقت والحضور', maxMark: 10 },
  { id: 'eval-2', name: 'التعاون والروح الرياضية', maxMark: 10 },
  { id: 'eval-3', name: 'الابتكار وجودة الفكرة', maxMark: 10 },
  { id: 'eval-4', name: 'طريقة العرض والتقديم', maxMark: 10 },
];

const defaultSettings: AppSettings = {
  timePeriods: defaultTimePeriods,
  bookingRange: {
    startMonth: 6, // July
    endMonth: 8,   // September
    allowedDays: ALLOWED_DAYS,
    excludedDates: [],
  },
  teamMemberLimits: {
    min: 3,
    max: 20,
  },
  allowUserCancellation: true,
  evaluationFields: defaultEvaluationFields,
};

interface SettingsContextType {
  settings: AppSettings;
  loading: boolean;
  updateSettings: (
    key: 'time_periods' | 'booking_range' | 'team_member_limits' | 'allow_user_cancellation' | 'evaluation_fields',
    value: unknown
  ) => Promise<boolean>;
  refreshSettings: () => Promise<void>;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<AppSettings>(defaultSettings);
  const [loading, setLoading] = useState(true);

  const loadedKeysRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    const markLoaded = (key: string) => {
      loadedKeysRef.current.add(key);
      if (loadedKeysRef.current.size === 5) {
        setLoading(false);
      }
    };

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
        markLoaded('time_periods');
      },
      (err) => {
        console.error('Error listening to time_periods:', err);
        markLoaded('time_periods');
      }
    );

    // Listen to booking_range document
    const unsubscribeBR = onSnapshot(
      doc(db, 'settings', 'booking_range'),
      (snap) => {
        const val = snap.exists() ? snap.data().value : defaultSettings.bookingRange;
        const normalizedRange = val ? {
          ...val,
          excludedDates: Array.isArray(val.excludedDates) ? val.excludedDates : []
        } : defaultSettings.bookingRange;
        setSettings(prev => ({
          ...prev,
          bookingRange: normalizedRange,
        }));
        markLoaded('booking_range');
      },
      (err) => {
        console.error('Error listening to booking_range:', err);
        markLoaded('booking_range');
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
        markLoaded('team_member_limits');
      },
      (err) => {
        console.error('Error listening to team_member_limits:', err);
        markLoaded('team_member_limits');
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
        markLoaded('allow_user_cancellation');
      },
      (err) => {
        console.error('Error listening to allow_user_cancellation:', err);
        markLoaded('allow_user_cancellation');
      }
    );

    // Listen to evaluation_fields document
    const unsubscribeEF = onSnapshot(
      doc(db, 'settings', 'evaluation_fields'),
      (snap) => {
        const val = snap.exists() ? snap.data().value : defaultEvaluationFields;
        setSettings(prev => ({
          ...prev,
          evaluationFields: val || defaultEvaluationFields,
        }));
        markLoaded('evaluation_fields');
      },
      (err) => {
        console.error('Error listening to evaluation_fields:', err);
        markLoaded('evaluation_fields');
      }
    );

    return () => {
      unsubscribeTP();
      unsubscribeBR();
      unsubscribeTML();
      unsubscribeAUC();
      unsubscribeEF();
    };
  }, []);

  const updateSettings = async (
    key: 'time_periods' | 'booking_range' | 'team_member_limits' | 'allow_user_cancellation' | 'evaluation_fields',
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
