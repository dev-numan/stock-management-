import React, { useState, useCallback } from 'react';
import { FlatList, RefreshControl } from 'react-native';
import { Text, useTheme } from 'react-native-paper';
import { useFocusEffect } from '@react-navigation/native';
import { getCredits } from '../../api/credits.api';
import { formatCurrency } from '../../utils/formatCurrency';
import CreditListItem from '../../components/credits/CreditListItem';
import { SaleListSkeleton } from '../../components/common/Skeleton';
import EmptyState from '../../components/common/EmptyState';
import ErrorMessage from '../../components/common/ErrorMessage';
import ScreenContainer from '../../components/common/ScreenContainer';

export default function CreditsScreen({ navigation }) {
  const theme = useTheme();
  const [sales, setSales] = useState([]);
  const [totalOutstanding, setTotalOutstanding] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const { data } = await getCredits();
      setSales(data.data.sales || []);
      setTotalOutstanding(data.data.totalOutstanding || 0);
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to load credit');
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const showSkeleton = loading && sales.length === 0;

  return (
    <ScreenContainer scroll={false} padding={16}>
      <Text variant="headlineSmall" style={{ fontWeight: '700', marginBottom: 4 }}>
        Credit
      </Text>
      <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant, marginBottom: 12 }}>
        {showSkeleton
          ? 'Loading credit sales...'
          : `Total outstanding: ${formatCurrency(totalOutstanding)} · ${sales.length} sale(s)`}
      </Text>
      <ErrorMessage message={error} />
      <FlatList
        style={{ flex: 1 }}
        data={showSkeleton ? [] : sales}
        keyExtractor={(item) => item.id}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={load} />}
        ListEmptyComponent={
          showSkeleton ? <SaleListSkeleton count={5} /> : <EmptyState message="No credit sales yet" />
        }
        renderItem={({ item }) => (
          <CreditListItem
            sale={item}
            onPress={() => navigation.navigate('Invoice', { saleId: item.id })}
          />
        )}
      />
    </ScreenContainer>
  );
}
