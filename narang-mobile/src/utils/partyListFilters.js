/** Shared filters/sorts for customers & suppliers (balance-based lists). */

export const PARTY_FILTERS = ['all', 'youWillGet', 'youWillGive'];

export const PARTY_TYPE_FILTERS = ['all', 'customer', 'supplier'];

export const PARTY_SORTS = ['newest', 'amountDesc', 'oldest', 'amountAsc'];

export function matchesPartyFilter(item, filter, getBalance) {
  if (!filter || filter === 'all') return true;
  const balance = getBalance(item);
  if (filter === 'youWillGet') return balance < 0;
  if (filter === 'youWillGive') return balance > 0;
  return true;
}

export function matchesPartyType(item, partyType) {
  if (!partyType || partyType === 'all') return true;
  if (partyType === 'customer') return item.partyType === 'customer';
  if (partyType === 'supplier') return item.partyType === 'supplier';
  return true;
}

export function sortParties(list, sort, { getBalance, getCreatedAt = (i) => i.createdAt }) {
  const items = [...list];
  const byName = (a, b) =>
    (a.name || '').localeCompare(b.name || '', undefined, { sensitivity: 'base' });
  const absBalance = (item) => Math.abs(getBalance(item));

  switch (sort) {
    case 'oldest':
      return items.sort(
        (a, b) => new Date(getCreatedAt(a) || 0) - new Date(getCreatedAt(b) || 0)
      );
    case 'amountDesc':
      return items.sort((a, b) => absBalance(b) - absBalance(a) || byName(a, b));
    case 'amountAsc':
      return items.sort((a, b) => absBalance(a) - absBalance(b) || byName(a, b));
    case 'nameAsc':
      return items.sort(byName);
    case 'nameDesc':
      return items.sort((a, b) => byName(b, a));
    case 'newest':
    default:
      return items.sort(
        (a, b) => new Date(getCreatedAt(b) || 0) - new Date(getCreatedAt(a) || 0)
      );
  }
}

export function filterAndSortParties(
  list,
  { filter = 'all', partyType = 'all', sort = 'newest', getBalance, getCreatedAt } = {}
) {
  let result = list;
  if (partyType && partyType !== 'all') {
    result = result.filter((item) => matchesPartyType(item, partyType));
  }
  if (filter && filter !== 'all') {
    result = result.filter((item) => matchesPartyFilter(item, filter, getBalance));
  }
  return sortParties(result, sort, { getBalance, getCreatedAt });
}
