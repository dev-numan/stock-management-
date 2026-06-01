import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { View, FlatList, RefreshControl } from 'react-native';
import { Searchbar, Switch, FAB, Text, useTheme } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import ProductCard from '../../components/products/ProductCard';
import StockValuationSummary from '../../components/products/StockValuationSummary';
import { ProductListSkeleton } from '../../components/common/Skeleton';
import EmptyState from '../../components/common/EmptyState';
import ErrorMessage from '../../components/common/ErrorMessage';
import { useAuth } from '../../context/AuthContext';
import { useProductsStore } from '../../stores/productsStore';
import { useNetworkStore } from '../../stores/networkStore';
import { useTranslation } from '../../i18n/useTranslation';

export default function ProductsScreen({ navigation, route }) {
  const theme = useTheme();
  const { t, isRtl } = useTranslation();
  const textDir = { writingDirection: isRtl ? 'rtl' : 'ltr' };
  const { isAdmin } = useAuth();
  const [search, setSearch] = useState('');
  const [lowStockOnly, setLowStockOnly] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const isOnline = useNetworkStore((s) => s.isOnline);

  const products = useProductsStore((s) => s.products);
  const loading = useProductsStore((s) => s.loading);
  const error = useProductsStore((s) => s.error);
  const fetchProducts = useProductsStore((s) => s.fetchProducts);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await fetchProducts(true);
    } finally {
      setRefreshing(false);
    }
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

  const emptyMessage = lowStockOnly ? t('products.emptyLowStock') : t('products.empty');

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <View style={{ paddingHorizontal: 16, paddingTop: 8, paddingBottom: 8 }}>
        <Searchbar
          placeholder={t('products.searchPlaceholder')}
          value={search}
          onChangeText={setSearch}
          style={{ marginBottom: 8, borderRadius: theme.roundness }}
        />
        <StockValuationSummary products={products} />
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
                {t('products.lowStockOnly')}
              </Text>
              <Text
                variant="bodySmall"
                style={{
                  color: lowStockOnly ? theme.colors.onErrorContainer : theme.colors.onSurfaceVariant,
                  marginTop: 2,
                  ...textDir,
                }}
              >
                {lowStockOnly ? t('products.lowStockActive') : t('products.lowStockOff')}
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
            {t('products.offlineHint')}
          </Text>
        ) : null}
      </View>
      <ErrorMessage message={error} />
      <FlatList
        data={loading && filtered.length === 0 ? [] : filtered}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: 16, paddingTop: 0 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
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
