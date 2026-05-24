import React from 'react';
import { Pressable } from 'react-native';
import { Card, Text, useTheme } from 'react-native-paper';
import { formatCurrency } from '../../utils/formatCurrency';
import StockBadge from './StockBadge';

export default function ProductCard({ product, onPress }) {
  const theme = useTheme();

  return (
    <Pressable onPress={onPress}>
      <Card mode="elevated" style={{ marginBottom: 12, borderRadius: theme.roundness }}>
        <Card.Content>
          <Card.Title
            title={product.name}
            subtitle={product.category?.name}
            titleVariant="titleMedium"
            right={() => (
              <StockBadge currentStock={product.currentStock} minStockAlert={product.minStockAlert} />
            )}
          />
          <Text variant="titleMedium" style={{ color: theme.colors.primary, fontWeight: '700', marginTop: 4 }}>
            {formatCurrency(product.salePrice)}
          </Text>
          <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, marginTop: 2 }}>
            Stock: {Number(product.currentStock)} {product.unit}
          </Text>
        </Card.Content>
      </Card>
    </Pressable>
  );
}
