import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import InlineCalendar from '@/components/InlineCalendar';

describe('InlineCalendar', () => {
  const mockOnSelectDate = vi.fn();

  beforeEach(() => {
    mockOnSelectDate.mockClear();
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 0, 15));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('exports as a function component', () => {
    expect(typeof InlineCalendar).toBe('function');
  });

  it('renders the calendar', () => {
    const { container } = render(
      <InlineCalendar selectedDate="" onSelectDate={mockOnSelectDate} />
    );
    
    expect(container).toBeDefined();
  });

  it('calls onSelectDate when clicking a date', () => {
    render(
      <InlineCalendar selectedDate="" onSelectDate={mockOnSelectDate} />
    );
    
    const day20 = screen.getByRole('button', { name: '20' });
    fireEvent.click(day20);
    
    expect(mockOnSelectDate).toHaveBeenCalled();
  });
});
