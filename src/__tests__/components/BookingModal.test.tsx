import { describe, it, expect, vi } from 'vitest';
import BookingModal from '@/components/BookingModal';

// Simple test to verify component exports correctly
describe('BookingModal', () => {
  it('exports as a function component', () => {
    expect(typeof BookingModal).toBe('function');
  });

  it('has correct display name', () => {
    expect(BookingModal.name).toBe('BookingModal');
  });
});
