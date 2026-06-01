import React, { useState } from 'react';
import { View } from 'react-native';
import { Text, Card, useTheme } from 'react-native-paper';
import AppLogo from '../../components/common/AppLogo';
import { APP_NAME, APP_TAGLINE } from '../../constants/branding';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useAuth } from '../../context/AuthContext';
import { loginSchema } from '../../utils/validation';
import AppInput from '../../components/common/AppInput';
import AppButton from '../../components/common/AppButton';
import ErrorMessage from '../../components/common/ErrorMessage';
import { getFriendlyErrorMessage } from '../../utils/apiErrors';
import KeyboardFormView from '../../components/common/KeyboardFormView';
import { useTranslation } from '../../i18n/useTranslation';

export default function LoginScreen() {
  const theme = useTheme();
  const { t } = useTranslation();
  const { login } = useAuth();
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const { control, handleSubmit, formState: { errors } } = useForm({
    resolver: zodResolver(loginSchema),
    mode: 'onChange',
    defaultValues: { email: '', password: '' },
  });

  const onSubmit = async (data) => {
    try {
      setLoading(true);
      setError(null);
      await login(data.email, data.password);
    } catch (err) {
      setError(getFriendlyErrorMessage(err, t('login.failed')));
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardFormView withHeader={false} centerContent contentContainerStyle={{ paddingHorizontal: 24, paddingVertical: 48 }}>
      <View style={{ alignItems: 'center', marginBottom: 32 }}>
        <AppLogo size={100} style={{ marginBottom: 12 }} />
        <Text variant="headlineSmall" style={{ color: theme.colors.primary, fontWeight: '700' }}>
          {APP_NAME}
        </Text>
        <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant, marginTop: 4 }}>
          {APP_TAGLINE}
        </Text>
      </View>
      <Card mode="elevated" style={{ borderRadius: theme.roundness }}>
        <Card.Content style={{ paddingVertical: 8 }}>
          <Controller
            control={control}
            name="email"
            render={({ field: { onChange, value } }) => (
              <AppInput
                label={t('login.email')}
                value={value}
                onChangeText={onChange}
                error={errors.email?.message}
                keyboardType="email-address"
              />
            )}
          />
          <Controller
            control={control}
            name="password"
            render={({ field: { onChange, value } }) => (
              <AppInput
                label={t('login.password')}
                value={value}
                onChangeText={onChange}
                secureTextEntry
                error={errors.password?.message}
              />
            )}
          />
          <AppButton
            title={t('login.submit')}
            onPress={handleSubmit(onSubmit, () => setError(t('common.fixErrors')))}
            loading={loading}
            icon="login"
          />
          <ErrorMessage message={error} />
        </Card.Content>
      </Card>
    </KeyboardFormView>
  );
}
