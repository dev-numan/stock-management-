export const PRODUCT_FILTER_LABEL_KEYS = {
  all: 'products.filterAll',
  lowStock: 'products.filterLowStock',
  inStock: 'products.filterInStock',
  outOfStock: 'products.filterOutOfStock',
  expiringSoon: 'products.filterExpiringSoon',
};

export const PRODUCT_SORT_LABEL_KEYS = {
  newest: 'products.sortNewest',
  stockValueDesc: 'products.sortStockValueHigh',
  nameAsc: 'products.sortNameAsc',
  oldest: 'products.sortOldest',
  stockValueAsc: 'products.sortStockValueLow',
  nameDesc: 'products.sortNameDesc',
};

export const PARTY_FILTER_LABEL_KEYS = {
  all: 'party.filterAll',
  youWillGet: 'ledger.youWillGet',
  youWillGive: 'ledger.youWillGive',
};

export const PARTY_TYPE_FILTER_LABEL_KEYS = {
  all: 'party.filterAll',
  customer: 'parties.typeCustomer',
  supplier: 'parties.typeSupplier',
};

export const PARTY_SORT_LABEL_KEYS = {
  newest: 'party.sortNewest',
  amountDesc: 'party.sortAmountHigh',
  oldest: 'party.sortOldest',
  amountAsc: 'party.sortAmountLow',
};

/** Build removable filter/sort/search tags for list screens. */
export function buildListFilterTags({
  t,
  filter,
  partyType,
  sort,
  search,
  defaultFilter = 'all',
  defaultPartyType = 'all',
  defaultSort = 'newest',
  filterLabelKeys,
  partyTypeLabelKeys,
  sortLabelKeys,
  onClearFilter,
  onClearPartyType,
  onClearSort,
  onClearSearch,
}) {
  const tags = [];

  if (partyType && partyType !== defaultPartyType && partyTypeLabelKeys?.[partyType]) {
    tags.push({
      id: 'partyType',
      label: t(partyTypeLabelKeys[partyType]),
      onRemove: onClearPartyType,
    });
  }

  if (filter && filter !== defaultFilter && filterLabelKeys[filter]) {
    tags.push({
      id: 'filter',
      label: t(filterLabelKeys[filter]),
      onRemove: onClearFilter,
    });
  }

  if (sort && sort !== defaultSort && sortLabelKeys[sort]) {
    tags.push({
      id: 'sort',
      label: t(sortLabelKeys[sort]),
      onRemove: onClearSort,
    });
  }

  const q = search?.trim();
  if (q && onClearSearch) {
    tags.push({
      id: 'search',
      label: t('filters.searchTag', { query: q }),
      onRemove: onClearSearch,
    });
  }

  return tags;
}
