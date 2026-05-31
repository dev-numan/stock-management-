import React, { useMemo } from 'react';
import { View } from 'react-native';
import { Card, Text, Button, useTheme } from 'react-native-paper';
import { formatCurrency } from '../../utils/formatCurrency';
import { getEffectiveAdvanceBalance } from '../../utils/customerBalance';
import { useSalesStore } from '../../stores/salesStore';

export function computeCustomerLedgerTotals(customers) {
  let youWillGet = 0;
  let youWillGive = 0;

  for (const customer of customers) {
    const balance = getEffectiveAdvanceBalance(customer);
    if (balance < 0) {
      youWillGet += Math.abs(balance);
    } else if (balance > 0) {
      youWillGive += balance;
    }
  }

  return { youWillGet, youWillGive };
}

export default function CustomerLedgerSummary({ customers, onSeeMore }) {
  const theme = useTheme();
  const pendingSales = useSalesStore((s) => s.pendingSales);
  const { youWillGet, youWillGive } = useMemo(
    () => computeCustomerLedgerTotals(customers),
    [customers, pendingSales]
  );

  return (
    <Card mode="elevated" style={{ marginBottom: 12, borderRadius: theme.roundness }}>
      <Card.Content style={{ paddingTop: 4, paddingBottom: 12 }}>
        {onSeeMore ? (
          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: 4,
            }}
          >
            <Text variant="titleMedium" style={{ fontWeight: '600' }}>
              Customer balance
            </Text>
            <Button compact mode="text" onPress={onSeeMore}>
              See more
            </Button>
          </View>
        ) : null}
        <View style={{ flexDirection: 'row' }}>
          <View style={{ flex: 1, alignItems: 'center', paddingVertical: 4 }}>
            <Text variant="headlineSmall" style={{ fontWeight: '700', color: theme.colors.primary }}>
              {formatCurrency(youWillGive)}
            </Text>
            <Text variant="labelMedium" style={{ color: theme.colors.onSurfaceVariant, marginTop: 4 }}>
              You will give
            </Text>
          </View>
          <View
            style={{
              width: 1,
              backgroundColor: theme.colors.outlineVariant,
              marginVertical: 4,
            }}
          />
          <View style={{ flex: 1, alignItems: 'center', paddingVertical: 4 }}>
            <Text variant="headlineSmall" style={{ fontWeight: '700', color: theme.colors.error }}>
              {formatCurrency(youWillGet)}
            </Text>
            <Text variant="labelMedium" style={{ color: theme.colors.onSurfaceVariant, marginTop: 4 }}>
              You will get
            </Text>
          </View>
        </View>
      </Card.Content>
    </Card>
  );
}
