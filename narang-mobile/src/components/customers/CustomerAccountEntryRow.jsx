import React from 'react';
import { View } from 'react-native';
import { Text, IconButton, useTheme } from 'react-native-paper';
import { formatCurrency } from '../../utils/formatCurrency';
import { formatDateTime } from '../../utils/formatDate';
import { useTranslation } from '../../i18n/useTranslation';

const TYPE_LABEL_KEYS = {
  payment: 'customer.entryTypePayment',
  credit: 'customer.entryTypeCredit',
  sale: 'customer.entryTypeSale',
};

export default function CustomerAccountEntryRow({
  entry,
  canDelete,
  onDelete,
  onOpenSale,
}) {
  const theme = useTheme();
  const { t, isRtl } = useTranslation();
  const textDir = { writingDirection: isRtl ? 'rtl' : 'ltr' };
  const amt = Number(entry.amount);
  const isCredit = amt < 0;
  const typeKey = TYPE_LABEL_KEYS[entry.entryType] || TYPE_LABEL_KEYS.payment;

  const noteText =
    entry.notes?.trim() ||
    (entry.linkedSaleId && entry.sale?.invoiceNumber
      ? entry.sale.invoiceNumber
      : '—');

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
      <View style={{ flex: 1.1, paddingRight: 6 }}>
        <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, ...textDir }}>
          {formatDateTime(entry.createdAt)}
        </Text>
        <Text variant="labelSmall" style={{ marginTop: 4, color: theme.colors.secondary, ...textDir }}>
          {t(typeKey)}
        </Text>
      </View>
      <View style={{ width: 88, alignItems: isRtl ? 'flex-start' : 'flex-end' }}>
        <Text
          variant="titleSmall"
          style={{
            fontWeight: '700',
            color: isCredit ? theme.colors.error : theme.colors.primary,
          }}
        >
          {isCredit ? '−' : '+'}
          {formatCurrency(Math.abs(amt))}
        </Text>
        <Text variant="labelSmall" style={{ marginTop: 4, color: theme.colors.onSurfaceVariant }}>
          {t('customer.col.balance')}: {formatCurrency(entry.balanceAfter)}
        </Text>
      </View>
      <View style={{ flex: 1.2, paddingHorizontal: 6 }}>
        {entry.linkedSaleId ? (
          <Text
            variant="bodyMedium"
            style={{ fontWeight: '600', color: theme.colors.primary, ...textDir }}
            numberOfLines={2}
            onPress={() => onOpenSale?.(entry)}
          >
            {noteText}
          </Text>
        ) : (
          <Text variant="bodyMedium" style={{ ...textDir }} numberOfLines={3}>
            {noteText}
          </Text>
        )}
      </View>
      {canDelete && onDelete && !entry.linkedSaleId ? (
        <IconButton
          icon="delete-outline"
          size={20}
          onPress={() => onDelete(entry)}
          accessibilityLabel={t('common.delete')}
        />
      ) : null}
    </View>
  );
}
