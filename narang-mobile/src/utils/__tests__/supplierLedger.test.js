import {
  computeSupplierBalanceTotals,
  computeSupplierLedgerTotals,
} from '../supplierLedger';

describe('computeSupplierLedgerTotals', () => {
  it('sums purchases and payments', () => {
    const suppliers = [
      { totalPurchases: 1000, totalPayments: 200 },
      { totalPurchases: 500, totalPayments: 800 },
    ];
    expect(computeSupplierLedgerTotals(suppliers)).toEqual({
      totalPurchases: 1500,
      totalPayments: 1000,
    });
  });
});

describe('computeSupplierBalanceTotals', () => {
  it('sums youWillGive (positive) and youWillGet (negative abs)', () => {
    const suppliers = [
      { payableBalance: 2297357 },
      { payableBalance: 90000 },
      { payableBalance: -155000 },
      { payableBalance: -121350 },
      { payableBalance: 0 },
    ];
    expect(computeSupplierBalanceTotals(suppliers)).toEqual({
      youWillGive: 2387357,
      youWillGet: 276350,
    });
  });
});
