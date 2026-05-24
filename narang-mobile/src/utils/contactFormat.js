/** Build a single address line from an Expo contact address entry. */
export const formatContactAddress = (address) => {
  if (!address) return '';
  return [address.street, address.city, address.region, address.postalCode, address.country]
    .filter(Boolean)
    .join(', ');
};

/** Pick primary phone from Expo contact phone numbers. */
export const getContactPrimaryPhone = (contact) => {
  const numbers = contact?.phoneNumbers;
  if (!numbers?.length) return '';
  const mobile = numbers.find((p) => /mobile|cell|iphone/i.test(p.label || ''));
  return (mobile || numbers[0])?.number?.trim() || '';
};

export const getContactDisplayName = (contact) => {
  if (contact?.name) return contact.name.trim();
  const first = contact?.firstName?.trim() || '';
  const last = contact?.lastName?.trim() || '';
  return `${first} ${last}`.trim() || 'Unknown';
};
