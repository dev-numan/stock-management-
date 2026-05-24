import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { View, FlatList, Keyboard, Platform } from 'react-native';
import { Modal, Portal, Text, Searchbar, Card, Chip, IconButton, ActivityIndicator, useTheme } from 'react-native-paper';
import * as Contacts from 'expo-contacts';
import { formatContactAddress, getContactDisplayName, getContactPrimaryPhone } from '../../utils/contactFormat';
import { findAppCustomerByPhone } from '../../services/customerContactService';
import { formatPhoneDisplay } from '../../utils/phone';
import { useCustomersStore } from '../../stores/customersStore';

export default function CustomerContactPickerModal({ visible, onClose, onSelect, resolving }) {
  const theme = useTheme();
  const [search, setSearch] = useState('');
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

      const withPhone = data.filter((c) => getContactPrimaryPhone(c));
      setContacts(withPhone);
    } catch (err) {
      setError(err.message || 'Could not load contacts');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (visible) {
      setSearch('');
      useCustomersStore.getState().fetchCustomers(true);
      loadContacts();
    }
  }, [visible, loadContacts]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return contacts;
    return contacts.filter((c) => {
      const name = getContactDisplayName(c).toLowerCase();
      const phone = getContactPrimaryPhone(c).replace(/\D/g, '');
      return name.includes(q) || phone.includes(q.replace(/\D/g, ''));
    });
  }, [contacts, search]);

  return (
    <Portal>
      <Modal
        visible={visible}
        onDismiss={onClose}
        dismissable={!resolving}
        contentContainerStyle={{
          flex: 1,
          marginTop: 48,
          backgroundColor: theme.colors.background,
          borderTopLeftRadius: theme.roundness * 2,
          borderTopRightRadius: theme.roundness * 2,
        }}
      >
        <View style={{ flex: 1, paddingHorizontal: 16, paddingTop: 16 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <Text variant="headlineSmall" style={{ fontWeight: '700' }}>
              Select customer
            </Text>
            <IconButton icon="close" onPress={onClose} disabled={resolving} />
          </View>
          <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, marginBottom: 12 }}>
            Choose from phone contacts. Existing customers are linked automatically.
          </Text>
          <Searchbar
            placeholder="Search name or phone..."
            value={search}
            onChangeText={setSearch}
            editable={!resolving}
            style={{ marginBottom: 12, borderRadius: theme.roundness }}
          />
          {loading ? (
            <ActivityIndicator animating size="large" color={theme.colors.primary} style={{ marginTop: 32 }} />
          ) : permissionDenied ? (
            <Text variant="bodyMedium" style={{ color: theme.colors.error, textAlign: 'center', paddingVertical: 32 }}>
              Contacts permission denied. Enable it in phone Settings for Expo Go.
            </Text>
          ) : error ? (
            <Text variant="bodyMedium" style={{ color: theme.colors.error, textAlign: 'center', paddingVertical: 32 }}>
              {error}
            </Text>
          ) : (
            <FlatList
              data={filtered}
              keyExtractor={(item) => item.id}
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
              automaticallyAdjustKeyboardInsets
              onScrollBeginDrag={Keyboard.dismiss}
              ListEmptyComponent={
                <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant, textAlign: 'center', paddingVertical: 32 }}>
                  No contacts with phone numbers
                </Text>
              }
              renderItem={({ item }) => {
                const name = getContactDisplayName(item);
                const phone = getContactPrimaryPhone(item);
                const inApp = !!findAppCustomerByPhone(phone);
                const address = formatContactAddress(item.addresses?.[0]);

                return (
                  <Card
                    mode="elevated"
                    style={{ marginBottom: 8, borderRadius: theme.roundness }}
                    onPress={() => !resolving && onSelect(item)}
                  >
                    <Card.Content>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <View style={{ flex: 1, marginRight: 8 }}>
                          <Text variant="titleSmall" style={{ fontWeight: '600' }}>
                            {name}
                          </Text>
                          <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, marginTop: 2 }}>
                            {formatPhoneDisplay(phone)}
                          </Text>
                          {address ? (
                            <Text variant="labelSmall" style={{ color: theme.colors.outline, marginTop: 4 }} numberOfLines={2}>
                              {address}
                            </Text>
                          ) : null}
                        </View>
                        <Chip compact mode="flat" style={{ backgroundColor: inApp ? theme.colors.primaryContainer : theme.colors.secondaryContainer }}>
                          {inApp ? 'In app' : 'New'}
                        </Chip>
                      </View>
                    </Card.Content>
                  </Card>
                );
              }}
            />
          )}
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
        </View>
      </Modal>
    </Portal>
  );
}
