'use client';

import { useState, useEffect, useCallback } from 'react';
import { doc, getDocs, collection, setDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
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

  const fetchSettings = useCallback(async () => {
    try {
      const querySnapshot = await getDocs(collection(db, 'settings'));
      
      if (!querySnapshot.empty) {
        const newSettings = { ...defaultSettings };
        querySnapshot.forEach((doc) => {
          const data = doc.data();
          if (doc.id === 'time_periods') newSettings.timePeriods = data.value;
          if (doc.id === 'booking_range') newSettings.bookingRange = data.value;
        });
        setSettings(newSettings);
      }
    } catch (err) {
      console.error('Error fetching settings:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  const updateSettings = async (key: 'time_periods' | 'booking_range', value: any) => {
    try {
      await setDoc(doc(db, 'settings', key), {
        value,
        updatedAt: new Date().toISOString()
      });
      await fetchSettings();
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
