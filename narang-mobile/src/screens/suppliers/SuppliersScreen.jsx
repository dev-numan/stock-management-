import React, { useEffect, useMemo } from 'react';
import { View, FlatList, RefreshControl, Keyboard, Platform } from 'react-native';
import { Card, Text, FAB, useTheme } from 'react-native-paper';
import { CustomerListSkeleton } from '../../components/common/Skeleton';
import EmptyState from '../../components/common/EmptyState';
import ErrorMessage from '../../components/common/ErrorMessage';
import SupplierLedgerSummary from '../../components/suppliers/SupplierLedgerSummary';
import { RECEIPT_GREEN } from '../../components/invoice/thermalReceiptShared';
import { useSuppliersStore } from '../../stores/suppliersStore';
import { formatCurrency } from '../../utils/formatCurrency';
import { useTranslation } from '../../i18n/useTranslation';

export default function SuppliersScreen({ navigation }) {
  const theme = useTheme();
  const { t, isRtl } = useTranslation();
  const textDir = { writingDirection: isRtl ? 'rtl' : 'ltr' };
  const suppliers = useSuppliersStore((s) => s.suppliers);
  const loading = useSuppliersStore((s) => s.loading);
  const error = useSuppliersStore((s) => s.error);
  const fetchSuppliers = useSuppliersStore((s) => s.fetchSuppliers);

  useEffect(() => {
    fetchSuppliers(true);
  }, [fetchSuppliers]);

  const sorted = useMemo(
    () => [...suppliers].sort((a, b) => a.name.localeCompare(b.name)),
    [suppliers]
  );

  const showSkeleton = loading && suppliers.length === 0;

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <FlatList
        data={showSkeleton ? [] : sorted}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: 16, paddingBottom: 88 }}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={() => fetchSuppliers(true)} />}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
        onScrollBeginDrag={Keyboard.dismiss}
        ListHeaderComponent={
          <>
            <SupplierLedgerSummary suppliers={sorted} />
            <ErrorMessage message={error} />
          </>
        }
        ListEmptyComponent={
          showSkeleton ? (
            <CustomerListSkeleton count={6} />
          ) : (
            <EmptyState message={t('supplier.empty')} />
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
                      {balance < 0 ? t('ledger.youWillGetColon') : t('ledger.youWillGiveColon')}
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
      <FAB
        icon="plus"
        style={{ position: 'absolute', right: 16, bottom: 16, backgroundColor: theme.colors.primary }}
        onPress={() => navigation.navigate('AddSupplier')}
      />
    </View>
  );
}
