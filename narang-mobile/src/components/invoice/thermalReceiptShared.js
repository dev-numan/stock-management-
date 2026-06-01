/** ~58mm thermal roll at print DPI (same width Sunmi bitmap uses). */
export const THERMAL_RECEIPT_WIDTH = 384;

export const RECEIPT_GREEN = '#2E7D32';
export const RECEIPT_MUTED = '#6B7280';
export const RECEIPT_BORDER = '#E5E7EB';

export const formatReceiptNum = (amount) => {
  const num = Number(amount ?? 0);
  return num.toLocaleString('en-PK', {
    minimumFractionDigits: num % 1 !== 0 ? 2 : 0,
    maximumFractionDigits: 2,
  });
};

export const getLineDiscount = (item) => Number(item?.discount ?? item?.lineDiscount ?? 0) || 0;

export const tableRow = {
  flexDirection: 'row',
  width: '100%',
  alignItems: 'center',
};
