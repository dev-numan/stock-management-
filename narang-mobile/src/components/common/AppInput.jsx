import React from 'react';
import { Keyboard, View } from 'react-native';
import { TextInput, HelperText, useTheme } from 'react-native-paper';

export default function AppInput({
  label,
  value,
  onChangeText,
  onBlur,
  placeholder,
  error,
  keyboardType = 'default',
  secureTextEntry = false,
  multiline = false,
  editable = true,
  dense = false,
  returnKeyType,
  onSubmitEditing,
}) {
  const theme = useTheme();
  const displayValue = value ?? '';

  const handleSubmitEditing = (e) => {
    if (onSubmitEditing) {
      onSubmitEditing(e);
      return;
    }
    if (!multiline) {
      Keyboard.dismiss();
    }
  };

  return (
    <View style={{ marginBottom: 12 }}>
      <TextInput
        mode="outlined"
        label={label}
        value={displayValue}
        onChangeText={onChangeText}
        onBlur={onBlur}
        placeholder={placeholder}
        keyboardType={keyboardType}
        secureTextEntry={secureTextEntry}
        multiline={multiline}
        editable={editable}
        error={!!error}
        dense={dense}
        returnKeyType={returnKeyType ?? (multiline ? 'default' : 'done')}
        blurOnSubmit={!multiline}
        onSubmitEditing={handleSubmitEditing}
        outlineColor={theme.colors.outline}
        activeOutlineColor={theme.colors.primary}
        style={{
          backgroundColor: editable ? theme.colors.surface : theme.colors.surfaceVariant,
          minHeight: multiline ? 88 : undefined,
        }}
        textAlignVertical={multiline ? 'top' : 'center'}
      />
      {error ? <HelperText type="error">{error}</HelperText> : null}
    </View>
  );
}
