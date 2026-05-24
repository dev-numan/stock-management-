import React, { useState, useCallback } from 'react';
import { Card, Text, useTheme } from 'react-native-paper';
import { useFocusEffect } from '@react-navigation/native';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { getSuppliers, createSupplier } from '../../api/suppliers.api';
import AppInput from '../../components/common/AppInput';
import AppButton from '../../components/common/AppButton';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import EmptyState from '../../components/common/EmptyState';
import ErrorMessage from '../../components/common/ErrorMessage';
import KeyboardFormView from '../../components/common/KeyboardFormView';
import { supplierSchema } from '../../utils/validation';

export default function SuppliersScreen() {
  const theme = useTheme();
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [apiError, setApiError] = useState(null);

  const { control, handleSubmit, reset, formState: { errors } } = useForm({
    resolver: zodResolver(supplierSchema),
    mode: 'onChange',
    defaultValues: { name: '', phone: '', address: '' },
  });

  const fetch = async () => {
    const { data } = await getSuppliers();
    setSuppliers(data.data);
    setLoading(false);
  };

  useFocusEffect(useCallback(() => { fetch(); }, []));

  const onSubmit = async (formData) => {
    try {
      setSaving(true);
      setApiError(null);
      await createSupplier({
        name: formData.name,
        phone: formData.phone || undefined,
        address: formData.address || undefined,
      });
      reset({ name: '', phone: '', address: '' });
      fetch();
    } catch (err) {
      setApiError(err.response?.data?.message || 'Failed to add supplier');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <LoadingSpinner />;

  return (
    <KeyboardFormView insideTab>
      <Controller control={control} name="name" render={({ field: { onChange, onBlur, value } }) => (
        <AppInput label="Name *" value={value} onChangeText={onChange} onBlur={onBlur} error={errors.name?.message} />
      )} />
      <Controller control={control} name="phone" render={({ field: { onChange, onBlur, value } }) => (
        <AppInput label="Phone" value={value} onChangeText={onChange} onBlur={onBlur} keyboardType="phone-pad" error={errors.phone?.message} />
      )} />
      <Controller control={control} name="address" render={({ field: { onChange, onBlur, value } }) => (
        <AppInput label="Address" value={value} onChangeText={onChange} onBlur={onBlur} error={errors.address?.message} />
      )} />
      <AppButton
        title="Add Supplier"
        onPress={handleSubmit(onSubmit, () => setApiError('Please fix the errors above'))}
        loading={saving}
      />
      <ErrorMessage message={apiError} />
      {suppliers.length === 0 ? (
        <EmptyState message="No suppliers yet" />
      ) : (
        suppliers.map((item) => (
          <Card key={item.id} mode="elevated" style={{ marginBottom: 8, marginTop: 8, borderRadius: theme.roundness }}>
            <Card.Content>
              <Text variant="titleSmall" style={{ fontWeight: '600' }}>{item.name}</Text>
              {item.phone ? (
                <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>{item.phone}</Text>
              ) : null}
            </Card.Content>
          </Card>
        ))
      )}
    </KeyboardFormView>
  );
}
