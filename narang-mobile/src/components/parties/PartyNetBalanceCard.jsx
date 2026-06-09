import React from 'react';
import { View } from 'react-native';
import { Card, Text, useTheme } from 'react-native-paper';
import { formatCurrency } from '../../utils/formatCurrency';
import { computePartyNetBalance } from '../../utils/partyNetBalance';
import { useTranslation } from '../../i18n/useTranslation';

export default function PartyNetBalanceCard({ party, style }) {
  const theme = useTheme();
  const { t, isRtl } = useTranslation();
  const textDir = { writingDirection: isRtl ? 'rtl' : 'ltr' };

  const {
    netBalance,
    customerReceivable,
    supplierPayable,
    youWillGet,
    youWillGive,
  } = computePartyNetBalance(party);

  const isSettled = netBalance === 0;
  const isNetGet = netBalance > 0;
  const headlineColor = isSettled
    ? theme.colors.onSurface
    : isNetGet
      ? theme.colors.error
      : theme.colors.primary;
  const containerBg = isSettled
    ? theme.colors.surfaceVariant
    : isNetGet
      ? theme.colors.errorContainer
      : theme.colors.primaryContainer;

  const showBreakdown = customerReceivable > 0 || supplierPayable > 0;

  return (
    <Card
      mode="elevated"
      style={[{ borderRadius: theme.roundness, marginBottom: 12 }, style]}
    >
      <Card.Content style={{ alignItems: 'center', paddingVertical: 16 }}>
        <Text variant="titleMedium" style={{ fontWeight: '700', color: headlineColor, ...textDir }}>
          {t('partyDetail.netBalance')}
        </Text>
        <Text
          variant="headlineLarge"
          style={{ fontWeight: '800', color: headlineColor, marginTop: 4 }}
        >
          {formatCurrency(Math.abs(netBalance))}
        </Text>
        <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant, marginTop: 4, ...textDir }}>
          {isSettled
            ? t('partyDetail.netSettled')
            : isNetGet
              ? t('ledger.youWillGetColon')
              : t('ledger.youWillGiveColon')}
        </Text>

        {showBreakdown ? (
          <View style={{ width: '100%', marginTop: 16, gap: 6 }}>
            {customerReceivable > 0 ? (
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, ...textDir }}>
                  {t('partyDetail.fromSales')}
                </Text>
                <Text variant="bodySmall" style={{ fontWeight: '600', color: theme.colors.error, ...textDir }}>
                  {t('ledger.youWillGetColon')} {formatCurrency(customerReceivable)}
                </Text>
              </View>
            ) : null}
            {supplierPayable > 0 ? (
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, ...textDir }}>
                  {t('partyDetail.fromPurchases')}
                </Text>
                <Text variant="bodySmall" style={{ fontWeight: '600', color: theme.colors.primary, ...textDir }}>
                  {t('ledger.youWillGiveColon')} {formatCurrency(supplierPayable)}
                </Text>
              </View>
            ) : null}
            {!isSettled ? (
              <View
                style={{
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  marginTop: 4,
                  paddingTop: 8,
                  borderTopWidth: 1,
                  borderTopColor: theme.colors.outlineVariant,
                }}
              >
                <Text variant="labelMedium" style={{ fontWeight: '700', ...textDir }}>
                  {t('partyDetail.netTotal')}
                </Text>
                <Text variant="labelMedium" style={{ fontWeight: '700', color: headlineColor, ...textDir }}>
                  {isNetGet
                    ? `${t('ledger.youWillGetColon')} ${formatCurrency(youWillGet)}`
                    : `${t('ledger.youWillGiveColon')} ${formatCurrency(youWillGive)}`}
                </Text>
              </View>
            ) : null}
          </View>
        ) : null}
      </Card.Content>
    </Card>
  );
}
