import React from 'react';
import { Pressable, View } from 'react-native';
import { Card, Text, useTheme } from 'react-native-paper';
import { formatCurrency } from '../../utils/formatCurrency';
import { formatDateTime } from '../../utils/formatDate';

export default function CreditListItem({ sale, onPress }) {
  const theme = useTheme();
  const customerName = sale.customer?.name || 'Walk-in customer';

  return (
    <Pressable onPress={onPress}>
      <Card mode="elevated" style={{ marginBottom: 8, borderRadius: theme.roundness }}>
        <Card.Content>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <View style={{ flex: 1, marginRight: 8 }}>
              <Text variant="titleMedium" style={{ fontWeight: '600' }}>
                {customerName}
              </Text>
              <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                {sale.invoiceNumber}
              </Text>
            </View>
            <Text variant="titleMedium" style={{ color: theme.colors.secondary, fontWeight: '700' }}>
              {formatCurrency(sale.totalAmount)}
            </Text>
          </View>
          {sale.customer?.phone ? (
            <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, marginTop: 4 }}>
              {sale.customer.phone}
            </Text>
          ) : null}
          <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, marginTop: 4 }}>
            {formatDateTime(sale.createdAt)}
          </Text>
        </Card.Content>
      </Card>
    </Pressable>
  );
}
