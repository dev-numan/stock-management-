import { format } from 'date-fns';
import { formatCurrency } from '../../utils/formatCurrency';
import { SHOP_NAME, APP_NAME_URDU } from '../../constants/branding';

export const GREEN = '#2E7D32';
export const RED = '#C62828';
export const TEXT = '#222222';
export const MUTED = '#444444';
export const LABEL = '#333333';
export const FOOTER = '#444444';

export const esc = (value) =>
  String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

export const rs = (n) => `Rs ${formatCurrency(n)}`;

export const summaryCard = (label, value, valueColor, labelColor = TEXT) => `
  <div style="flex:1;text-align:center;padding:10px 6px;">
    <div style="font-size:18px;font-weight:bold;color:${valueColor};">${esc(value)}</div>
    <div style="font-size:12px;color:${labelColor};margin-top:4px;font-weight:700;">${esc(label)}</div>
  </div>`;

export const buildTableHead = (cols) =>
  cols
    .map(
      (col) =>
        `<th style="padding:8px 6px;font-size:11px;text-align:${col.align};color:${col.color || TEXT};font-weight:700;background:#eeeeee;border-bottom:2px solid #bbb;">${esc(col.label)}</th>`
    )
    .join('');

export const getReportMeta = (settings, locale) => {
  const isRtl = locale === 'ur';
  const now = new Date();
  return {
    isRtl,
    shopName: isRtl ? APP_NAME_URDU : SHOP_NAME,
    address: settings?.address?.trim() || '',
    phone: settings?.phone?.trim() || '',
    dateLabel: format(now, 'dd MMM yy'),
    reportStamp: `${format(now, 'h:mm a')} | ${format(now, 'dd MMM yy')}`,
  };
};

export const wrapReportHtml = ({
  locale,
  logoDataUri,
  shopName,
  address,
  phone,
  title,
  subtitle = '',
  dateLabel,
  summaryHtml = '',
  entriesLabel = '',
  tableSectionsHtml,
  reportStamp,
  t,
}) => {
  const isRtl = locale === 'ur';
  const dir = isRtl ? 'rtl' : 'ltr';
  const fontStack = isRtl
    ? "'Noto Nastaliq Urdu', 'Noto Sans Arabic', Arial, sans-serif"
    : 'Arial, Helvetica, sans-serif';

  return `
<!DOCTYPE html>
<html dir="${dir}" lang="${locale}">
<head>
  <meta charset="utf-8" />
  ${isRtl ? '<link href="https://fonts.googleapis.com/css2?family=Noto+Nastaliq+Urdu:wght@400;700&display=swap" rel="stylesheet" />' : ''}
  <style>
    @page { margin: 10mm; }
    body { font-family: ${fontStack}; color:${TEXT}; margin:0; }
    table { width:100%; border-collapse:collapse; }
    .section-break { page-break-before: auto; margin-top: 28px; }
  </style>
</head>
<body>
  <div style="text-align:center;border-bottom:3px solid ${GREEN};padding-bottom:14px;margin-bottom:16px;">
    ${logoDataUri ? `<img src="${logoDataUri}" alt="${esc(shopName)}" style="width:64px;height:64px;object-fit:contain;margin:0 auto 8px;display:block;" />` : ''}
    <h1 style="color:${GREEN};margin:0;font-size:22px;">${esc(shopName)}</h1>
    ${address ? `<div style="color:${MUTED};font-size:12px;margin-top:4px;font-weight:500;">${esc(address)}</div>` : ''}
    ${phone ? `<div style="color:${MUTED};font-size:12px;margin-top:2px;font-weight:500;">${esc(phone)}</div>` : ''}
    <div style="font-size:18px;font-weight:bold;margin-top:12px;color:${TEXT};">${esc(title)}</div>
    ${subtitle ? `<div style="font-size:14px;font-weight:600;margin-top:6px;color:${LABEL};">${esc(subtitle)}</div>` : ''}
    <div style="color:${MUTED};font-size:12px;margin-top:4px;font-weight:500;">${esc(t('partyReport.tillToday', { date: dateLabel }))}</div>
  </div>

  ${summaryHtml ? `<div style="display:flex;border:1px solid #ccc;border-radius:8px;margin-bottom:16px;">${summaryHtml}</div>` : ''}
  ${entriesLabel ? `<div style="text-align:center;color:${MUTED};font-size:12px;margin-bottom:14px;font-weight:600;">${esc(entriesLabel)}</div>` : ''}

  ${tableSectionsHtml}

  <div style="text-align:center;color:${FOOTER};font-size:11px;margin-top:24px;border-top:1px solid #ddd;padding-top:12px;font-weight:500;">
    <div>${esc(shopName)}${phone ? ` · ${esc(phone)}` : ''}</div>
    <div style="margin-top:4px;">${esc(t('partyReport.reportDate'))}: ${esc(reportStamp)}</div>
  </div>
</body>
</html>`;
};
