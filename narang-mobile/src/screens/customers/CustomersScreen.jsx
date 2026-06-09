import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { View, FlatList, RefreshControl, Keyboard, Platform, Alert } from 'react-native';
import { Card, Text, Icon, FAB, IconButton, Badge, Searchbar, useTheme } from 'react-native-paper';
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
import CustomerLedgerSummary from '../../components/customers/CustomerLedgerSummary';
import { useCustomersStore } from '../../stores/customersStore';
import { useSalesStore } from '../../stores/salesStore';
import { formatCurrency } from '../../utils/formatCurrency';
import { getEffectiveAdvanceBalance } from '../../utils/customerBalance';
import { filterAndSortParties } from '../../utils/partyListFilters';
import { exportPartyListPdf } from '../../utils/generatePartyListPDF';
import { useTranslation } from '../../i18n/useTranslation';

export default function CustomersScreen({ navigation }) {
  const theme = useTheme();
  const { t, isRtl } = useTranslation();
  const textDir = { writingDirection: isRtl ? 'rtl' : 'ltr' };
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [sort, setSort] = useState('newest');
  const [filterModalVisible, setFilterModalVisible] = useState(false);
  const [exporting, setExporting] = useState(false);

  const customers = useCustomersStore((s) => s.customers);
  const loading = useCustomersStore((s) => s.loading);
  const error = useCustomersStore((s) => s.error);
  const fetchCustomers = useCustomersStore((s) => s.fetchCustomers);
  const pendingSales = useSalesStore((s) => s.pendingSales);

  const getBalance = useCallback((c) => getEffectiveAdvanceBalance(c), [pendingSales]);

  useEffect(() => {
    fetchCustomers();
  }, [fetchCustomers]);

  const displayedCustomers = useMemo(() => {
    let list = filterAndSortParties(customers, { filter, sort, getBalance });
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(
        (c) =>
          c.name?.toLowerCase().includes(q) ||
          c.phone?.toLowerCase().includes(q) ||
          c.address?.toLowerCase().includes(q)
      );
    }
    return list;
  }, [customers, filter, sort, search, getBalance]);

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

  const handleExport = useCallback(async () => {
    setExporting(true);
    try {
      await exportPartyListPdf({ kind: 'customer', parties: displayedCustomers });
    } catch {
      Alert.alert(t('partyReport.export'), t('reports.exportFailed'));
    } finally {
      setExporting(false);
    }
  }, [displayedCustomers, t]);

  const emptyMessage = useMemo(() => {
    if (search.trim()) return t('customers.noMatch', { query: search.trim() });
    if (filter === 'youWillGet') return t('customers.emptyYouWillGet');
    if (filter === 'youWillGive') return t('customers.emptyYouWillGive');
    return t('customers.empty');
  }, [filter, search, t]);

  const showSkeleton = loading && customers.length === 0;

  const ListHeader = (
    <>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 8 }}>
        <Searchbar
          placeholder={t('customers.searchPlaceholder')}
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
        <IconButton
          icon="file-pdf-box"
          mode="contained-tonal"
          loading={exporting}
          disabled={exporting || displayedCustomers.length === 0}
          onPress={handleExport}
          accessibilityLabel={t('partyReport.export')}
        />
      </View>
      <ActiveFilterChips tags={filterTags} onClearAll={clearAllFilters} />
      <CustomerLedgerSummary customers={customers} />
      {hasActiveFilters ? (
        <Text
          variant="bodySmall"
          style={{ color: theme.colors.onSurfaceVariant, marginBottom: 8, ...textDir }}
        >
          {t('customers.resultsCount', { count: displayedCustomers.length })}
        </Text>
      ) : null}
      <ErrorMessage message={error} />
    </>
  );

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <FlatList
        data={showSkeleton ? [] : displayedCustomers}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: 16, paddingBottom: 88 }}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={() => fetchCustomers(true)} />}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
        automaticallyAdjustKeyboardInsets
        onScrollBeginDrag={Keyboard.dismiss}
        ListHeaderComponent={ListHeader}
        ListEmptyComponent={
          showSkeleton ? (
            <CustomerListSkeleton count={6} />
          ) : (
            <EmptyState message={emptyMessage} />
          )
        }
        renderItem={({ item }) => {
          const balance = getEffectiveAdvanceBalance(item);
          return (
            <Card
              mode="elevated"
              style={{ marginBottom: 8, borderRadius: theme.roundness }}
              onPress={() => navigation.navigate('CustomerDetail', { customerId: item.id, customer: item })}
            >
              <Card.Content style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <View style={{ flex: 1 }}>
                  <Text variant="titleSmall" style={{ fontWeight: '600' }}>
                    {item.name}
                  </Text>
                  {item.phone ? (
                    <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, marginTop: 2 }}>
                      {item.phone}
                    </Text>
                  ) : null}
                  {item.address ? (
                    <Text variant="labelSmall" style={{ color: theme.colors.outline, marginTop: 4 }} numberOfLines={1}>
                      {item.address}
                    </Text>
                  ) : null}
                  {balance !== 0 ? (
                    <Text
                      variant="labelSmall"
                      style={{
                        marginTop: 4,
                        fontWeight: '600',
                        color: balance < 0 ? theme.colors.error : theme.colors.primary,
                      }}
                    >
                      {balance < 0 ? t('ledger.youWillGetColon') : t('ledger.youWillGiveColon')}{' '}
                      {formatCurrency(Math.abs(balance))}
                    </Text>
                  ) : null}
                  {item._local ? (
                    <Text variant="labelSmall" style={{ color: theme.colors.secondary, marginTop: 4, ...textDir }}>
                      {t('common.pendingSync')}
                    </Text>
                  ) : null}
                </View>
                <Icon source="chevron-right" size={24} color={theme.colors.outline} />
              </Card.Content>
            </Card>
          );
        }}
      />
      <PartyFilterSortModal
        visible={filterModalVisible}
        filter={filter}
        sort={sort}
        titleKey="customers.filterTitle"
        onClose={() => setFilterModalVisible(false)}
        onApply={({ filter: nextFilter, sort: nextSort }) => {
          setFilter(nextFilter);
          setSort(nextSort);
        }}
      />
      <FAB
        icon="plus"
        style={{ position: 'absolute', right: 16, bottom: 16, backgroundColor: theme.colors.primary }}
        color={theme.colors.onPrimary}
        onPress={() => navigation.navigate('AddCustomer')}
      />
    </View>
  );
}
