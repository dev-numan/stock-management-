import { normalizePhone } from './phone';
import { getContactPrimaryPhone, getContactDisplayName, formatContactAddress } from './contactFormat';
import { matchesPartySearch } from './partySearch';

/** Build searchable picker rows from saved parties + phone contacts. */
export function buildPartyContactPickerItems(parties = [], contacts = []) {
  const items = [];
  const phonesInApp = new Set();

  for (const party of parties) {
    const phone = party.phone || '';
    if (phone) phonesInApp.add(normalizePhone(phone));
    items.push({
      id: `app-${party.id}`,
      name: party.name,
      phone,
      address: party.address || '',
      source: 'app',
      partyType: party.partyType,
      rawParty: party,
    });
  }

  for (const contact of contacts) {
    const phone = getContactPrimaryPhone(contact);
    const phoneKey = normalizePhone(phone);
    if (phoneKey && phonesInApp.has(phoneKey)) continue;

    items.push({
      id: `contact-${contact.id || phoneKey || getContactDisplayName(contact)}`,
      name: getContactDisplayName(contact),
      phone,
      address: formatContactAddress(contact.addresses?.[0]),
      source: 'contact',
      partyType: null,
      rawContact: contact,
    });
  }

  return items.sort((a, b) => a.name.localeCompare(b.name));
}

export function filterPartyPickerItems(items, query) {
  if (!query.trim()) return items;
  return items.filter((item) => matchesPartySearch(item, query));
}

export function findPartyByExactName(parties, name) {
  const q = name.trim().toLowerCase();
  if (!q) return null;
  return parties.find((p) => p.name.trim().toLowerCase() === q) ?? null;
}
