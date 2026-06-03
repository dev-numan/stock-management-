import {
  getUnitPrice,
  getStockDeduction,
  getMaxSaleQuantity,
  getRemainingSaleQuantity,
  hasAlternateSale,
  getUnitsPerStockUnit,
  canHaveAlternateUnit,
  parseUnitsPerStockUnit,
  roundSaleQty,
} from '../productUnits';

// BAG of fertilizer that can also be sold loose by KG: 50 KG per bag.
const bagProduct = {
  id: 'p1',
  unit: 'BAG',
  salePrice: 5000,
  costPrice: 4000,
  currentStock: 10,
  alternateSaleUnit: 'KG',
  unitsPerStockUnit: 50,
};

// Awkward ratio to exercise rounding: 1000 per 3 units.
const thirdProduct = {
  id: 'p2',
  unit: 'BAG',
  salePrice: 1000,
  costPrice: 600,
  currentStock: 5,
  alternateSaleUnit: 'KG',
  unitsPerStockUnit: 3,
};

// Simple product with no alternate unit.
const pieceProduct = {
  id: 'p3',
  unit: 'PIECE',
  salePrice: 50,
  costPrice: 30,
  currentStock: 20,
};

describe('alternate unit detection', () => {
  it('recognises a valid alternate sale config', () => {
    expect(hasAlternateSale(bagProduct)).toBe(true);
    expect(getUnitsPerStockUnit(bagProduct)).toBe(50);
  });

  it('rejects invalid or missing configs', () => {
    expect(hasAlternateSale(pieceProduct)).toBe(false);
    expect(getUnitsPerStockUnit(pieceProduct)).toBeNull();
    expect(hasAlternateSale({ ...bagProduct, unitsPerStockUnit: 0 })).toBe(false);
    expect(canHaveAlternateUnit('BAG', 'BAG')).toBe(false);
    expect(canHaveAlternateUnit('BAG', 'LITRE')).toBe(false);
    expect(canHaveAlternateUnit('BAG', 'KG')).toBe(true);
  });

  it('parses units-per-stock defensively', () => {
    expect(parseUnitsPerStockUnit('50')).toBe(50);
    expect(parseUnitsPerStockUnit('')).toBe(0);
    expect(parseUnitsPerStockUnit(null)).toBe(0);
    expect(parseUnitsPerStockUnit('abc')).toBe(0);
  });
});

describe('getUnitPrice', () => {
  it('returns the full sale price when sold by the primary unit', () => {
    expect(getUnitPrice(bagProduct, 'BAG')).toBe(5000);
    expect(getUnitPrice(pieceProduct, 'PIECE')).toBe(50);
  });

  it('derives a clean per-alternate-unit price', () => {
    expect(getUnitPrice(bagProduct, 'KG')).toBe(100); // 5000 / 50
  });

  it('rounds an awkward division to paisa (no float tail)', () => {
    expect(getUnitPrice(thirdProduct, 'KG')).toBe(333.33); // 1000 / 3
  });

  it('falls back to sale price for an unknown unit', () => {
    expect(getUnitPrice(bagProduct, 'LITRE')).toBe(5000);
  });
});

describe('getStockDeduction', () => {
  it('deducts whole stock units when sold by primary unit', () => {
    expect(getStockDeduction(bagProduct, 'BAG', 2)).toBe(2);
    expect(getStockDeduction(pieceProduct, 'PIECE', 4)).toBe(4);
  });

  it('converts alternate quantity back to stock units', () => {
    expect(getStockDeduction(bagProduct, 'KG', 100)).toBe(2); // 100 KG = 2 bags
    expect(getStockDeduction(thirdProduct, 'KG', 3)).toBe(1);
  });

  it('returns 0 for non-positive quantity', () => {
    expect(getStockDeduction(bagProduct, 'KG', 0)).toBe(0);
    expect(getStockDeduction(bagProduct, 'KG', -5)).toBe(0);
  });
});

describe('getMaxSaleQuantity', () => {
  it('caps by stock in the chosen unit', () => {
    expect(getMaxSaleQuantity(bagProduct, 'BAG')).toBe(10);
    expect(getMaxSaleQuantity(bagProduct, 'KG')).toBe(500); // 10 bags * 50
    expect(getMaxSaleQuantity(pieceProduct, 'PIECE')).toBe(20);
  });

  it('returns 0 for empty stock', () => {
    expect(getMaxSaleQuantity({ ...bagProduct, currentStock: 0 }, 'BAG')).toBe(0);
  });
});

describe('getRemainingSaleQuantity', () => {
  it('subtracts stock already committed by other cart lines', () => {
    const cart = [
      { product: bagProduct, soldUnit: 'BAG', quantity: 3, lineKey: 'p1:BAG' },
    ];
    // 10 - 3 = 7 bags left, in KG that is 7 * 50 = 350
    expect(getRemainingSaleQuantity(bagProduct, 'KG', cart, 'p1:KG')).toBe(350);
    // Excluding the same line key counts it as available again
    expect(
      getRemainingSaleQuantity(bagProduct, 'BAG', cart, 'p1:BAG')
    ).toBe(10);
  });
});

describe('roundSaleQty', () => {
  it('rounds quantity to 2 decimals', () => {
    expect(roundSaleQty(1.236)).toBe(1.24);
    expect(roundSaleQty(2.5)).toBe(2.5);
    expect(roundSaleQty(0.333)).toBe(0.33);
  });
});
