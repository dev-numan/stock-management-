import React, { useState, useEffect, useMemo, useCallback } from 'react';
import ActiveFilterChips from '../../components/common/ActiveFilterChips';
import {
  buildListFilterTags,
  PRODUCT_FILTER_LABEL_KEYS,
  PRODUCT_SORT_LABEL_KEYS,
} from '../../utils/filterLabelKeys';
import { View, FlatList, RefreshControl } from 'react-native';
import { Searchbar, FAB, Text, IconButton, Badge, useTheme } from 'react-native-paper';
import ProductFilterSortModal from '../../components/products/ProductFilterSortModal';
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
  const [filter, setFilter] = useState('all');
  const [sort, setSort] = useState('newest');
  const [filterModalVisible, setFilterModalVisible] = useState(false);
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
        setFilter('lowStock');
        navigation.setParams({ lowStockOnly: undefined });
      }
    }, [route.params?.lowStockOnly, navigation])
  );

  const filtered = useMemo(
    () => useProductsStore.getState().getFiltered({ search, filter, sort }),
    [products, search, filter, sort]
  );

  const hasActiveFilters = filter !== 'all' || sort !== 'newest' || Boolean(search.trim());

  const filterTags = useMemo(
    () =>
      buildListFilterTags({
        t,
        filter,
        sort,
        search,
        filterLabelKeys: PRODUCT_FILTER_LABEL_KEYS,
        sortLabelKeys: PRODUCT_SORT_LABEL_KEYS,
        onClearFilter: () => setFilter('all'),
        onClearSort: () => setSort('newest'),
        onClearSearch: () => setSearch(''),
      }),
    [filter, sort, search, t]
  );

  const clearAllFilters = useCallback(() => {
    setFilter('all');
    setSort('newest');
    setSearch('');
  }, []);

  const emptyMessage = useMemo(() => {
    if (search.trim()) return t('products.noMatch', { query: search.trim() });
    if (filter === 'lowStock') return t('products.emptyLowStock');
    if (filter === 'outOfStock') return t('products.emptyOutOfStock');
    if (filter === 'inStock') return t('products.emptyInStock');
    if (filter === 'expiringSoon') return t('products.emptyExpiringSoon');
    return t('products.empty');
  }, [filter, search, t]);

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <View style={{ paddingHorizontal: 16, paddingTop: 8, paddingBottom: 8 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 8 }}>
          <Searchbar
            placeholder={t('products.searchPlaceholder')}
            value={search}
            onChangeText={setSearch}
            style={{ flex: 1, borderRadius: theme.roundness }}
          />
          <View>
            <IconButton
              icon="filter-variant"
              mode="contained-tonal"
              onPress={() => setFilterModalVisible(true)}
              accessibilityLabel={t('products.filterSort')}
            />
            {filterTags.length > 0 ? (
              <Badge
                size={8}
                style={{ position: 'absolute', top: 8, right: 8, backgroundColor: theme.colors.primary }}
              />
            ) : null}
          </View>
        </View>
        <ActiveFilterChips tags={filterTags} onClearAll={clearAllFilters} />
        <StockValuationSummary products={filtered} />
        {hasActiveFilters ? (
          <Text
            variant="bodySmall"
            style={{ color: theme.colors.onSurfaceVariant, marginBottom: 8, ...textDir }}
          >
            {t('products.resultsCount', { count: filtered.length })}
          </Text>
        ) : null}
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
      <ProductFilterSortModal
        visible={filterModalVisible}
        filter={filter}
        sort={sort}
        onClose={() => setFilterModalVisible(false)}
        onApply={({ filter: nextFilter, sort: nextSort }) => {
          setFilter(nextFilter);
          setSort(nextSort);
        }}
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
