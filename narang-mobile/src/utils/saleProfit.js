import { getStockDeduction } from './productUnits';

export const computeLineCogs = (item) => {
  const product = item?.product;
  if (!product) return 0;
  const soldUnit = item.soldUnit || product.unit;
  const deduction = getStockDeduction(product, soldUnit, Number(item.quantity));
  return (Number(product.costPrice) || 0) * deduction;
};

export const computeSaleGrossProfit = (sale) => {
  if (!sale) return 0;
  const revenue = Number(sale.totalAmount ?? 0);
  const cogs = (sale.items || []).reduce((sum, item) => sum + computeLineCogs(item), 0);
  return revenue - cogs;
};
