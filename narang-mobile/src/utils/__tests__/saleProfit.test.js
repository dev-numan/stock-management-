import { computeLineCogs, computeSaleGrossProfit } from '../saleProfit';

const bagProduct = {
  id: 'p1',
  unit: 'BAG',
  salePrice: 5000,
  costPrice: 4000,
  alternateSaleUnit: 'KG',
  unitsPerStockUnit: 50,
};

const pieceProduct = { id: 'p3', unit: 'PIECE', salePrice: 50, costPrice: 30 };

describe('computeLineCogs', () => {
  it('uses cost price times whole stock units for primary-unit sales', () => {
    expect(computeLineCogs({ product: bagProduct, soldUnit: 'BAG', quantity: 2 })).toBe(8000);
    expect(computeLineCogs({ product: pieceProduct, soldUnit: 'PIECE', quantity: 4 })).toBe(120);
  });

  it('converts alternate-unit quantity to stock units for cost', () => {
    // 100 KG = 2 bags -> 2 * 4000 = 8000
    expect(computeLineCogs({ product: bagProduct, soldUnit: 'KG', quantity: 100 })).toBe(8000);
  });

  it('returns 0 when product is missing', () => {
    expect(computeLineCogs({ quantity: 5 })).toBe(0);
    expect(computeLineCogs(null)).toBe(0);
  });

  it('treats a missing cost price as 0', () => {
    expect(
      computeLineCogs({ product: { unit: 'PIECE' }, soldUnit: 'PIECE', quantity: 3 })
    ).toBe(0);
  });
});

describe('computeSaleGrossProfit', () => {
  it('is revenue minus the sum of line COGS', () => {
    const sale = {
      totalAmount: 11000,
      items: [
        { product: bagProduct, soldUnit: 'BAG', quantity: 2 }, // cogs 8000
        { product: pieceProduct, soldUnit: 'PIECE', quantity: 4 }, // cogs 120
      ],
    };
    expect(computeSaleGrossProfit(sale)).toBe(11000 - 8120);
  });

  it('handles a sale with no items', () => {
    expect(computeSaleGrossProfit({ totalAmount: 500, items: [] })).toBe(500);
    expect(computeSaleGrossProfit({ totalAmount: 500 })).toBe(500);
  });

  it('returns 0 for a null sale', () => {
    expect(computeSaleGrossProfit(null)).toBe(0);
  });

  it('coerces a missing total amount to 0 revenue', () => {
    // revenue 0, cogs 120 -> -120 (a loss, but no NaN)
    const sale = { items: [{ product: pieceProduct, soldUnit: 'PIECE', quantity: 4 }] };
    expect(computeSaleGrossProfit(sale)).toBe(-120);
  });
});
