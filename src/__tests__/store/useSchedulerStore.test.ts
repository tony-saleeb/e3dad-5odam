import { describe, it, expect, beforeEach } from 'vitest';
import { act } from '@testing-library/react';
import { useSchedulerStore } from '@/store/useSchedulerStore';
import { format } from 'date-fns';

describe('useSchedulerStore', () => {
  beforeEach(() => {
    // Reset store state before each test
    useSchedulerStore.setState({
      selectedDate: format(new Date(), 'yyyy-MM-dd'),
      currentMonth: new Date(),
      isBookingModalOpen: false,
      isAdminPanelOpen: false,
      isAdminDashboardOpen: false,
      isEventModalOpen: false,
      selectedEvent: null,
    });
  });

  it('has initial selectedDate as today', () => {
    const store = useSchedulerStore.getState();
    const today = format(new Date(), 'yyyy-MM-dd');
    expect(store.selectedDate).toBe(today);
  });

  it('has initial isBookingModalOpen as false', () => {
    const store = useSchedulerStore.getState();
    expect(store.isBookingModalOpen).toBe(false);
  });

  it('setSelectedDate updates the date', () => {
    act(() => {
      useSchedulerStore.getState().setSelectedDate('2026-01-20');
    });
    
    expect(useSchedulerStore.getState().selectedDate).toBe('2026-01-20');
  });

  it('openBookingModal sets isBookingModalOpen to true', () => {
    act(() => {
      useSchedulerStore.getState().openBookingModal();
    });
    
    expect(useSchedulerStore.getState().isBookingModalOpen).toBe(true);
  });

  it('closeBookingModal sets isBookingModalOpen to false', () => {
    act(() => {
      useSchedulerStore.getState().openBookingModal();
    });
    
    act(() => {
      useSchedulerStore.getState().closeBookingModal();
    });
    
    expect(useSchedulerStore.getState().isBookingModalOpen).toBe(false);
  });

  it('openAdminPanel sets isAdminPanelOpen to true', () => {
    act(() => {
      useSchedulerStore.getState().openAdminPanel();
    });
    
    expect(useSchedulerStore.getState().isAdminPanelOpen).toBe(true);
  });

  it('openAdminDashboard sets isAdminDashboardOpen to true', () => {
    act(() => {
      useSchedulerStore.getState().openAdminDashboard();
    });
    
    expect(useSchedulerStore.getState().isAdminDashboardOpen).toBe(true);
  });

  it('openEventModal sets event and isEventModalOpen', () => {
    const mockEvent = {
      id: '1',
      title: 'Test',
      date: '2026-01-15',
      startTime: '10:00',
      endTime: '12:00',
      serviceId: 's1',
      roomId: 'r1',
      roomIds: ['r1'],
      status: 'approved' as const,
      requesterName: 'John',
      requesterEmail: 'john@test.com',
      createdAt: '2026-01-01T00:00:00.000Z',
    };
    
    act(() => {
      useSchedulerStore.getState().openEventModal(mockEvent);
    });
    
    const state = useSchedulerStore.getState();
    expect(state.isEventModalOpen).toBe(true);
    expect(state.selectedEvent).toEqual(mockEvent);
  });

  it('closeEventModal resets state', () => {
    const mockEvent = {
      id: '1',
      title: 'Test',
      date: '2026-01-15',
      startTime: '10:00',
      endTime: '12:00',
      serviceId: 's1',
      roomId: 'r1',
      roomIds: ['r1'],
      status: 'approved' as const,
      requesterName: 'John',
      requesterEmail: 'john@test.com',
      createdAt: '2026-01-01T00:00:00.000Z',
    };
    
    act(() => {
      useSchedulerStore.getState().openEventModal(mockEvent);
    });
    
    act(() => {
      useSchedulerStore.getState().closeEventModal();
    });
    
    const state = useSchedulerStore.getState();
    expect(state.isEventModalOpen).toBe(false);
    expect(state.selectedEvent).toBe(null);
  });
});
