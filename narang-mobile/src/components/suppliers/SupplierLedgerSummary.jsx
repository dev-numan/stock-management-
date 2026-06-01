import React, { useMemo } from 'react';
import { View } from 'react-native';
import { Card, Text, useTheme } from 'react-native-paper';
import { formatCurrency } from '../../utils/formatCurrency';
import { computeSupplierLedgerTotals } from '../../utils/supplierLedger';
import { useTranslation } from '../../i18n/useTranslation';
import { RECEIPT_GREEN } from '../invoice/thermalReceiptShared';

export default function SupplierLedgerSummary({ suppliers }) {
  const theme = useTheme();
  const { t, isRtl } = useTranslation();
  const textDir = { writingDirection: isRtl ? 'rtl' : 'ltr' };
  const { totalPurchases, totalPayments } = useMemo(
    () => computeSupplierLedgerTotals(suppliers),
    [suppliers]
  );

  return (
    <Card mode="elevated" style={{ marginBottom: 12, borderRadius: theme.roundness }}>
      <Card.Content style={{ paddingTop: 4, paddingBottom: 12 }}>
        <View style={{ flexDirection: 'row' }}>
          <View style={{ flex: 1, alignItems: 'center', paddingVertical: 4 }}>
            <Text variant="headlineSmall" style={{ fontWeight: '700', color: theme.colors.error }}>
              {formatCurrency(totalPurchases)}
            </Text>
            <Text variant="labelMedium" style={{ color: theme.colors.onSurfaceVariant, marginTop: 4, ...textDir }}>
              {t('supplier.col.purchase')}
            </Text>
          </View>
          <View
            style={{
              width: 1,
              backgroundColor: theme.colors.outlineVariant,
              marginVertical: 4,
            }}
          />
          <View style={{ flex: 1, alignItems: 'center', paddingVertical: 4 }}>
            <Text variant="headlineSmall" style={{ fontWeight: '700', color: RECEIPT_GREEN }}>
              {formatCurrency(totalPayments)}
            </Text>
            <Text variant="labelMedium" style={{ color: theme.colors.onSurfaceVariant, marginTop: 4, ...textDir }}>
              {t('supplier.col.payment')}
            </Text>
          </View>
        </View>
      </Card.Content>
    </Card>
  );
}
