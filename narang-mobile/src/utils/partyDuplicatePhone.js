import { usePartiesStore } from '../stores/partiesStore';
import { useCustomersStore } from '../stores/customersStore';
import { useSuppliersStore } from '../stores/suppliersStore';
import { normalizePhone } from './phone';
import { findDuplicateParty } from './partySearch';

/** Find a saved party with the same normalized phone (any customer or supplier). */
export function findPartyByPhoneEverywhere(phone, excludeId) {
  const key = normalizePhone(phone);
  if (!key) return null;

  const parties = usePartiesStore.getState().parties;
  let duplicate = findDuplicateParty(parties, { phone, excludeId });
  if (duplicate) return duplicate;

  const customers = useCustomersStore.getState().customers;
  duplicate = findDuplicateParty(
    customers.map((c) => ({ ...c, partyType: 'CUSTOMER' })),
    { phone, excludeId }
  );
  if (duplicate) return duplicate;

  const suppliers = useSuppliersStore.getState().suppliers;
  duplicate = findDuplicateParty(
    suppliers.map((s) => ({ ...s, partyType: 'SUPPLIER' })),
    { phone, excludeId }
  );
  return duplicate ?? null;
}

export function phoneDuplicateMessage(t, existing) {
  if (existing?.name) {
    return t('party.phoneAlreadyExists', { name: existing.name });
  }
  return t('party.phoneAlreadyExistsGeneric');
}

export function isDuplicatePhoneError(message) {
  if (!message || typeof message !== 'string') return false;
  return /phone.*already|already.*phone|already saved/i.test(message);
}
