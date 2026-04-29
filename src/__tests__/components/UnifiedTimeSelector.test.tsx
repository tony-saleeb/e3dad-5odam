import { describe, it, expect, vi } from 'vitest';
import UnifiedTimeSelector from '@/components/UnifiedTimeSelector';

describe('UnifiedTimeSelector', () => {
  it('exports as a function component', () => {
    expect(typeof UnifiedTimeSelector).toBe('function');
  });

  it('has correct display name', () => {
    expect(UnifiedTimeSelector.name).toBe('UnifiedTimeSelector');
  });
});
