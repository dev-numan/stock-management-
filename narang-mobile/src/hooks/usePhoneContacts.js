import { useState, useCallback } from 'react';
import * as Contacts from 'expo-contacts';
import { getContactPrimaryPhone } from '../utils/contactFormat';

export function usePhoneContacts() {
  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [permissionDenied, setPermissionDenied] = useState(false);
  const [error, setError] = useState(null);

  const loadContacts = useCallback(async () => {
    setLoading(true);
    setError(null);
    setPermissionDenied(false);
    try {
      const { status } = await Contacts.requestPermissionsAsync();
      if (status !== 'granted') {
        setPermissionDenied(true);
        setContacts([]);
        return;
      }

      const { data } = await Contacts.getContactsAsync({
        fields: [
          Contacts.Fields.Name,
          Contacts.Fields.FirstName,
          Contacts.Fields.LastName,
          Contacts.Fields.PhoneNumbers,
          Contacts.Fields.Addresses,
        ],
        sort: Contacts.SortTypes.FirstName,
      });

      setContacts(data.filter((c) => getContactPrimaryPhone(c)));
    } catch (err) {
      setError(err.message || 'Could not load contacts');
      setContacts([]);
    } finally {
      setLoading(false);
    }
  }, []);

  return { contacts, loading, permissionDenied, error, loadContacts };
}
