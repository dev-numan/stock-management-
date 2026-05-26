import { format } from 'date-fns';

export const formatDate = (date) => {
  if (!date) return '';
  return format(new Date(date), 'dd/MM/yyyy');
};

export const formatDateTime = (date) => {
  if (!date) return '';
  return format(new Date(date), 'dd/MM/yyyy HH:mm');
};

/** month: 1–12 */
export const getMonthDateRange = (year, month) => {
  const from = new Date(year, month - 1, 1);
  const to = new Date(year, month, 0);
  return {
    from: format(from, 'yyyy-MM-dd'),
    to: format(to, 'yyyy-MM-dd'),
  };
};

export const MONTH_NAMES = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

export const getYearDateRange = (year) => ({
  from: `${year}-01-01`,
  to: `${year}-12-31`,
});

/** day: 1–31 */
export const getDayDateRange = (year, month, day) => {
  const dateStr = format(new Date(year, month - 1, day), 'yyyy-MM-dd');
  return { from: dateStr, to: dateStr };
};

export const daysInMonth = (year, month) => new Date(year, month, 0).getDate();

export const shiftCalendarDay = (year, month, day, delta) => {
  const d = new Date(year, month - 1, day + delta);
  return {
    year: d.getFullYear(),
    month: d.getMonth() + 1,
    day: d.getDate(),
  };
};

/** @param {'day'|'month'|'year'|'all'} mode */
export const getPeriodQueryParams = (mode, year, month, day = 1) => {
  if (mode === 'all') return {};
  if (mode === 'year') return getYearDateRange(year);
  if (mode === 'day') return getDayDateRange(year, month, day);
  return getMonthDateRange(year, month);
};

/** @param {'day'|'month'|'year'|'all'} mode */
export const getPeriodLabel = (mode, year, month, day = 1) => {
  if (mode === 'all') return 'All time';
  if (mode === 'year') return `Year ${year}`;
  if (mode === 'day') return `${day} ${MONTH_NAMES[month - 1]} ${year}`;
  return `${MONTH_NAMES[month - 1]} ${year}`;
};

/** @param {'day'|'month'|'year'|'all'} mode */
export const isDateInPeriod = (date, mode, year, month, day = 1) => {
  if (mode === 'all' || !date) return true;
  const d = new Date(date);
  if (mode === 'year') return d.getFullYear() === year;
  if (mode === 'day') {
    return (
      d.getFullYear() === year &&
      d.getMonth() + 1 === month &&
      d.getDate() === day
    );
  }
  return d.getFullYear() === year && d.getMonth() + 1 === month;
};
