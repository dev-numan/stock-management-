import { format } from 'date-fns';
import { enUS } from 'date-fns/locale';
import { getT } from '../stores/languageStore';

export const formatDate = (date) => {
  if (!date) return '';
  return format(new Date(date), 'dd/MM/yyyy');
};

export const formatDateTime = (date) => {
  if (!date) return '';
  return format(new Date(date), 'dd/MM/yyyy h:mm a');
};

/** Receipts & share image: always English, e.g. Sun 11 may, 2026 11:55 Pm */
export const formatReceiptDateTime = (date) => {
  if (!date) return '';
  const d = new Date(date);
  const dayName = format(d, 'EEE', { locale: enUS });
  const day = format(d, 'd', { locale: enUS });
  const month = format(d, 'MMM', { locale: enUS }).toLowerCase();
  const year = format(d, 'yyyy', { locale: enUS });
  const time = format(d, 'h:mm', { locale: enUS });
  const ampm = format(d, 'a', { locale: enUS });
  const ampmLabel = ampm.charAt(0) + ampm.slice(1).toLowerCase();
  return `${dayName} ${day} ${month}, ${year} ${time} ${ampmLabel}`;
};

/** Device-local period bounds as ISO (matches on-screen dd/MM/yyyy). */
export const localPeriodBounds = (start, end) => ({
  from: start.toISOString(),
  to: end.toISOString(),
});

/** month: 1–12 */
export const getMonthDateRange = (year, month) =>
  localPeriodBounds(
    new Date(year, month - 1, 1, 0, 0, 0, 0),
    new Date(year, month, 0, 23, 59, 59, 999)
  );

export const MONTH_KEY_IDS = [
  'months.jan', 'months.feb', 'months.mar', 'months.apr', 'months.may', 'months.jun',
  'months.jul', 'months.aug', 'months.sep', 'months.oct', 'months.nov', 'months.dec',
];

/** @deprecated Use getMonthName(month - 1) for i18n */
export const MONTH_NAMES = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

/** @param {number} monthIndex 0–11 */
export const getMonthName = (monthIndex) => {
  const t = getT();
  return t(MONTH_KEY_IDS[monthIndex] ?? MONTH_KEY_IDS[0]);
};

export const getYearDateRange = (year) =>
  localPeriodBounds(
    new Date(year, 0, 1, 0, 0, 0, 0),
    new Date(year, 11, 31, 23, 59, 59, 999)
  );

/** day: 1–31 */
export const getDayDateRange = (year, month, day) =>
  localPeriodBounds(
    new Date(year, month - 1, day, 0, 0, 0, 0),
    new Date(year, month - 1, day, 23, 59, 59, 999)
  );

/** Sales trend: last 5 calendar years ending at endYear. */
export const getTrendYearRange = (endYear) => {
  const start = getYearDateRange(endYear - 4);
  const end = getYearDateRange(endYear);
  return { from: start.from, to: end.to };
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
  const t = getT();
  if (mode === 'all') return t('period.allTime');
  if (mode === 'year') return t('period.yearLabel', { year });
  if (mode === 'day') {
    return t('period.dayLabel', {
      day,
      month: getMonthName(month - 1),
      year,
    });
  }
  return t('period.monthLabel', { month: getMonthName(month - 1), year });
};

export const isInstantInLocalRange = (date, from, to) => {
  if (!date) return false;
  const t = new Date(date).getTime();
  if (from && t < new Date(from).getTime()) return false;
  if (to && t > new Date(to).getTime()) return false;
  return true;
};

/** @param {'day'|'month'|'year'|'all'} mode */
export const isDateInPeriod = (date, mode, year, month, day = 1) => {
  if (mode === 'all' || !date) return true;
  if (mode === 'year') {
    const { from, to } = getYearDateRange(year);
    return isInstantInLocalRange(date, from, to);
  }
  if (mode === 'day') {
    const { from, to } = getDayDateRange(year, month, day);
    return isInstantInLocalRange(date, from, to);
  }
  const { from, to } = getMonthDateRange(year, month);
  return isInstantInLocalRange(date, from, to);
};
