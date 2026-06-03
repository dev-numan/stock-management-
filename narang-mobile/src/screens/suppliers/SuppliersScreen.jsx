import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { View, FlatList, RefreshControl, Keyboard, Platform } from 'react-native';
import { Card, Text, FAB, IconButton, Badge, Searchbar, useTheme } from 'react-native-paper';
import PartyFilterSortModal from '../../components/common/PartyFilterSortModal';
import ActiveFilterChips from '../../components/common/ActiveFilterChips';
import {
  buildListFilterTags,
  PARTY_FILTER_LABEL_KEYS,
  PARTY_SORT_LABEL_KEYS,
} from '../../utils/filterLabelKeys';
import { CustomerListSkeleton } from '../../components/common/Skeleton';
import EmptyState from '../../components/common/EmptyState';
import ErrorMessage from '../../components/common/ErrorMessage';
import SupplierLedgerSummary from '../../components/suppliers/SupplierLedgerSummary';
import { RECEIPT_GREEN } from '../../components/invoice/thermalReceiptShared';
import { useSuppliersStore } from '../../stores/suppliersStore';
import { formatCurrency } from '../../utils/formatCurrency';
import { filterAndSortParties } from '../../utils/partyListFilters';
import { useTranslation } from '../../i18n/useTranslation';

export default function SuppliersScreen({ navigation }) {
  const theme = useTheme();
  const { t, isRtl } = useTranslation();
  const textDir = { writingDirection: isRtl ? 'rtl' : 'ltr' };
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [sort, setSort] = useState('newest');
  const [filterModalVisible, setFilterModalVisible] = useState(false);

  const suppliers = useSuppliersStore((s) => s.suppliers);
  const loading = useSuppliersStore((s) => s.loading);
  const error = useSuppliersStore((s) => s.error);
  const fetchSuppliers = useSuppliersStore((s) => s.fetchSuppliers);

  const getBalance = useCallback((s) => Number(s.payableBalance ?? 0), []);

  useEffect(() => {
    fetchSuppliers(true);
  }, [fetchSuppliers]);

  const displayed = useMemo(() => {
    let list = filterAndSortParties(suppliers, { filter, sort, getBalance });
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(
        (s) => s.name?.toLowerCase().includes(q) || s.phone?.toLowerCase().includes(q)
      );
    }
    return list;
  }, [suppliers, filter, sort, search, getBalance]);

  const hasActiveFilters = filter !== 'all' || sort !== 'newest' || Boolean(search.trim());

  const filterTags = useMemo(
    () =>
      buildListFilterTags({
        t,
        filter,
        sort,
        search,
        filterLabelKeys: PARTY_FILTER_LABEL_KEYS,
        sortLabelKeys: PARTY_SORT_LABEL_KEYS,
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
    if (search.trim()) return t('supplier.noMatch', { query: search.trim() });
    if (filter === 'youWillGet') return t('supplier.emptyYouWillGet');
    if (filter === 'youWillGive') return t('supplier.emptyYouWillGive');
    return t('supplier.empty');
  }, [filter, search, t]);

  const showSkeleton = loading && suppliers.length === 0;

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <FlatList
        data={showSkeleton ? [] : displayed}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: 16, paddingBottom: 88 }}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={() => fetchSuppliers(true)} />}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
        onScrollBeginDrag={Keyboard.dismiss}
        ListHeaderComponent={
          <>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 8 }}>
              <Searchbar
                placeholder={t('supplier.searchPlaceholder')}
                value={search}
                onChangeText={setSearch}
                style={{ flex: 1, borderRadius: theme.roundness }}
              />
              <View>
                <IconButton
                  icon="filter-variant"
                  mode="contained-tonal"
                  onPress={() => setFilterModalVisible(true)}
                  accessibilityLabel={t('party.filterSort')}
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
            <SupplierLedgerSummary suppliers={suppliers} />
            {hasActiveFilters ? (
              <Text
                variant="bodySmall"
                style={{ color: theme.colors.onSurfaceVariant, marginBottom: 8, ...textDir }}
              >
                {t('supplier.resultsCount', { count: displayed.length })}
              </Text>
            ) : null}
            <ErrorMessage message={error} />
          </>
        }
        ListEmptyComponent={
          showSkeleton ? (
            <CustomerListSkeleton count={6} />
          ) : (
            <EmptyState message={emptyMessage} />
          )
        }
        renderItem={({ item }) => {
          const balance = Number(item.payableBalance ?? 0);
          const totalPurchases = Number(item.totalPurchases ?? 0);
          const totalPayments = Number(item.totalPayments ?? 0);
          return (
            <Card
              mode="elevated"
              style={{ marginBottom: 8, borderRadius: theme.roundness }}
              onPress={() => navigation.navigate('SupplierDetail', { supplierId: item.id, supplier: item })}
            >
              <Card.Content>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <View style={{ flex: 1 }}>
                    <Text variant="titleSmall" style={{ fontWeight: '600' }}>
                      {item.name}
                    </Text>
                    {item.phone ? (
                      <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, marginTop: 2 }}>
                        {item.phone}
                      </Text>
                    ) : null}
                  </View>
                  <View style={{ alignItems: isRtl ? 'flex-start' : 'flex-end' }}>
                    <Text
                      variant="titleSmall"
                      style={{
                        fontWeight: '700',
                        color: balance > 0 ? theme.colors.primary : balance < 0 ? RECEIPT_GREEN : theme.colors.onSurfaceVariant,
                      }}
                    >
                      {formatCurrency(Math.abs(balance))}
                    </Text>
                    <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant, marginTop: 2, ...textDir }}>
                      {balance === 0
                        ? t('supplier.balance')
                        : balance < 0
                          ? t('ledger.youWillGetColon')
                          : t('ledger.youWillGiveColon')}
                    </Text>
                  </View>
                </View>
                <View style={{ flexDirection: 'row', marginTop: 10, gap: 12 }}>
                  <View style={{ flex: 1 }}>
                    <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant, ...textDir }}>
                      {t('supplier.col.purchase')}
                    </Text>
                    <Text variant="bodyMedium" style={{ fontWeight: '700', color: theme.colors.error, marginTop: 2 }}>
                      {formatCurrency(totalPurchases)}
                    </Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant, ...textDir }}>
                      {t('supplier.col.payment')}
                    </Text>
                    <Text variant="bodyMedium" style={{ fontWeight: '700', color: RECEIPT_GREEN, marginTop: 2 }}>
                      {formatCurrency(totalPayments)}
                    </Text>
                  </View>
                </View>
              </Card.Content>
            </Card>
          );
        }}
      />
      <PartyFilterSortModal
        visible={filterModalVisible}
        filter={filter}
        sort={sort}
        titleKey="suppliers.filterTitle"
        onClose={() => setFilterModalVisible(false)}
        onApply={({ filter: nextFilter, sort: nextSort }) => {
          setFilter(nextFilter);
          setSort(nextSort);
        }}
      />
      <FAB
        icon="plus"
        style={{ position: 'absolute', right: 16, bottom: 16, backgroundColor: theme.colors.primary }}
        onPress={() => navigation.navigate('AddSupplier')}
      />
    </View>
  );
}
