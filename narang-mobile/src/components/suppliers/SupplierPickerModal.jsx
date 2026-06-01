import React, { useEffect, useMemo, useState } from 'react';
import { View, FlatList, Keyboard, Platform, useWindowDimensions } from 'react-native';
import { Modal, Portal, Text, Searchbar, Card, IconButton, ActivityIndicator, Button, useTheme } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSuppliersStore } from '../../stores/suppliersStore';
import { filterSuppliersForPicker, findSupplierByExactName } from '../../utils/supplierLedger';
import { formatPhoneDisplay } from '../../utils/phone';
import { useTranslation } from '../../i18n/useTranslation';

export default function SupplierPickerModal({ visible, onClose, onSelect }) {
  const theme = useTheme();
  const { t, isRtl } = useTranslation();
  const textDir = { writingDirection: isRtl ? 'rtl' : 'ltr' };
  const { height: windowHeight } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const [search, setSearch] = useState('');

  const suppliers = useSuppliersStore((s) => s.suppliers);
  const loading = useSuppliersStore((s) => s.loading);
  const fetchSuppliers = useSuppliersStore((s) => s.fetchSuppliers);

  useEffect(() => {
    if (!visible) {
      setSearch('');
      return;
    }
    fetchSuppliers(true);
  }, [visible, fetchSuppliers]);

  const filtered = useMemo(
    () => filterSuppliersForPicker(suppliers, search),
    [suppliers, search]
  );

  const trimmedSearch = search.trim();
  const canUseNewName =
    trimmedSearch.length > 0 && !findSupplierByExactName(suppliers, trimmedSearch);

  const topOffset = insets.top + 48;
  const sheetHeight = windowHeight - topOffset;

  const emptyLabel = trimmedSearch
    ? t('supplier.noMatch', { query: trimmedSearch })
    : t('supplier.empty');

  const handlePick = (supplier) => {
    onSelect(supplier);
    onClose();
  };

  const handleUseNewName = () => {
    onSelect({ id: null, name: trimmedSearch, isNew: true });
    onClose();
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
            style={{ marginBottom: 12, borderRadius: theme.roundness }}
          >
            {t('supplier.useNewName', { name: trimmedSearch })}
          </Button>
        ) : null}

        <View style={{ flex: 1, minHeight: 0 }}>
          {loading && suppliers.length === 0 ? (
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
                  onPress={() => handlePick(item)}
                >
                  <Card.Content>
                    <Text variant="titleSmall" style={{ fontWeight: '600' }}>
                      {item.name}
                    </Text>
                    {item.phone ? (
                      <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, marginTop: 2 }}>
                        {formatPhoneDisplay(item.phone)}
                      </Text>
                    ) : null}
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
