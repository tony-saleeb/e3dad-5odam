import { describe, it, expect } from 'vitest';
import Header from '@/components/Header';

describe('Header', () => {
  it('exports as a function component', () => {
    expect(typeof Header).toBe('function');
  });

  it('has correct display name', () => {
    expect(Header.name).toBe('Header');
  });
});
