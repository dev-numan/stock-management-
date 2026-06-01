import React, { useEffect, useState } from 'react';
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
  onSubmit,
  onClose,
  loading,
}) {
  const { t, isRtl } = useTranslation();
  const textDir = { writingDirection: isRtl ? 'rtl' : 'ltr' };
  const suppliers = useSuppliersStore((s) => s.suppliers);
  const [quantity, setQuantity] = useState('');
  const [supplierName, setSupplierName] = useState('');
  const [selectedSupplier, setSelectedSupplier] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!visible) {
      setQuantity('');
      setSupplierName('');
      setSelectedSupplier(null);
      setError(null);
      return;
    }
    setSupplierName(defaultSupplierName || '');
    setSelectedSupplier(
      defaultSupplierId
        ? suppliers.find((s) => s.id === defaultSupplierId) || { id: defaultSupplierId, name: defaultSupplierName }
        : null
    );
  }, [visible, defaultSupplierName, defaultSupplierId, suppliers]);

  const handleSubmit = () => {
    const qty = Number(String(quantity).trim());
    if (!qty || qty <= 0) {
      setError(t('product.addStockQtyRequired'));
      return;
    }
    const trimmedName = supplierName.trim();
    const match = selectedSupplier || findSupplierByExactName(suppliers, trimmedName);
    if (!match && !trimmedName) {
      setError(t('product.supplierRequired'));
      return;
    }
    setError(null);
    onSubmit({
      quantity: qty,
      supplierId: match?.id,
      supplierName: match ? undefined : trimmedName,
    });
  };

  return (
    <Portal>
      <Dialog visible={visible} onDismiss={onClose} style={{ borderRadius: 12 }}>
        <Dialog.Title>{t('product.addStockTitle')}</Dialog.Title>
        <Dialog.Content>
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
          <SupplierNameAutocomplete
            value={supplierName}
            onChangeText={setSupplierName}
            onSelectSupplier={setSelectedSupplier}
            selectedSupplierId={selectedSupplier?.id}
          />
          {error ? (
            <Text variant="bodySmall" style={{ color: '#B00020', marginTop: 4, ...textDir }}>
              {error}
            </Text>
          ) : null}
        </Dialog.Content>
        <Dialog.Actions>
          <AppButton title={t('common.cancel')} variant="outline" onPress={onClose} disabled={loading} />
          <AppButton title={t('product.addStockConfirm')} onPress={handleSubmit} loading={loading} />
        </Dialog.Actions>
      </Dialog>
    </Portal>
  );
}
