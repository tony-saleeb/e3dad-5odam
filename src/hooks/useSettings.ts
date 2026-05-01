'use client';

import { useState, useEffect, useCallback } from 'react';
import { db } from '@/lib/firebase';
import { doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';
import { AppSettings, TimePeriod } from '@/types';
import { timePeriods as defaultTimePeriods, ALLOWED_DAYS, getDateRange } from '@/data/initialData';

const defaultSettings: AppSettings = {
  timePeriods: defaultTimePeriods,
  bookingRange: {
    startMonth: 6, // July
    endMonth: 8,   // September
    allowedDays: ALLOWED_DAYS,
  }
};

export function useSettings() {
  const [settings, setSettings] = useState<AppSettings>(defaultSettings);
  const [loading, setLoading] = useState(true);

  // Real-time listener for settings
  useEffect(() => {
    // Listen to time_periods document
    const unsubTP = onSnapshot(
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
    const unsubBR = onSnapshot(
      doc(db, 'settings', 'booking_range'),
      (snap) => {
        if (snap.exists()) {
          const data = snap.data();
          setSettings(prev => ({
            ...prev,
            bookingRange: data.value || defaultSettings.bookingRange,
          }));
        }
      },
      (err) => {
        console.error('Error listening to booking_range:', err);
      }
    );

    return () => {
      unsubTP();
      unsubBR();
    };
  }, []);

  const fetchSettings = useCallback(async () => {
    // onSnapshot handles this — kept for interface compat
  }, []);

  const updateSettings = async (key: 'time_periods' | 'booking_range', value: any) => {
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

  return {
    settings,
    loading,
    updateSettings,
    refreshSettings: fetchSettings,
  };
}
