import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { View, FlatList, Keyboard, Platform, useWindowDimensions } from 'react-native';
import {
  Modal,
  Portal,
  Text,
  Searchbar,
  Card,
  Chip,
  IconButton,
  ActivityIndicator,
  Button,
  useTheme,
} from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Contacts from 'expo-contacts';
import { getContactDisplayName, getContactPrimaryPhone } from '../../utils/contactFormat';
import { formatPhoneDisplay, normalizePhone } from '../../utils/phone';
import { usePartiesStore } from '../../stores/partiesStore';
import { useSuppliersStore } from '../../stores/suppliersStore';
import {
  buildPartyContactPickerItems,
  filterPartyPickerItems,
  findPartyByExactName,
} from '../../utils/partyPickerItems';
import { useTranslation } from '../../i18n/useTranslation';

export default function SupplierPickerModal({ visible, onClose, onSelect, fillFormOnly = false }) {
  const theme = useTheme();
  const { t, isRtl } = useTranslation();
  const textDir = { writingDirection: isRtl ? 'rtl' : 'ltr' };
  const { height: windowHeight } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const [search, setSearch] = useState('');
  const [contacts, setContacts] = useState([]);
  const [contactsLoading, setContactsLoading] = useState(false);
  const [permissionDenied, setPermissionDenied] = useState(false);
  const [contactsError, setContactsError] = useState(null);
  const [creating, setCreating] = useState(false);

  const parties = usePartiesStore((s) => s.parties);
  const partiesLoading = usePartiesStore((s) => s.loading);
  const fetchParties = usePartiesStore((s) => s.fetchParties);
  const createSupplier = useSuppliersStore((s) => s.createSupplier);

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
      setContactsError(err.message || t('customer.contactsLoadFailed'));
    } finally {
      setContactsLoading(false);
    }
  }, [t]);

  useEffect(() => {
    if (!visible) {
      setSearch('');
      return;
    }
    fetchParties(true);
    loadContacts();
  }, [visible, fetchParties, loadContacts]);

  const pickerItems = useMemo(
    () => buildPartyContactPickerItems(parties, contacts),
    [parties, contacts]
  );

  const filtered = useMemo(() => filterPartyPickerItems(pickerItems, search), [pickerItems, search]);

  const trimmedSearch = search.trim();
  const exactAppMatch = useMemo(() => {
    if (!trimmedSearch) return null;
    return findPartyByExactName(parties, trimmedSearch);
  }, [parties, trimmedSearch]);

  const canUseNewName = trimmedSearch.length > 0 && !exactAppMatch;

  const topOffset = insets.top + 48;
  const sheetHeight = windowHeight - topOffset;
  const loading = partiesLoading || contactsLoading;
  const showSpinner = loading && parties.length === 0 && contacts.length === 0;

  const emptyLabel = trimmedSearch
    ? t('supplier.noMatch', { query: trimmedSearch })
    : permissionDenied
      ? t('customer.noContactsPermission')
      : t('supplier.empty');

  const handlePickApp = (party) => {
    if (fillFormOnly) {
      onSelect({ type: 'app', party });
    } else {
      onSelect(party);
    }
    onClose();
  };

  const handlePickContact = async (contact) => {
    const phone = getContactPrimaryPhone(contact);
    const name = getContactDisplayName(contact);
    if (!name) return;

    const existing = phone
      ? parties.find((p) => normalizePhone(p.phone) === normalizePhone(phone))
      : null;
    if (existing) {
      handlePickApp(existing);
      return;
    }

    if (fillFormOnly) {
      onSelect({ type: 'contact', contact });
      onClose();
      return;
    }

    try {
      setCreating(true);
      const created = await createSupplier({ name, ...(phone ? { phone } : {}) });
      handlePickApp(created);
    } catch (err) {
      setContactsError(err.message || t('supplier.loadFailed'));
    } finally {
      setCreating(false);
    }
  };

  const handleUseNewName = async () => {
    const existing = findPartyByExactName(parties, trimmedSearch);
    if (existing) {
      handlePickApp(existing);
      return;
    }
    if (fillFormOnly) {
      onSelect({ type: 'new', name: trimmedSearch });
      onClose();
      return;
    }
    try {
      setCreating(true);
      const created = await createSupplier({ name: trimmedSearch });
      onSelect(created);
      onClose();
    } catch (err) {
      setContactsError(err.message || t('supplier.loadFailed'));
    } finally {
      setCreating(false);
    }
  };

  if (!visible) return null;

  return (
    <Portal>
      <Modal
        visible
        onDismiss={onClose}
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
          <Text variant="headlineSmall" style={{ fontWeight: '700', ...textDir }}>
            {t('supplier.selectTitle')}
          </Text>
          <IconButton icon="close" onPress={onClose} style={{ margin: 0 }} />
        </View>
        <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, marginBottom: 12, ...textDir }}>
          {t('supplier.selectHint')}
        </Text>

        <Searchbar
          placeholder={t('supplier.searchPlaceholder')}
          value={search}
          onChangeText={setSearch}
          autoFocus
          style={{ marginBottom: 12, borderRadius: theme.roundness }}
        />

        {canUseNewName ? (
          <Button
            mode="outlined"
            icon="plus"
            onPress={handleUseNewName}
            loading={creating}
            disabled={creating}
            style={{ marginBottom: 12, borderRadius: theme.roundness }}
          >
            {t('supplier.useNewName', { name: trimmedSearch })}
          </Button>
        ) : null}

        {contactsError ? (
          <Text variant="bodySmall" style={{ color: theme.colors.error, marginBottom: 8 }}>
            {contactsError}
          </Text>
        ) : null}

        <View style={{ flex: 1, minHeight: 0 }}>
          {showSpinner ? (
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
                  style={{ color: theme.colors.onSurfaceVariant, textAlign: 'center', paddingVertical: 32, ...textDir }}
                >
                  {emptyLabel}
                </Text>
              }
              renderItem={({ item }) => (
                <Card
                  mode="elevated"
                  style={{ marginBottom: 8, borderRadius: theme.roundness }}
                  onPress={() => {
                    if (creating) return;
                    if (item.source === 'app') handlePickApp(item.rawParty);
                    else handlePickContact(item.rawContact);
                  }}
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
                      </View>
                      <Chip compact mode="flat">
                        {item.source === 'app'
                          ? item.partyType === 'CUSTOMER'
                            ? t('parties.typeCustomer')
                            : t('parties.typeSupplier')
                          : t('customer.contact')}
                      </Chip>
                    </View>
                  </Card.Content>
                </Card>
              )}
            />
          )}
        </View>
      </Modal>
    </Portal>
  );
}
