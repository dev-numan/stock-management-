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

export default function LoginScreen() {
  const theme = useTheme();
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
      setError(getFriendlyErrorMessage(err, 'Could not sign in. Check your email and password.'));
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
                label="Email"
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
                label="Password"
                value={value}
                onChangeText={onChange}
                secureTextEntry
                error={errors.password?.message}
              />
            )}
          />
          <AppButton
            title="Login"
            onPress={handleSubmit(onSubmit, () => setError('Please fix the errors above'))}
            loading={loading}
            icon="login"
          />
          <ErrorMessage message={error} />
        </Card.Content>
      </Card>
    </KeyboardFormView>
  );
}
