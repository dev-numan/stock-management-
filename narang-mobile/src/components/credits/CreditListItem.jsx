import React from 'react';
import { Pressable } from 'react-native';
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
          <Card.Title
            title={customerName}
            subtitle={sale.invoiceNumber}
            titleVariant="titleMedium"
            right={() => (
              <Text variant="titleMedium" style={{ color: theme.colors.secondary, fontWeight: '700' }}>
                {formatCurrency(sale.totalAmount)}
              </Text>
            )}
          />
          {sale.customer?.phone ? (
            <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, marginTop: -4 }}>
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
