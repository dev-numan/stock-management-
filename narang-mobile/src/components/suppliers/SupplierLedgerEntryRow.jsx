import React from 'react';
import { View } from 'react-native';
import { Text, useTheme } from 'react-native-paper';
import { formatCurrency } from '../../utils/formatCurrency';
import { formatDateTime } from '../../utils/formatDate';
import { useTranslation } from '../../i18n/useTranslation';

export default function SupplierLedgerEntryRow({ entry }) {
  const theme = useTheme();
  const { t, isRtl } = useTranslation();
  const textDir = { writingDirection: isRtl ? 'rtl' : 'ltr' };
  const isPayment = entry.type === 'PAYMENT';
  return (
    <View
      style={{
        flexDirection: 'row',
        paddingVertical: 12,
        paddingHorizontal: 4,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.outlineVariant,
        alignItems: 'flex-start',
      }}
    >
      <View style={{ width: 72, alignItems: 'center', paddingTop: 2 }}>
        <Text
          variant="titleSmall"
          style={{ fontWeight: '700', color: isPayment ? theme.colors.error : 'transparent' }}
        >
          {isPayment ? formatCurrency(entry.amount) : ' '}
        </Text>
      </View>
      <View style={{ width: 72, alignItems: 'center', paddingTop: 2 }}>
        <Text
          variant="titleSmall"
          style={{ fontWeight: '700', color: !isPayment ? theme.colors.primary : 'transparent' }}
        >
          {!isPayment ? formatCurrency(entry.amount) : ' '}
        </Text>
      </View>
      <View style={{ flex: 1, paddingLeft: 8 }}>
        <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, ...textDir }}>
          {formatDateTime(entry.createdAt)}
        </Text>
        <Text variant="bodyMedium" style={{ fontWeight: '600', marginTop: 4, ...textDir }} numberOfLines={3}>
          {entry.notes || (isPayment ? t('supplier.col.payment') : t('supplier.col.purchase'))}
        </Text>
        <View
          style={{
            alignSelf: isRtl ? 'flex-start' : 'flex-end',
            marginTop: 6,
            backgroundColor: theme.colors.primaryContainer,
            paddingHorizontal: 8,
            paddingVertical: 4,
            borderRadius: 6,
          }}
        >
          <Text variant="labelMedium" style={{ fontWeight: '700', color: theme.colors.primary }}>
            {formatCurrency(entry.balanceAfter)}
          </Text>
        </View>
      </View>
    </View>
  );
}
