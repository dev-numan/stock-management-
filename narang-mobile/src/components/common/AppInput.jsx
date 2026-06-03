import React, { useState } from 'react';
import { Keyboard, View } from 'react-native';
import { TextInput, HelperText, useTheme } from 'react-native-paper';
import { useTranslation } from '../../i18n/useTranslation';

export default function AppInput({
  label,
  value,
  onChangeText,
  onBlur,
  placeholder,
  error,
  keyboardType = 'default',
  secureTextEntry = false,
  passwordToggle = false,
  multiline = false,
  editable = true,
  dense = false,
  returnKeyType,
  onSubmitEditing,
}) {
  const theme = useTheme();
  const { t } = useTranslation();
  const [passwordVisible, setPasswordVisible] = useState(false);
  const displayValue = value ?? '';
  const isPasswordField = secureTextEntry || passwordToggle;
  const hidePassword = passwordToggle ? !passwordVisible : secureTextEntry;

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
        secureTextEntry={hidePassword}
        multiline={multiline}
        editable={editable}
        error={!!error}
        dense={dense}
        right={
          passwordToggle ? (
            <TextInput.Icon
              icon={passwordVisible ? 'eye-off' : 'eye'}
              onPress={() => setPasswordVisible((v) => !v)}
              forceTextInputFocus={false}
              accessibilityLabel={
                passwordVisible ? t('login.hidePassword') : t('login.showPassword')
              }
            />
          ) : undefined
        }
        autoCapitalize={isPasswordField ? 'none' : undefined}
        autoCorrect={isPasswordField ? false : undefined}
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
