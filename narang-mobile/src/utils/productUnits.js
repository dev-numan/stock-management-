/** Allowed primary unit → alternate sale unit pairs */
export const ALLOWED_ALTERNATE_UNITS = {
  BAG: ['KG'],
  BOTTLE: ['LITRE'],
  PIECE: ['KG'],
};

export const getAllowedAlternateUnits = (primaryUnit) =>
  ALLOWED_ALTERNATE_UNITS[primaryUnit] ?? [];

export const canHaveAlternateUnit = (primaryUnit, alternateUnit) => {
  if (!primaryUnit || !alternateUnit) return false;
  if (primaryUnit === alternateUnit) return false;
  return getAllowedAlternateUnits(primaryUnit).includes(alternateUnit);
};

export const hasAlternateSale = (product) =>
  Boolean(
    product?.alternateSaleUnit &&
      product?.unitsPerStockUnit != null &&
      Number(product.unitsPerStockUnit) > 0
  );

export const getUnitsPerStockUnit = (product) => {
  if (!hasAlternateSale(product)) return null;
  return Number(product.unitsPerStockUnit);
};

export const getUnitPrice = (product, soldUnit) => {
  const primary = product.unit;
  const salePrice = Number(product.salePrice);

  if (soldUnit === primary) return salePrice;

  const perStock = getUnitsPerStockUnit(product);
  if (!perStock || soldUnit !== product.alternateSaleUnit) return salePrice;

  return salePrice / perStock;
};

export const getStockDeduction = (product, soldUnit, quantity) => {
  const qty = Number(quantity);
  if (!qty || qty <= 0) return 0;

  if (soldUnit === product.unit) return qty;

  const perStock = getUnitsPerStockUnit(product);
  if (!perStock || soldUnit !== product.alternateSaleUnit) return qty;

  return qty / perStock;
};

export const getMaxSaleQuantity = (product, soldUnit) => {
  const stock = Number(product.currentStock);
  if (Number.isNaN(stock) || stock <= 0) return 0;

  if (soldUnit === product.unit) return stock;

  const perStock = getUnitsPerStockUnit(product);
  if (!perStock || soldUnit !== product.alternateSaleUnit) return stock;

  return stock * perStock;
};

export const formatStockDisplay = (product) => {
  const stock = Number(product.currentStock);
  const primary = product.unit;
  const base = `${stock} ${primary}`;

  if (!hasAlternateSale(product)) return base;

  const altQty = stock * Number(product.unitsPerStockUnit);
  const altUnit = product.alternateSaleUnit;
  const altFormatted = Number.isInteger(altQty) ? altQty : Math.round(altQty * 100) / 100;

  return `${base} (${altFormatted} ${altUnit})`;
};

export const cartLineKey = (productId, soldUnit) => `${productId}:${soldUnit}`;

export const usesDecimalQuantity = (soldUnit, primaryUnit) =>
  soldUnit !== primaryUnit;
