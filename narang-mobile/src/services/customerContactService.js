import { useCustomersStore } from '../stores/customersStore';
import { normalizePhone } from '../utils/phone';
import { formatContactAddress, getContactPrimaryPhone, getContactDisplayName } from '../utils/contactFormat';

export const contactToCustomerPayload = (contact) => {
  const phone = getContactPrimaryPhone(contact);
  const name = getContactDisplayName(contact);
  const address = formatContactAddress(contact?.addresses?.[0]);

  return { name, phone, address };
};

/**
 * Match contact to app customer by phone, or create a new customer.
 */
export const resolveContactToCustomer = async (contact) => {
  const { name, phone, address } = contactToCustomerPayload(contact);

  if (!phone) {
    throw new Error('Selected contact has no phone number');
  }
  if (!name) {
    throw new Error('Selected contact has no name');
  }

  await useCustomersStore.getState().fetchCustomers(true);
  const existing = useCustomersStore.getState().findByPhone(phone);

  if (existing) {
    if (address && !existing.address && existing.id && !String(existing.id).startsWith('local-')) {
      try {
        await useCustomersStore.getState().updateCustomer(existing.id, { address });
      } catch {
        // keep existing record if update fails
      }
    }
    return { ...useCustomersStore.getState().findByPhone(phone), isExisting: true };
  }

  const created = await useCustomersStore.getState().createCustomer({
    name,
    phone,
    ...(address ? { address } : {}),
  });
  return { ...created, isExisting: false };
};

export const findAppCustomerByPhone = (phone) => {
  return useCustomersStore.getState().findByPhone(phone);
};
