import {
  matchesPartyFilter,
  matchesPartyType,
  sortParties,
  filterAndSortParties,
} from '../partyListFilters';

const getBalance = (p) => Number(p.balance ?? 0);

const parties = [
  { id: 'a', name: 'Zubair', balance: -500, createdAt: '2026-01-01', partyType: 'customer' },
  { id: 'b', name: 'Ahmed', balance: 1200, createdAt: '2026-03-01', partyType: 'supplier' },
  { id: 'c', name: 'Bilal', balance: 0, createdAt: '2026-02-01', partyType: 'customer' },
];

describe('matchesPartyFilter', () => {
  it('all → everything', () => {
    expect(parties.every((p) => matchesPartyFilter(p, 'all', getBalance))).toBe(true);
  });

  it('youWillGet → negative balances (they owe us)', () => {
    expect(matchesPartyFilter(parties[0], 'youWillGet', getBalance)).toBe(true);
    expect(matchesPartyFilter(parties[1], 'youWillGet', getBalance)).toBe(false);
    expect(matchesPartyFilter(parties[2], 'youWillGet', getBalance)).toBe(false);
  });

  it('youWillGive → positive balances (we owe them)', () => {
    expect(matchesPartyFilter(parties[1], 'youWillGive', getBalance)).toBe(true);
    expect(matchesPartyFilter(parties[0], 'youWillGive', getBalance)).toBe(false);
  });

  it('settled (zero) parties appear only under "all"', () => {
    expect(matchesPartyFilter(parties[2], 'youWillGet', getBalance)).toBe(false);
    expect(matchesPartyFilter(parties[2], 'youWillGive', getBalance)).toBe(false);
    expect(matchesPartyFilter(parties[2], 'all', getBalance)).toBe(true);
  });
});

describe('matchesPartyType', () => {
  it('filters by party type', () => {
    expect(matchesPartyType(parties[0], 'customer')).toBe(true);
    expect(matchesPartyType(parties[0], 'supplier')).toBe(false);
    expect(matchesPartyType(parties[1], 'all')).toBe(true);
  });
});

describe('sortParties', () => {
  it('newest first by createdAt', () => {
    const out = sortParties(parties, 'newest', { getBalance });
    expect(out.map((p) => p.id)).toEqual(['b', 'c', 'a']);
  });

  it('oldest first', () => {
    const out = sortParties(parties, 'oldest', { getBalance });
    expect(out.map((p) => p.id)).toEqual(['a', 'c', 'b']);
  });

  it('amountDesc by absolute balance', () => {
    const out = sortParties(parties, 'amountDesc', { getBalance });
    expect(out.map((p) => p.id)).toEqual(['b', 'a', 'c']); // 1200, 500, 0
  });

  it('amountAsc by absolute balance', () => {
    const out = sortParties(parties, 'amountAsc', { getBalance });
    expect(out.map((p) => p.id)).toEqual(['c', 'a', 'b']);
  });

  it('does not mutate the input array', () => {
    const copy = [...parties];
    sortParties(parties, 'amountDesc', { getBalance });
    expect(parties).toEqual(copy);
  });
});

describe('filterAndSortParties', () => {
  it('combines type filter, balance filter and sort', () => {
    const out = filterAndSortParties(parties, {
      partyType: 'customer',
      filter: 'youWillGet',
      sort: 'newest',
      getBalance,
    });
    expect(out.map((p) => p.id)).toEqual(['a']);
  });
});
