import React from 'react';
import { View } from 'react-native';
import { Text, useTheme } from 'react-native-paper';
import { useTranslation } from '../../i18n/useTranslation';

export default function EmptyState({ message, icon = '📦' }) {
  const theme = useTheme();
  const { t, isRtl } = useTranslation();
  const displayMessage = message ?? t('common.noData');

  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: 48 }}>
      <Text variant="headlineMedium" style={{ marginBottom: 8 }}>
        {icon}
      </Text>
      <Text
        variant="bodyLarge"
        style={{ color: theme.colors.onSurfaceVariant, textAlign: 'center', writingDirection: isRtl ? 'rtl' : 'ltr' }}
      >
        {displayMessage}
      </Text>
    </View>
  );
}
