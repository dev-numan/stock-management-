import { APP_NAME, SHOP_NAME } from '../constants/branding';
import { formatCurrency } from './formatCurrency';
import { formatReceiptDateTime } from './formatDate';
import { formatPhoneDisplay } from './phone';
import { getT } from '../stores/languageStore';

/** Narrow HTML for 58–80mm thermal printers (expo-print fallback). */
export function buildInvoiceReceiptHtml(sale, settings) {
  const t = getT();
  const address = settings?.address?.trim() || '';
  const phone = settings?.phone ? formatPhoneDisplay(settings.phone) : '';
  const payment =
    sale.paymentMethod === 'CREDIT' ? t('payment.credit') : sale.paymentMethod || '—';

  const itemRows = (sale.items || [])
    .map(
      (item) => `
    <tr>
      <td style="padding:4px 0;font-size:11px;">${item.product?.name || ''}</td>
    </tr>
    <tr>
      <td style="padding:0 0 6px;font-size:10px;color:#444;">
        ${Number(item.quantity)} ${item.soldUnit || item.product?.unit || ''} × ${formatCurrency(item.unitPrice)}
        <span style="float:right;font-weight:bold;">${formatCurrency(item.total)}</span>
      </td>
    </tr>`
    )
    .join('');

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <style>
    @page { margin: 4mm; }
    body { font-family: sans-serif; font-size: 11px; color: #000; width: 72mm; margin: 0 auto; }
    .center { text-align: center; }
    .bold { font-weight: bold; }
    .divider { border-top: 1px dashed #000; margin: 6px 0; }
    .total { font-size: 14px; font-weight: bold; }
  </style>
</head>
<body>
  <div class="center bold" style="font-size:14px;">${SHOP_NAME}</div>
  ${address ? `<div class="center">${address}</div>` : ''}
  ${phone ? `<div class="center">${phone}</div>` : ''}
  <div class="divider"></div>
  <div><b>${t('invoice.invoiceLabel')}</b> ${sale.invoiceNumber}</div>
  <div>${formatReceiptDateTime(sale.createdAt)}</div>
  ${
    sale.customer
      ? `<div style="margin-top:4px;"><b>${t('invoice.customerNameLabel')}</b> ${sale.customer.name}</div>`
      : ''
  }
  <div class="divider"></div>
  <table style="width:100%;border-collapse:collapse;">${itemRows}</table>
  <div class="divider"></div>
  <div>${t('invoice.subtotal')}: <span style="float:right;">${formatCurrency(sale.subtotal)}</span></div>
  <div>${t('invoice.discount')}: <span style="float:right;">${formatCurrency(sale.discount)}</span></div>
  <div class="total">${t('invoice.total')}: <span style="float:right;">${formatCurrency(sale.totalAmount)}</span></div>
  <div>${t('invoice.payment', { method: payment })}</div>
  <div class="divider"></div>
  <div class="center">${t('invoice.thankYou', { appName: APP_NAME })}</div>
</body>
</html>`;
}
