import React, { useState, useEffect, useMemo } from 'react';
import { View, FlatList, Keyboard, Platform } from 'react-native';
import { Modal, Portal, Text, Searchbar, Card, IconButton, useTheme } from 'react-native-paper';
import { formatCurrency } from '../../utils/formatCurrency';
import { ProductListSkeleton } from '../common/Skeleton';
import { useProductsStore } from '../../stores/productsStore';

export default function ProductSearchModal({ visible, onClose, onSelect }) {
  const theme = useTheme();
  const [search, setSearch] = useState('');
  const products = useProductsStore((s) => s.products);
  const loading = useProductsStore((s) => s.loading);
  const fetchProducts = useProductsStore((s) => s.fetchProducts);

  useEffect(() => {
    if (!visible) return;
    fetchProducts();
  }, [visible, fetchProducts]);

  const filtered = useMemo(
    () => useProductsStore.getState().getFiltered({ search }),
    [products, search]
  );

  return (
    <Portal>
      <Modal
        visible={visible}
        onDismiss={onClose}
        contentContainerStyle={{
          flex: 1,
          marginTop: 48,
          backgroundColor: theme.colors.background,
          borderTopLeftRadius: theme.roundness * 2,
          borderTopRightRadius: theme.roundness * 2,
        }}
      >
        <View style={{ flex: 1, paddingHorizontal: 16, paddingTop: 16 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <Text variant="headlineSmall" style={{ fontWeight: '700' }}>
              Add Product
            </Text>
            <IconButton icon="close" onPress={onClose} />
          </View>
          <Searchbar
            placeholder="Search products..."
            value={search}
            onChangeText={setSearch}
            style={{ marginBottom: 12, borderRadius: theme.roundness }}
          />
          {loading && products.length === 0 ? (
            <ProductListSkeleton count={5} />
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
                  No products found
                </Text>
              }
              renderItem={({ item }) => (
                <Card
                  mode="elevated"
                  style={{ marginBottom: 8, borderRadius: theme.roundness }}
                  onPress={() => {
                    onSelect(item);
                    onClose();
                  }}
                >
                  <Card.Content>
                    <Text variant="titleSmall" style={{ fontWeight: '600' }}>
                      {item.name}
                    </Text>
                    <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                      {formatCurrency(item.salePrice)} · Stock: {Number(item.currentStock)}
                    </Text>
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
