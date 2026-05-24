import React, { useState, useCallback } from 'react';
import { View } from 'react-native';
import { Card, Text, Button, useTheme } from 'react-native-paper';
import { SkeletonLine } from '../common/Skeleton';
import { useFocusEffect } from '@react-navigation/native';
import { getCredits } from '../../api/credits.api';
import { formatCurrency } from '../../utils/formatCurrency';

export default function CreditSettingsSection({ navigation }) {
  const theme = useTheme();
  const [sales, setSales] = useState([]);
  const [totalOutstanding, setTotalOutstanding] = useState(0);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const { data } = await getCredits();
      setSales(data.data.sales || []);
      setTotalOutstanding(data.data.totalOutstanding || 0);
    } catch {
      setSales([]);
      setTotalOutstanding(0);
    } finally {
      setLoading(false);
    }
  }, []);

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
          <Text variant="titleLarge" style={{ fontWeight: '700' }}>
            Credit
          </Text>
          <Button compact mode="text" onPress={() => navigation.navigate('Credits')}>
            View all
          </Button>
        </View>
        <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, marginBottom: 12 }}>
          {loading
            ? 'Loading...'
            : `Outstanding: ${formatCurrency(totalOutstanding)} · ${sales.length} sale(s)`}
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
          <Text variant="bodySmall" style={{ color: theme.colors.outline }}>
            No credit sales recorded yet.
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
                  {sale.customer?.name || 'Walk-in customer'}
                </Text>
                <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>
                  {sale.invoiceNumber}
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
            +{sales.length - 5} more — open full list
          </Button>
        ) : null}
      </Card.Content>
    </Card>
  );
}
