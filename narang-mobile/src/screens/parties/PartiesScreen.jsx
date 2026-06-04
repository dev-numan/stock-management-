import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { View, FlatList, RefreshControl, Keyboard, Platform } from 'react-native';
import { Card, Text, Icon, Chip, IconButton, Badge, Searchbar, useTheme } from 'react-native-paper';
import PartyFilterSortModal from '../../components/common/PartyFilterSortModal';
import ActiveFilterChips from '../../components/common/ActiveFilterChips';
import PartyLedgerSummary from '../../components/parties/PartyLedgerSummary';
import { CustomerListSkeleton } from '../../components/common/Skeleton';
import EmptyState from '../../components/common/EmptyState';
import ErrorMessage from '../../components/common/ErrorMessage';
import {
  buildListFilterTags,
  PARTY_FILTER_LABEL_KEYS,
  PARTY_TYPE_FILTER_LABEL_KEYS,
  PARTY_SORT_LABEL_KEYS,
} from '../../utils/filterLabelKeys';
import { useCustomersStore } from '../../stores/customersStore';
import { useSuppliersStore } from '../../stores/suppliersStore';
import { useSalesStore } from '../../stores/salesStore';
import { formatCurrency } from '../../utils/formatCurrency';
import { formatPhoneDisplay } from '../../utils/phone';
import { filterAndSortParties } from '../../utils/partyListFilters';
import { buildCombinedPartyRows, getPartyRowBalance } from '../../utils/partyLedgerTotals';
import { useTranslation } from '../../i18n/useTranslation';

export default function PartiesScreen({ navigation }) {
  const theme = useTheme();
  const { t, isRtl } = useTranslation();
  const textDir = { writingDirection: isRtl ? 'rtl' : 'ltr' };
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [partyType, setPartyType] = useState('all');
  const [sort, setSort] = useState('newest');
  const [filterModalVisible, setFilterModalVisible] = useState(false);

  const customers = useCustomersStore((s) => s.customers);
  const customersLoading = useCustomersStore((s) => s.loading);
  const customersError = useCustomersStore((s) => s.error);
  const fetchCustomers = useCustomersStore((s) => s.fetchCustomers);

  const suppliers = useSuppliersStore((s) => s.suppliers);
  const suppliersLoading = useSuppliersStore((s) => s.loading);
  const suppliersError = useSuppliersStore((s) => s.error);
  const fetchSuppliers = useSuppliersStore((s) => s.fetchSuppliers);

  const pendingSales = useSalesStore((s) => s.pendingSales);

  const loading = customersLoading || suppliersLoading;
  const error = customersError || suppliersError;

  const allRows = useMemo(
    () => buildCombinedPartyRows(customers, suppliers),
    [customers, suppliers]
  );

  const getBalance = useCallback((row) => getPartyRowBalance(row), [pendingSales]);

  useEffect(() => {
    fetchCustomers();
    fetchSuppliers(true);
  }, [fetchCustomers, fetchSuppliers]);

  const displayed = useMemo(() => {
    let list = filterAndSortParties(allRows, { filter, partyType, sort, getBalance });
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(
        (row) =>
          row.name?.toLowerCase().includes(q) ||
          row.phone?.toLowerCase().includes(q) ||
          row.address?.toLowerCase().includes(q)
      );
    }
    return list;
  }, [allRows, filter, partyType, sort, search, getBalance]);

  const hasActiveFilters =
    filter !== 'all' || partyType !== 'all' || sort !== 'newest' || Boolean(search.trim());

  const filterTags = useMemo(
    () =>
      buildListFilterTags({
        t,
        filter,
        partyType,
        sort,
        search,
        filterLabelKeys: PARTY_FILTER_LABEL_KEYS,
        partyTypeLabelKeys: PARTY_TYPE_FILTER_LABEL_KEYS,
        sortLabelKeys: PARTY_SORT_LABEL_KEYS,
        onClearFilter: () => setFilter('all'),
        onClearPartyType: () => setPartyType('all'),
        onClearSort: () => setSort('newest'),
        onClearSearch: () => setSearch(''),
      }),
    [filter, partyType, sort, search, t]
  );

  const clearAllFilters = useCallback(() => {
    setFilter('all');
    setPartyType('all');
    setSort('newest');
    setSearch('');
  }, []);

  const emptyMessage = useMemo(() => {
    if (search.trim()) return t('parties.noMatch', { query: search.trim() });
    if (partyType === 'customer') return t('parties.emptyCustomers');
    if (partyType === 'supplier') return t('parties.emptySuppliers');
    if (filter === 'youWillGet') return t('parties.emptyYouWillGet');
    if (filter === 'youWillGive') return t('parties.emptyYouWillGive');
    return t('parties.empty');
  }, [filter, partyType, search, t]);

  const onRefresh = useCallback(() => {
    fetchCustomers(true);
    fetchSuppliers(true);
  }, [fetchCustomers, fetchSuppliers]);

  const openRow = (item) => {
    if (item.partyType === 'customer') {
      navigation.navigate('CustomerDetail', {
        customerId: item.id,
        customer: item.raw,
      });
      return;
    }
    navigation.navigate('SupplierDetail', {
      supplierId: item.id,
      supplier: item.raw,
    });
  };

  const showSkeleton = loading && allRows.length === 0;

  const ListHeader = (
    <>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 8 }}>
        <Searchbar
          placeholder={t('parties.searchPlaceholder')}
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
      <PartyLedgerSummary customers={customers} suppliers={suppliers} />
      {hasActiveFilters ? (
        <Text
          variant="bodySmall"
          style={{ color: theme.colors.onSurfaceVariant, marginBottom: 8, ...textDir }}
        >
          {t('parties.resultsCount', { count: displayed.length })}
        </Text>
      ) : null}
      <ErrorMessage message={error} />
    </>
  );

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <FlatList
        data={showSkeleton ? [] : displayed}
        keyExtractor={(item) => `${item.partyType}-${item.id}`}
        contentContainerStyle={{ padding: 16, paddingBottom: 24 }}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={onRefresh} />}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
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
          const balance = getPartyRowBalance(item);
          const isCustomer = item.partyType === 'customer';
          return (
            <Card
              mode="elevated"
              style={{ marginBottom: 8, borderRadius: theme.roundness }}
              onPress={() => openRow(item)}
            >
              <Card.Content>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <View style={{ flex: 1, marginRight: 8 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                      <Chip compact mode="flat" style={{ alignSelf: 'flex-start' }}>
                        {isCustomer ? t('parties.typeCustomer') : t('parties.typeSupplier')}
                      </Chip>
                    </View>
                    <Text variant="titleSmall" style={{ fontWeight: '600' }}>
                      {item.name}
                    </Text>
                    {item.phone ? (
                      <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, marginTop: 2 }}>
                        {formatPhoneDisplay(item.phone)}
                      </Text>
                    ) : null}
                    {isCustomer && item.address ? (
                      <Text variant="labelSmall" style={{ color: theme.colors.outline, marginTop: 4 }} numberOfLines={1}>
                        {item.address}
                      </Text>
                    ) : null}
                    {item._local ? (
                      <Text variant="labelSmall" style={{ color: theme.colors.secondary, marginTop: 4, ...textDir }}>
                        {t('common.pendingSync')}
                      </Text>
                    ) : null}
                  </View>
                  {balance !== 0 ? (
                    <View style={{ alignItems: isRtl ? 'flex-start' : 'flex-end' }}>
                      <Text
                        variant="titleSmall"
                        style={{
                          fontWeight: '700',
                          color: balance < 0 ? theme.colors.error : theme.colors.primary,
                        }}
                      >
                        {formatCurrency(Math.abs(balance))}
                      </Text>
                      <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant, marginTop: 2, ...textDir }}>
                        {balance < 0 ? t('ledger.youWillGetColon') : t('ledger.youWillGiveColon')}
                      </Text>
                    </View>
                  ) : (
                    <Icon source="chevron-right" size={24} color={theme.colors.outline} />
                  )}
                </View>
              </Card.Content>
            </Card>
          );
        }}
      />
      <PartyFilterSortModal
        visible={filterModalVisible}
        filter={filter}
        partyType={partyType}
        showPartyTypeFilter
        sort={sort}
        titleKey="parties.filterTitle"
        onClose={() => setFilterModalVisible(false)}
        onApply={({ filter: nextFilter, partyType: nextPartyType, sort: nextSort }) => {
          setFilter(nextFilter);
          if (nextPartyType !== undefined) setPartyType(nextPartyType);
          setSort(nextSort);
        }}
      />
    </View>
  );
}
