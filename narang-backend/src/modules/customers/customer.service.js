import { ApiError } from '../../utils/ApiError.js';
import { db } from '../../config/db.js';
import * as partyService from '../parties/party.service.js';

export const getAllCustomers = async ({ search }) => {
  const parties = await partyService.getAllParties({ type: 'CUSTOMER', search });
  return parties.map(partyService.asCustomer);
};

export const getCustomerById = async (id) => {
  const party = await partyService.getPartyById(id);
  return partyService.asCustomer(party);
};

export const createCustomer = async (data) =>
  partyService.createParty({ ...data, partyType: 'CUSTOMER' });

export const updateCustomer = async (id, data) => partyService.updateParty(id, data);

export const deleteCustomer = async (id) => {
  // Idempotent: a replayed offline delete (party already gone) must not 404.
  const existing = await db.party.findUnique({ where: { id } });
  if (!existing) return { id, alreadyDeleted: true };
  const blockers = await partyService.getPartyDeletionBlockers(id);
  if (blockers.sales.length > 0) {
    throw new ApiError(409, 'Customer is linked to existing sales', {
      code: 'CUSTOMER_IN_USE',
      sales: blockers.sales,
    });
  }
  if (!blockers.canDelete) {
    throw new ApiError(409, 'Customer is linked to existing records', {
      code: 'CUSTOMER_IN_USE',
      ...blockers,
    });
  }
  return partyService.deleteParty(id);
};

export const getCustomerDeletionBlockers = async (id) => {
  const blockers = await partyService.getPartyDeletionBlockers(id);
  return { canDelete: blockers.sales.length === 0, sales: blockers.sales };
};

export const getCustomerAdvanceEntries = async (customerId) =>
  partyService.getPartyAdvanceEntries(customerId);

export const deleteCustomerAdvanceEntry = async (customerId, entryId) =>
  partyService.deletePartyAdvanceEntry(customerId, entryId);

export const addCustomerAdvance = async (customerId, body) =>
  partyService.addPartyAdvance(customerId, body);

export const addCustomerCreditCharge = async (customerId, body) =>
  partyService.addPartyCreditCharge(customerId, body);
