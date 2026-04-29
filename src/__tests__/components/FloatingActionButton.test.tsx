import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import FloatingActionButton from '@/components/FloatingActionButton';

const mockOpenBookingModal = vi.fn();

vi.mock('@/store/useSchedulerStore', () => ({
  useSchedulerStore: vi.fn(() => ({
    openBookingModal: mockOpenBookingModal,
  })),
}));

describe('FloatingActionButton', () => {
  beforeEach(() => {
    mockOpenBookingModal.mockClear();
  });

  it('renders the button', () => {
    render(<FloatingActionButton />);
    
    const button = screen.getByRole('button');
    expect(button).toBeInTheDocument();
  });

  it('has correct styling classes', () => {
    render(<FloatingActionButton />);
    
    const button = screen.getByRole('button');
    expect(button).toHaveClass('fixed');
  });

  it('calls openBookingModal on click', () => {
    render(<FloatingActionButton />);
    
    const button = screen.getByRole('button');
    fireEvent.click(button);
    
    expect(mockOpenBookingModal).toHaveBeenCalled();
  });

  it('contains SVG icon', () => {
    const { container } = render(<FloatingActionButton />);
    
    const svg = container.querySelector('svg');
    expect(svg).toBeInTheDocument();
  });
});
