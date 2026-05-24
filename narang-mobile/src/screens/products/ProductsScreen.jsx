import React, { useState, useEffect, useMemo } from 'react';
import { View, FlatList, RefreshControl } from 'react-native';
import { Searchbar, Chip, FAB, Text, useTheme } from 'react-native-paper';
import ProductCard from '../../components/products/ProductCard';
import { ProductListSkeleton } from '../../components/common/Skeleton';
import EmptyState from '../../components/common/EmptyState';
import ErrorMessage from '../../components/common/ErrorMessage';
import { useAuth } from '../../context/AuthContext';
import { useProductsStore } from '../../stores/productsStore';
import { useNetworkStore } from '../../stores/networkStore';

export default function ProductsScreen({ navigation }) {
  const theme = useTheme();
  const { isAdmin } = useAuth();
  const [search, setSearch] = useState('');
  const [lowStock, setLowStock] = useState(false);
  const isOnline = useNetworkStore((s) => s.isOnline);

  const products = useProductsStore((s) => s.products);
  const loading = useProductsStore((s) => s.loading);
  const error = useProductsStore((s) => s.error);
  const fetchProducts = useProductsStore((s) => s.fetchProducts);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  const filtered = useMemo(
    () => useProductsStore.getState().getFiltered({ search, lowStock }),
    [products, search, lowStock]
  );

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <View style={{ paddingHorizontal: 16, paddingTop: 8, paddingBottom: 8 }}>
        <Searchbar
          placeholder="Search products..."
          value={search}
          onChangeText={setSearch}
          style={{ marginBottom: 8, borderRadius: theme.roundness }}
        />
        <Chip
          selected={lowStock}
          onPress={() => setLowStock(!lowStock)}
          icon="alert"
          style={{ alignSelf: 'flex-start' }}
        >
          Low stock only
        </Chip>
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
          loading ? <ProductListSkeleton count={6} /> : <EmptyState message="No products found" />
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
