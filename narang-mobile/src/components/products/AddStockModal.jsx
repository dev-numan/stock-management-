import React, { useEffect, useState } from 'react';
import { ScrollView } from 'react-native';
import { Portal, Dialog, Text } from 'react-native-paper';
import AppInput from '../common/AppInput';
import AppButton from '../common/AppButton';
import SupplierNameAutocomplete from '../suppliers/SupplierNameAutocomplete';
import { useTranslation } from '../../i18n/useTranslation';
import { sanitizeAmountInput } from '../../utils/validation';
import { findSupplierByExactName } from '../../utils/supplierLedger';
import { useSuppliersStore } from '../../stores/suppliersStore';

export default function AddStockModal({
  visible,
  productName,
  defaultSupplierName,
  defaultSupplierId,
  defaultCostPrice,
  defaultSalePrice,
  onSubmit,
  onClose,
  loading,
}) {
  const { t, isRtl } = useTranslation();
  const textDir = { writingDirection: isRtl ? 'rtl' : 'ltr' };
  const suppliers = useSuppliersStore((s) => s.suppliers);
  const [quantity, setQuantity] = useState('');
  const [costPrice, setCostPrice] = useState('');
  const [salePrice, setSalePrice] = useState('');
  const [supplierName, setSupplierName] = useState('');
  const [selectedSupplier, setSelectedSupplier] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!visible) {
      setQuantity('');
      setCostPrice('');
      setSalePrice('');
      setSupplierName('');
      setSelectedSupplier(null);
      setError(null);
      return;
    }
    setCostPrice(
      defaultCostPrice != null && defaultCostPrice !== ''
        ? String(defaultCostPrice)
        : ''
    );
    setSalePrice(
      defaultSalePrice != null && defaultSalePrice !== ''
        ? String(defaultSalePrice)
        : ''
    );
    setSupplierName(defaultSupplierName || '');
    setSelectedSupplier(
      defaultSupplierId
        ? suppliers.find((s) => s.id === defaultSupplierId) || { id: defaultSupplierId, name: defaultSupplierName }
        : null
    );
  }, [visible, defaultSupplierName, defaultSupplierId, defaultCostPrice, defaultSalePrice, suppliers]);

  const handleSubmit = () => {
    const qty = Number(String(quantity).trim());
    if (!qty || qty <= 0) {
      setError(t('product.addStockQtyRequired'));
      return;
    }
    const cost = Number(String(costPrice).trim());
    const sale = Number(String(salePrice).trim());
    if (!cost || cost <= 0) {
      setError(t('product.costPrice'));
      return;
    }
    if (!sale || sale <= 0) {
      setError(t('product.salePrice'));
      return;
    }
    if (sale < cost) {
      setError(t('product.saleBelowCost'));
      return;
    }
    const trimmedName = supplierName.trim();
    const match = selectedSupplier || findSupplierByExactName(suppliers, trimmedName);
    setError(null);
    onSubmit({
      quantity: qty,
      costPrice: cost,
      salePrice: sale,
      supplierId: match?.id,
      supplierName: match ? undefined : trimmedName || undefined,
    });
  };

  return (
    <Portal>
      <Dialog visible={visible} onDismiss={onClose} style={{ borderRadius: 12, maxHeight: '90%' }}>
        <Dialog.Title>{t('product.addStockTitle')}</Dialog.Title>
        <Dialog.ScrollArea style={{ paddingHorizontal: 0, maxHeight: 420 }}>
          <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingHorizontal: 24 }}>
            {productName ? (
              <Text variant="bodyMedium" style={{ marginBottom: 12, fontWeight: '600', ...textDir }}>
                {productName}
              </Text>
            ) : null}
            <AppInput
              label={t('product.addStockQty')}
              value={quantity}
              onChangeText={(v) => setQuantity(sanitizeAmountInput(v))}
              keyboardType="decimal-pad"
              placeholder="1"
            />
            <AppInput
              label={t('product.costPrice')}
              value={costPrice}
              onChangeText={(v) => setCostPrice(sanitizeAmountInput(v))}
              keyboardType="decimal-pad"
            />
            <AppInput
              label={t('product.salePrice')}
              value={salePrice}
              onChangeText={(v) => setSalePrice(sanitizeAmountInput(v))}
              keyboardType="decimal-pad"
            />
            <Text variant="bodySmall" style={{ color: '#6B7280', marginTop: -4, marginBottom: 8, ...textDir }}>
              {t('product.addStockSaleHint')}
            </Text>
            <SupplierNameAutocomplete
              value={supplierName}
              onChangeText={setSupplierName}
              onSelectSupplier={setSelectedSupplier}
              selectedSupplierId={selectedSupplier?.id}
              optional
            />
            <Text variant="bodySmall" style={{ color: '#6B7280', marginTop: -4, marginBottom: 8, ...textDir }}>
              {t('product.noSupplierStockHint')}
            </Text>
            {error ? (
              <Text variant="bodySmall" style={{ color: '#B00020', marginTop: 4, ...textDir }}>
                {error}
              </Text>
            ) : null}
          </ScrollView>
        </Dialog.ScrollArea>
        <Dialog.Actions>
          <AppButton title={t('common.cancel')} variant="outline" onPress={onClose} disabled={loading} />
          <AppButton title={t('product.addStockConfirm')} onPress={handleSubmit} loading={loading} />
        </Dialog.Actions>
      </Dialog>
    </Portal>
  );
}
