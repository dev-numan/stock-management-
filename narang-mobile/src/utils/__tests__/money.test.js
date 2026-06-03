import { roundMoney, safeNumber, sumMoney } from '../money';

describe('safeNumber', () => {
  it('returns finite numbers unchanged', () => {
    expect(safeNumber(12.34)).toBe(12.34);
    expect(safeNumber('56.78')).toBe(56.78);
    expect(safeNumber(0)).toBe(0);
  });

  it('falls back to 0 for non-numeric input', () => {
    expect(safeNumber(undefined)).toBe(0);
    expect(safeNumber(null)).toBe(0);
    expect(safeNumber('abc')).toBe(0);
    expect(safeNumber(NaN)).toBe(0);
    expect(safeNumber(Infinity)).toBe(0);
  });
});

describe('roundMoney', () => {
  it('rounds to 2 decimal places', () => {
    expect(roundMoney(333.33333)).toBe(333.33);
    expect(roundMoney(0.1 + 0.2)).toBe(0.3); // classic float drift
    expect(roundMoney(1000 / 3)).toBe(333.33);
    expect(roundMoney(2 / 3)).toBe(0.67);
  });

  it('rounds half up at the paisa boundary', () => {
    expect(roundMoney(1.005)).toBe(1.01);
    expect(roundMoney(2.675)).toBe(2.68);
  });

  it('is NaN-safe', () => {
    expect(roundMoney(undefined)).toBe(0);
    expect(roundMoney('xyz')).toBe(0);
  });

  it('leaves clean values intact', () => {
    expect(roundMoney(1000)).toBe(1000);
    expect(roundMoney(49.5)).toBe(49.5);
  });
});

describe('sumMoney', () => {
  it('sums to a rounded total without float drift', () => {
    expect(sumMoney([0.1, 0.2])).toBe(0.3);
    expect(sumMoney([333.33, 333.33, 333.34])).toBe(1000);
  });

  it('ignores non-numeric entries instead of producing NaN', () => {
    expect(sumMoney([100, undefined, '50', null])).toBe(150);
  });

  it('returns 0 for empty input', () => {
    expect(sumMoney([])).toBe(0);
  });
});
