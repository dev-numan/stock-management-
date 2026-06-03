import { getEffectiveAdvanceBalance } from '../customerBalance';
import { useSalesStore } from '../../stores/salesStore';

// Mock the sales store so we can inject pending offline sales.
jest.mock('../../stores/salesStore', () => ({
  useSalesStore: { getState: jest.fn() },
}));

const setPending = (pendingSales) => {
  useSalesStore.getState.mockReturnValue({ pendingSales });
};

describe('getEffectiveAdvanceBalance', () => {
  beforeEach(() => setPending([]));

  it('returns 0 for a customer without an id', () => {
    expect(getEffectiveAdvanceBalance(null)).toBe(0);
    expect(getEffectiveAdvanceBalance({})).toBe(0);
  });

  it('returns the stored advance balance when there are no pending sales', () => {
    expect(getEffectiveAdvanceBalance({ id: 'c1', advanceBalance: 500 })).toBe(500);
  });

  it('subtracts pending CREDIT sales for that customer', () => {
    setPending([
      { id: 's1', pendingSync: true, paymentMethod: 'CREDIT', customerId: 'c1', totalAmount: 200 },
      { id: 's2', pendingSync: true, paymentMethod: 'CASH', customerId: 'c1', totalAmount: 999 }, // ignored (cash)
      { id: 's3', pendingSync: true, paymentMethod: 'CREDIT', customerId: 'other', totalAmount: 50 }, // other customer
    ]);
    expect(getEffectiveAdvanceBalance({ id: 'c1', advanceBalance: 500 })).toBe(300);
  });

  it('matches pending sales by nested customer id or phone', () => {
    setPending([
      { id: 's1', pendingSync: true, paymentMethod: 'CREDIT', customer: { id: 'c1' }, totalAmount: 100 },
      { id: 's2', pendingSync: true, paymentMethod: 'CREDIT', customer: { phone: '03001234567' }, totalAmount: 100 },
    ]);
    const balance = getEffectiveAdvanceBalance({
      id: 'c1',
      advanceBalance: 0,
      phone: '03001234567',
    });
    expect(balance).toBe(-200); // owes 200 across both matches
  });

  it('can exclude a specific pending sale id', () => {
    setPending([
      { id: 's1', pendingSync: true, paymentMethod: 'CREDIT', customerId: 'c1', totalAmount: 200 },
    ]);
    expect(
      getEffectiveAdvanceBalance({ id: 'c1', advanceBalance: 500 }, { excludePendingSaleId: 's1' })
    ).toBe(500);
  });

  it('ignores non-pending (already synced) sales', () => {
    setPending([
      { id: 's1', pendingSync: false, paymentMethod: 'CREDIT', customerId: 'c1', totalAmount: 200 },
    ]);
    expect(getEffectiveAdvanceBalance({ id: 'c1', advanceBalance: 500 })).toBe(500);
  });
});
