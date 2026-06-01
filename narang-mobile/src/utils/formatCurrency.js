export const formatCurrency = (amount) => {
  const num = Number(amount ?? 0);
  const hasDecimals = num % 1 !== 0;
  const formatted = num.toLocaleString('en-PK', {
    minimumFractionDigits: hasDecimals ? 2 : 0,
    maximumFractionDigits: 2,
  });
  return formatted;
};

/** Short label for chart axes (e.g. 1.2M, 45K) */
export const formatCurrencyCompact = (amount) => {
  const num = Number(amount ?? 0);
  if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(1)}M`;
  if (num >= 1_000) return `${(num / 1_000).toFixed(0)}K`;
  return String(Math.round(num));
};
