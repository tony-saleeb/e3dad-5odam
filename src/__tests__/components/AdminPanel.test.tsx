import { describe, it, expect, vi } from 'vitest';
import AdminPanel from '@/components/AdminPanel';

// Simple test to verify component exports correctly
describe('AdminPanel', () => {
  it('exports as a function component', () => {
    expect(typeof AdminPanel).toBe('function');
  });

  it('has correct display name', () => {
    expect(AdminPanel.name).toBe('AdminPanel');
  });
});
