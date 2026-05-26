import React from 'react';
import { View } from 'react-native';
import { Card, Text, useTheme } from 'react-native-paper';

const accentColors = {
  green: '#2E7D32',
  amber: '#FFA000',
  red: '#DC2626',
};

const SUBTITLE_LINE_HEIGHT = 18;

export default function StatCard({ title, value, subtitle, color = 'green' }) {
  const theme = useTheme();
  const accent = accentColors[color] || accentColors.green;

  return (
    <View style={{ flex: 1, alignSelf: 'stretch' }}>
      <Card
        mode="elevated"
        style={{
          flex: 1,
          borderRadius: theme.roundness,
          borderLeftWidth: 4,
          borderLeftColor: accent,
        }}
        contentStyle={{ flex: 1 }}
      >
        <Card.Content style={{ flex: 1, justifyContent: 'space-between' }}>
          <View>
            <Text variant="labelMedium" style={{ color: theme.colors.onSurfaceVariant }}>
              {title}
            </Text>
            <Text variant="titleLarge" style={{ fontWeight: '700', marginTop: 4 }}>
              {value}
            </Text>
          </View>
          <View style={{ minHeight: SUBTITLE_LINE_HEIGHT, marginTop: 4, justifyContent: 'flex-end' }}>
            {subtitle ? (
              <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                {subtitle}
              </Text>
            ) : null}
          </View>
        </Card.Content>
      </Card>
    </View>
  );
}
