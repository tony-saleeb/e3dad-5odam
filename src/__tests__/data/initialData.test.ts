import { describe, it, expect } from 'vitest';
import { churches, timePeriods, ALLOWED_DAYS, getDateRange } from '@/data/initialData';

describe('initialData - churches', () => {
  it('exports an array of churches', () => {
    expect(Array.isArray(churches)).toBe(true);
    expect(churches.length).toBeGreaterThan(0);
  });

  it('contains expected church names', () => {
    expect(churches).toContain('العذراء بالفجالة');
    expect(churches).toContain('مارجرجس بالقللى');
  });
});

describe('initialData - timePeriods', () => {
  it('exports an array of time periods', () => {
    expect(Array.isArray(timePeriods)).toBe(true);
    expect(timePeriods.length).toBe(3);
  });

  it('each time period has required fields', () => {
    timePeriods.forEach((period) => {
      expect(period).toHaveProperty('id');
      expect(period).toHaveProperty('label');
      expect(period).toHaveProperty('startTime');
      expect(period).toHaveProperty('endTime');
    });
  });
});

describe('initialData - restrictions', () => {
  it('exports allowed days of week', () => {
    expect(Array.isArray(ALLOWED_DAYS)).toBe(true);
    expect(ALLOWED_DAYS).toEqual([0, 1, 2, 3]);
  });

  it('getDateRange returns correct start and end bounds', () => {
    const range = getDateRange(6, 8);
    expect(range.start.getMonth()).toBe(6);
    expect(range.start.getDate()).toBe(1);
    
    // end of September should be 30th
    expect(range.end.getMonth()).toBe(8);
    expect(range.end.getDate()).toBe(30);
  });
});
