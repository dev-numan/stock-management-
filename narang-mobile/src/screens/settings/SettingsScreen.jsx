import React, { useState, useEffect } from 'react';
import { Card, Text, useTheme } from 'react-native-paper';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { getSettings, updateSettings } from '../../api/settings.api';
import AppInput from '../../components/common/AppInput';
import AppButton from '../../components/common/AppButton';
import ErrorMessage from '../../components/common/ErrorMessage';
import { FormFieldsSkeleton } from '../../components/common/Skeleton';
import KeyboardFormView from '../../components/common/KeyboardFormView';
import { settingsSchema } from '../../utils/validation';
import { SHOP_NAME, INVOICE_PREFIX } from '../../constants/branding';
import CreditSettingsSection from '../../components/settings/CreditSettingsSection';

export default function SettingsScreen({ navigation }) {
  const theme = useTheme();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  const { control, handleSubmit, reset, formState: { errors } } = useForm({
    resolver: zodResolver(settingsSchema),
    mode: 'onChange',
    defaultValues: {
      address: '',
      phone: '',
    },
  });

  useEffect(() => {
    getSettings().then(({ data }) => {
      const s = data.data;
      reset({
        address: s.address,
        phone: s.phone,
      });
      setLoading(false);
    });
  }, [reset]);

  const onSubmit = async (formData) => {
    try {
      setSaving(true);
      setError(null);
      setSuccess(false);
      await updateSettings(formData);
      setSuccess(true);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  return (
    <KeyboardFormView insideTab>
      <CreditSettingsSection navigation={navigation} />
      {loading ? (
        <FormFieldsSkeleton rows={2} />
      ) : (
        <>
      <Card mode="elevated" style={{ marginBottom: 16, borderRadius: theme.roundness }}>
        <Card.Content>
          <Text variant="labelMedium" style={{ color: theme.colors.onSurfaceVariant }}>Shop name</Text>
          <Text variant="titleLarge" style={{ color: theme.colors.primary, fontWeight: '600' }}>{SHOP_NAME}</Text>
          <Text variant="labelMedium" style={{ color: theme.colors.onSurfaceVariant, marginTop: 12 }}>Invoice prefix</Text>
          <Text variant="titleMedium" style={{ fontWeight: '600' }}>{INVOICE_PREFIX}</Text>
        </Card.Content>
      </Card>
      <Controller control={control} name="address" render={({ field: { onChange, onBlur, value } }) => (
        <AppInput label="Address *" value={value} onChangeText={onChange} onBlur={onBlur} multiline error={errors.address?.message} />
      )} />
      <Controller control={control} name="phone" render={({ field: { onChange, onBlur, value } }) => (
        <AppInput label="Phone *" value={value} onChangeText={onChange} onBlur={onBlur} keyboardType="phone-pad" error={errors.phone?.message} />
      )} />
      <AppButton
        title="Save Settings"
        onPress={handleSubmit(onSubmit, () => setError('Please fix the errors above'))}
        loading={saving}
      />
      <ErrorMessage message={error} />
      {success ? (
        <Text variant="bodyMedium" style={{ color: theme.colors.primary, marginTop: 8, textAlign: 'center' }}>
          Settings saved successfully
        </Text>
      ) : null}
        </>
      )}
    </KeyboardFormView>
  );
}
