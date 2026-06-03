import React from 'react';
import { ScrollView } from 'react-native';
import { Portal, Dialog, Text, Button, List, Divider, useTheme } from 'react-native-paper';
import { formatCurrency } from '../../utils/formatCurrency';
import { formatDateTime } from '../../utils/formatDate';
import { useTranslation } from '../../i18n/useTranslation';

export default function CustomerDeletionBlockedModal({
  visible,
  customerName,
  sales = [],
  onClose,
  onOpenSale,
}) {
  const theme = useTheme();
  const { t, isRtl } = useTranslation();
  const textDir = { writingDirection: isRtl ? 'rtl' : 'ltr' };

  if (!visible) return null;

  return (
    <Portal>
      <Dialog visible onDismiss={onClose} style={{ borderRadius: 12, maxHeight: '85%' }}>
        <Dialog.Title style={textDir}>{t('customer.deleteBlockedTitle')}</Dialog.Title>
        <Dialog.Content style={{ paddingHorizontal: 0, maxHeight: 420 }}>
          {customerName ? (
            <Text variant="titleSmall" style={{ fontWeight: '600', marginBottom: 8, paddingHorizontal: 24, ...textDir }}>
              {customerName}
            </Text>
          ) : null}
          <Text variant="bodyMedium" style={{ marginBottom: 12, paddingHorizontal: 24, ...textDir }}>
            {t('customer.deleteBlockedSalesMessage', { count: sales.length })}
          </Text>
          <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, marginBottom: 8, paddingHorizontal: 24, ...textDir }}>
            {t('customer.deleteBlockedHint')}
          </Text>
          <ScrollView style={{ maxHeight: 280 }}>
            {sales.map((sale, index) => (
              <React.Fragment key={sale.id}>
                {index > 0 ? <Divider /> : null}
                <List.Item
                  title={sale.invoiceNumber}
                  description={`${formatDateTime(sale.createdAt)} · ${formatCurrency(sale.totalAmount)}`}
                  left={(props) => <List.Icon {...props} icon="receipt" />}
                  right={(props) => <List.Icon {...props} icon="chevron-right" />}
                  onPress={() => onOpenSale?.(sale)}
                  titleStyle={textDir}
                  descriptionStyle={textDir}
                />
              </React.Fragment>
            ))}
          </ScrollView>
        </Dialog.Content>
        <Dialog.Actions>
          <Button onPress={onClose}>{t('common.close')}</Button>
        </Dialog.Actions>
      </Dialog>
    </Portal>
  );
}
