import { ApiError } from '../../utils/ApiError.js';
import { db } from '../../config/db.js';
import * as partyService from '../parties/party.service.js';

export const getAllSuppliers = async ({ search }) =>
  partyService.getAllParties({ type: 'SUPPLIER', search });

export const getSupplierById = async (id) => partyService.getPartyById(id);

export const createSupplier = async (data) =>
  partyService.createParty({ ...data, partyType: 'SUPPLIER' });

export const updateSupplier = async (id, data) => partyService.updateParty(id, data);

export const deleteSupplier = async (id) => {
  // Idempotent: a replayed offline delete (party already gone) must not 404.
  const existing = await db.party.findUnique({ where: { id } });
  if (!existing) return { id, alreadyDeleted: true };
  const blockers = await partyService.getPartyDeletionBlockers(id);
  if (!blockers.canDelete) {
    throw new ApiError(409, 'Supplier is linked to products or purchases', {
      code: 'SUPPLIER_IN_USE',
      products: blockers.products,
      purchases: blockers.purchases,
    });
  }
  return partyService.deleteParty(id);
};

export const getSupplierDeletionBlockers = async (id) => {
  const blockers = await partyService.getPartyDeletionBlockers(id);
  return {
    canDelete: blockers.products.length === 0 && blockers.purchases.length === 0,
    products: blockers.products,
    purchases: blockers.purchases,
  };
};

export const getSupplierLedger = async (supplierId, opts) =>
  partyService.getPartySupplierLedger(supplierId, opts);

export const addSupplierPayment = async (supplierId, body) =>
  partyService.addPartyPayment(supplierId, body);

export const addSupplierPurchase = async (supplierId, body) =>
  partyService.addPartyPurchase(supplierId, body);

export const deleteSupplierPayment = async (supplierId, paymentId) =>
  partyService.deletePartyPayment(supplierId, paymentId);

export async function computeSupplierPayable(supplierId) {
  const party = await partyService.getPartyById(supplierId);
  return party.payableBalance;
}
