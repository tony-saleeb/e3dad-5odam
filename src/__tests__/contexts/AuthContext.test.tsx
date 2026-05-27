import { describe, it, expect } from 'vitest';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';

describe('AuthContext', () => {
  it('exports AuthProvider', () => {
    expect(typeof AuthProvider).toBe('function');
  });

  it('exports useAuth hook', () => {
    expect(typeof useAuth).toBe('function');
  });
});
