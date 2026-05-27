'use client';

import { useGlobalSettings } from '@/contexts/SettingsContext';

export function useSettings() {
  const { settings, loading, updateSettings, refreshSettings } = useGlobalSettings();

  return {
    settings,
    loading,
    updateSettings,
    refreshSettings,
  };
}
