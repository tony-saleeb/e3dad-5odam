import { describe, it, expect } from 'vitest';
import { services, rooms } from '@/data/initialData';

describe('initialData - services', () => {
  it('exports an array of services', () => {
    expect(Array.isArray(services)).toBe(true);
  });

  it('has services with required fields', () => {
    services.forEach((service) => {
      expect(service).toHaveProperty('id');
      expect(service).toHaveProperty('name');
      expect(service).toHaveProperty('color');
    });
  });

  it('each service has a unique id', () => {
    const ids = services.map((s) => s.id);
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(ids.length);
  });

  it('each service color is a valid hex color', () => {
    const hexColorRegex = /^#[0-9A-Fa-f]{6}$/;
    services.forEach((service) => {
      expect(service.color).toMatch(hexColorRegex);
    });
  });
});

describe('initialData - rooms', () => {
  it('exports an array of rooms', () => {
    expect(Array.isArray(rooms)).toBe(true);
  });

  it('each room has required fields', () => {
    rooms.forEach((room) => {
      expect(room).toHaveProperty('id');
      expect(room).toHaveProperty('name');
    });
  });

  it('each room has a unique id', () => {
    const ids = rooms.map((r) => r.id);
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(ids.length);
  });

  it('outside room requires custom location', () => {
    const outside = rooms.find((r) => r.id === 'outside');
    expect(outside).toBeDefined();
    expect(outside?.requiresCustomLocation).toBe(true);
  });
});
