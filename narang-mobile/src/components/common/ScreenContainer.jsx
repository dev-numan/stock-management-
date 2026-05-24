import React from 'react';
import { Keyboard, Platform, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from 'react-native-paper';

export default function ScreenContainer({
  children,
  scroll = true,
  refreshControl,
  contentStyle,
  padding = 16,
  keyboardAware = true,
}) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const baseStyle = { flex: 1, backgroundColor: theme.colors.background };

  if (!scroll) {
    return <View style={[baseStyle, { padding }, contentStyle]}>{children}</View>;
  }

  return (
    <ScrollView
      style={baseStyle}
      contentContainerStyle={[
        { padding, paddingBottom: insets.bottom + 32 },
        contentStyle,
      ]}
      refreshControl={refreshControl}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
      showsVerticalScrollIndicator={false}
      automaticallyAdjustKeyboardInsets={keyboardAware}
      contentInsetAdjustmentBehavior="automatic"
      onScrollBeginDrag={Keyboard.dismiss}
    >
      {children}
    </ScrollView>
  );
}
