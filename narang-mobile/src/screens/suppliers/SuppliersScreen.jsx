import React, { useEffect, useMemo } from 'react';
import { View, FlatList, RefreshControl, Keyboard, Platform } from 'react-native';
import { Card, Text, FAB, useTheme } from 'react-native-paper';
import { CustomerListSkeleton } from '../../components/common/Skeleton';
import EmptyState from '../../components/common/EmptyState';
import ErrorMessage from '../../components/common/ErrorMessage';
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

  const totalPayable = useMemo(
    () => sorted.reduce((sum, s) => sum + Math.max(0, Number(s.payableBalance ?? 0)), 0),
    [sorted]
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
            <Card mode="elevated" style={{ marginBottom: 12, borderRadius: theme.roundness }}>
              <Card.Content style={{ alignItems: 'center', paddingVertical: 12 }}>
                <Text variant="headlineSmall" style={{ fontWeight: '700', color: theme.colors.primary }}>
                  {formatCurrency(totalPayable)}
                </Text>
                <Text variant="labelMedium" style={{ color: theme.colors.onSurfaceVariant, marginTop: 4, ...textDir }}>
                  {t('supplier.youWillGive')}
                </Text>
              </Card.Content>
            </Card>
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
          return (
            <Card
              mode="elevated"
              style={{ marginBottom: 8, borderRadius: theme.roundness }}
              onPress={() => navigation.navigate('SupplierDetail', { supplierId: item.id, supplier: item })}
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
                </View>
                <View style={{ alignItems: isRtl ? 'flex-start' : 'flex-end' }}>
                  <Text
                    variant="titleSmall"
                    style={{ fontWeight: '700', color: balance > 0 ? theme.colors.primary : theme.colors.onSurfaceVariant }}
                  >
                    {formatCurrency(balance)}
                  </Text>
                  <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant, marginTop: 2, ...textDir }}>
                    {t('ledger.youWillGiveColon')}
                  </Text>
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
