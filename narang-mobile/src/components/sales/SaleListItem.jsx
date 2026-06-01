import React from 'react';
import { Pressable, View } from 'react-native';
import { Card, Text, useTheme } from 'react-native-paper';
import { formatCurrency } from '../../utils/formatCurrency';
import { formatDateTime } from '../../utils/formatDate';
import { useTranslation } from '../../i18n/useTranslation';

export default function SaleListItem({ sale, onPress }) {
  const theme = useTheme();
  const { t, isRtl } = useTranslation();
  const textDir = { writingDirection: isRtl ? 'rtl' : 'ltr' };

  const paymentLabel =
    sale.paymentMethod === 'CREDIT' ? t('payment.credit') : sale.paymentMethod;

  return (
    <Pressable onPress={onPress}>
      <Card mode="elevated" style={{ marginBottom: 12, borderRadius: theme.roundness }}>
        <Card.Content>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <View style={{ flex: 1, marginRight: 8 }}>
              <Text variant="titleMedium" style={{ fontWeight: '600' }}>
                {sale.invoiceNumber}
              </Text>
              <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, ...textDir }}>
                {sale.customer?.name || t('sale.walkInCustomer')}
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
          <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, marginTop: 4, ...textDir }}>
            {formatDateTime(sale.createdAt)}
            {' · '}
            {paymentLabel}
            {sale.pendingSync ? ` · ${t('common.pendingSync')}` : ''}
          </Text>
        </Card.Content>
      </Card>
    </Pressable>
  );
}
