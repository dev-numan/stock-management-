import { formatCurrency } from '../../utils/formatCurrency';
import { formatDateTime } from '../../utils/formatDate';
import { SHOP_NAME } from '../../constants/branding';

const row = (label, value, bold = false) => `
  <tr>
    <td style="padding:8px;border-bottom:1px solid #eee;color:#555;">${label}</td>
    <td style="padding:8px;border-bottom:1px solid #eee;text-align:right;${bold ? 'font-weight:bold;color:#2E7D32;' : ''}">${value}</td>
  </tr>`;

const section = (title, subtitle, rows) => `
  <div style="margin-bottom:24px;">
    <h2 style="color:#2E7D32;font-size:16px;margin:0 0 4px;">${title}</h2>
    ${subtitle ? `<p style="color:#888;font-size:12px;margin:0 0 8px;">${subtitle}</p>` : ''}
    <table style="width:100%;border-collapse:collapse;">${rows}</table>
  </div>`;

export const buildReportHTML = ({
  periodLabel,
  summary,
  profitLoss,
  stock,
  settings,
  logoDataUri = null,
}) => {
  const address = settings?.address || '';
  const phone = settings?.phone || '';
  const generatedAt = formatDateTime(new Date().toISOString());

  const stockRows = (stock?.products || [])
    .slice()
    .sort((a, b) => (b.saleValue ?? 0) - (a.saleValue ?? 0))
    .slice(0, 25)
    .map(
      (p) => `
    <tr>
      <td style="padding:6px;border-bottom:1px solid #eee;font-size:12px;">${p.name}</td>
      <td style="padding:6px;border-bottom:1px solid #eee;font-size:12px;text-align:center;">${p.currentStock}</td>
      <td style="padding:6px;border-bottom:1px solid #eee;font-size:12px;text-align:right;">${formatCurrency(p.costValue)}</td>
      <td style="padding:6px;border-bottom:1px solid #eee;font-size:12px;text-align:right;">${formatCurrency(p.saleValue)}</td>
    </tr>`
    )
    .join('');

  const stockTable = stockRows
    ? `
  <div style="margin-bottom:24px;">
    <h2 style="color:#2E7D32;font-size:16px;margin:0 0 4px;">Stock by product</h2>
    <p style="color:#888;font-size:12px;margin:0 0 8px;">Top 25 by sale value</p>
    <table style="width:100%;border-collapse:collapse;font-size:12px;">
      <thead>
        <tr style="background:#f5f5f5;">
          <th style="padding:8px;text-align:left;">Product</th>
          <th style="padding:8px;">Stock</th>
          <th style="padding:8px;text-align:right;">Cost value</th>
          <th style="padding:8px;text-align:right;">Sale value</th>
        </tr>
      </thead>
      <tbody>${stockRows}</tbody>
    </table>
  </div>`
    : '';

  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>Report ${periodLabel}</title></head>
<body style="font-family:Arial,sans-serif;padding:24px;color:#333;max-width:720px;margin:0 auto;">
  <div style="text-align:center;border-bottom:3px solid #2E7D32;padding-bottom:16px;margin-bottom:24px;">
    ${logoDataUri ? `<img src="${logoDataUri}" alt="${SHOP_NAME}" style="width:72px;height:72px;object-fit:contain;margin:0 auto 10px;display:block;" />` : ''}
    <h1 style="color:#2E7D32;margin:0;font-size:22px;">${SHOP_NAME}</h1>
    ${address ? `<p style="margin:4px 0;color:#666;font-size:13px;">${address}</p>` : ''}
    ${phone ? `<p style="margin:4px 0;color:#666;font-size:13px;">${phone}</p>` : ''}
    <p style="margin:12px 0 0;font-size:18px;font-weight:bold;">Business Report</p>
    <p style="margin:4px 0;color:#555;">${periodLabel}</p>
    <p style="margin:4px 0;color:#999;font-size:11px;">Generated ${generatedAt}</p>
  </div>

  ${section(
    'Sales Summary',
    periodLabel,
    [
      row('Total sales', formatCurrency(summary?.totalSales)),
      row('Number of sales', String(summary?.salesCount ?? 0)),
      row('Cash sales', formatCurrency(summary?.cashSales)),
      row('Credit sales', formatCurrency(summary?.creditSales)),
    ].join('')
  )}

  ${section(
    'Profit & Loss',
    periodLabel,
    [
      row('Revenue', formatCurrency(profitLoss?.revenue)),
      row('Cost of goods sold (COGS)', formatCurrency(profitLoss?.cogs)),
      row('Gross profit', formatCurrency(profitLoss?.grossProfit), true),
      row('Expenses', formatCurrency(profitLoss?.expenses)),
      row('Net profit', formatCurrency(profitLoss?.netProfit), true),
    ].join('')
  )}

  ${section(
    'Stock valuation',
    'Current inventory (not filtered by report period)',
    [
      row('Total cost value', formatCurrency(stock?.totalCostValue)),
      row('Total sale value', formatCurrency(stock?.totalSaleValue), true),
      row('Products in stock', String(stock?.products?.length ?? 0)),
    ].join('')
  )}

  ${stockTable}

  <p style="text-align:center;color:#999;font-size:11px;margin-top:32px;">
    ${SHOP_NAME} — Confidential
  </p>
</body>
</html>`;
};
