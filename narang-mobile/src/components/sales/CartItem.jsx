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
import { useTranslation } from '../../i18n/useTranslation';

export default function CartItem({ item, onUpdateQty, onRemove, onChangeUnit }) {
  const theme = useTheme();
  const { t, isRtl } = useTranslation();
  const textDir = { writingDirection: isRtl ? 'rtl' : 'ltr' };
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
      setQtyError(t('cart.onlyAvailable', { qty: formatMaxQtyLabel(result.maxQty, item.soldUnit) }));
    } else if (qty > item.maxQuantity + 0.0001) {
      setQtyError(t('cart.onlyAvailable', { qty: formatMaxQtyLabel(item.maxQuantity, item.soldUnit) }));
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
            <Text variant="labelSmall" style={{ color: theme.colors.outline, marginTop: 2, ...textDir }}>
              {t('cart.available', {
                qty: Math.round(item.maxQuantity * 100) / 100,
                unit: item.soldUnit,
              })}
            </Text>
            {canChangeUnit ? (
              <Chip
                compact
                icon="swap-horizontal"
                onPress={() => onChangeUnit(item)}
                style={{ alignSelf: 'flex-start', marginTop: 6 }}
              >
                {t('cart.changeUnit')}
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
              {t('cart.remove')}
            </Text>
          </View>
        </View>

        {decimalUnit ? (
          <AppInput
            label={t('cart.quantity', { unit: item.soldUnit })}
            value={qtyText}
            onChangeText={(text) => {
              setQtyError(null);
              setQtyText(sanitizeAmountInput(text));
            }}
            onBlur={() => commitQty(qtyText)}
            onSubmitEditing={() => commitQty(qtyText)}
            keyboardType="decimal-pad"
            error={qtyError}
          />
        ) : (
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <Text variant="labelLarge" style={textDir}>{t('cart.quantityPlain')}</Text>
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
          <Text variant="labelSmall" style={{ color: theme.colors.secondary, marginTop: 8, ...textDir }}>
            {t('cart.maxStock')}
          </Text>
        ) : null}
      </Card.Content>
    </Card>
  );
}
