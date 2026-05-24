import React from 'react';
import { Keyboard, Platform, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from 'react-native-paper';

const TAB_BAR_HEIGHT = 49;
const KEYBOARD_SCROLL_EXTRA = 24;

export default function KeyboardFormView({
  children,
  footer = null,
  centerContent = false,
  withHeader = true,
  insideTab = false,
  extraOffset = 0,
  contentContainerStyle,
}) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();

  const bottomInset = insets.bottom + (insideTab ? TAB_BAR_HEIGHT : 0) + extraOffset;

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: theme.colors.background }}
      contentContainerStyle={[
        {
          paddingHorizontal: 16,
          paddingTop: 16,
          paddingBottom: bottomInset + KEYBOARD_SCROLL_EXTRA + (footer ? 16 : 32),
          flexGrow: centerContent ? 1 : undefined,
          justifyContent: centerContent ? 'center' : undefined,
        },
        contentContainerStyle,
      ]}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
      showsVerticalScrollIndicator={false}
      automaticallyAdjustKeyboardInsets
      contentInsetAdjustmentBehavior="automatic"
      scrollEventThrottle={16}
      onScrollBeginDrag={Keyboard.dismiss}
    >
      {children}
      {footer ? (
        <View style={{ paddingTop: 8, paddingBottom: insets.bottom > 0 ? 0 : 8 }}>{footer}</View>
      ) : null}
    </ScrollView>
  );
}
