import { format } from 'date-fns';
import { formatCurrency } from '../../utils/formatCurrency';
import { getEffectiveAdvanceBalance } from '../../utils/customerBalance';
import { computeCustomerLedgerTotals } from '../../utils/creditData';
import { computeSupplierBalanceTotals } from '../../utils/supplierLedger';
import { computeCombinedLedgerSummary } from '../../utils/partyLedgerTotals';
import { SHOP_NAME, APP_NAME_URDU } from '../../constants/branding';

const GREEN = '#2E7D32';
const RED = '#C62828';
const TEXT = '#222222';
const MUTED = '#444444';
const LABEL = '#333333';
const FOOTER = '#444444';

const esc = (value) =>
  String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

const rs = (n) => `Rs ${formatCurrency(n)}`;

const customerRow = (c) => {
  const balance = getEffectiveAdvanceBalance(c);
  return {
    name: c.name,
    phone: c.phone,
    youWillGet: balance < 0 ? Math.abs(balance) : 0,
    youWillGive: balance > 0 ? balance : 0,
  };
};

const supplierRow = (s) => {
  const balance = Number(s.payableBalance ?? 0);
  return {
    name: s.name,
    phone: s.phone,
    youWillGive: balance > 0 ? balance : 0,
    advance: balance < 0 ? Math.abs(balance) : 0,
  };
};

const summaryCard = (label, value, valueColor, labelColor = TEXT) => `
  <div style="flex:1;text-align:center;padding:10px 6px;">
    <div style="font-size:18px;font-weight:bold;color:${valueColor};">${esc(value)}</div>
    <div style="font-size:12px;color:${labelColor};margin-top:4px;font-weight:700;">${esc(label)}</div>
  </div>`;

const customerTableCols = (t, detailsLabel) => [
  { label: '#', align: 'center', color: TEXT },
  { label: detailsLabel, align: 'start', color: TEXT },
  { label: t('ledger.youWillGet'), align: 'end', color: RED },
  { label: t('ledger.youWillGive'), align: 'end', color: GREEN },
];

const supplierTableCols = (t, detailsLabel) => [
  { label: '#', align: 'center', color: TEXT },
  { label: detailsLabel, align: 'start', color: TEXT },
  { label: t('ledger.youWillGive'), align: 'end', color: GREEN },
  { label: t('partyReport.advance'), align: 'end', color: RED },
];

const buildTableHead = (cols) =>
  cols
    .map(
      (col) =>
        `<th style="padding:8px 6px;font-size:11px;text-align:${col.align};color:${col.color || TEXT};font-weight:700;background:#eeeeee;border-bottom:2px solid #bbb;">${esc(col.label)}</th>`
    )
    .join('');

const buildCustomerTableBody = (rows, isRtl) =>
  rows
    .map(
      (r, i) => `
      <tr style="background:${i % 2 ? '#f5f5f5' : '#fff'};">
        <td style="padding:6px 4px;border-bottom:1px solid #ddd;text-align:center;font-size:11px;color:${MUTED};font-weight:600;">${i + 1}</td>
        <td style="padding:6px 8px;border-bottom:1px solid #ddd;font-size:12px;color:${TEXT};">
          <div style="font-weight:700;">${esc(r.name)}</div>
          ${r.phone ? `<div style="font-size:11px;color:${LABEL};margin-top:2px;font-weight:500;">${esc(r.phone)}</div>` : ''}
        </td>
        <td style="padding:6px 8px;border-bottom:1px solid #ddd;text-align:${isRtl ? 'left' : 'right'};font-size:12px;color:${RED};font-weight:600;">${r.youWillGet ? formatCurrency(r.youWillGet) : ''}</td>
        <td style="padding:6px 8px;border-bottom:1px solid #ddd;text-align:${isRtl ? 'left' : 'right'};font-size:12px;color:${GREEN};font-weight:600;">${r.youWillGive ? formatCurrency(r.youWillGive) : ''}</td>
      </tr>`
    )
    .join('');

const buildSupplierTableBody = (parties, isRtl, t) => {
  const rows = parties.map(supplierRow);
  const body = rows
    .map(
      (r, i) => `
      <tr style="background:${i % 2 ? '#f5f5f5' : '#fff'};">
        <td style="padding:6px 4px;border-bottom:1px solid #ddd;text-align:center;font-size:11px;color:${MUTED};font-weight:600;">${i + 1}</td>
        <td style="padding:6px 8px;border-bottom:1px solid #ddd;font-size:12px;color:${TEXT};">
          <div style="font-weight:700;">${esc(r.name)}</div>
          ${r.phone ? `<div style="font-size:11px;color:${LABEL};margin-top:2px;font-weight:500;">${esc(r.phone)}</div>` : ''}
        </td>
        <td style="padding:6px 8px;border-bottom:1px solid #ddd;text-align:${isRtl ? 'left' : 'right'};font-size:12px;color:${GREEN};font-weight:600;">${r.youWillGive ? formatCurrency(r.youWillGive) : ''}</td>
        <td style="padding:6px 8px;border-bottom:1px solid #ddd;text-align:${isRtl ? 'left' : 'right'};font-size:12px;color:${RED};font-weight:600;">${r.advance ? formatCurrency(r.advance) : ''}</td>
      </tr>`
    )
    .join('');

  const { youWillGet, youWillGive } = computeSupplierBalanceTotals(parties);
  const grandTotal = youWillGive + youWillGet;
  const footer = `
      <tr style="background:#eef6ee;font-weight:bold;">
        <td colspan="2" style="padding:8px;font-size:12px;color:${TEXT};">${esc(t('partyReport.grandTotal'))}</td>
        <td style="padding:8px;text-align:${isRtl ? 'left' : 'right'};font-size:12px;color:${GREEN};">${rs(grandTotal)}</td>
        <td style="padding:8px;text-align:${isRtl ? 'left' : 'right'};font-size:12px;color:${RED};">${rs(youWillGet)}</td>
      </tr>`;

  return { body, footer };
};

const buildCustomerSection = (parties, isRtl, t) => {
  if (!parties.length) return '';
  const rows = parties.map(customerRow);
  const cols = customerTableCols(t, t('partyReport.customerDetails'));

  return `
    <div class="section-break">
      <div style="font-size:15px;font-weight:700;color:${TEXT};margin-bottom:8px;">${esc(t('partyReport.customerSection'))}</div>
      <div style="color:${MUTED};font-size:12px;margin-bottom:10px;font-weight:600;">${esc(t('partyReport.totalEntriesAll', { count: parties.length }))}</div>
      <table>
        <thead><tr>${buildTableHead(cols)}</tr></thead>
        <tbody>${buildCustomerTableBody(rows, isRtl)}</tbody>
      </table>
    </div>`;
};

const buildSupplierSection = (parties, isRtl, t) => {
  if (!parties.length) return '';
  const cols = supplierTableCols(t, t('partyReport.supplierDetails'));
  const { body, footer } = buildSupplierTableBody(parties, isRtl, t);

  return `
    <div class="section-break">
      <div style="font-size:15px;font-weight:700;color:${TEXT};margin-bottom:8px;">${esc(t('partyReport.supplierSection'))}</div>
      <div style="color:${MUTED};font-size:12px;margin-bottom:10px;font-weight:600;">${esc(t('partyReport.totalEntriesAll', { count: parties.length }))}</div>
      <table>
        <thead><tr>${buildTableHead(cols)}</tr></thead>
        <tbody>${body}${footer}</tbody>
      </table>
    </div>`;
};

const getReportMeta = (settings, locale) => {
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

const wrapHtml = ({ locale, logoDataUri, shopName, address, phone, title, dateLabel, summaryHtml, entriesLabel, tableSectionsHtml, reportStamp, t }) => {
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
    <div style="color:${MUTED};font-size:12px;margin-top:4px;font-weight:500;">${esc(t('partyReport.tillToday', { date: dateLabel }))}</div>
  </div>

  <div style="display:flex;border:1px solid #ccc;border-radius:8px;margin-bottom:16px;">
    ${summaryHtml}
  </div>
  ${entriesLabel ? `<div style="text-align:center;color:${MUTED};font-size:12px;margin-bottom:14px;font-weight:600;">${esc(entriesLabel)}</div>` : ''}

  ${tableSectionsHtml}

  <div style="text-align:center;color:${FOOTER};font-size:11px;margin-top:24px;border-top:1px solid #ddd;padding-top:12px;font-weight:500;">
    <div>${esc(shopName)}${phone ? ` · ${esc(phone)}` : ''}</div>
    <div style="margin-top:4px;">${esc(t('partyReport.reportDate'))}: ${esc(reportStamp)}</div>
  </div>
</body>
</html>`;
};

export const buildPartyListHTML = ({
  kind,
  parties,
  settings,
  logoDataUri = null,
  locale,
  t,
}) => {
  const meta = getReportMeta(settings, locale);
  const isCustomer = kind === 'customer';
  const title = isCustomer ? t('partyReport.customerTitle') : t('partyReport.supplierTitle');
  const detailsLabel = isCustomer
    ? t('partyReport.customerDetails')
    : t('partyReport.supplierDetails');

  let summaryHtml;
  let tableSectionsHtml;

  if (isCustomer) {
    const { youWillGet, youWillGive } = computeCustomerLedgerTotals(parties);
    const netBalance = youWillGet - youWillGive;
    summaryHtml =
      summaryCard(t('partyReport.balance'), rs(netBalance), GREEN, TEXT) +
      summaryCard(t('ledger.youWillGive'), rs(youWillGive), GREEN, GREEN) +
      summaryCard(t('ledger.youWillGet'), rs(youWillGet), RED, RED);

    const rows = parties.map(customerRow);
    const cols = customerTableCols(t, detailsLabel);
    tableSectionsHtml = `
      <table>
        <thead><tr>${buildTableHead(cols)}</tr></thead>
        <tbody>${buildCustomerTableBody(rows, meta.isRtl)}</tbody>
      </table>`;
  } else {
    const { youWillGet, youWillGive } = computeSupplierBalanceTotals(parties);
    const grandTotal = youWillGive + youWillGet;
    summaryHtml =
      summaryCard(t('partyReport.balance'), rs(youWillGive), GREEN, TEXT) +
      summaryCard(t('partyReport.advance'), rs(youWillGet), RED, RED) +
      summaryCard(t('ledger.youWillGive'), rs(grandTotal), GREEN, GREEN);

    const cols = supplierTableCols(t, detailsLabel);
    const { body, footer } = buildSupplierTableBody(parties, meta.isRtl, t);
    tableSectionsHtml = `
      <table>
        <thead><tr>${buildTableHead(cols)}</tr></thead>
        <tbody>${body}${footer}</tbody>
      </table>`;
  }

  return wrapHtml({
    locale,
    logoDataUri,
    shopName: meta.shopName,
    address: meta.address,
    phone: meta.phone,
    title,
    dateLabel: meta.dateLabel,
    summaryHtml,
    entriesLabel: t('partyReport.totalEntriesAll', { count: parties.length }),
    tableSectionsHtml,
    reportStamp: meta.reportStamp,
    t,
  });
};

export const buildCombinedPartyListHTML = ({
  customers = [],
  suppliers = [],
  settings,
  logoDataUri = null,
  locale,
  t,
}) => {
  const meta = getReportMeta(settings, locale);
  const { youWillGet, youWillGive } = computeCombinedLedgerSummary(customers, suppliers);
  const totalCount = customers.length + suppliers.length;

  const summaryHtml =
    summaryCard(t('ledger.youWillGive'), rs(youWillGive), GREEN, GREEN) +
    summaryCard(t('ledger.youWillGet'), rs(youWillGet), RED, RED);

  const tableSectionsHtml =
    buildCustomerSection(customers, meta.isRtl, t) + buildSupplierSection(suppliers, meta.isRtl, t);

  return wrapHtml({
    locale,
    logoDataUri,
    shopName: meta.shopName,
    address: meta.address,
    phone: meta.phone,
    title: t('partyReport.combinedTitle'),
    dateLabel: meta.dateLabel,
    summaryHtml,
    entriesLabel: t('partyReport.totalEntriesCombined', { count: totalCount }),
    tableSectionsHtml,
    reportStamp: meta.reportStamp,
    t,
  });
};
