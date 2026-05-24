import React, { useEffect, useMemo } from 'react';
import { View, FlatList, RefreshControl, Keyboard, Platform } from 'react-native';
import { Card, Text, Icon, FAB, useTheme } from 'react-native-paper';
import { CustomerListSkeleton } from '../../components/common/Skeleton';
import EmptyState from '../../components/common/EmptyState';
import ErrorMessage from '../../components/common/ErrorMessage';
import CustomerLedgerSummary from '../../components/customers/CustomerLedgerSummary';
import { useCustomersStore } from '../../stores/customersStore';
import { useSalesStore } from '../../stores/salesStore';
import { formatCurrency } from '../../utils/formatCurrency';
import { getEffectiveAdvanceBalance } from '../../utils/customerBalance';

export default function CustomersScreen({ navigation }) {
  const theme = useTheme();
  const customers = useCustomersStore((s) => s.customers);
  const loading = useCustomersStore((s) => s.loading);
  const error = useCustomersStore((s) => s.error);
  const fetchCustomers = useCustomersStore((s) => s.fetchCustomers);
  const pendingSales = useSalesStore((s) => s.pendingSales);

  useEffect(() => {
    fetchCustomers();
  }, [fetchCustomers]);

  const sortedCustomers = useMemo(() => {
    return [...customers].sort((a, b) => a.name.localeCompare(b.name));
  }, [customers, pendingSales]);

  const showSkeleton = loading && customers.length === 0;

  const ListHeader = (
    <>
      <CustomerLedgerSummary customers={customers} />
      <ErrorMessage message={error} />
    </>
  );

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <FlatList
        data={showSkeleton ? [] : sortedCustomers}
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
            <EmptyState message="No customers yet. Tap + to add one." />
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
                      {balance < 0 ? 'You will get: ' : 'You will give: '}
                      {formatCurrency(Math.abs(balance))}
                    </Text>
                  ) : null}
                  {item._local ? (
                    <Text variant="labelSmall" style={{ color: theme.colors.secondary, marginTop: 4 }}>
                      Pending sync
                    </Text>
                  ) : null}
                </View>
                <Icon source="chevron-right" size={24} color={theme.colors.outline} />
              </Card.Content>
            </Card>
          );
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
