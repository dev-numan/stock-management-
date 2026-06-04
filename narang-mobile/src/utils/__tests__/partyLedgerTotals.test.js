import { computeCombinedLedgerSummary } from '../partyLedgerTotals';

describe('computeCombinedLedgerSummary', () => {
  it('sums customer and supplier balance buckets (not purchases/payments)', () => {
    const customers = [
      { id: 'c1', advanceBalance: 500 },
      { id: 'c2', advanceBalance: -200 },
    ];
    const suppliers = [
      { payableBalance: 1000 },
      { payableBalance: -50 },
    ];
    expect(computeCombinedLedgerSummary(customers, suppliers)).toEqual({
      youWillGive: 1500,
      youWillGet: 250,
    });
  });
});
