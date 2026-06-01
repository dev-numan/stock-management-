import React from 'react';
import { View } from 'react-native';
import { Card, Text, Switch, Chip, useTheme } from 'react-native-paper';
import { Controller } from 'react-hook-form';
import { useLanguageStore } from '../../stores/languageStore';

const MONTH_OPTIONS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];

export default function AlertSettingsSection({ control }) {
  const theme = useTheme();
  const t = useLanguageStore((s) => s.t);
  const isRtl = useLanguageStore((s) => s.locale) === 'ur';

  return (
    <Card mode="elevated" style={{ marginBottom: 16, borderRadius: theme.roundness }}>
      <Card.Content>
        <Text variant="titleLarge" style={{ fontWeight: '700', marginBottom: 4, writingDirection: isRtl ? 'rtl' : 'ltr' }}>
          {t('alerts.title')}
        </Text>
        <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, marginBottom: 16, writingDirection: isRtl ? 'rtl' : 'ltr' }}>
          {t('alerts.subtitle')}
        </Text>

        <Controller
          control={control}
          name="showLowStockAlert"
          render={({ field: { value, onChange } }) => (
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: 12,
              }}
            >
              <View style={{ flex: 1, marginRight: 12 }}>
                <Text variant="bodyLarge" style={{ fontWeight: '600', writingDirection: isRtl ? 'rtl' : 'ltr' }}>
                  {t('alerts.lowStock')}
                </Text>
                <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, writingDirection: isRtl ? 'rtl' : 'ltr' }}>
                  {t('alerts.lowStockDesc')}
                </Text>
              </View>
              <Switch value={value} onValueChange={onChange} />
            </View>
          )}
        />

        <Controller
          control={control}
          name="showExpiryAlert"
          render={({ field: { value, onChange } }) => (
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: 16,
              }}
            >
              <View style={{ flex: 1, marginRight: 12 }}>
                <Text variant="bodyLarge" style={{ fontWeight: '600', writingDirection: isRtl ? 'rtl' : 'ltr' }}>
                  {t('alerts.expiry')}
                </Text>
                <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, writingDirection: isRtl ? 'rtl' : 'ltr' }}>
                  {t('alerts.expiryDesc')}
                </Text>
              </View>
              <Switch value={value} onValueChange={onChange} />
            </View>
          )}
        />

        <Text variant="labelLarge" style={{ marginBottom: 8, writingDirection: isRtl ? 'rtl' : 'ltr' }}>
          {t('alerts.expiryMonths')}
        </Text>
        <Controller
          control={control}
          name="expiryAlertMonths"
          render={({ field: { value, onChange } }) => (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {MONTH_OPTIONS.map((m) => (
                <Chip
                  key={m}
                  selected={value === m}
                  onPress={() => onChange(m)}
                  compact
                >
                  {m}
                </Chip>
              ))}
            </View>
          )}
        />
      </Card.Content>
    </Card>
  );
}
