import { describe, it, expect, vi } from 'vitest';
import TimeRangePicker from '@/components/TimeRangePicker';

describe('TimeRangePicker', () => {
  it('exports as a function component', () => {
    expect(typeof TimeRangePicker).toBe('function');
  });

  it('has correct display name', () => {
    expect(TimeRangePicker.name).toBe('TimeRangePicker');
  });
});
