import { formatCurrency, formatCurrencyCompact } from '../formatCurrency';

describe('formatCurrency', () => {
  it('shows whole numbers with no decimals', () => {
    expect(formatCurrency(50)).toBe('50');
    expect(formatCurrency(0)).toBe('0');
  });

  it('shows 2 decimals when the value is fractional', () => {
    expect(formatCurrency(1000.5)).toBe('1,000.50');
    expect(formatCurrency(333.33)).toBe('333.33');
  });

  it('caps fractional digits at 2', () => {
    expect(formatCurrency(333.333)).toBe('333.33');
  });

  it('treats null/undefined as 0', () => {
    expect(formatCurrency(null)).toBe('0');
    expect(formatCurrency(undefined)).toBe('0');
  });

  it('never renders NaN for bad input', () => {
    expect(formatCurrency('not-a-number')).toBe('0');
    expect(formatCurrency(NaN)).toBe('0');
  });
});

describe('formatCurrencyCompact', () => {
  it('abbreviates thousands and millions', () => {
    expect(formatCurrencyCompact(1500)).toBe('2K');
    expect(formatCurrencyCompact(1_200_000)).toBe('1.2M');
  });

  it('shows small numbers as-is', () => {
    expect(formatCurrencyCompact(750)).toBe('750');
  });

  it('is NaN-safe', () => {
    expect(formatCurrencyCompact('abc')).toBe('0');
  });
});
