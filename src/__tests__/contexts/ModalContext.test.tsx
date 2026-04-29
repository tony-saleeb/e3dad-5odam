import { describe, it, expect } from 'vitest';
import { ModalProvider, useModal } from '@/contexts/ModalContext';

describe('ModalContext', () => {
  it('exports ModalProvider', () => {
    expect(typeof ModalProvider).toBe('function');
  });

  it('exports useModal hook', () => {
    expect(typeof useModal).toBe('function');
  });
});
