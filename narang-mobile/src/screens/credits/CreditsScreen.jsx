import React, { useState, useCallback } from 'react';
import { FlatList, RefreshControl } from 'react-native';
import { Text, useTheme } from 'react-native-paper';
import { useFocusEffect } from '@react-navigation/native';
import { getCredits } from '../../api/credits.api';
import { formatCurrency } from '../../utils/formatCurrency';
import {
  computeTotalCreditOutstanding,
  mergeCreditSalesWithPending,
} from '../../utils/creditData';
import CreditListItem from '../../components/credits/CreditListItem';
import { SaleListSkeleton } from '../../components/common/Skeleton';
import EmptyState from '../../components/common/EmptyState';
import ErrorMessage from '../../components/common/ErrorMessage';
import { getFriendlyErrorMessage } from '../../utils/apiErrors';
import ScreenContainer from '../../components/common/ScreenContainer';
import { useCustomersStore } from '../../stores/customersStore';
import { useSalesStore } from '../../stores/salesStore';
import { getIsOnline } from '../../stores/networkStore';
import { useTranslation } from '../../i18n/useTranslation';

export default function CreditsScreen({ navigation }) {
  const theme = useTheme();
  const { t, isRtl } = useTranslation();
  const textDir = { writingDirection: isRtl ? 'rtl' : 'ltr' };
  const customers = useCustomersStore((s) => s.customers);
  const pendingSales = useSalesStore((s) => s.pendingSales);
  const fetchCustomers = useCustomersStore((s) => s.fetchCustomers);
  const [sales, setSales] = useState([]);
  const [totalOutstanding, setTotalOutstanding] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      if (getIsOnline()) {
        await fetchCustomers(true);
      }

      let apiSales = [];
      if (getIsOnline()) {
        const { data } = await getCredits();
        apiSales = data.data?.sales || [];
      }

      const merged = mergeCreditSalesWithPending(apiSales);
      const outstanding = computeTotalCreditOutstanding(
        useCustomersStore.getState().customers
      );

      setSales(merged);
      setTotalOutstanding(outstanding);
    } catch (err) {
      setError(getFriendlyErrorMessage(err, t('credit.loadFailed')));
      const merged = mergeCreditSalesWithPending([]);
      setSales(merged);
      setTotalOutstanding(computeTotalCreditOutstanding(useCustomersStore.getState().customers));
    } finally {
      setLoading(false);
    }
  }, [fetchCustomers, pendingSales, t]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const showSkeleton = loading && sales.length === 0;
  const pendingCount = sales.filter((s) => s.pendingSync).length;

  return (
    <ScreenContainer scroll={false} padding={16}>
      <Text variant="headlineSmall" style={{ fontWeight: '700', marginBottom: 4 }}>
        {t('credit.title')}
      </Text>
      <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant, marginBottom: 12, ...textDir }}>
        {showSkeleton
          ? t('credit.loading')
          : pendingCount > 0
            ? t('credit.summary', {
                amount: formatCurrency(totalOutstanding),
                count: sales.length,
                pending: pendingCount,
              })
            : t('credit.summaryShort', {
                amount: formatCurrency(totalOutstanding),
                count: sales.length,
              })}
      </Text>
      <ErrorMessage message={error} />
      <FlatList
        style={{ flex: 1 }}
        data={showSkeleton ? [] : sales}
        keyExtractor={(item) => item.id}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={load} />}
        ListEmptyComponent={
          showSkeleton ? <SaleListSkeleton count={5} /> : <EmptyState message={t('credit.empty')} />
        }
        renderItem={({ item }) => (
          <CreditListItem
            sale={item}
            onPress={() =>
              navigation.navigate('Invoice', {
                saleId: item.pendingSync ? undefined : item.id,
                sale: item,
              })
            }
          />
        )}
      />
    </ScreenContainer>
  );
}
