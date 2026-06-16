import { usePartiesStore } from '../stores/partiesStore';
import { findDuplicateParty } from './partySearch';
import { normalizePhone } from './phone';

export class OfflineValidationError extends Error {
  constructor(message, code = 'VALIDATION') {
    super(message);
    this.name = 'OfflineValidationError';
    this.code = code;
  }
}

/** Mirror backend duplicate-phone rule using the persisted local party list. */
export function validatePartyPhoneUnique(phone, excludeId) {
  const key = normalizePhone(phone);
  if (!key) return;

  const parties = usePartiesStore.getState().parties;
  const duplicate = findDuplicateParty(parties, { phone, excludeId });
  if (duplicate) {
    const label = duplicate.partyType === 'SUPPLIER' ? 'Supplier' : 'Customer';
    throw new OfflineValidationError(
      `${label} with this phone is already saved (${duplicate.name})`,
      'DUPLICATE_PHONE'
    );
  }
}

export function validateProductPrices({ costPrice, salePrice, currentStock, minStockAlert }) {
  const cost = Number(costPrice);
  const sale = Number(salePrice);
  if (Number.isFinite(cost) && Number.isFinite(sale) && sale < cost) {
    throw new OfflineValidationError('Sale price cannot be less than cost price', 'PRODUCT_PRICE');
  }
  const stock = Number(currentStock ?? 0);
  const minAlert = Number(minStockAlert ?? 10);
  if (stock > 0 && minAlert > stock) {
    throw new OfflineValidationError(
      `Low stock alert cannot exceed current stock (${stock})`,
      'PRODUCT_STOCK'
    );
  }
}

/** HTTP statuses that will not succeed on blind retry — block until data is fixed. */
export function isPermanentSyncError(err) {
  const status = err?.response?.status;
  if (status === 400 || status === 404 || status === 409 || status === 422) return true;
  const msg = String(err?.message || err?.friendlyMessage || '').toLowerCase();
  return /phone.*already|already.*phone|already saved|not found|invalid|cannot be less/i.test(msg);
}
