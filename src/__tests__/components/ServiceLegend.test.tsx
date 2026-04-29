import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import ServiceLegend from '@/components/ServiceLegend';

vi.mock('@/data/initialData', () => ({
  services: [
    { id: 'service1', name: 'Service 1', color: '#10B981' },
    { id: 'service2', name: 'Service 2', color: '#3B82F6' },
  ],
}));

describe('ServiceLegend', () => {
  it('renders the component', () => {
    render(<ServiceLegend />);
    
    expect(screen.getByText('الخدمات')).toBeInTheDocument();
  });

  it('renders service names', () => {
    render(<ServiceLegend />);
    
    expect(screen.getByText('Service 1')).toBeInTheDocument();
    expect(screen.getByText('Service 2')).toBeInTheDocument();
  });

  it('renders status indicators', () => {
    render(<ServiceLegend />);
    
    expect(screen.getByText('موافق عليه')).toBeInTheDocument();
    expect(screen.getByText('قيد الانتظار')).toBeInTheDocument();
  });

  it('has RTL direction', () => {
    const { container } = render(<ServiceLegend />);
    
    const rtlContainer = container.querySelector('[dir="rtl"]');
    expect(rtlContainer).toBeInTheDocument();
  });
});
