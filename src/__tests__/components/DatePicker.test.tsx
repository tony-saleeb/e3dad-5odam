import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import DatePicker from '@/components/DatePicker';

describe('DatePicker', () => {
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
    expect(typeof DatePicker).toBe('function');
  });

  it('renders without crashing', () => {
    const { container } = render(
      <DatePicker selectedDate="2026-01-15" onSelectDate={mockOnSelectDate} />
    );
    expect(container).toBeDefined();
  });

  it('shows go to today button', () => {
    render(
      <DatePicker selectedDate="2026-01-15" onSelectDate={mockOnSelectDate} />
    );
    
    expect(screen.getByText('الذهاب لليوم')).toBeInTheDocument();
  });

  it('calls onSelectDate when go to today is clicked', () => {
    render(
      <DatePicker selectedDate="2026-01-10" onSelectDate={mockOnSelectDate} />
    );
    
    const todayButton = screen.getByText('الذهاب لليوم');
    fireEvent.click(todayButton);
    
    expect(mockOnSelectDate).toHaveBeenCalled();
  });
});
