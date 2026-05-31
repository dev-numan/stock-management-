import React, { useState } from 'react';
import { View } from 'react-native';
import { Card, Text, IconButton, Chip, useTheme } from 'react-native-paper';
import { formatCurrency } from '../../utils/formatCurrency';
import AppInput from '../common/AppInput';
import {
  formatMaxQtyLabel,
  hasAlternateSale,
  usesDecimalQuantity,
} from '../../utils/productUnits';
import { sanitizeAmountInput } from '../../utils/validation';

export default function CartItem({ item, onUpdateQty, onRemove, onChangeUnit }) {
  const theme = useTheme();
  const [qtyText, setQtyText] = useState(String(item.quantity));
  const [qtyError, setQtyError] = useState(null);
  const atMax = item.quantity >= item.maxQuantity - 0.0001;
  const decimalUnit = usesDecimalQuantity(item.soldUnit, item.product.unit);
  const canChangeUnit = hasAlternateSale(item.product) && onChangeUnit;

  React.useEffect(() => {
    setQtyText(String(item.quantity));
  }, [item.quantity, item.maxQuantity]);

  const commitQty = (text) => {
    const qty = Number(text);
    if (!text || Number.isNaN(qty) || qty <= 0) {
      setQtyText(String(item.quantity));
      setQtyError(null);
      return;
    }
    const result = onUpdateQty(item.lineKey, qty);
    if (result?.capped) {
      setQtyError(`Only ${formatMaxQtyLabel(result.maxQty, item.soldUnit)} available`);
    } else if (qty > item.maxQuantity + 0.0001) {
      setQtyError(`Only ${formatMaxQtyLabel(item.maxQuantity, item.soldUnit)} available`);
    } else {
      setQtyError(null);
    }
  };

  return (
    <Card mode="elevated" style={{ marginBottom: 8, borderRadius: theme.roundness }}>
      <Card.Content>
        <View style={{ flexDirection: 'row', alignItems: 'flex-start', marginBottom: 8 }}>
          <View style={{ flex: 1, paddingRight: 8 }}>
            <Text variant="titleSmall" style={{ fontWeight: '600' }} numberOfLines={2}>
              {item.product.name}
            </Text>
            <Text
              variant="bodySmall"
              style={{ color: theme.colors.onSurfaceVariant, marginTop: 2 }}
            >
              {formatCurrency(item.unitPrice)} / {item.soldUnit}
            </Text>
            <Text variant="labelSmall" style={{ color: theme.colors.outline, marginTop: 2 }}>
              Available: {Math.round(item.maxQuantity * 100) / 100} {item.soldUnit}
            </Text>
            {canChangeUnit ? (
              <Chip
                compact
                icon="swap-horizontal"
                onPress={() => onChangeUnit(item)}
                style={{ alignSelf: 'flex-start', marginTop: 6 }}
              >
                Change unit
              </Chip>
            ) : null}
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text variant="titleSmall" style={{ color: theme.colors.primary, fontWeight: '700' }}>
              {formatCurrency(item.total)}
            </Text>
            <Text
              variant="labelSmall"
              style={{ color: theme.colors.error, marginTop: 4 }}
              onPress={() => onRemove(item.lineKey)}
            >
              Remove
            </Text>
          </View>
        </View>

        {decimalUnit ? (
          <AppInput
            label={`Quantity (${item.soldUnit})`}
            value={qtyText}
            onChangeText={(t) => {
              setQtyError(null);
              setQtyText(sanitizeAmountInput(t));
            }}
            onBlur={() => commitQty(qtyText)}
            onSubmitEditing={() => commitQty(qtyText)}
            keyboardType="decimal-pad"
            error={qtyError}
          />
        ) : (
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <Text variant="labelLarge">Quantity</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <IconButton
                icon="minus"
                size={20}
                mode="contained-tonal"
                onPress={() => onUpdateQty(item.lineKey, item.quantity - 1)}
              />
              <Text
                variant="titleMedium"
                style={{ minWidth: 32, textAlign: 'center', fontWeight: '600' }}
              >
                {item.quantity}
              </Text>
              <IconButton
                icon="plus"
                size={20}
                mode="contained"
                containerColor={atMax ? theme.colors.surfaceDisabled : theme.colors.primary}
                iconColor={atMax ? theme.colors.onSurfaceDisabled : theme.colors.onPrimary}
                disabled={atMax}
                onPress={() => !atMax && onUpdateQty(item.lineKey, item.quantity + 1)}
              />
            </View>
          </View>
        )}

        {atMax ? (
          <Text variant="labelSmall" style={{ color: theme.colors.secondary, marginTop: 8 }}>
            Maximum stock reached
          </Text>
        ) : null}
      </Card.Content>
    </Card>
  );
}
