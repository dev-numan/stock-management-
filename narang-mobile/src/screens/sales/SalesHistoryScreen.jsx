import React, { useState, useEffect, useCallback } from 'react';
import { View, FlatList, RefreshControl } from 'react-native';
import { useTheme } from 'react-native-paper';
import { getPeriodQueryParams, getPeriodLabel } from '../../utils/formatDate';
import SaleListItem from '../../components/sales/SaleListItem';
import { SaleListSkeleton } from '../../components/common/Skeleton';
import EmptyState from '../../components/common/EmptyState';
import ErrorMessage from '../../components/common/ErrorMessage';
import PeriodFilter from '../../components/common/PeriodFilter';
import { formatCurrency } from '../../utils/formatCurrency';
import { useSalesStore } from '../../stores/salesStore';

const now = new Date();

export default function SalesHistoryScreen({ navigation }) {
  const theme = useTheme();
  const [sales, setSales] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [mode, setMode] = useState('all');
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);

  const fetchSales = useCallback(async (force = false) => {
    try {
      setLoading(true);
      setError(null);
      const params = getPeriodQueryParams(mode, year, month);
      const list = await useSalesStore.getState().fetchSales(params, force);
      setSales(list);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load sales');
    } finally {
      setLoading(false);
    }
  }, [mode, year, month]);

  useEffect(() => {
    fetchSales();
  }, [fetchSales]);

  const totalAmount = sales.reduce((sum, s) => sum + Number(s.totalAmount), 0);
  const periodLabel = getPeriodLabel(mode, year, month);
  const showSkeleton = loading && sales.length === 0;
  const summaryText = showSkeleton
    ? 'Loading sales...'
    : mode === 'all'
      ? `Showing all sales · ${sales.length} sale(s) · ${formatCurrency(totalAmount)}`
      : `${periodLabel} · ${sales.length} sale(s) · ${formatCurrency(totalAmount)}`;

  const ListHeader = (
    <View style={{ marginBottom: 12 }}>
      <ErrorMessage message={error} />
      <PeriodFilter
        mode={mode}
        year={year}
        month={month}
        onModeChange={setMode}
        onYearChange={setYear}
        onMonthChange={setMonth}
        summaryText={summaryText}
      />
    </View>
  );

  return (
    <FlatList
      style={{ flex: 1, backgroundColor: theme.colors.background }}
      contentContainerStyle={{ padding: 16, paddingTop: 8 }}
      data={showSkeleton ? [] : sales}
      keyExtractor={(item) => item.id}
      ListHeaderComponent={
        <>
          {ListHeader}
          {showSkeleton ? <SaleListSkeleton count={6} /> : null}
        </>
      }
      ListEmptyComponent={
        !loading ? <EmptyState message="No sales for this period" /> : null
      }
      refreshControl={
        <RefreshControl refreshing={loading} onRefresh={() => fetchSales(true)} />
      }
      renderItem={({ item }) => (
        <SaleListItem
          sale={item}
          onPress={() =>
            navigation.navigate('Invoice', {
              saleId: item.pendingSync ? undefined : item.id,
              sale: item.pendingSync ? item : undefined,
            })
          }
        />
      )}
    />
  );
}
