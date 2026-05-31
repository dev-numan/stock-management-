import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { View, FlatList, Keyboard, Platform, useWindowDimensions } from 'react-native';
import { Modal, Portal, Text, Searchbar, Card, IconButton, useTheme } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { formatCurrency } from '../../utils/formatCurrency';
import { formatExpiryLabel } from '../../utils/expiry';
import { ProductSearchSkeleton } from '../common/Skeleton';
import ErrorMessage from '../common/ErrorMessage';
import { useProductsStore } from '../../stores/productsStore';
import { formatStockDisplay, getUnitPrice, hasAlternateSale } from '../../utils/productUnits';

const LIST_ROW_GAP = 8;

export default function ProductSearchModal({ visible, onClose, onSelect }) {
  const theme = useTheme();
  const { height: windowHeight } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const [search, setSearch] = useState('');

  const products = useProductsStore((s) => s.products);
  const loading = useProductsStore((s) => s.loading);
  const error = useProductsStore((s) => s.error);
  const fetchProducts = useProductsStore((s) => s.fetchProducts);
  const getFiltered = useProductsStore((s) => s.getFiltered);

  useEffect(() => {
    if (!visible) {
      setSearch('');
      return;
    }
    fetchProducts(true);
  }, [visible, fetchProducts]);

  const displayProducts = useMemo(
    () => getFiltered({ search }),
    [search, products, getFiltered]
  );

  const emptyLabel = search.trim()
    ? `No products match "${search.trim()}"`
    : error
      ? 'Could not load products'
      : 'No products found';

  const topOffset = insets.top + 12;
  const sheetHeight = windowHeight - topOffset;
  const skeletonCount = Math.max(6, Math.floor((sheetHeight - 160) / 72));

  const renderProductRow = useCallback(
    ({ item }) => (
      <Card
        mode="elevated"
        style={{ marginBottom: LIST_ROW_GAP, borderRadius: theme.roundness }}
        onPress={() => onSelect(item)}
      >
        <Card.Content style={{ paddingVertical: 10 }}>
          <Text variant="titleSmall" style={{ fontWeight: '600' }} numberOfLines={1}>
            {item.name}
          </Text>
          <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }} numberOfLines={2}>
            {formatCurrency(item.salePrice)} / {item.unit}
            {hasAlternateSale(item)
              ? ` · ${formatCurrency(getUnitPrice(item, item.alternateSaleUnit))} / ${item.alternateSaleUnit} · Tap to pick unit`
              : ''}
            {' · Stock: '}
            {formatStockDisplay(item)}
            {item.expiryDate ? ` · ${formatExpiryLabel(item.expiryDate)}` : ''}
          </Text>
        </Card.Content>
      </Card>
    ),
    [theme.roundness, theme.colors.onSurfaceVariant, onSelect]
  );

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
            marginBottom: 12,
          }}
        >
          <Text variant="headlineSmall" style={{ fontWeight: '700' }}>
            Add Product
          </Text>
          <IconButton icon="close" onPress={onClose} style={{ margin: 0 }} />
        </View>

        <Searchbar
          placeholder="Search products..."
          value={search}
          onChangeText={setSearch}
          loading={loading && products.length === 0}
          style={{ marginBottom: 12, borderRadius: theme.roundness }}
        />
        <ErrorMessage message={error} />

        <View style={{ flex: 1, minHeight: 0 }}>
          {loading && products.length === 0 && !search.trim() ? (
            <ProductSearchSkeleton count={skeletonCount} />
          ) : (
            <FlatList
              data={displayProducts}
              keyExtractor={(item) => String(item.id)}
              renderItem={renderProductRow}
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
              showsVerticalScrollIndicator
              onScrollBeginDrag={Keyboard.dismiss}
              contentContainerStyle={{
                paddingBottom: insets.bottom + 16,
              }}
              ListEmptyComponent={
                <Text
                  variant="bodyMedium"
                  style={{
                    color: theme.colors.onSurfaceVariant,
                    textAlign: 'center',
                    paddingVertical: 32,
                  }}
                >
                  {emptyLabel}
                </Text>
              }
            />
          )}
        </View>
      </Modal>
    </Portal>
  );
}
