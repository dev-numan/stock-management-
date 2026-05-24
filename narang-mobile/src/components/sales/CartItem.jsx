import React from 'react';
import { View } from 'react-native';
import { Card, Text, IconButton, useTheme } from 'react-native-paper';
import { formatCurrency } from '../../utils/formatCurrency';

export default function CartItem({ item, onUpdateQty, onRemove }) {
  const theme = useTheme();
  const stock = Number(item.product.currentStock);
  const atMax = item.quantity >= stock;

  return (
    <Card mode="elevated" style={{ marginBottom: 8, borderRadius: theme.roundness }}>
      <Card.Content>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <View style={{ flex: 1 }}>
            <Text variant="titleSmall" style={{ fontWeight: '600' }}>
              {item.product.name}
            </Text>
            <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
              {formatCurrency(item.unitPrice)} each
            </Text>
            <Text variant="labelSmall" style={{ color: theme.colors.outline }}>
              Available: {stock}
            </Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <IconButton
              icon="minus"
              size={18}
              mode="contained-tonal"
              onPress={() => onUpdateQty(item.product.id, item.quantity - 1)}
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
              onPress={() => !atMax && onUpdateQty(item.product.id, item.quantity + 1)}
            />
          </View>
          <View style={{ marginLeft: 8, alignItems: 'flex-end' }}>
            <Text variant="titleSmall" style={{ color: theme.colors.primary, fontWeight: '700' }}>
              {formatCurrency(item.total)}
            </Text>
            <Text
              variant="labelSmall"
              style={{ color: theme.colors.error, marginTop: 4 }}
              onPress={() => onRemove(item.product.id)}
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
