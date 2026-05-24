import { formatCurrency } from '../../utils/formatCurrency';
import { formatDate } from '../../utils/formatDate';
import { APP_NAME, SHOP_NAME } from '../../constants/branding';

export const buildInvoiceHTML = (sale, settings, logoDataUri = null) => {
  const shopName = SHOP_NAME;
  const address = settings?.address || '';
  const phone = settings?.phone || '';

  const rows = (sale.items || [])
    .map(
      (item) => `
    <tr>
      <td style="padding:8px;border-bottom:1px solid #eee;">${item.product?.name || ''}</td>
      <td style="padding:8px;border-bottom:1px solid #eee;text-align:center;">${Number(item.quantity)}</td>
      <td style="padding:8px;border-bottom:1px solid #eee;text-align:center;">${item.product?.unit || ''}</td>
      <td style="padding:8px;border-bottom:1px solid #eee;text-align:right;">${formatCurrency(item.unitPrice)}</td>
      <td style="padding:8px;border-bottom:1px solid #eee;text-align:right;">${formatCurrency(item.total)}</td>
    </tr>`
    )
    .join('');

  const customerBlock = sale.customer
    ? `<div style="text-align:right;">
      <p><strong>Customer:</strong> ${sale.customer.name}</p>
      ${sale.customer.phone ? `<p>${sale.customer.phone}</p>` : ''}
    </div>`
    : '';

  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>Invoice ${sale.invoiceNumber}</title></head>
<body style="font-family:Arial,sans-serif;padding:24px;color:#333;max-width:600px;margin:0 auto;">
  <div style="text-align:center;border-bottom:3px solid #2E7D32;padding-bottom:16px;margin-bottom:20px;">
    ${logoDataUri ? `<img src="${logoDataUri}" alt="${shopName}" style="width:88px;height:88px;object-fit:contain;margin:0 auto 12px;display:block;" />` : ''}
    <h1 style="color:#2E7D32;margin:0;">${shopName}</h1>
    <p style="margin:4px 0;color:#666;">${address}</p>
    ${phone ? `<p style="margin:4px 0;color:#666;">${phone}</p>` : ''}
  </div>
  <div style="display:flex;justify-content:space-between;margin-bottom:20px;">
    <div>
      <p><strong>Invoice:</strong> ${sale.invoiceNumber}</p>
      <p><strong>Date:</strong> ${formatDate(sale.createdAt)}</p>
    </div>
    ${customerBlock}
  </div>
  <table style="width:100%;border-collapse:collapse;margin-bottom:20px;">
    <thead>
      <tr style="background:#2E7D32;color:white;">
        <th style="padding:10px;text-align:left;">Product</th>
        <th style="padding:10px;">Qty</th>
        <th style="padding:10px;">Unit</th>
        <th style="padding:10px;text-align:right;">Price</th>
        <th style="padding:10px;text-align:right;">Total</th>
      </tr>
    </thead>
    <tbody>${rows}</tbody>
  </table>
  <div style="text-align:right;margin-bottom:24px;">
    <p>Subtotal: ${formatCurrency(sale.subtotal)}</p>
    <p>Discount: ${formatCurrency(sale.discount)}</p>
    <p style="font-size:20px;font-weight:bold;color:#2E7D32;margin-top:8px;">
      GRAND TOTAL: ${formatCurrency(sale.totalAmount)}
    </p>
    <p style="color:#666;">Payment: ${sale.paymentMethod === 'CREDIT' ? 'Credit' : sale.paymentMethod}</p>
  </div>
  <p style="text-align:center;color:#FFA000;font-weight:bold;margin-top:32px;">
    Thank you for choosing ${APP_NAME}!
  </p>
</body>
</html>`;
};
