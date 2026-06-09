import { normalizePhone } from './phone';
import { getContactPrimaryPhone, getContactDisplayName, formatContactAddress } from './contactFormat';

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
  const q = query.trim().toLowerCase();
  if (!q) return items;
  const qDigits = q.replace(/\D/g, '');
  return items.filter((item) => {
    const name = item.name.toLowerCase();
    const phone = (item.phone || '').replace(/\D/g, '');
    return name.includes(q) || (qDigits.length > 0 && phone.includes(qDigits));
  });
}

export function findPartyByExactName(parties, name) {
  const q = name.trim().toLowerCase();
  if (!q) return null;
  return parties.find((p) => p.name.trim().toLowerCase() === q) ?? null;
}
