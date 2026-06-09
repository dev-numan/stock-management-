import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { View, FlatList, Keyboard, Platform, Alert, useWindowDimensions } from 'react-native';
import { Modal, Portal, Text, Searchbar, Card, Chip, IconButton, ActivityIndicator, Button, useTheme } from 'react-native-paper';
import AddCustomerQuickModal from '../customers/AddCustomerQuickModal';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Contacts from 'expo-contacts';
import { getContactDisplayName, getContactPrimaryPhone } from '../../utils/contactFormat';
import { formatPhoneDisplay } from '../../utils/phone';
import { usePartiesStore } from '../../stores/partiesStore';
import { useCustomersStore } from '../../stores/customersStore';
import {
  findPartyByPhoneEverywhere,
  phoneDuplicateMessage,
  isDuplicatePhoneError,
} from '../../utils/partyDuplicatePhone';
import { getFriendlyErrorMessage } from '../../utils/apiErrors';
import {
  buildPartyContactPickerItems,
  filterPartyPickerItems,
  findPartyByExactName,
} from '../../utils/partyPickerItems';
import { useTranslation } from '../../i18n/useTranslation';

export default function CustomerContactPickerModal({ visible, onClose, onSelect, resolving }) {
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

  const parties = usePartiesStore((s) => s.parties);
  const fetchParties = usePartiesStore((s) => s.fetchParties);
  const createCustomer = useCustomersStore((s) => s.createCustomer);
  const [quickAddVisible, setQuickAddVisible] = useState(false);
  const [creating, setCreating] = useState(false);

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

  const canAddNew = trimmedSearch.length > 0 && !exactAppMatch;

  const topOffset = insets.top + 48;
  const sheetHeight = windowHeight - topOffset;
  const showContactsSpinner = contactsLoading && contacts.length === 0 && parties.length === 0;

  const emptyLabel = search.trim()
    ? t('customer.noMatch', { query: search.trim() })
    : permissionDenied
      ? t('customer.noContactsPermission')
      : t('customer.emptyPicker');

  const handleSelect = (item) => {
    if (resolving || creating) return;
    if (item.source === 'app') {
      onSelect({ type: 'app', customer: item.rawParty });
      return;
    }
    onSelect({ type: 'contact', contact: item.rawContact });
  };

  const handleQuickAdd = async ({ name, phone }) => {
    try {
      setCreating(true);
      setContactsError(null);
      const trimmedPhone = phone?.trim();
      if (trimmedPhone) {
        await fetchParties(true);
        const duplicate = findPartyByPhoneEverywhere(trimmedPhone);
        if (duplicate) {
          const message = phoneDuplicateMessage(t, duplicate);
          setContactsError(message);
          Alert.alert(t('party.duplicatePhoneTitle'), message);
          return;
        }
      }
      const created = await createCustomer({
        name,
        ...(trimmedPhone ? { phone: trimmedPhone } : {}),
      });
      setQuickAddVisible(false);
      onSelect({ type: 'app', customer: created });
    } catch (err) {
      const friendly = getFriendlyErrorMessage(err, t('customer.addFailed'));
      if (isDuplicatePhoneError(friendly)) {
        setContactsError(friendly);
        Alert.alert(t('party.duplicatePhoneTitle'), friendly);
      } else {
        setContactsError(friendly);
      }
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
            {t('customer.selectTitle')}
          </Text>
          <View style={{ flexDirection: 'row' }}>
            <IconButton
              icon="plus"
              onPress={() => setQuickAddVisible(true)}
              disabled={resolving || creating}
              style={{ margin: 0 }}
              accessibilityLabel={t('customer.addQuickTitle')}
            />
            <IconButton icon="close" onPress={onClose} disabled={resolving || creating} style={{ margin: 0 }} />
          </View>
        </View>
        <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, marginBottom: 12, ...textDir }}>
          {t('customer.selectHint')}
        </Text>

        <Searchbar
          placeholder={t('customer.searchPlaceholder')}
          value={search}
          onChangeText={setSearch}
          editable={!resolving && !creating}
          style={{ marginBottom: 12, borderRadius: theme.roundness }}
        />

        {canAddNew ? (
          <Button
            mode="outlined"
            icon="plus"
            onPress={() => setQuickAddVisible(true)}
            disabled={resolving || creating}
            style={{ marginBottom: 12, borderRadius: theme.roundness }}
          >
            {t('customer.useNewName', { name: trimmedSearch })}
          </Button>
        ) : null}

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
                        {item.source === 'app'
                          ? item.partyType === 'SUPPLIER'
                            ? t('parties.typeSupplier')
                            : t('parties.typeCustomer')
                          : t('customer.contact')}
                      </Chip>
                    </View>
                  </Card.Content>
                </Card>
              )}
            />
          )}
        </View>

        {(resolving || creating) ? (
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
                {t('customer.saving')}
              </Text>
            </Card>
          </View>
        ) : null}
      </Modal>
      <AddCustomerQuickModal
        visible={quickAddVisible}
        initialName={trimmedSearch}
        onSubmit={handleQuickAdd}
        onClose={() => setQuickAddVisible(false)}
        loading={creating}
      />
    </Portal>
  );
}
