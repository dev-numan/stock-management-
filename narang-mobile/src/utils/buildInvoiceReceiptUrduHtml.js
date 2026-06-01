import { APP_NAME_URDU } from '../constants/branding';
import { translate } from '../i18n/translations';
import { formatCurrency } from './formatCurrency';
import { formatDateTime } from './formatDate';
import { formatPhoneDisplay } from './phone';

const tu = (key, params) => translate('ur', key, params);

/** RTL HTML receipt with Urdu font (expo-print fallback when bitmap unavailable). */
export function buildInvoiceReceiptUrduHtml(sale, settings) {
  const address = settings?.address?.trim() || '';
  const phone = settings?.phone ? formatPhoneDisplay(settings.phone) : '';
  const payment =
    sale.paymentMethod === 'CREDIT'
      ? tu('payment.credit')
      : sale.paymentMethod === 'CASH'
        ? tu('payment.cash')
        : sale.paymentMethod || '—';

  const fmt = (n) => Number(n ?? 0).toLocaleString('en-PK', { maximumFractionDigits: 2 });
  const itemRows = (sale.items || [])
    .map(
      (item) => `
    <tr style="font-size:10px;border-bottom:1px solid #ddd;">
      <td style="text-align:right;padding:4px 2px;">${item.product?.name || ''}</td>
      <td style="text-align:center;padding:4px 2px;">${fmt(item.unitPrice)}</td>
      <td style="text-align:center;padding:4px 2px;">${Number(item.quantity)}</td>
      <td style="text-align:center;padding:4px 2px;">${fmt(item.discount ?? item.lineDiscount ?? 0)}</td>
      <td style="text-align:left;padding:4px 2px;font-weight:bold;">${fmt(item.total)}</td>
    </tr>`
    )
    .join('');

  const tableHead = `
    <tr style="background:#2E7D32;color:#fff;font-size:10px;font-weight:bold;">
      <th style="padding:4px 2px;text-align:right;">${tu('invoice.col.product')}</th>
      <th style="padding:4px 2px;text-align:center;">${tu('invoice.col.price')}</th>
      <th style="padding:4px 2px;text-align:center;">${tu('invoice.col.qty')}</th>
      <th style="padding:4px 2px;text-align:center;">${tu('invoice.col.discountShort')}</th>
      <th style="padding:4px 2px;text-align:left;">${tu('invoice.col.amount')}</th>
    </tr>`;

  return `
<!DOCTYPE html>
<html dir="rtl" lang="ur">
<head>
  <meta charset="utf-8" />
  <link href="https://fonts.googleapis.com/css2?family=Noto+Nastaliq+Urdu:wght@400;700&display=swap" rel="stylesheet" />
  <style>
    @page { margin: 4mm; }
    body {
      font-family: 'Noto Nastaliq Urdu', 'Noto Sans Arabic', serif;
      font-size: 13px;
      color: #000;
      width: 72mm;
      margin: 0 auto;
      direction: rtl;
      text-align: right;
    }
    .center { text-align: center; }
    .bold { font-weight: bold; }
    .divider { border-top: 1px dashed #000; margin: 8px 0; }
    .total { font-size: 16px; font-weight: bold; color: #2E7D32; }
    h2 { margin: 0; color: #2E7D32; font-size: 18px; }
  </style>
</head>
<body>
  <div class="center">
    <h2>${APP_NAME_URDU}</h2>
    ${address ? `<div>${address}</div>` : ''}
    ${phone ? `<div>${phone}</div>` : ''}
  </div>
  <div class="divider"></div>
  <div><b>${tu('invoice.invoiceLabel')}</b> ${sale.invoiceNumber}</div>
  <div><b>${tu('invoice.dateTimeLabel')}</b> ${formatDateTime(sale.createdAt)}</div>
  ${
    sale.customer
      ? `<div style="margin-top:6px;"><b>${tu('invoice.customerNameLabel')}</b> ${sale.customer.name}${sale.customer.phone ? `<br/><b>${tu('invoice.customerPhoneLabel')}</b> ${formatPhoneDisplay(sale.customer.phone)}` : ''}</div>`
      : ''
  }
  <div class="divider"></div>
  <table style="width:100%;border-collapse:collapse;">${tableHead}${itemRows}</table>
  <div class="divider"></div>
  <div>${tu('invoice.subtotal')}: <span style="float:left;">${formatCurrency(sale.subtotal)}</span></div>
  <div>${tu('invoice.discount')}: <span style="float:left;">${formatCurrency(sale.discount)}</span></div>
  <div class="total">${tu('invoice.total')}: <span style="float:left;">${formatCurrency(sale.totalAmount)}</span></div>
  <div>${tu('invoice.payment', { method: payment })}</div>
  <div class="divider"></div>
  <div class="center">${tu('invoice.thankYou', { appName: APP_NAME_URDU })}</div>
</body>
</html>`;
}
