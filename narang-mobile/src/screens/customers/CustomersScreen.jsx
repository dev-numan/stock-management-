import React, { useMemo, useState, useCallback } from 'react';
import { View, FlatList, RefreshControl, Keyboard, Platform, Alert } from 'react-native';
import { Text, FAB, IconButton, Badge, Searchbar, useTheme } from 'react-native-paper';
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
import PartyLedgerSummary from '../../components/parties/PartyLedgerSummary';
import PartyContactListItem from '../../components/parties/PartyContactListItem';
import { usePartyContactList } from '../../hooks/usePartyContactList';
import { contactToCustomerPayload } from '../../services/customerContactService';
import { filterAndSortParties } from '../../utils/partyListFilters';
import { matchesPartySearch } from '../../utils/partySearch';
import { exportCombinedPartyListPdf } from '../../utils/generatePartyListPDF';
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

  const { rows, parties, loading, error, permissionDenied, refresh, getBalance } = usePartyContactList();

  const customerParties = useMemo(
    () => parties.filter((p) => p.partyType === 'CUSTOMER'),
    [parties]
  );
  const supplierParties = useMemo(
    () => parties.filter((p) => p.partyType === 'SUPPLIER'),
    [parties]
  );

  const displayed = useMemo(() => {
    let list = filterAndSortParties(rows, { filter, sort, getBalance });
    if (search.trim()) {
      list = list.filter((row) => matchesPartySearch(row, search));
    }
    return list;
  }, [rows, filter, sort, search, getBalance]);

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
    const appRows = displayed.filter((row) => row.source === 'app');
    setExporting(true);
    try {
      await exportCombinedPartyListPdf({
        customers: appRows.filter((r) => r.partyType !== 'SUPPLIER').map((r) => r.rawParty),
        suppliers: appRows.filter((r) => r.partyType === 'SUPPLIER').map((r) => r.rawParty),
      });
    } catch {
      Alert.alert(t('partyReport.export'), t('reports.exportFailed'));
    } finally {
      setExporting(false);
    }
  }, [displayed, t]);

  const emptyMessage = useMemo(() => {
    if (search.trim()) return t('customers.noMatch', { query: search.trim() });
    if (permissionDenied) return t('customer.noContactsPermission');
    if (filter === 'youWillGet') return t('customers.emptyYouWillGet');
    if (filter === 'youWillGive') return t('customers.emptyYouWillGive');
    return t('customer.emptyPicker');
  }, [filter, search, permissionDenied, t]);

  const openRow = useCallback(
    (item) => {
      if (item.source === 'app') {
        navigation.navigate('PartyDetail', {
          partyId: item.rawParty.id,
          party: item.rawParty,
          initialTab: item.partyType === 'SUPPLIER' ? 'supplier' : 'customer',
        });
        return;
      }
      navigation.navigate('AddCustomer', {
        prefill: contactToCustomerPayload(item.rawContact),
      });
    },
    [navigation]
  );

  const showSkeleton = loading && rows.length === 0;

  const ListHeader = (
    <>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 8 }}>
        <Searchbar
          placeholder={t('customer.selectHint')}
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
          disabled={exporting || displayed.filter((r) => r.source === 'app').length === 0}
          onPress={handleExport}
          accessibilityLabel={t('partyReport.export')}
        />
      </View>
      <ActiveFilterChips tags={filterTags} onClearAll={clearAllFilters} />
      <PartyLedgerSummary customers={customerParties} suppliers={supplierParties} />
      {hasActiveFilters ? (
        <Text
          variant="bodySmall"
          style={{ color: theme.colors.onSurfaceVariant, marginBottom: 8, ...textDir }}
        >
          {t('customers.resultsCount', { count: displayed.length })}
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
        contentContainerStyle={{ padding: 16, paddingBottom: 88 }}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={refresh} />}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
        automaticallyAdjustKeyboardInsets
        onScrollBeginDrag={Keyboard.dismiss}
        ListHeaderComponent={ListHeader}
        ListEmptyComponent={
          showSkeleton ? <CustomerListSkeleton count={6} /> : <EmptyState message={emptyMessage} />
        }
        renderItem={({ item }) => <PartyContactListItem item={item} onPress={openRow} />}
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
