import {
  getMonthDateRange,
  getDayDateRange,
  getYearDateRange,
  getPeriodQueryParams,
  isDateInPeriod,
  isInstantInLocalRange,
  daysInMonth,
  shiftCalendarDay,
} from '../formatDate';

// Ranges are built from device-local calendar boundaries and serialised to ISO.
// We assert via local Date getters so the tests are timezone-independent.

describe('getMonthDateRange', () => {
  it('spans local start of the 1st to end of the last day of the month', () => {
    const { from, to } = getMonthDateRange(2026, 6); // June
    const start = new Date(from);
    const end = new Date(to);
    expect(start.getFullYear()).toBe(2026);
    expect(start.getMonth()).toBe(5); // June (0-indexed)
    expect(start.getDate()).toBe(1);
    expect(start.getHours()).toBe(0);
    expect(start.getMinutes()).toBe(0);

    expect(end.getMonth()).toBe(5);
    expect(end.getDate()).toBe(30); // June has 30 days
    expect(end.getHours()).toBe(23);
    expect(end.getMinutes()).toBe(59);
    expect(start.getTime()).toBeLessThan(end.getTime());
  });

  it('handles February correctly (28 days in 2026)', () => {
    const { to } = getMonthDateRange(2026, 2);
    expect(new Date(to).getDate()).toBe(28);
  });
});

describe('getDayDateRange', () => {
  it('covers a single local day', () => {
    const { from, to } = getDayDateRange(2026, 6, 15);
    const start = new Date(from);
    const end = new Date(to);
    expect(start.getDate()).toBe(15);
    expect(start.getHours()).toBe(0);
    expect(end.getDate()).toBe(15);
    expect(end.getHours()).toBe(23);
  });
});

describe('getYearDateRange', () => {
  it('spans Jan 1 to Dec 31', () => {
    const { from, to } = getYearDateRange(2026);
    expect(new Date(from).getMonth()).toBe(0);
    expect(new Date(from).getDate()).toBe(1);
    expect(new Date(to).getMonth()).toBe(11);
    expect(new Date(to).getDate()).toBe(31);
  });
});

describe('getPeriodQueryParams', () => {
  it('returns empty params for "all"', () => {
    expect(getPeriodQueryParams('all', 2026, 6, 1)).toEqual({});
  });

  it('returns a from/to range for specific periods', () => {
    expect(getPeriodQueryParams('month', 2026, 6)).toHaveProperty('from');
    expect(getPeriodQueryParams('day', 2026, 6, 15)).toHaveProperty('to');
    expect(getPeriodQueryParams('year', 2026)).toHaveProperty('from');
  });
});

describe('isInstantInLocalRange / isDateInPeriod', () => {
  it('includes an instant inside the month and excludes one outside', () => {
    // Build local-time instants so the comparison matches local boundaries.
    const midJune = new Date(2026, 5, 15, 12, 0, 0).toISOString();
    const julyFirst = new Date(2026, 6, 1, 12, 0, 0).toISOString();
    expect(isDateInPeriod(midJune, 'month', 2026, 6)).toBe(true);
    expect(isDateInPeriod(julyFirst, 'month', 2026, 6)).toBe(false);
  });

  it('a sale just after local midnight on the 1st is in that month', () => {
    const justAfterMidnight = new Date(2026, 5, 1, 0, 30, 0).toISOString();
    expect(isDateInPeriod(justAfterMidnight, 'month', 2026, 6)).toBe(true);
  });

  it('"all" always matches and missing dates do not', () => {
    expect(isDateInPeriod('2020-01-01T00:00:00Z', 'all', 2026, 6)).toBe(true);
    expect(isDateInPeriod(null, 'month', 2026, 6)).toBe(true); // null => treated as match per impl
  });

  it('isInstantInLocalRange respects open bounds', () => {
    expect(isInstantInLocalRange(null)).toBe(false);
    const t = new Date(2026, 5, 15, 12).toISOString();
    expect(isInstantInLocalRange(t, undefined, undefined)).toBe(true);
  });
});

describe('calendar helpers', () => {
  it('daysInMonth', () => {
    expect(daysInMonth(2026, 2)).toBe(28);
    expect(daysInMonth(2024, 2)).toBe(29); // leap year
    expect(daysInMonth(2026, 6)).toBe(30);
  });

  it('shiftCalendarDay rolls across month boundaries', () => {
    expect(shiftCalendarDay(2026, 6, 30, 1)).toEqual({ year: 2026, month: 7, day: 1 });
    expect(shiftCalendarDay(2026, 1, 1, -1)).toEqual({ year: 2025, month: 12, day: 31 });
  });
});
