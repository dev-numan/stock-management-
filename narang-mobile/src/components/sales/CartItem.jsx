import React, { useState } from 'react';
import { View } from 'react-native';
import { Card, Text, IconButton, useTheme } from 'react-native-paper';
import { formatCurrency } from '../../utils/formatCurrency';
import AppInput from '../common/AppInput';
import { usesDecimalQuantity } from '../../utils/productUnits';
import { sanitizeAmountInput } from '../../utils/validation';

export default function CartItem({ item, onUpdateQty, onRemove }) {
  const theme = useTheme();
  const [qtyText, setQtyText] = useState(String(item.quantity));
  const atMax = item.quantity >= item.maxQuantity - 0.0001;
  const decimalUnit = usesDecimalQuantity(item.soldUnit, item.product.unit);

  React.useEffect(() => {
    setQtyText(String(item.quantity));
  }, [item.quantity]);

  const commitQty = (text) => {
    const qty = Number(text);
    if (!text || Number.isNaN(qty)) {
      setQtyText(String(item.quantity));
      return;
    }
    onUpdateQty(item.lineKey, qty);
  };

  return (
    <Card mode="elevated" style={{ marginBottom: 8, borderRadius: theme.roundness }}>
      <Card.Content>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <View style={{ flex: 1 }}>
            <Text variant="titleSmall" style={{ fontWeight: '600' }}>
              {item.product.name}
            </Text>
            <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
              {formatCurrency(item.unitPrice)} / {item.soldUnit}
            </Text>
            <Text variant="labelSmall" style={{ color: theme.colors.outline }}>
              Available: {Math.round(item.maxQuantity * 100) / 100} {item.soldUnit}
            </Text>
          </View>
          {decimalUnit ? (
            <View style={{ width: 88, marginHorizontal: 4 }}>
              <AppInput
                label="Qty"
                value={qtyText}
                onChangeText={(t) => setQtyText(sanitizeAmountInput(t))}
                onBlur={() => commitQty(qtyText)}
                keyboardType="decimal-pad"
                dense
              />
            </View>
          ) : (
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <IconButton
                icon="minus"
                size={18}
                mode="contained-tonal"
                onPress={() => onUpdateQty(item.lineKey, item.quantity - 1)}
              />
              <Text variant="titleMedium" style={{ minWidth: 24, textAlign: 'center', fontWeight: '600' }}>
                {item.quantity}
              </Text>
              <IconButton
                icon="plus"
                size={18}
                mode="contained"
                containerColor={atMax ? theme.colors.surfaceDisabled : theme.colors.primary}
                iconColor={atMax ? theme.colors.onSurfaceDisabled : theme.colors.onPrimary}
                disabled={atMax}
                onPress={() => !atMax && onUpdateQty(item.lineKey, item.quantity + 1)}
              />
            </View>
          )}
          <View style={{ marginLeft: 8, alignItems: 'flex-end' }}>
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
        {atMax ? (
          <Text variant="labelSmall" style={{ color: theme.colors.secondary, marginTop: 8 }}>
            Maximum stock reached
          </Text>
        ) : null}
      </Card.Content>
    </Card>
  );
}
