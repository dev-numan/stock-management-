import { usePartiesStore } from '../stores/partiesStore';
import { normalizePhone } from './phone';

/** Find a saved party with the same normalized phone (any customer or supplier). */
export function findPartyByPhoneEverywhere(phone, excludeId) {
  const key = normalizePhone(phone);
  if (!key) return null;

  const party = usePartiesStore.getState().findByPhone(phone);
  if (party && party.id !== excludeId) return party;
  return null;
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
