import React from 'react';
import { View } from 'react-native';
import { Card, Text, Chip, Icon, useTheme } from 'react-native-paper';
import { formatCurrency } from '../../utils/formatCurrency';
import { formatPhoneDisplay } from '../../utils/phone';
import { getPartyNetDisplayBalance } from '../../utils/partyNetBalance';
import { useTranslation } from '../../i18n/useTranslation';

export default function PartyContactListItem({ item, onPress }) {
  const theme = useTheme();
  const { t, isRtl } = useTranslation();
  const textDir = { writingDirection: isRtl ? 'rtl' : 'ltr' };

  const isContact = item.source === 'contact';
  const balance = isContact ? 0 : getPartyNetDisplayBalance(item.rawParty);

  const typeLabel = isContact
    ? t('customer.contact')
    : item.partyType === 'SUPPLIER'
      ? t('parties.typeSupplier')
      : t('parties.typeCustomer');

  return (
    <Card
      mode="elevated"
      style={{ marginBottom: 8, borderRadius: theme.roundness }}
      onPress={() => onPress(item)}
    >
      <Card.Content>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <View style={{ flex: 1, marginRight: 8 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <Chip compact mode="flat" style={{ alignSelf: 'flex-start' }}>
                {typeLabel}
              </Chip>
            </View>
            <Text variant="titleSmall" style={{ fontWeight: '600' }}>
              {item.name}
            </Text>
            {item.phone ? (
              <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, marginTop: 2 }}>
                {formatPhoneDisplay(item.phone)}
              </Text>
            ) : null}
            {item.address ? (
              <Text variant="labelSmall" style={{ color: theme.colors.outline, marginTop: 4 }} numberOfLines={1}>
                {item.address}
              </Text>
            ) : null}
            {item.rawParty?._local ? (
              <Text variant="labelSmall" style={{ color: theme.colors.secondary, marginTop: 4, ...textDir }}>
                {t('common.pendingSync')}
              </Text>
            ) : null}
          </View>
          {isContact ? (
            <Icon source="chevron-right" size={24} color={theme.colors.outline} />
          ) : balance !== 0 ? (
            <View style={{ alignItems: isRtl ? 'flex-start' : 'flex-end' }}>
              <Text
                variant="titleSmall"
                style={{
                  fontWeight: '700',
                  color: balance < 0 ? theme.colors.error : theme.colors.primary,
                }}
              >
                {formatCurrency(Math.abs(balance))}
              </Text>
              <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant, marginTop: 2, ...textDir }}>
                {balance < 0 ? t('ledger.youWillGetColon') : t('ledger.youWillGiveColon')}
              </Text>
            </View>
          ) : (
            <Icon source="chevron-right" size={24} color={theme.colors.outline} />
          )}
        </View>
      </Card.Content>
    </Card>
  );
}
