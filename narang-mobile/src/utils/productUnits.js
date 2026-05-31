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

export const parseUnitsPerStockUnit = (value) => {
  if (value == null || value === '') return 0;
  const n = Number(typeof value === 'object' && value !== null ? String(value) : value);
  return Number.isFinite(n) ? n : 0;
};

export const hasAlternateSale = (product) => {
  const alt = product?.alternateSaleUnit;
  const perStock = parseUnitsPerStockUnit(product?.unitsPerStockUnit);
  return Boolean(alt && canHaveAlternateUnit(product?.unit, alt) && perStock > 0);
};

export const getUnitsPerStockUnit = (product) => {
  if (!hasAlternateSale(product)) return null;
  return parseUnitsPerStockUnit(product.unitsPerStockUnit);
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
  if (!perStock || soldUnit !== product.alternateSaleUnit) return 0;

  return stock * perStock;
};

/** Sum stock used by other cart lines for the same product (in primary/stock units). */
export const getTotalStockDeduction = (product, cartItems, excludeLineKey = null) => {
  if (!cartItems?.length) return 0;
  return cartItems
    .filter(
      (line) =>
        line.product.id === product.id &&
        (excludeLineKey == null || line.lineKey !== excludeLineKey)
    )
    .reduce(
      (sum, line) => sum + getStockDeduction(line.product, line.soldUnit, line.quantity),
      0
    );
};

/** Max quantity allowed on one cart line in the chosen sale unit. */
export const getRemainingSaleQuantity = (product, soldUnit, cartItems, excludeLineKey = null) => {
  const stock = Number(product.currentStock);
  if (Number.isNaN(stock) || stock <= 0) return 0;

  const usedPrimary = getTotalStockDeduction(product, cartItems, excludeLineKey);
  const remainingPrimary = Math.max(0, stock - usedPrimary);

  if (soldUnit === product.unit) return remainingPrimary;

  const perStock = getUnitsPerStockUnit(product);
  if (!perStock || soldUnit !== product.alternateSaleUnit) return 0;

  return remainingPrimary * perStock;
};

export const roundSaleQty = (qty) => Math.round(Number(qty) * 100) / 100;

export const formatMaxQtyLabel = (qty, unit) =>
  `${roundSaleQty(qty)} ${unit}`;

export const formatStockDisplay = (product) => {
  const stock = Number(product.currentStock);
  const primary = product.unit;
  const base = `${stock} ${primary}`;

  if (!hasAlternateSale(product)) return base;

  const altQty = stock * parseUnitsPerStockUnit(product.unitsPerStockUnit);
  const altUnit = product.alternateSaleUnit;
  const altFormatted = Number.isInteger(altQty) ? altQty : Math.round(altQty * 100) / 100;

  return `${base} (${altFormatted} ${altUnit})`;
};

export const cartLineKey = (productId, soldUnit) => `${productId}:${soldUnit}`;

export const usesDecimalQuantity = (soldUnit, primaryUnit) =>
  soldUnit !== primaryUnit;
