import React from 'react';
import { Pressable, View } from 'react-native';
import { Card, Text, useTheme } from 'react-native-paper';
import { formatCurrency } from '../../utils/formatCurrency';
import { formatDateTime } from '../../utils/formatDate';

export default function SaleListItem({ sale, onPress }) {
  const theme = useTheme();

  return (
    <Pressable onPress={onPress}>
      <Card mode="elevated" style={{ marginBottom: 12, borderRadius: theme.roundness }}>
        <Card.Content>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <View style={{ flex: 1, marginRight: 8 }}>
              <Text variant="titleMedium" style={{ fontWeight: '600' }}>
                {sale.invoiceNumber}
              </Text>
              <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                {sale.customer?.name || 'Walk-in customer'}
              </Text>
            </View>
            <Text variant="titleMedium" style={{ color: theme.colors.primary, fontWeight: '700' }}>
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
            {' · '}
            {sale.paymentMethod === 'CREDIT' ? 'Credit' : sale.paymentMethod}
            {sale.pendingSync ? ' · Pending sync' : ''}
          </Text>
        </Card.Content>
      </Card>
    </Pressable>
  );
}
