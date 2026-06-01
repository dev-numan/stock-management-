import React, { useMemo } from 'react';
import { View } from 'react-native';
import { Card, Text, useTheme } from 'react-native-paper';
import { formatCurrency } from '../../utils/formatCurrency';
import { useTranslation } from '../../i18n/useTranslation';

export function computeStockTotals(products) {
  let totalCostValue = 0;
  let totalSaleValue = 0;

  for (const product of products ?? []) {
    const stockQty = Number(product.currentStock) || 0;
    totalCostValue += stockQty * (Number(product.costPrice) || 0);
    totalSaleValue += stockQty * (Number(product.salePrice) || 0);
  }

  return { totalCostValue, totalSaleValue };
}

function ValueColumn({ label, value, valueColor }) {
  const theme = useTheme();
  const { isRtl } = useTranslation();

  return (
    <View style={{ flex: 1, minWidth: 0 }}>
      <Text
        variant="labelMedium"
        style={{ color: theme.colors.onSurfaceVariant, marginBottom: 6, writingDirection: isRtl ? 'rtl' : 'ltr' }}
      >
        {label}
      </Text>
      <Text
        variant="titleMedium"
        style={{ fontWeight: '700', color: valueColor ?? theme.colors.onSurface }}
        numberOfLines={2}
        adjustsFontSizeToFit
        minimumFontScale={0.72}
      >
        {value}
      </Text>
    </View>
  );
}

export default function StockValuationSummary({ products }) {
  const theme = useTheme();
  const { t, isRtl } = useTranslation();
  const { totalCostValue, totalSaleValue } = useMemo(
    () => computeStockTotals(products),
    [products]
  );

  return (
    <Card mode="elevated" style={{ marginBottom: 8, borderRadius: theme.roundness }}>
      <Card.Content style={{ paddingVertical: 12 }}>
        <Text
          variant="titleSmall"
          style={{ fontWeight: '600', marginBottom: 12, color: theme.colors.onSurface, writingDirection: isRtl ? 'rtl' : 'ltr' }}
        >
          {t('inventory.valueTitle')}
        </Text>
        <View style={{ flexDirection: 'row', gap: 16 }}>
          <ValueColumn label={t('inventory.totalCost')} value={formatCurrency(totalCostValue)} />
          <ValueColumn
            label={t('inventory.totalSale')}
            value={formatCurrency(totalSaleValue)}
            valueColor={theme.colors.primary}
          />
        </View>
      </Card.Content>
    </Card>
  );
}
