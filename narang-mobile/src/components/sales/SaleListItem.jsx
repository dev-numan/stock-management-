import React from 'react';
import { Pressable } from 'react-native';
import { Card, Text, useTheme } from 'react-native-paper';
import { formatCurrency } from '../../utils/formatCurrency';
import { formatDateTime } from '../../utils/formatDate';

export default function SaleListItem({ sale, onPress }) {
  const theme = useTheme();

  return (
    <Pressable onPress={onPress}>
      <Card mode="elevated" style={{ marginBottom: 12, borderRadius: theme.roundness }}>
        <Card.Content>
          <Card.Title
            title={sale.invoiceNumber}
            subtitle={sale.customer?.name || 'Walk-in customer'}
            titleVariant="titleMedium"
            subtitleVariant="bodySmall"
            right={() => (
              <Text variant="titleMedium" style={{ color: theme.colors.primary, fontWeight: '700' }}>
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
            {' · '}
            {sale.paymentMethod === 'CREDIT' ? 'Credit' : sale.paymentMethod}
            {sale.pendingSync ? ' · Pending sync' : ''}
          </Text>
        </Card.Content>
      </Card>
    </Pressable>
  );
}
