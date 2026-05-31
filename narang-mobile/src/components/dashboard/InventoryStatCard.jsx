import React from 'react';
import { View, Pressable } from 'react-native';
import { Card, Text, Divider, useTheme } from 'react-native-paper';

export default function InventoryStatCard({
  lowStockCount,
  totalProducts,
  onLowStockPress,
  onProductsPress,
}) {
  const theme = useTheme();

  return (
    <View style={{ flex: 1, alignSelf: 'stretch', height: '100%' }}>
      <Card
        mode="elevated"
        style={{
          flex: 1,
          height: '100%',
          borderRadius: theme.roundness,
          borderLeftWidth: 4,
          borderLeftColor: '#DC2626',
        }}
        contentStyle={{ flex: 1 }}
      >
        <Card.Content style={{ flex: 1, justifyContent: 'space-between', paddingVertical: 12 }}>
          <Pressable onPress={onLowStockPress} style={{ flex: 1, justifyContent: 'center', paddingVertical: 2 }}>
            <Text variant="labelMedium" style={{ color: theme.colors.onSurfaceVariant }}>
              Low Stock
            </Text>
            <Text variant="titleLarge" style={{ fontWeight: '700', marginTop: 2, color: theme.colors.error }}>
              {String(lowStockCount ?? 0)}
            </Text>
          </Pressable>
          <Divider />
          <Pressable onPress={onProductsPress} style={{ flex: 1, justifyContent: 'center', paddingVertical: 2 }}>
            <Text variant="labelMedium" style={{ color: theme.colors.onSurfaceVariant }}>
              Products
            </Text>
            <Text variant="titleMedium" style={{ fontWeight: '700', marginTop: 2 }}>
              {String(totalProducts ?? 0)} total
            </Text>
          </Pressable>
        </Card.Content>
      </Card>
    </View>
  );
}
