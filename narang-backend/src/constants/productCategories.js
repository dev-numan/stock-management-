/** Fixed product categories (not stored in a separate DB table). */
export const PRODUCT_CATEGORIES = ['Fertilizers', 'Pesticides', 'Seeds', 'Other'];

export const isValidProductCategory = (value) =>
  PRODUCT_CATEGORIES.includes(String(value || '').trim());
