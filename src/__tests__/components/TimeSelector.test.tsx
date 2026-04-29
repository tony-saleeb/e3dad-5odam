import { describe, it, expect, vi } from 'vitest';
import TimeSelector from '@/components/TimeSelector';

describe('TimeSelector', () => {
  it('exports as a function component', () => {
    expect(typeof TimeSelector).toBe('function');
  });

  it('has correct display name', () => {
    expect(TimeSelector.name).toBe('TimeSelector');
  });
});
