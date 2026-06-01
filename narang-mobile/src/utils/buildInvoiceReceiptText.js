import { SHOP_NAME } from '../constants/branding';
import { formatCurrency } from './formatCurrency';
import { formatDateTime } from './formatDate';
import { formatPhoneDisplay } from './phone';
import { getT } from '../stores/languageStore';

const LINE_WIDTH = 32;
const DIVIDER = '-'.repeat(LINE_WIDTH);
const DOUBLE_DIVIDER = '='.repeat(LINE_WIDTH);

function padLine(left, right) {
  const l = String(left);
  const r = String(right);
  const space = LINE_WIDTH - l.length - r.length;
  if (space < 1) {
    return `${l}\n${r}`;
  }
  return l + ' '.repeat(space) + r;
}

function wrapText(text, width = LINE_WIDTH) {
  const words = String(text).split(/\s+/);
  const lines = [];
  let current = '';
  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if (next.length <= width) {
      current = next;
    } else {
      if (current) lines.push(current);
      current = word.length > width ? word.slice(0, width) : word;
    }
  }
  if (current) lines.push(current);
  return lines;
}

function centerText(text) {
  const s = String(text).trim();
  if (s.length >= LINE_WIDTH) return s.slice(0, LINE_WIDTH);
  const pad = Math.floor((LINE_WIDTH - s.length) / 2);
  return ' '.repeat(pad) + s;
}

/**
 * Lines for Sunmi thermal printer (text mode).
 * @returns {{ text: string, size?: number, bold?: boolean }[]}
 */
export function buildInvoiceReceiptLines(sale, settings) {
  const t = getT();
  const lines = [];
  const paymentLabel =
    sale.paymentMethod === 'CREDIT' ? t('payment.credit') : sale.paymentMethod || '—';

  lines.push({ text: DOUBLE_DIVIDER });
  lines.push({ text: centerText(SHOP_NAME), size: 26 });
  if (settings?.address?.trim()) {
    wrapText(settings.address.trim()).forEach((l) => lines.push({ text: centerText(l) }));
  }
  if (settings?.phone?.trim()) {
    lines.push({ text: centerText(formatPhoneDisplay(settings.phone)) });
  }
  lines.push({ text: DOUBLE_DIVIDER });
  lines.push({ text: `${t('invoice.invoiceLabel')} ${sale.invoiceNumber}` });
  lines.push({ text: formatDateTime(sale.createdAt) });
  if (sale.customer?.name) {
    lines.push({ text: '' });
    lines.push({ text: `${t('invoice.customerNameLabel')} ${sale.customer.name}` });
    if (sale.customer.phone) {
      lines.push({ text: formatPhoneDisplay(sale.customer.phone) });
    }
  }
  lines.push({ text: DIVIDER });

  for (const item of sale.items || []) {
    const name = item.product?.name || '—';
    wrapText(name).forEach((l) => lines.push({ text: l }));
    const qtyUnit = `${Number(item.quantity)} ${item.soldUnit || item.product?.unit || ''}`;
    const priceLine = `${qtyUnit} x ${formatCurrency(item.unitPrice)}`;
    lines.push({ text: padLine(priceLine, formatCurrency(item.total)) });
  }

  lines.push({ text: DIVIDER });
  lines.push({ text: padLine(`${t('invoice.subtotal')}:`, formatCurrency(sale.subtotal)) });
  lines.push({ text: padLine(`${t('invoice.discount')}:`, formatCurrency(sale.discount)) });
  lines.push({ text: padLine(`${t('invoice.total')}:`, formatCurrency(sale.totalAmount)), size: 24 });
  lines.push({ text: padLine(`${t('invoice.paymentShort')}:`, paymentLabel) });
  lines.push({ text: DIVIDER });
  lines.push({ text: centerText(t('invoice.thankYou', { appName: SHOP_NAME })) });
  lines.push({ text: DOUBLE_DIVIDER });

  return lines;
}
