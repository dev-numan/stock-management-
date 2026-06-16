import React, { useState, useEffect } from 'react';
import { Card, Text, useTheme } from 'react-native-paper';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useSettingsStore } from '../../stores/settingsStore';
import { queueOrRun } from '../../services/offlineMutation';
import AppInput from '../../components/common/AppInput';
import AppButton from '../../components/common/AppButton';
import ErrorMessage from '../../components/common/ErrorMessage';
import { getFriendlyErrorMessage } from '../../utils/apiErrors';
import { FormFieldsSkeleton } from '../../components/common/Skeleton';
import KeyboardFormView from '../../components/common/KeyboardFormView';
import { settingsSchema } from '../../utils/validation';
import { SHOP_NAME, INVOICE_PREFIX } from '../../constants/branding';
import AlertSettingsSection from '../../components/settings/AlertSettingsSection';
import LanguageSettingsSection from '../../components/settings/LanguageSettingsSection';
import { useAuth } from '../../context/AuthContext';
import { useDashboardStore } from '../../stores/dashboardStore';
import { useLanguageStore } from '../../stores/languageStore';
import { createClientRequestId } from '../../utils/clientRequestId';

export default function SettingsScreen() {
  const theme = useTheme();
  const { isAdmin } = useAuth();
  const t = useLanguageStore((s) => s.t);
  const isRtl = useLanguageStore((s) => s.locale) === 'ur';
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
      showLowStockAlert: true,
      showExpiryAlert: true,
      expiryAlertMonths: 3,
    },
  });

  useEffect(() => {
    if (!isAdmin) {
      setLoading(false);
      return;
    }
    useSettingsStore
      .getState()
      .fetchSettings(true)
      .then((s) => {
        reset({
          address: s.address,
          phone: s.phone,
          showLowStockAlert: s.showLowStockAlert !== false,
          showExpiryAlert: s.showExpiryAlert !== false,
          expiryAlertMonths: Math.min(12, Math.max(1, Number(s.expiryAlertMonths) || 3)),
        });
      })
      .finally(() => setLoading(false));
  }, [reset, isAdmin]);

  const onSubmit = async (formData) => {
    try {
      setSaving(true);
      setError(null);
      setSuccess(false);
      await queueOrRun({
        online: async () => {
          await useSettingsStore.getState().updateSettings(formData);
        },
        type: 'UPDATE_SETTINGS',
        payload: { ...formData, clientRequestId: createClientRequestId('settings') },
        optimistic: () => {
          useSettingsStore.setState({
            settings: { ...useSettingsStore.getState().settings, ...formData },
          });
        },
      });
      useDashboardStore.getState().invalidate();
      setSuccess(true);
    } catch (err) {
      setError(getFriendlyErrorMessage(err, t('settings.saveFailed')));
    } finally {
      setSaving(false);
    }
  };

  return (
    <KeyboardFormView insideTab>
      {loading ? (
        <FormFieldsSkeleton rows={2} />
      ) : (
        <>
      <LanguageSettingsSection />
      {isAdmin ? (
        <>
          <AlertSettingsSection control={control} />
          <Card mode="elevated" style={{ marginBottom: 16, borderRadius: theme.roundness }}>
            <Card.Content>
              <Text variant="labelMedium" style={{ color: theme.colors.onSurfaceVariant, writingDirection: isRtl ? 'rtl' : 'ltr' }}>
                {t('settings.shopName')}
              </Text>
              <Text variant="titleLarge" style={{ color: theme.colors.primary, fontWeight: '600' }}>{SHOP_NAME}</Text>
              <Text variant="labelMedium" style={{ color: theme.colors.onSurfaceVariant, marginTop: 12, writingDirection: isRtl ? 'rtl' : 'ltr' }}>
                {t('settings.invoicePrefix')}
              </Text>
              <Text variant="titleMedium" style={{ fontWeight: '600' }}>{INVOICE_PREFIX}</Text>
            </Card.Content>
          </Card>
          <Controller control={control} name="address" render={({ field: { onChange, onBlur, value } }) => (
            <AppInput label={t('settings.address')} value={value} onChangeText={onChange} onBlur={onBlur} multiline error={errors.address?.message} />
          )} />
          <Controller control={control} name="phone" render={({ field: { onChange, onBlur, value } }) => (
            <AppInput label={t('settings.phone')} value={value} onChangeText={onChange} onBlur={onBlur} keyboardType="phone-pad" error={errors.phone?.message} />
          )} />
          <AppButton
            title={t('settings.save')}
            onPress={handleSubmit(onSubmit, () => setError(t('settings.fixErrors')))}
            loading={saving}
          />
        </>
      ) : null}
      <ErrorMessage message={error} />
      {success ? (
        <Text variant="bodyMedium" style={{ color: theme.colors.primary, marginTop: 8, textAlign: 'center', writingDirection: isRtl ? 'rtl' : 'ltr' }}>
          {t('settings.saved')}
        </Text>
      ) : null}
        </>
      )}
    </KeyboardFormView>
  );
}
