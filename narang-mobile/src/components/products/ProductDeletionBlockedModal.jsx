import React, { useMemo } from 'react';
import { ScrollView, View } from 'react-native';
import { Portal, Dialog, Text, Button, List, Divider, useTheme } from 'react-native-paper';
import { formatCurrency } from '../../utils/formatCurrency';
import { formatDateTime } from '../../utils/formatDate';
import { useTranslation } from '../../i18n/useTranslation';

export default function ProductDeletionBlockedModal({
  visible,
  productName,
  sales = [],
  purchases = [],
  onClose,
  onOpenSale,
}) {
  const theme = useTheme();
  const { t, isRtl } = useTranslation();
  const textDir = { writingDirection: isRtl ? 'rtl' : 'ltr' };

  const message = useMemo(() => {
    const hasSales = sales.length > 0;
    const hasPurchases = purchases.length > 0;
    if (hasSales && hasPurchases) {
      return t('product.deleteBlockedBothMessage', {
        saleCount: sales.length,
        purchaseCount: purchases.length,
      });
    }
    if (hasSales) {
      return t('product.deleteBlockedSalesMessage', { count: sales.length });
    }
    if (hasPurchases) {
      return t('product.deleteBlockedPurchasesMessage', { count: purchases.length });
    }
    return t('product.deleteBlockedGeneric');
  }, [sales.length, purchases.length, t]);

  if (!visible) return null;

  return (
    <Portal>
      <Dialog visible onDismiss={onClose} style={{ borderRadius: 12, maxHeight: '85%' }}>
        <Dialog.Title style={textDir}>{t('product.deleteBlockedTitle')}</Dialog.Title>
        <Dialog.Content style={{ paddingHorizontal: 0, maxHeight: 420 }}>
          {productName ? (
            <Text variant="titleSmall" style={{ fontWeight: '600', marginBottom: 8, paddingHorizontal: 24, ...textDir }}>
              {productName}
            </Text>
          ) : null}
          <Text variant="bodyMedium" style={{ marginBottom: 12, paddingHorizontal: 24, ...textDir }}>
            {message}
          </Text>
          <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, marginBottom: 8, paddingHorizontal: 24, ...textDir }}>
            {t('product.deleteBlockedHint')}
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
            {purchases.map((purchase, index) => (
              <React.Fragment key={purchase.id}>
                {index > 0 || sales.length > 0 ? <Divider /> : null}
                <List.Item
                  title={purchase.supplier?.name || t('product.deleteBlockedPurchaseFallback')}
                  description={`${formatDateTime(purchase.createdAt)} · ${formatCurrency(purchase.totalAmount)}`}
                  left={(props) => <List.Icon {...props} icon="cart-arrow-down" />}
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
