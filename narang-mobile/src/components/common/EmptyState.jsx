import React from 'react';
import { View } from 'react-native';
import { Text, useTheme } from 'react-native-paper';

export default function EmptyState({ message = 'No data found', icon = '📦' }) {
  const theme = useTheme();

  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: 48 }}>
      <Text variant="headlineMedium" style={{ marginBottom: 8 }}>
        {icon}
      </Text>
      <Text variant="bodyLarge" style={{ color: theme.colors.onSurfaceVariant, textAlign: 'center' }}>
        {message}
      </Text>
    </View>
  );
}
