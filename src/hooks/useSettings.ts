'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
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
    if (!isSupabaseConfigured) {
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('settings')
        .select('*');

      if (error) throw error;

      if (data && data.length > 0) {
        const newSettings = { ...defaultSettings };
        data.forEach((row: any) => {
          if (row.key === 'time_periods') newSettings.timePeriods = row.value;
          if (row.key === 'booking_range') newSettings.bookingRange = row.value;
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
    if (!isSupabaseConfigured) return;

    try {
      const { error } = await supabase
        .from('settings')
        .upsert({ key, value, updated_at: new Date().toISOString() }, { onConflict: 'key' });

      if (error) throw error;
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
