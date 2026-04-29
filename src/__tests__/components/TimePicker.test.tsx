import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import TimePicker from '@/components/TimePicker';

describe('TimePicker', () => {
  const mockOnChange = vi.fn();

  beforeEach(() => {
    mockOnChange.mockClear();
  });

  it('renders with label', () => {
    render(
      <TimePicker
        label="وقت البداية"
        value=""
        onChange={mockOnChange}
      />
    );
    
    expect(screen.getByText('وقت البداية')).toBeInTheDocument();
  });

  it('shows placeholder when no time selected', () => {
    render(
      <TimePicker
        label="Test"
        value=""
        onChange={mockOnChange}
      />
    );
    
    expect(screen.getByText('Select time')).toBeInTheDocument();
  });

  it('displays selected time', () => {
    render(
      <TimePicker
        label="Test"
        value="10:00"
        onChange={mockOnChange}
      />
    );
    
    expect(screen.getByText('10:00 AM')).toBeInTheDocument();
  });

  it('opens dropdown on click', () => {
    render(
      <TimePicker
        label="Test"
        value=""
        onChange={mockOnChange}
      />
    );
    
    const button = screen.getByRole('button');
    fireEvent.click(button);
    
    // Should show quick select header
    expect(screen.getByText('Quick Select')).toBeInTheDocument();
  });
});
