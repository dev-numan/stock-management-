import React from 'react';
import { Card, Text, useTheme } from 'react-native-paper';

const accentColors = {
  green: '#2E7D32',
  amber: '#FFA000',
  red: '#DC2626',
};

export default function StatCard({ title, value, subtitle, color = 'green' }) {
  const theme = useTheme();
  const accent = accentColors[color] || accentColors.green;

  return (
    <Card
      mode="elevated"
      style={{
        flex: 1,
        marginRight: 8,
        marginBottom: 8,
        borderRadius: theme.roundness,
        borderLeftWidth: 4,
        borderLeftColor: accent,
      }}
    >
      <Card.Content>
        <Text variant="labelMedium" style={{ color: theme.colors.onSurfaceVariant }}>
          {title}
        </Text>
        <Text variant="titleLarge" style={{ fontWeight: '700', marginTop: 4 }}>
          {value}
        </Text>
        {subtitle ? (
          <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, marginTop: 4 }}>
            {subtitle}
          </Text>
        ) : null}
      </Card.Content>
    </Card>
  );
}
