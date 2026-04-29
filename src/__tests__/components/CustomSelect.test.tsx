import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import CustomSelect from '@/components/CustomSelect';

describe('CustomSelect', () => {
  const mockOnChange = vi.fn();
  const defaultOptions = [
    { value: 'opt1', label: 'Option 1' },
    { value: 'opt2', label: 'Option 2', color: '#10B981' },
  ];

  beforeEach(() => {
    mockOnChange.mockClear();
  });

  it('renders with placeholder', () => {
    render(
      <CustomSelect
        options={defaultOptions}
        value=""
        onChange={mockOnChange}
        placeholder="Select..."
      />
    );
    
    expect(screen.getByText('Select...')).toBeInTheDocument();
  });

  it('shows selected option', () => {
    render(
      <CustomSelect
        options={defaultOptions}
        value="opt1"
        onChange={mockOnChange}
      />
    );
    
    expect(screen.getByText('Option 1')).toBeInTheDocument();
  });

  it('opens dropdown on click', () => {
    render(
      <CustomSelect
        options={defaultOptions}
        value=""
        onChange={mockOnChange}
      />
    );
    
    const button = screen.getByRole('button');
    fireEvent.click(button);
    
    expect(screen.getByText('Option 1')).toBeInTheDocument();
    expect(screen.getByText('Option 2')).toBeInTheDocument();
  });

  it('calls onChange when option is selected', () => {
    render(
      <CustomSelect
        options={defaultOptions}
        value=""
        onChange={mockOnChange}
      />
    );
    
    const trigger = screen.getByRole('button');
    fireEvent.click(trigger);
    
    const option = screen.getByText('Option 1');
    fireEvent.click(option);
    
    expect(mockOnChange).toHaveBeenCalledWith('opt1');
  });

  it('closes on escape key', () => {
    render(
      <CustomSelect
        options={defaultOptions}
        value=""
        onChange={mockOnChange}
      />
    );
    
    const trigger = screen.getByRole('button');
    fireEvent.click(trigger);
    
    fireEvent.keyDown(document, { key: 'Escape' });
    
    // Dropdown should be closed (options not visible as separate buttons)
    const buttons = screen.getAllByRole('button');
    expect(buttons.length).toBe(1); // Only trigger button
  });
});
