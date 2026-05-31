import React from 'react';
import { Pressable, View } from 'react-native';
import { Card, Text, useTheme } from 'react-native-paper';
import { formatCurrency } from '../../utils/formatCurrency';
import { formatExpiryLabel, expiryTone } from '../../utils/expiry';
import StockBadge from './StockBadge';
import { formatStockDisplay } from '../../utils/productUnits';

export default function ProductCard({ product, onPress }) {
  const theme = useTheme();
  const expiryLabel = formatExpiryLabel(product.expiryDate);
  const tone = expiryTone(product.expiryDate);
  const expiryColor =
    tone === 'error' ? theme.colors.error : tone === 'warning' ? '#B45309' : theme.colors.onSurfaceVariant;

  const stockQty = Number(product.currentStock) || 0;
  const stockCostValue = stockQty * (Number(product.costPrice) || 0);
  const stockSaleValue = stockQty * (Number(product.salePrice) || 0);

  return (
    <Pressable onPress={onPress}>
      <Card mode="elevated" style={{ marginBottom: 12, borderRadius: theme.roundness }}>
        <Card.Content>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
            <View style={{ flex: 1, marginRight: 8 }}>
              <Text variant="titleMedium" style={{ fontWeight: '600' }}>
                {product.name}
              </Text>
              {product.category ? (
                <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                  {typeof product.category === 'string' ? product.category : product.category?.name}
                </Text>
              ) : null}
            </View>
            <StockBadge currentStock={product.currentStock} minStockAlert={product.minStockAlert} />
          </View>
          <Text variant="titleMedium" style={{ color: theme.colors.primary, fontWeight: '700' }}>
            {formatCurrency(product.salePrice)}
          </Text>
          <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, marginTop: 2 }}>
            Stock: {formatStockDisplay(product)}
          </Text>
          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              marginTop: 8,
              paddingTop: 8,
              borderTopWidth: 1,
              borderTopColor: theme.colors.outlineVariant,
            }}
          >
            <View style={{ flex: 1, marginRight: 8 }}>
              <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>
                Stock cost value
              </Text>
              <Text variant="bodyMedium" style={{ fontWeight: '600', marginTop: 2 }}>
                {formatCurrency(stockCostValue)}
              </Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>
                Stock sale value
              </Text>
              <Text
                variant="bodyMedium"
                style={{ fontWeight: '600', marginTop: 2, color: theme.colors.primary }}
              >
                {formatCurrency(stockSaleValue)}
              </Text>
            </View>
          </View>
          {expiryLabel ? (
            <Text variant="bodySmall" style={{ color: expiryColor, marginTop: 4 }}>
              {expiryLabel}
            </Text>
          ) : null}
        </Card.Content>
      </Card>
    </Pressable>
  );
}
