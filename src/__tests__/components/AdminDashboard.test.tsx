import { describe, it, expect, vi } from 'vitest';
import AdminDashboard from '@/components/AdminDashboard';

// Simple test to verify component exports correctly
describe('AdminDashboard', () => {
  it('exports as a function component', () => {
    expect(typeof AdminDashboard).toBe('function');
  });

  it('has correct display name', () => {
    expect(AdminDashboard.name).toBe('AdminDashboard');
  });
});
