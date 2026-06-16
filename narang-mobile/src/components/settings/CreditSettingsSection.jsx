import React, { useState, useCallback } from 'react';
import { View } from 'react-native';
import { Card, Text, Button, useTheme } from 'react-native-paper';
import { SkeletonLine } from '../common/Skeleton';
import { useFocusEffect } from '@react-navigation/native';
import { getCredits } from '../../api/credits.api';
import { formatCurrency } from '../../utils/formatCurrency';
import {
  computeTotalCreditOutstanding,
  mergeCreditSalesWithPending,
} from '../../utils/creditData';
import { getFriendlyErrorMessage } from '../../utils/apiErrors';
import { useCustomersStore } from '../../stores/customersStore';
import { useSalesStore } from '../../stores/salesStore';
import { useOfflineCacheStore } from '../../stores/offlineCacheStore';
import { getIsOnline } from '../../stores/networkStore';
import { useTranslation } from '../../i18n/useTranslation';

export default function CreditSettingsSection({ navigation }) {
  const theme = useTheme();
  const { t, isRtl } = useTranslation();
  const textDir = { writingDirection: isRtl ? 'rtl' : 'ltr' };
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
      } else {
        apiSales = useOfflineCacheStore.getState().getCreditSales();
      }

      setSales(mergeCreditSalesWithPending(apiSales));
      setTotalOutstanding(
        computeTotalCreditOutstanding(useCustomersStore.getState().customers)
      );
    } catch (err) {
      setError(getFriendlyErrorMessage(err, t('credit.summaryFailed')));
      setSales(mergeCreditSalesWithPending([]));
      setTotalOutstanding(
        computeTotalCreditOutstanding(useCustomersStore.getState().customers)
      );
    } finally {
      setLoading(false);
    }
  }, [fetchCustomers, pendingSales, t]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const preview = sales.slice(0, 5);

  return (
    <Card mode="elevated" style={{ marginBottom: 16, borderRadius: theme.roundness }}>
      <Card.Content>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <Text variant="titleLarge" style={{ fontWeight: '700', ...textDir }}>
            {t('credit.title')}
          </Text>
          <Button compact mode="text" onPress={() => navigation.navigate('Credits')}>
            {t('common.viewAll')}
          </Button>
        </View>
        {error ? (
          <Text variant="bodySmall" style={{ color: theme.colors.error, marginBottom: 8, ...textDir }}>
            {error}
          </Text>
        ) : null}
        <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, marginBottom: 12, ...textDir }}>
          {loading
            ? t('common.loading')
            : t('credit.summaryShort', {
                amount: formatCurrency(totalOutstanding),
                count: sales.length,
              })}
        </Text>
        {loading ? (
          <>
            {[1, 2, 3].map((i) => (
              <View key={i} style={{ paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: theme.colors.outlineVariant }}>
                <SkeletonLine width="50%" height={14} style={{ marginBottom: 6 }} />
                <SkeletonLine width="35%" height={12} />
              </View>
            ))}
          </>
        ) : preview.length === 0 ? (
          <Text variant="bodySmall" style={{ color: theme.colors.outline, ...textDir }}>
            {t('credit.emptyShort')}
          </Text>
        ) : (
          preview.map((sale) => (
            <View
              key={sale.id}
              style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                paddingVertical: 8,
                borderBottomWidth: 1,
                borderBottomColor: theme.colors.outlineVariant,
              }}
            >
              <View style={{ flex: 1 }}>
                <Text variant="bodyMedium" style={{ fontWeight: '600' }}>
                  {sale.customer?.name || (sale.customerId ? t('credit.customerFallback') : t('credit.unlinkedSale'))}
                </Text>
                <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant, ...textDir }}>
                  {sale.invoiceNumber}
                  {sale.pendingSync ? ` · ${t('common.pendingUpload')}` : ''}
                </Text>
              </View>
              <Text variant="bodyMedium" style={{ fontWeight: '600', color: theme.colors.secondary }}>
                {formatCurrency(sale.totalAmount)}
              </Text>
            </View>
          ))
        )}
        {sales.length > 5 ? (
          <Button compact mode="text" onPress={() => navigation.navigate('Credits')} style={{ marginTop: 8 }}>
            {t('credit.moreLink', { count: sales.length - 5 })}
          </Button>
        ) : null}
      </Card.Content>
    </Card>
  );
}
