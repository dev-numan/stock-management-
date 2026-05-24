import React from 'react';
import { Text, List, useTheme } from 'react-native-paper';
import { formatCurrency } from '../../utils/formatCurrency';
import { formatDateTime } from '../../utils/formatDate';

export default function RecentSaleItem({ sale, onPress }) {
  const theme = useTheme();

  return (
    <List.Item
      title={sale.invoiceNumber}
      description={`${sale.customer?.name || 'Walk-in'} · ${formatDateTime(sale.createdAt)}`}
      onPress={onPress}
      right={() => (
        <Text variant="titleSmall" style={{ color: theme.colors.primary, fontWeight: '700', alignSelf: 'center' }}>
          {formatCurrency(sale.totalAmount)}
        </Text>
      )}
      style={{ paddingHorizontal: 0 }}
    />
  );
}
