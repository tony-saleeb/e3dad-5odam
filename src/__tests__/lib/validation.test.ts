import { describe, it, expect } from 'vitest';

// Extract the same validation patterns used in AdminDashboard Excel import
const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
const sanitizeName = (name: string) => name.replace(/<[^>]*>/g, '').trim();

describe('Email Validation', () => {
  it('accepts valid email addresses', () => {
    const valid = [
      'user@example.com',
      'john.doe@church.org',
      'leader+test@gmail.com',
      'name@sub.domain.co.uk',
      'user123@domain.com',
    ];
    valid.forEach(email => {
      expect(EMAIL_REGEX.test(email), `${email} should be valid`).toBe(true);
    });
  });

  it('rejects invalid email addresses', () => {
    const invalid = [
      '',
      'not-an-email',
      '@no-local-part.com',
      'user@',
      'user@.com',
      'user@ domain.com',
      'user@domain',
      'user@@domain.com',
      '<script>alert(1)</script>@domain.com',
    ];
    invalid.forEach(email => {
      expect(EMAIL_REGEX.test(email), `${email} should be invalid`).toBe(false);
    });
  });

  it('normalizes email to lowercase', () => {
    const email = 'John.Doe@Gmail.COM';
    expect(email.toLowerCase()).toBe('john.doe@gmail.com');
  });

  it('rejects emails with path traversal characters', () => {
    expect(EMAIL_REGEX.test('user/../admin@evil.com')).toBe(false);
  });
});

describe('Name Sanitization', () => {
  it('passes through clean names unchanged', () => {
    expect(sanitizeName('يوحنا')).toBe('يوحنا');
    expect(sanitizeName('Tony Saleeb')).toBe('Tony Saleeb');
    expect(sanitizeName('مريم عادل')).toBe('مريم عادل');
  });

  it('strips HTML tags', () => {
    expect(sanitizeName('<b>Bold Name</b>')).toBe('Bold Name');
    expect(sanitizeName('<script>alert("xss")</script>')).toBe('alert("xss")');
    expect(sanitizeName('Normal <img src=x onerror=alert(1)> Name')).toBe('Normal  Name');
  });

  it('strips nested HTML tags', () => {
    expect(sanitizeName('<div><span>Nested</span></div>')).toBe('Nested');
  });

  it('handles empty and whitespace strings', () => {
    expect(sanitizeName('')).toBe('');
    expect(sanitizeName('   ')).toBe('');
    expect(sanitizeName('  name  ')).toBe('name');
  });

  it('preserves special characters that are not HTML', () => {
    expect(sanitizeName("O'Brien")).toBe("O'Brien");
    expect(sanitizeName('Name & Co.')).toBe('Name & Co.');
    expect(sanitizeName('100% valid')).toBe('100% valid');
  });
});
