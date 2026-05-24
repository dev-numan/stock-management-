import React from 'react';
import { Button, useTheme } from 'react-native-paper';

export default function AppButton({
  title,
  onPress,
  loading = false,
  variant = 'primary',
  disabled = false,
  className = '',
  style,
  icon,
}) {
  const theme = useTheme();

  const mode = variant === 'outline' ? 'outlined' : 'contained';
  const buttonColor =
    variant === 'danger' ? theme.colors.error : variant === 'primary' ? theme.colors.primary : undefined;
  const textColor = variant === 'outline' ? theme.colors.primary : undefined;

  return (
    <Button
      mode={mode}
      onPress={onPress}
      loading={loading}
      disabled={disabled || loading}
      icon={icon}
      buttonColor={buttonColor}
      textColor={textColor}
      style={[{ borderRadius: theme.roundness }, style]}
      contentStyle={{ paddingVertical: 6 }}
      labelStyle={{ fontSize: 16, fontWeight: '600' }}
    >
      {title}
    </Button>
  );
}
