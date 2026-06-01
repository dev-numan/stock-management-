import React from 'react';
import { Pressable, View } from 'react-native';
import { Text, useTheme } from 'react-native-paper';
import { formatCurrency } from '../../utils/formatCurrency';
import { formatDateTime } from '../../utils/formatDate';
import { useTranslation } from '../../i18n/useTranslation';

export default function RecentSaleItem({ sale, onPress, isLast }) {
  const theme = useTheme();
  const { t, isRtl } = useTranslation();

  return (
    <Pressable
      onPress={onPress}
      style={{
        paddingVertical: 10,
        borderBottomWidth: isLast ? 0 : 1,
        borderBottomColor: theme.colors.outlineVariant,
      }}
    >
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <View style={{ flex: 1, marginRight: 8 }}>
          <Text variant="titleSmall" style={{ fontWeight: '600' }}>
            {sale.invoiceNumber}
          </Text>
          <Text
            variant="bodySmall"
            style={{ color: theme.colors.onSurfaceVariant, marginTop: 2, writingDirection: isRtl ? 'rtl' : 'ltr' }}
            numberOfLines={2}
          >
            {sale.customer?.name || t('sale.walkIn')} · {formatDateTime(sale.createdAt)}
          </Text>
        </View>
        <Text variant="titleSmall" style={{ color: theme.colors.primary, fontWeight: '700' }}>
          {formatCurrency(sale.totalAmount)}
        </Text>
      </View>
    </Pressable>
  );
}
