import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { View, FlatList, RefreshControl } from 'react-native';
import { Searchbar, Switch, FAB, Text, useTheme } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import ProductCard from '../../components/products/ProductCard';
import { ProductListSkeleton } from '../../components/common/Skeleton';
import EmptyState from '../../components/common/EmptyState';
import ErrorMessage from '../../components/common/ErrorMessage';
import { useAuth } from '../../context/AuthContext';
import { useProductsStore } from '../../stores/productsStore';
import { useNetworkStore } from '../../stores/networkStore';

export default function ProductsScreen({ navigation, route }) {
  const theme = useTheme();
  const { isAdmin } = useAuth();
  const [search, setSearch] = useState('');
  const [lowStockOnly, setLowStockOnly] = useState(false);
  const isOnline = useNetworkStore((s) => s.isOnline);

  const products = useProductsStore((s) => s.products);
  const loading = useProductsStore((s) => s.loading);
  const error = useProductsStore((s) => s.error);
  const fetchProducts = useProductsStore((s) => s.fetchProducts);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  useFocusEffect(
    useCallback(() => {
      if (route.params?.lowStockOnly) {
        setLowStockOnly(true);
        navigation.setParams({ lowStockOnly: undefined });
      }
    }, [route.params?.lowStockOnly, navigation])
  );

  const filtered = useMemo(
    () => useProductsStore.getState().getFiltered({ search, lowStock: lowStockOnly }),
    [products, search, lowStockOnly]
  );

  const emptyMessage = lowStockOnly ? 'No low stock products' : 'No products found';

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <View style={{ paddingHorizontal: 16, paddingTop: 8, paddingBottom: 8 }}>
        <Searchbar
          placeholder="Search products..."
          value={search}
          onChangeText={setSearch}
          style={{ marginBottom: 8, borderRadius: theme.roundness }}
        />
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingHorizontal: 12,
            paddingVertical: 10,
            borderRadius: theme.roundness,
            backgroundColor: lowStockOnly ? theme.colors.errorContainer : theme.colors.surfaceVariant,
            borderWidth: 1,
            borderColor: lowStockOnly ? theme.colors.error : theme.colors.outlineVariant,
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1, marginRight: 12 }}>
            <MaterialCommunityIcons
              name="alert"
              size={22}
              color={lowStockOnly ? theme.colors.error : theme.colors.onSurfaceVariant}
            />
            <View style={{ marginLeft: 10, flex: 1 }}>
              <Text
                variant="labelLarge"
                style={{
                  fontWeight: lowStockOnly ? '700' : '500',
                  color: lowStockOnly ? theme.colors.onErrorContainer : theme.colors.onSurface,
                }}
              >
                Low stock only
              </Text>
              <Text
                variant="bodySmall"
                style={{
                  color: lowStockOnly ? theme.colors.onErrorContainer : theme.colors.onSurfaceVariant,
                  marginTop: 2,
                }}
              >
                {lowStockOnly ? 'Active — showing low stock products' : 'Off — showing all products'}
              </Text>
            </View>
          </View>
          <Switch
            value={lowStockOnly}
            onValueChange={setLowStockOnly}
            color={theme.colors.error}
          />
        </View>
        {!isOnline ? (
          <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, marginTop: 8 }}>
            Offline — showing saved products
          </Text>
        ) : null}
      </View>
      <ErrorMessage message={error} />
      <FlatList
        data={loading && filtered.length === 0 ? [] : filtered}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: 16, paddingTop: 0 }}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={() => fetchProducts(true)} />}
        ListEmptyComponent={
          loading ? <ProductListSkeleton count={6} /> : <EmptyState message={emptyMessage} />
        }
        renderItem={({ item }) => (
          <ProductCard
            product={item}
            onPress={() => navigation.navigate('AddEditProduct', { product: item, readOnly: !isAdmin })}
          />
        )}
      />
      {isAdmin ? (
        <FAB
          icon="plus"
          style={{ position: 'absolute', right: 16, bottom: 16, backgroundColor: theme.colors.primary }}
          color={theme.colors.onPrimary}
          onPress={() => navigation.navigate('AddEditProduct', {})}
        />
      ) : null}
    </View>
  );
}
