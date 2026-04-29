// Zustand store for UI state only
// Data is now managed by Firebase hooks

import { create } from 'zustand';
import { format } from 'date-fns';
import { Booking } from '@/types';
// CHURCH ADAPTATION: Import date range helper
import { getDateRange } from '@/data/initialData';

interface SchedulerStore {
  // UI State
  selectedDate: string;
  selectedStartTime: string;
  selectedEndTime: string;
  currentMonth: Date;
  isBookingModalOpen: boolean;
  isAdminPanelOpen: boolean;
  isAdminDashboardOpen: boolean;
  isEventModalOpen: boolean;
  selectedEvent: Booking | null;

  // Actions
  setSelectedDate: (date: string) => void;
  setSelectedStartTime: (time: string) => void;
  setSelectedEndTime: (time: string) => void;
  setCurrentMonth: (date: Date) => void;
  openBookingModal: () => void;
  closeBookingModal: () => void;
  openAdminPanel: () => void;
  closeAdminPanel: () => void;
  openAdminDashboard: () => void;
  closeAdminDashboard: () => void;
  openEventModal: (event: Booking) => void;
  closeEventModal: () => void;
}

// CHURCH ADAPTATION: Initialize to the start of the allowed date range (July 1)
const dateRange = getDateRange();
const initialDate = dateRange.start;

export const useSchedulerStore = create<SchedulerStore>((set) => ({
  // Initial UI State
  // CHURCH ADAPTATION: Default to July 1 instead of today
  selectedDate: format(initialDate, 'yyyy-MM-dd'),
  selectedStartTime: '',
  selectedEndTime: '',
  currentMonth: initialDate,
  isBookingModalOpen: false,
  isAdminPanelOpen: false,
  isAdminDashboardOpen: false,
  isEventModalOpen: false,
  selectedEvent: null,

  // UI Actions
  setSelectedDate: (date) => set({ selectedDate: date }),
  setSelectedStartTime: (time) => set({ selectedStartTime: time }),
  setSelectedEndTime: (time) => set({ selectedEndTime: time }),
  setCurrentMonth: (date) => set({ currentMonth: date }),
  openBookingModal: () => set({ isBookingModalOpen: true }),
  closeBookingModal: () => set({ isBookingModalOpen: false }),
  openAdminPanel: () => set({ isAdminPanelOpen: true }),
  closeAdminPanel: () => set({ isAdminPanelOpen: false }),
  openAdminDashboard: () => set({ isAdminDashboardOpen: true }),
  closeAdminDashboard: () => set({ isAdminDashboardOpen: false }),
  openEventModal: (event) => set({ isEventModalOpen: true, selectedEvent: event }),
  closeEventModal: () => set({ isEventModalOpen: false, selectedEvent: null }),
}));
