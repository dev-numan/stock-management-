import { format } from 'date-fns';
import { formatCurrency } from '../../utils/formatCurrency';
import { formatPhoneDisplay } from '../../utils/phone';
import { getEffectiveAdvanceBalance } from '../../utils/customerBalance';
import {
  buildTableHead,
  esc,
  getReportMeta,
  GREEN,
  LABEL,
  MUTED,
  RED,
  rs,
  summaryCard,
  TEXT,
  wrapReportHtml,
} from './pdfReportCommon';

const fmtDateTime = (value) => {
  if (!value) return '';
  return format(new Date(value), 'dd/MM/yyyy h:mm a');
};

const fmtDate = (value) => {
  if (!value) return '';
  return format(new Date(value), 'dd/MM/yyyy');
};

const partySubtitle = (party) => {
  const parts = [];
  if (party?.phone) parts.push(formatPhoneDisplay(party.phone));
  if (party?.address?.trim()) parts.push(party.address.trim());
  return parts.join(' · ');
};

const buildSalesSection = (sales, isRtl, t) => {
  if (!sales.length) {
    return `<div style="color:${MUTED};font-size:13px;margin-bottom:20px;">${esc(t('ledgerReport.noSales'))}</div>`;
  }

  const align = isRtl ? 'left' : 'right';
  const cols = [
    { label: '#', align: 'center' },
    { label: t('ledgerReport.col.date'), align: 'start' },
    { label: t('ledgerReport.col.invoice'), align: 'start' },
    { label: t('ledgerReport.col.method'), align: 'center' },
    { label: t('ledgerReport.col.amount'), align: 'end', color: GREEN },
  ];

  const body = sales
    .map(
      (sale, i) => `
      <tr style="background:${i % 2 ? '#f5f5f5' : '#fff'};">
        <td style="padding:6px 4px;border-bottom:1px solid #ddd;text-align:center;font-size:11px;color:${MUTED};">${i + 1}</td>
        <td style="padding:6px 8px;border-bottom:1px solid #ddd;font-size:11px;">${esc(fmtDateTime(sale.createdAt))}</td>
        <td style="padding:6px 8px;border-bottom:1px solid #ddd;font-size:11px;font-weight:600;">${esc(sale.invoiceNumber || '—')}</td>
        <td style="padding:6px 8px;border-bottom:1px solid #ddd;text-align:center;font-size:11px;">${esc(sale.paymentMethod === 'CREDIT' ? t('payment.credit') : t('payment.cash'))}</td>
        <td style="padding:6px 8px;border-bottom:1px solid #ddd;text-align:${align};font-size:12px;font-weight:600;color:${GREEN};">${formatCurrency(sale.totalAmount)}</td>
      </tr>`
    )
    .join('');

  const total = sales.reduce((s, row) => s + Number(row.totalAmount ?? 0), 0);

  return `
    <div class="section-break">
      <div style="font-size:15px;font-weight:700;color:${TEXT};margin-bottom:8px;">${esc(t('ledgerReport.salesSection'))}</div>
      <table>
        <thead><tr>${buildTableHead(cols)}</tr></thead>
        <tbody>${body}
          <tr style="background:#eef6ee;font-weight:bold;">
            <td colspan="4" style="padding:8px;font-size:12px;">${esc(t('partyReport.grandTotal'))}</td>
            <td style="padding:8px;text-align:${align};font-size:12px;color:${GREEN};">${rs(total)}</td>
          </tr>
        </tbody>
      </table>
    </div>`;
};

const entryTypeLabel = (entry, t) => {
  if (entry.entryType === 'sale') return t('ledgerReport.entryType.sale');
  if (entry.entryType === 'credit') return t('ledgerReport.entryType.credit');
  return t('ledgerReport.entryType.payment');
};

const buildAccountHistorySection = (entries, isRtl, t) => {
  if (!entries.length) {
    return `<div style="color:${MUTED};font-size:13px;margin-bottom:20px;">${esc(t('ledgerReport.noAccountEntries'))}</div>`;
  }

  const align = isRtl ? 'left' : 'right';
  const cols = [
    { label: t('ledgerReport.col.date'), align: 'start' },
    { label: t('ledgerReport.col.type'), align: 'start' },
    { label: t('ledgerReport.col.amount'), align: 'end' },
    { label: t('customer.col.note'), align: 'start' },
    { label: t('customer.col.balance'), align: 'end', color: RED },
  ];

  const body = entries
    .map(
      (entry, i) => {
        const amt = Number(entry.amount ?? 0);
        const isNegative = amt < 0;
        return `
      <tr style="background:${i % 2 ? '#f5f5f5' : '#fff'};">
        <td style="padding:6px 8px;border-bottom:1px solid #ddd;font-size:11px;">${esc(fmtDateTime(entry.createdAt))}</td>
        <td style="padding:6px 8px;border-bottom:1px solid #ddd;font-size:11px;">${esc(entryTypeLabel(entry, t))}</td>
        <td style="padding:6px 8px;border-bottom:1px solid #ddd;text-align:${align};font-size:12px;font-weight:600;color:${isNegative ? RED : GREEN};">${formatCurrency(Math.abs(amt))}</td>
        <td style="padding:6px 8px;border-bottom:1px solid #ddd;font-size:11px;">${esc(entry.notes?.trim() || entry.sale?.invoiceNumber || '—')}</td>
        <td style="padding:6px 8px;border-bottom:1px solid #ddd;text-align:${align};font-size:11px;font-weight:600;">${formatCurrency(entry.balanceAfter ?? 0)}</td>
      </tr>`;
      }
    )
    .join('');

  return `
    <div class="section-break">
      <div style="font-size:15px;font-weight:700;color:${TEXT};margin-bottom:8px;">${esc(t('ledgerReport.accountSection'))}</div>
      <table>
        <thead><tr>${buildTableHead(cols)}</tr></thead>
        <tbody>${body}</tbody>
      </table>
    </div>`;
};

const buildSupplierLedgerSection = (ledger, isRtl, t) => {
  if (!ledger.length) {
    return `<div style="color:${MUTED};font-size:13px;">${esc(t('ledgerReport.noLedgerEntries'))}</div>`;
  }

  const align = isRtl ? 'left' : 'right';
  const cols = [
    { label: t('ledgerReport.col.date'), align: 'start' },
    { label: t('supplier.col.payment'), align: 'end', color: GREEN },
    { label: t('supplier.col.purchase'), align: 'end', color: RED },
    { label: t('supplier.col.entries'), align: 'start' },
  ];

  const body = ledger
    .map((entry, i) => {
      const isPayment = entry.type === 'PAYMENT';
      return `
      <tr style="background:${i % 2 ? '#f5f5f5' : '#fff'};">
        <td style="padding:6px 8px;border-bottom:1px solid #ddd;font-size:11px;">${esc(fmtDateTime(entry.createdAt))}</td>
        <td style="padding:6px 8px;border-bottom:1px solid #ddd;text-align:${align};font-size:12px;font-weight:600;color:${GREEN};">${isPayment ? formatCurrency(entry.amount) : ''}</td>
        <td style="padding:6px 8px;border-bottom:1px solid #ddd;text-align:${align};font-size:12px;font-weight:600;color:${RED};">${!isPayment ? formatCurrency(entry.amount) : ''}</td>
        <td style="padding:6px 8px;border-bottom:1px solid #ddd;font-size:11px;">${esc(entry.notes?.trim() || (isPayment ? t('supplier.col.payment') : t('supplier.col.purchase')))}</td>
      </tr>`;
    })
    .join('');

  const totalPurchases = ledger
    .filter((e) => e.type !== 'PAYMENT')
    .reduce((s, e) => s + Number(e.amount ?? 0), 0);
  const totalPayments = ledger
    .filter((e) => e.type === 'PAYMENT')
    .reduce((s, e) => s + Number(e.amount ?? 0), 0);

  return `
    <div class="section-break">
      <div style="font-size:15px;font-weight:700;color:${TEXT};margin-bottom:8px;">${esc(t('ledgerReport.ledgerSection'))}</div>
      <table>
        <thead><tr>${buildTableHead(cols)}</tr></thead>
        <tbody>${body}
          <tr style="background:#eef6ee;font-weight:bold;">
            <td style="padding:8px;font-size:12px;">${esc(t('partyReport.grandTotal'))}</td>
            <td style="padding:8px;text-align:${align};font-size:12px;color:${GREEN};">${rs(totalPayments)}</td>
            <td style="padding:8px;text-align:${align};font-size:12px;color:${RED};">${rs(totalPurchases)}</td>
            <td></td>
          </tr>
        </tbody>
      </table>
    </div>`;
};

export const buildCustomerLedgerHTML = ({
  customer,
  sales = [],
  accountHistory = [],
  periodLabel = '',
  settings,
  logoDataUri = null,
  locale,
  t,
}) => {
  const meta = getReportMeta(settings, locale);
  const balance = getEffectiveAdvanceBalance(customer);
  const totalSales = sales.reduce((s, row) => s + Number(row.totalAmount ?? 0), 0);
  const youWillGet = balance < 0 ? Math.abs(balance) : 0;
  const youWillGive = balance > 0 ? balance : 0;

  const summaryHtml =
    summaryCard(t('customer.accountBalance'), rs(balance), balance < 0 ? RED : GREEN, TEXT) +
    summaryCard(t('ledgerReport.totalSales'), rs(totalSales), GREEN, GREEN) +
    summaryCard(t('ledger.youWillGet'), rs(youWillGet), RED, RED) +
    summaryCard(t('ledger.youWillGive'), rs(youWillGive), GREEN, GREEN);

  const tableSectionsHtml =
    buildSalesSection(sales, meta.isRtl, t) +
    buildAccountHistorySection(accountHistory, meta.isRtl, t);

  const subtitleParts = [
    customer?.name,
    partySubtitle(customer),
    periodLabel ? t('ledgerReport.period', { label: periodLabel }) : '',
  ].filter(Boolean);
  const subtitle = subtitleParts.join(' · ');

  return wrapReportHtml({
    locale,
    logoDataUri,
    shopName: meta.shopName,
    address: meta.address,
    phone: meta.phone ? formatPhoneDisplay(meta.phone) : '',
    title: t('ledgerReport.customerTitle'),
    subtitle,
    dateLabel: meta.dateLabel,
    summaryHtml,
    entriesLabel: t('ledgerReport.customerEntries', {
      sales: sales.length,
      account: accountHistory.length,
    }),
    tableSectionsHtml,
    reportStamp: meta.reportStamp,
    t,
  });
};

export const buildSupplierLedgerHTML = ({
  supplier,
  ledger = [],
  settings,
  logoDataUri = null,
  locale,
  t,
}) => {
  const meta = getReportMeta(settings, locale);
  const payable = Number(supplier?.payableBalance ?? 0);
  const totalPurchases = Number(supplier?.totalPurchases ?? 0);
  const totalPayments = Number(supplier?.totalPayments ?? 0);

  const summaryHtml =
    summaryCard(t('supplier.balance'), rs(Math.abs(payable)), payable > 0 ? GREEN : RED, TEXT) +
    summaryCard(t('supplier.col.purchase'), rs(totalPurchases), RED, RED) +
    summaryCard(t('supplier.col.payment'), rs(totalPayments), GREEN, GREEN);

  const tableSectionsHtml = buildSupplierLedgerSection(ledger, meta.isRtl, t);

  const subtitle = [supplier?.name, partySubtitle(supplier)].filter(Boolean).join(' · ');

  return wrapReportHtml({
    locale,
    logoDataUri,
    shopName: meta.shopName,
    address: meta.address,
    phone: meta.phone ? formatPhoneDisplay(meta.phone) : '',
    title: t('ledgerReport.supplierTitle'),
    subtitle,
    dateLabel: meta.dateLabel,
    summaryHtml,
    entriesLabel: t('ledgerReport.supplierEntries', { count: ledger.length }),
    tableSectionsHtml,
    reportStamp: meta.reportStamp,
    t,
  });
};
