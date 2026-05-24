import React from 'react';
import { View } from 'react-native';
import { ActivityIndicator, useTheme } from 'react-native-paper';

export default function LoadingSpinner() {
  const theme = useTheme();

  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: 40 }}>
      <ActivityIndicator animating size="large" color={theme.colors.primary} />
    </View>
  );
}
