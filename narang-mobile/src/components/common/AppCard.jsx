import React from 'react';
import { View } from 'react-native';
import { Card, useTheme } from 'react-native-paper';

export default function AppCard({ children, style, contentStyle, elevation = 1 }) {
  const theme = useTheme();

  return (
    <View style={[{ marginBottom: 12 }, style]}>
      <Card
        mode="elevated"
        elevation={elevation}
        style={{ borderRadius: theme.roundness, backgroundColor: theme.colors.surface }}
      >
        <Card.Content style={[{ paddingVertical: 12 }, contentStyle]}>{children}</Card.Content>
      </Card>
    </View>
  );
}
