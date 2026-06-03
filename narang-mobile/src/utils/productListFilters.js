import { daysUntilExpiry } from './expiry';

export const PRODUCT_FILTERS = ['all', 'lowStock', 'inStock', 'outOfStock', 'expiringSoon'];

export const PRODUCT_SORTS = [
  'newest',
  'stockValueDesc',
  'nameAsc',
  'oldest',
  'stockValueAsc',
  'nameDesc',
];

const EXPIRING_SOON_DAYS = 60;

export function stockSaleValue(product) {
  const qty = Number(product.currentStock) || 0;
  return qty * (Number(product.salePrice) || 0);
}

export function matchesProductFilter(product, filter) {
  const stock = Number(product.currentStock) || 0;
  const min = Number(product.minStockAlert) || 0;

  switch (filter) {
    case 'lowStock':
      return stock <= min;
    case 'inStock':
      return stock > 0;
    case 'outOfStock':
      return stock <= 0;
    case 'expiringSoon': {
      if (!product.expiryDate) return false;
      const days = daysUntilExpiry(product.expiryDate);
      return days !== null && days >= 0 && days <= EXPIRING_SOON_DAYS;
    }
    default:
      return true;
  }
}

export function sortProducts(list, sort) {
  const items = [...list];
  const byName = (a, b) =>
    (a.name || '').localeCompare(b.name || '', undefined, { sensitivity: 'base' });

  switch (sort) {
    case 'oldest':
      return items.sort(
        (a, b) => new Date(a.createdAt || 0) - new Date(b.createdAt || 0)
      );
    case 'nameAsc':
      return items.sort(byName);
    case 'nameDesc':
      return items.sort((a, b) => byName(b, a));
    case 'stockValueDesc':
      return items.sort((a, b) => stockSaleValue(b) - stockSaleValue(a));
    case 'stockValueAsc':
      return items.sort((a, b) => stockSaleValue(a) - stockSaleValue(b));
    case 'newest':
    default:
      return items.sort(
        (a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0)
      );
  }
}

export function filterAndSortProducts(products, { search = '', filter = 'all', sort = 'newest' } = {}) {
  let list = products;
  if (search.trim()) {
    const q = search.trim().toLowerCase();
    list = list.filter((p) => p.name?.toLowerCase().includes(q));
  }
  if (filter && filter !== 'all') {
    list = list.filter((p) => matchesProductFilter(p, filter));
  }
  return sortProducts(list, sort);
}
