import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { View, FlatList, Keyboard, Platform, useWindowDimensions } from 'react-native';
import { Modal, Portal, Text, Searchbar, Card, Chip, IconButton, ActivityIndicator, useTheme } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Contacts from 'expo-contacts';
import { formatContactAddress, getContactDisplayName, getContactPrimaryPhone } from '../../utils/contactFormat';
import { formatPhoneDisplay, normalizePhone } from '../../utils/phone';
import { useCustomersStore } from '../../stores/customersStore';

function buildPickerItems(appCustomers, contacts) {
  const items = [];
  const phonesInApp = new Set();

  for (const customer of appCustomers) {
    const phone = customer.phone || '';
    if (phone) phonesInApp.add(normalizePhone(phone));
    items.push({
      id: `app-${customer.id}`,
      name: customer.name,
      phone,
      address: customer.address || '',
      source: 'app',
      rawCustomer: customer,
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
      rawContact: contact,
    });
  }

  return items.sort((a, b) => a.name.localeCompare(b.name));
}

function filterPickerItems(items, query) {
  const q = query.trim().toLowerCase();
  if (!q) return items;
  const qDigits = q.replace(/\D/g, '');
  return items.filter((item) => {
    const name = item.name.toLowerCase();
    const phone = item.phone.replace(/\D/g, '');
    return name.includes(q) || (qDigits.length > 0 && phone.includes(qDigits));
  });
}

export default function CustomerContactPickerModal({ visible, onClose, onSelect, resolving }) {
  const theme = useTheme();
  const { height: windowHeight } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const [search, setSearch] = useState('');
  const [contacts, setContacts] = useState([]);
  const [contactsLoading, setContactsLoading] = useState(false);
  const [permissionDenied, setPermissionDenied] = useState(false);
  const [contactsError, setContactsError] = useState(null);

  const appCustomers = useCustomersStore((s) => s.customers);
  const fetchCustomers = useCustomersStore((s) => s.fetchCustomers);

  const loadContacts = useCallback(async () => {
    setContactsLoading(true);
    setContactsError(null);
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
      setContactsError(err.message || 'Could not load contacts');
    } finally {
      setContactsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!visible) {
      setSearch('');
      return;
    }
    fetchCustomers(true);
    loadContacts();
  }, [visible, fetchCustomers, loadContacts]);

  // Purely local search: filter the saved customers (from the store) and the
  // loaded phone contacts as the user types — no per-keystroke network calls.
  const pickerItems = useMemo(
    () => buildPickerItems(appCustomers, contacts),
    [appCustomers, contacts]
  );

  const filtered = useMemo(() => filterPickerItems(pickerItems, search), [pickerItems, search]);

  const topOffset = insets.top + 48;
  const sheetHeight = windowHeight - topOffset;
  const showContactsSpinner = contactsLoading && contacts.length === 0 && appCustomers.length === 0;

  const emptyLabel = search.trim()
    ? `No customers match "${search.trim()}"`
    : permissionDenied
      ? 'No app customers yet. Allow contacts in Settings or add customers from More.'
      : 'No customers or contacts found';

  const handleSelect = (item) => {
    if (resolving) return;
    if (item.source === 'app') {
      onSelect({ type: 'app', customer: item.rawCustomer });
      return;
    }
    onSelect({ type: 'contact', contact: item.rawContact });
  };

  return (
    <Portal>
      <Modal
        visible={visible}
        onDismiss={onClose}
        dismissable={!resolving}
        style={{ justifyContent: 'flex-end', margin: 0 }}
        contentContainerStyle={{
          height: sheetHeight,
          backgroundColor: theme.colors.background,
          borderTopLeftRadius: theme.roundness * 2,
          borderTopRightRadius: theme.roundness * 2,
          paddingHorizontal: 16,
          paddingTop: 16,
        }}
      >
        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 8,
          }}
        >
          <Text variant="headlineSmall" style={{ fontWeight: '700' }}>
            Select customer
          </Text>
          <IconButton icon="close" onPress={onClose} disabled={resolving} style={{ margin: 0 }} />
        </View>
        <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, marginBottom: 12 }}>
          Search saved customers or phone contacts.
        </Text>

        <Searchbar
          placeholder="Search name or phone..."
          value={search}
          onChangeText={setSearch}
          editable={!resolving}
          style={{ marginBottom: 12, borderRadius: theme.roundness }}
        />

        {contactsError ? (
          <Text variant="bodySmall" style={{ color: theme.colors.error, marginBottom: 8 }}>
            {contactsError}
          </Text>
        ) : null}

        <View style={{ flex: 1, minHeight: 0 }}>
          {showContactsSpinner ? (
            <ActivityIndicator animating size="large" color={theme.colors.primary} style={{ marginTop: 32 }} />
          ) : (
            <FlatList
              data={filtered}
              keyExtractor={(item) => item.id}
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
              onScrollBeginDrag={Keyboard.dismiss}
              contentContainerStyle={{
                paddingBottom: insets.bottom + 24,
                flexGrow: filtered.length === 0 ? 1 : undefined,
              }}
              ListEmptyComponent={
                <Text
                  variant="bodyMedium"
                  style={{ color: theme.colors.onSurfaceVariant, textAlign: 'center', paddingVertical: 32 }}
                >
                  {emptyLabel}
                </Text>
              }
              renderItem={({ item }) => (
                <Card
                  mode="elevated"
                  style={{ marginBottom: 8, borderRadius: theme.roundness }}
                  onPress={() => handleSelect(item)}
                >
                  <Card.Content>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <View style={{ flex: 1, marginRight: 8 }}>
                        <Text variant="titleSmall" style={{ fontWeight: '600' }}>
                          {item.name}
                        </Text>
                        {item.phone ? (
                          <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, marginTop: 2 }}>
                            {formatPhoneDisplay(item.phone)}
                          </Text>
                        ) : null}
                        {item.address ? (
                          <Text variant="labelSmall" style={{ color: theme.colors.outline, marginTop: 4 }} numberOfLines={2}>
                            {item.address}
                          </Text>
                        ) : null}
                      </View>
                      <Chip
                        compact
                        mode="flat"
                        style={{
                          backgroundColor:
                            item.source === 'app' ? theme.colors.primaryContainer : theme.colors.secondaryContainer,
                        }}
                      >
                        {item.source === 'app' ? 'Saved' : 'Contact'}
                      </Chip>
                    </View>
                  </Card.Content>
                </Card>
              )}
            />
          )}
        </View>

        {resolving ? (
          <View
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'rgba(0,0,0,0.2)',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Card style={{ padding: 24, borderRadius: theme.roundness }}>
              <ActivityIndicator animating color={theme.colors.primary} />
              <Text variant="bodyMedium" style={{ marginTop: 8, color: theme.colors.onSurfaceVariant }}>
                Saving customer...
              </Text>
            </Card>
          </View>
        ) : null}
      </Modal>
    </Portal>
  );
}
