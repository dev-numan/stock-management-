import React, { useMemo } from 'react';
import { ScrollView } from 'react-native';
import { Portal, Dialog, Text, Button, List, Divider, useTheme } from 'react-native-paper';
import { formatCurrency } from '../../utils/formatCurrency';
import { formatDateTime } from '../../utils/formatDate';
import { useTranslation } from '../../i18n/useTranslation';

export default function SupplierDeletionBlockedModal({
  visible,
  supplierName,
  products = [],
  purchases = [],
  onClose,
  onOpenProduct,
}) {
  const theme = useTheme();
  const { t, isRtl } = useTranslation();
  const textDir = { writingDirection: isRtl ? 'rtl' : 'ltr' };

  const message = useMemo(() => {
    const hasProducts = products.length > 0;
    const hasPurchases = purchases.length > 0;
    if (hasProducts && hasPurchases) {
      return t('supplier.deleteBlockedBothMessage', {
        productCount: products.length,
        purchaseCount: purchases.length,
      });
    }
    if (hasProducts) {
      return t('supplier.deleteBlockedProductsMessage', { count: products.length });
    }
    if (hasPurchases) {
      return t('supplier.deleteBlockedPurchasesMessage', { count: purchases.length });
    }
    return t('supplier.deleteBlockedGeneric');
  }, [products.length, purchases.length, t]);

  if (!visible) return null;

  return (
    <Portal>
      <Dialog visible onDismiss={onClose} style={{ borderRadius: 12, maxHeight: '85%' }}>
        <Dialog.Title style={textDir}>{t('supplier.deleteBlockedTitle')}</Dialog.Title>
        <Dialog.Content style={{ paddingHorizontal: 0, maxHeight: 420 }}>
          {supplierName ? (
            <Text variant="titleSmall" style={{ fontWeight: '600', marginBottom: 8, paddingHorizontal: 24, ...textDir }}>
              {supplierName}
            </Text>
          ) : null}
          <Text variant="bodyMedium" style={{ marginBottom: 12, paddingHorizontal: 24, ...textDir }}>
            {message}
          </Text>
          <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, marginBottom: 8, paddingHorizontal: 24, ...textDir }}>
            {t('supplier.deleteBlockedHint')}
          </Text>
          <ScrollView style={{ maxHeight: 280 }}>
            {products.map((product, index) => (
              <React.Fragment key={product.id}>
                {index > 0 ? <Divider /> : null}
                <List.Item
                  title={product.name}
                  description={t('supplier.deleteBlockedProductStock', {
                    stock: Number(product.currentStock ?? 0),
                  })}
                  left={(props) => <List.Icon {...props} icon="package-variant" />}
                  right={(props) => <List.Icon {...props} icon="chevron-right" />}
                  onPress={() => onOpenProduct?.(product)}
                  titleStyle={textDir}
                  descriptionStyle={textDir}
                />
              </React.Fragment>
            ))}
            {purchases.map((purchase, index) => (
              <React.Fragment key={purchase.id}>
                {index > 0 || products.length > 0 ? <Divider /> : null}
                <List.Item
                  title={purchase.notes?.trim() || t('supplier.col.purchase')}
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
