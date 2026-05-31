import React, { useState } from 'react';
import { View } from 'react-native';
import { Modal, Portal, Text, SegmentedButtons, useTheme } from 'react-native-paper';
import AppInput from '../common/AppInput';
import AppButton from '../common/AppButton';
import { formatCurrency } from '../../utils/formatCurrency';
import {
  getMaxSaleQuantity,
  getUnitPrice,
  hasAlternateSale,
} from '../../utils/productUnits';
import { sanitizeAmountInput } from '../../utils/validation';

export default function SaleUnitPickerModal({
  visible,
  product,
  onClose,
  onConfirm,
  initialSoldUnit,
  initialQuantity,
  confirmLabel = 'Add to cart',
}) {
  const theme = useTheme();
  const [soldUnit, setSoldUnit] = useState(product?.unit || 'BAG');
  const [quantity, setQuantity] = useState('1');
  const [error, setError] = useState(null);

  React.useEffect(() => {
    if (!visible || !product) return;
    setSoldUnit(initialSoldUnit || product.unit);
    setQuantity(initialQuantity != null ? String(initialQuantity) : '1');
    setError(null);
  }, [visible, product, initialSoldUnit, initialQuantity]);

  if (!visible || !product) return null;

  const alternateEnabled = hasAlternateSale(product);
  const unitOptions = alternateEnabled
    ? [
        { value: product.unit, label: product.unit },
        { value: product.alternateSaleUnit, label: product.alternateSaleUnit },
      ]
    : [{ value: product.unit, label: product.unit }];

  const unitPrice = getUnitPrice(product, soldUnit);
  const maxQty = getMaxSaleQuantity(product, soldUnit);
  const qtyNum = Number(quantity);
  const total = qtyNum > 0 ? qtyNum * unitPrice : 0;

  const handleConfirm = () => {
    const qty = Number(quantity);
    if (!qty || qty <= 0) {
      setError('Enter a valid quantity');
      return;
    }
    if (qty > maxQty + 0.0001) {
      setError(`Only ${Math.round(maxQty * 100) / 100} ${soldUnit} available`);
      return;
    }
    onConfirm(product, qty, soldUnit);
    onClose();
  };

  return (
    <Portal>
      <Modal
        visible
        onDismiss={onClose}
        contentContainerStyle={{
          margin: 24,
          padding: 20,
          borderRadius: theme.roundness,
          backgroundColor: theme.colors.surface,
        }}
      >
        <Text variant="titleMedium" style={{ fontWeight: '700', marginBottom: 4 }}>
          {product.name}
        </Text>
        <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, marginBottom: 12 }}>
          {alternateEnabled ? 'Choose unit and quantity' : 'Enter quantity'}
        </Text>
        <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, marginBottom: 12 }}>
          Available: {Math.round(maxQty * 100) / 100} {soldUnit}
        </Text>

        {alternateEnabled ? (
          <SegmentedButtons
            value={soldUnit}
            onValueChange={(unit) => {
              setSoldUnit(unit);
              setError(null);
            }}
            buttons={unitOptions}
            style={{ marginBottom: 12 }}
          />
        ) : null}

        <AppInput
          label={`Quantity (${soldUnit}) *`}
          value={quantity}
          onChangeText={(t) => {
            setError(null);
            setQuantity(sanitizeAmountInput(t));
          }}
          keyboardType="decimal-pad"
          error={error}
        />

        <Text variant="bodyMedium" style={{ marginBottom: 16 }}>
          {formatCurrency(unitPrice)} / {soldUnit} · Total {formatCurrency(total)}
        </Text>

        <View style={{ flexDirection: 'row', gap: 8 }}>
          <AppButton title="Cancel" variant="outline" onPress={onClose} style={{ flex: 1 }} />
          <AppButton title={confirmLabel} onPress={handleConfirm} style={{ flex: 1 }} />
        </View>
      </Modal>
    </Portal>
  );
}
