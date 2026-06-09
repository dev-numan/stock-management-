import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { View, FlatList, RefreshControl, Keyboard, Platform, Alert } from 'react-native';
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
import { usePartiesStore } from '../../stores/partiesStore';
import { useCustomersStore } from '../../stores/customersStore';
import { useSuppliersStore } from '../../stores/suppliersStore';
import { useSalesStore } from '../../stores/salesStore';
import { formatCurrency } from '../../utils/formatCurrency';
import { formatPhoneDisplay } from '../../utils/phone';
import { filterAndSortParties } from '../../utils/partyListFilters';
import { buildPartyRows, getPartyRowBalance } from '../../utils/partyLedgerTotals';
import { matchesPartySearch } from '../../utils/partySearch';
import { exportCombinedPartyListPdf } from '../../utils/generatePartyListPDF';
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
  const [exporting, setExporting] = useState(false);

  const parties = usePartiesStore((s) => s.parties);
  const partiesLoading = usePartiesStore((s) => s.loading);
  const partiesError = usePartiesStore((s) => s.error);
  const fetchParties = usePartiesStore((s) => s.fetchParties);

  const customers = useCustomersStore((s) => s.customers);
  const fetchCustomers = useCustomersStore((s) => s.fetchCustomers);
  const fetchSuppliers = useSuppliersStore((s) => s.fetchSuppliers);

  const pendingSales = useSalesStore((s) => s.pendingSales);

  const loading = partiesLoading;
  const error = partiesError;

  const allRows = useMemo(() => buildPartyRows(parties), [parties]);

  const getBalance = useCallback((row) => getPartyRowBalance(row), [pendingSales]);

  useEffect(() => {
    fetchParties();
    fetchCustomers();
    fetchSuppliers(true);
  }, [fetchParties, fetchCustomers, fetchSuppliers]);

  const displayed = useMemo(() => {
    let list = filterAndSortParties(allRows, { filter, partyType, sort, getBalance });
    if (search.trim()) {
      list = list.filter((row) => matchesPartySearch(row, search));
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

  const exportCustomers = useMemo(
    () =>
      displayed
        .filter((row) => row.raw?.partyType === 'CUSTOMER')
        .map((row) => row.raw),
    [displayed]
  );
  const exportSuppliers = useMemo(
    () =>
      displayed
        .filter((row) => row.raw?.partyType === 'SUPPLIER')
        .map((row) => row.raw),
    [displayed]
  );

  const handleExport = useCallback(async () => {
    setExporting(true);
    try {
      await exportCombinedPartyListPdf({
        customers: exportCustomers,
        suppliers: exportSuppliers,
      });
    } catch {
      Alert.alert(t('partyReport.export'), t('reports.exportFailed'));
    } finally {
      setExporting(false);
    }
  }, [exportCustomers, exportSuppliers, t]);

  const emptyMessage = useMemo(() => {
    if (search.trim()) return t('parties.noMatch', { query: search.trim() });
    if (partyType === 'customer') return t('parties.emptyCustomers');
    if (partyType === 'supplier') return t('parties.emptySuppliers');
    if (filter === 'youWillGet') return t('parties.emptyYouWillGet');
    if (filter === 'youWillGive') return t('parties.emptyYouWillGive');
    return t('parties.empty');
  }, [filter, partyType, search, t]);

  const onRefresh = useCallback(() => {
    fetchParties(true);
    fetchCustomers(true);
    fetchSuppliers(true);
  }, [fetchParties, fetchCustomers, fetchSuppliers]);

  const openRow = (item) => {
    navigation.navigate('PartyDetail', {
      partyId: item.id,
      party: item.raw,
      initialTab: item.activeType,
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
        <IconButton
          icon="file-pdf-box"
          mode="contained-tonal"
          loading={exporting}
          disabled={exporting || displayed.length === 0}
          onPress={handleExport}
          accessibilityLabel={t('partyReport.export')}
        />
      </View>
      <ActiveFilterChips tags={filterTags} onClearAll={clearAllFilters} />
      <PartyLedgerSummary customers={customers} suppliers={parties.filter((p) => p.partyType === 'SUPPLIER')} />
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
        keyExtractor={(item) => item.id}
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
          const isCustomer = item.activeType === 'customer';
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
