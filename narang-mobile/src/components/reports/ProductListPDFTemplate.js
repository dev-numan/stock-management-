import { formatCurrency } from '../../utils/formatCurrency';
import { formatStockDisplay } from '../../utils/productUnits';
import { computeStockTotals } from '../products/StockValuationSummary';
import { formatPhoneDisplay } from '../../utils/phone';
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

const productRow = (product, isRtl) => {
  const stockQty = Number(product.currentStock) || 0;
  const costPrice = Number(product.costPrice) || 0;
  const salePrice = Number(product.salePrice) || 0;
  const costValue = stockQty * costPrice;
  const saleValue = stockQty * salePrice;
  const align = isRtl ? 'left' : 'right';

  return `
    <tr>
      <td style="padding:6px 4px;border-bottom:1px solid #ddd;text-align:center;font-size:11px;color:${MUTED};">${esc(product._index)}</td>
      <td style="padding:6px 8px;border-bottom:1px solid #ddd;font-size:12px;color:${TEXT};">
        <div style="font-weight:700;">${esc(product.name)}</div>
        <div style="font-size:11px;color:${LABEL};margin-top:2px;">${esc(product.category || '')}</div>
      </td>
      <td style="padding:6px 8px;border-bottom:1px solid #ddd;font-size:11px;color:${TEXT};">${esc(formatStockDisplay(product))}</td>
      <td style="padding:6px 8px;border-bottom:1px solid #ddd;text-align:${align};font-size:11px;">${formatCurrency(costPrice)}</td>
      <td style="padding:6px 8px;border-bottom:1px solid #ddd;text-align:${align};font-size:11px;color:${GREEN};font-weight:600;">${formatCurrency(salePrice)}</td>
      <td style="padding:6px 8px;border-bottom:1px solid #ddd;text-align:${align};font-size:11px;">${formatCurrency(costValue)}</td>
      <td style="padding:6px 8px;border-bottom:1px solid #ddd;text-align:${align};font-size:11px;color:${GREEN};font-weight:600;">${formatCurrency(saleValue)}</td>
    </tr>`;
};

export const buildProductListHTML = ({
  products = [],
  settings,
  logoDataUri = null,
  locale,
  t,
}) => {
  const meta = getReportMeta(settings, locale);
  const { totalCostValue, totalSaleValue } = computeStockTotals(products);

  const cols = [
    { label: '#', align: 'center' },
    { label: t('productReport.col.name'), align: 'start' },
    { label: t('productReport.col.stock'), align: 'start' },
    { label: t('productReport.col.costPrice'), align: 'end' },
    { label: t('productReport.col.salePrice'), align: 'end', color: GREEN },
    { label: t('productReport.col.costValue'), align: 'end' },
    { label: t('productReport.col.saleValue'), align: 'end', color: GREEN },
  ];

  const rows = products.map((p, i) => productRow({ ...p, _index: i + 1 }, meta.isRtl)).join('');

  const summaryHtml =
    summaryCard(t('productReport.totalProducts'), String(products.length), TEXT, TEXT) +
    summaryCard(t('inventory.totalCost'), rs(totalCostValue), TEXT, TEXT) +
    summaryCard(t('inventory.totalSale'), rs(totalSaleValue), GREEN, GREEN);

  const tableSectionsHtml = `
    <table>
      <thead><tr>${buildTableHead(cols)}</tr></thead>
      <tbody>${rows}</tbody>
      <tfoot>
        <tr style="background:#eef6ee;font-weight:bold;">
          <td colspan="5" style="padding:8px;font-size:12px;">${esc(t('partyReport.grandTotal'))}</td>
          <td style="padding:8px;text-align:${meta.isRtl ? 'left' : 'right'};font-size:12px;">${rs(totalCostValue)}</td>
          <td style="padding:8px;text-align:${meta.isRtl ? 'left' : 'right'};font-size:12px;color:${GREEN};">${rs(totalSaleValue)}</td>
        </tr>
      </tfoot>
    </table>`;

  return wrapReportHtml({
    locale,
    logoDataUri,
    shopName: meta.shopName,
    address: meta.address,
    phone: meta.phone ? formatPhoneDisplay(meta.phone) : '',
    title: t('productReport.title'),
    dateLabel: meta.dateLabel,
    summaryHtml,
    entriesLabel: t('productReport.totalEntries', { count: products.length }),
    tableSectionsHtml,
    reportStamp: meta.reportStamp,
    t,
  });
};
