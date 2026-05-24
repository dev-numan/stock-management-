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

/** @param {'month'|'year'|'all'} mode */
export const getPeriodQueryParams = (mode, year, month) => {
  if (mode === 'all') return {};
  if (mode === 'year') return getYearDateRange(year);
  return getMonthDateRange(year, month);
};

/** @param {'month'|'year'|'all'} mode */
export const getPeriodLabel = (mode, year, month) => {
  if (mode === 'all') return 'All time';
  if (mode === 'year') return `Year ${year}`;
  return `${MONTH_NAMES[month - 1]} ${year}`;
};

/** @param {'month'|'year'|'all'} mode */
export const isDateInPeriod = (date, mode, year, month) => {
  if (mode === 'all' || !date) return true;
  const d = new Date(date);
  if (mode === 'year') return d.getFullYear() === year;
  return d.getFullYear() === year && d.getMonth() + 1 === month;
};
