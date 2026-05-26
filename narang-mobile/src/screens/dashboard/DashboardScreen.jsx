import React, { useEffect, useCallback } from 'react';
import { View, ScrollView, RefreshControl, Pressable } from 'react-native';
import { Text, Button, useTheme } from 'react-native-paper';
import { formatCurrency } from '../../utils/formatCurrency';
import { formatExpiryLabel, expiryTone } from '../../utils/expiry';
import StatCard from '../../components/dashboard/StatCard';
import RecentSaleItem from '../../components/dashboard/RecentSaleItem';
import SalesTrendChart from '../../components/dashboard/SalesTrendChart';
import { DashboardSkeleton } from '../../components/common/Skeleton';
import ErrorMessage from '../../components/common/ErrorMessage';
import AppCard from '../../components/common/AppCard';
import { useDashboardStore } from '../../stores/dashboardStore';
import { useNetworkStore } from '../../stores/networkStore';

export default function DashboardScreen({ navigation }) {
  const theme = useTheme();
  const data = useDashboardStore((s) => s.dashboard);
  const loading = useDashboardStore((s) => s.loading);
  const error = useDashboardStore((s) => s.error);
  const fetchDashboard = useDashboardStore((s) => s.fetchDashboard);
  const enrichDashboard = useDashboardStore((s) => s.enrichDashboard);
  const isOnline = useNetworkStore((s) => s.isOnline);

  const load = useCallback(async (force = false) => {
    await fetchDashboard(force);
  }, [fetchDashboard]);

  useEffect(() => {
    load();
  }, [load]);

  const display = enrichDashboard(data);

  const showSkeleton = loading && !display;

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: theme.colors.background }}
      contentContainerStyle={{ padding: 16, paddingTop: 16 }}
      refreshControl={<RefreshControl refreshing={loading} onRefresh={() => load(true)} />}
    >
      {!isOnline ? (
        <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, marginBottom: 8 }}>
          Offline — showing last saved data
        </Text>
      ) : null}
      <ErrorMessage message={error} />
      {showSkeleton ? (
        <DashboardSkeleton />
      ) : (
        <>
      <View style={{ flexDirection: 'row', alignItems: 'stretch', gap: 8, marginBottom: 8 }}>
        <StatCard title="Today's Sales" value={formatCurrency(display?.todaySalesTotal)} subtitle={`${display?.todaySalesCount || 0} invoices`} color="green" />
        <StatCard title="Products" value={String(display?.totalProducts || 0)} color="amber" />
        <Pressable
          style={{ flex: 1 }}
          onPress={() =>
            navigation.navigate('Stock', { screen: 'ProductsList', params: { lowStockOnly: true } })
          }
        >
          <StatCard title="Low Stock" value={String(display?.lowStockCount || 0)} color="red" />
        </Pressable>
      </View>
      <SalesTrendChart />
      {display?.showLowStockAlert !== false && display?.lowStockProducts?.length > 0 ? (
        <AppCard>
          <Text variant="titleMedium" style={{ color: theme.colors.error, fontWeight: '600', marginBottom: 8 }}>
            ⚠️ Low Stock Alert
          </Text>
          {display.lowStockProducts.map((p) => (
            <Text key={p.id} variant="bodyMedium" style={{ color: theme.colors.onSurface, paddingVertical: 4 }}>
              {p.name} — {Number(p.currentStock)} left
            </Text>
          ))}
        </AppCard>
      ) : null}
      {display?.showExpiryAlert !== false && display?.expiringProducts?.length > 0 ? (
        <AppCard>
          <Text variant="titleMedium" style={{ color: '#B45309', fontWeight: '600', marginBottom: 4 }}>
            📅 Expiry Alert
          </Text>
          <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, marginBottom: 8 }}>
            Within {display.expiryAlertMonths || 3} month(s)
          </Text>
          {display.expiringProducts.map((p) => {
            const label = formatExpiryLabel(p.expiryDate);
            const tone = expiryTone(p.expiryDate);
            const color =
              tone === 'error'
                ? theme.colors.error
                : tone === 'warning'
                  ? '#B45309'
                  : theme.colors.onSurface;
            return (
              <Text key={p.id} variant="bodyMedium" style={{ color, paddingVertical: 4 }}>
                {p.name} — {label}
              </Text>
            );
          })}
        </AppCard>
      ) : null}
        <AppCard>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <Text variant="titleMedium" style={{ fontWeight: '600' }}>
              Recent Sales
            </Text>
            <Button compact mode="text" onPress={() => navigation.navigate('History')}>
              View all
            </Button>
          </View>
        {display?.recentSales?.length ? (
          display.recentSales.map((sale) => (
            <RecentSaleItem
              key={sale.id}
              sale={sale}
              onPress={() =>
                sale.pendingSync
                  ? navigation.navigate('History', {
                      screen: 'Invoice',
                      params: { sale },
                    })
                  : navigation.navigate('History', {
                      screen: 'Invoice',
                      params: { saleId: sale.id },
                    })
              }
            />
          ))
        ) : (
          <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>
            No sales today
          </Text>
        )}
      </AppCard>
        </>
      )}
    </ScrollView>
  );
}
