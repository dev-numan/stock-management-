import React, { useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import AppInput from '../../components/common/AppInput';
import AppButton from '../../components/common/AppButton';
import ErrorMessage from '../../components/common/ErrorMessage';
import { getFriendlyErrorMessage } from '../../utils/apiErrors';
import KeyboardFormView from '../../components/common/KeyboardFormView';
import { customerSchema } from '../../utils/validation';
import { useCustomersStore } from '../../stores/customersStore';
import { useTranslation } from '../../i18n/useTranslation';

export default function AddCustomerScreen({ navigation }) {
  const { t } = useTranslation();
  const createCustomer = useCustomersStore((s) => s.createCustomer);
  const [saving, setSaving] = useState(false);
  const [apiError, setApiError] = useState(null);

  const { control, handleSubmit, formState: { errors } } = useForm({
    resolver: zodResolver(customerSchema),
    mode: 'onChange',
    defaultValues: { name: '', phone: '', address: '' },
  });

  const onSubmit = async (formData) => {
    try {
      setSaving(true);
      setApiError(null);
      await createCustomer({
        name: formData.name,
        phone: formData.phone || undefined,
        address: formData.address || undefined,
      });
      navigation.goBack();
    } catch (err) {
      setApiError(getFriendlyErrorMessage(err, t('customer.addFailed')));
    } finally {
      setSaving(false);
    }
  };

  return (
    <KeyboardFormView insideTab>
      <Controller
        control={control}
        name="name"
        render={({ field: { onChange, onBlur, value } }) => (
          <AppInput label={t('customer.name')} value={value} onChangeText={onChange} onBlur={onBlur} error={errors.name?.message} />
        )}
      />
      <Controller
        control={control}
        name="phone"
        render={({ field: { onChange, onBlur, value } }) => (
          <AppInput
            label={t('customer.phoneOptional')}
            value={value}
            onChangeText={onChange}
            onBlur={onBlur}
            keyboardType="phone-pad"
            error={errors.phone?.message}
          />
        )}
      />
      <Controller
        control={control}
        name="address"
        render={({ field: { onChange, onBlur, value } }) => (
          <AppInput label={t('common.address')} value={value} onChangeText={onChange} onBlur={onBlur} error={errors.address?.message} />
        )}
      />
      <AppButton
        title={t('customer.save')}
        onPress={handleSubmit(onSubmit, () => setApiError(t('common.fixErrors')))}
        loading={saving}
      />
      <ErrorMessage message={apiError} />
    </KeyboardFormView>
  );
}
