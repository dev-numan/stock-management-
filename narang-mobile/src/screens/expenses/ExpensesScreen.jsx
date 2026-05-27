import React, { useState, useCallback } from 'react';
import { View } from 'react-native';
import { Card, Text, useTheme } from 'react-native-paper';
import { useFocusEffect } from '@react-navigation/native';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { getExpenses, createExpense } from '../../api/expenses.api';
import AppInput from '../../components/common/AppInput';
import AppButton from '../../components/common/AppButton';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import EmptyState from '../../components/common/EmptyState';
import ErrorMessage from '../../components/common/ErrorMessage';
import KeyboardFormView from '../../components/common/KeyboardFormView';
import { formatCurrency } from '../../utils/formatCurrency';
import { formatDate } from '../../utils/formatDate';
import { expenseSchema, sanitizeAmountInput } from '../../utils/validation';

export default function ExpensesScreen() {
  const theme = useTheme();
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [apiError, setApiError] = useState(null);

  const today = new Date().toISOString().split('T')[0];

  const { control, handleSubmit, reset, formState: { errors } } = useForm({
    resolver: zodResolver(expenseSchema),
    mode: 'onChange',
    defaultValues: { title: '', amount: '', category: '', date: '', notes: '' },
  });

  const fetch = async () => {
    const { data } = await getExpenses({ month: new Date().getMonth() + 1, year: new Date().getFullYear() });
    setExpenses(data.data);
    setLoading(false);
  };

  useFocusEffect(useCallback(() => { fetch(); }, []));

  const onSubmit = async (formData) => {
    try {
      setSaving(true);
      setApiError(null);
      await createExpense(formData);
      reset({ title: '', amount: '', category: '', date: '', notes: '' });
      fetch();
    } catch (err) {
      setApiError(err.response?.data?.message || 'Failed to add expense');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <LoadingSpinner />;

  return (
    <KeyboardFormView insideTab>
      <Controller control={control} name="title" render={({ field: { onChange, onBlur, value } }) => (
        <AppInput label="Title *" value={value} onChangeText={onChange} onBlur={onBlur} error={errors.title?.message} />
      )} />
      <Controller control={control} name="amount" render={({ field: { onChange, onBlur, value } }) => (
        <AppInput label="Amount (PKR) *" value={value} onChangeText={(t) => onChange(sanitizeAmountInput(t))} onBlur={onBlur} keyboardType="decimal-pad" error={errors.amount?.message} />
      )} />
      <Controller control={control} name="category" render={({ field: { onChange, onBlur, value } }) => (
        <AppInput
          label="Category *"
          value={value}
          onChangeText={onChange}
          onBlur={onBlur}
          placeholder="General"
          error={errors.category?.message}
        />
      )} />
      <Controller control={control} name="date" render={({ field: { onChange, onBlur, value } }) => (
        <AppInput
          label="Date (YYYY-MM-DD) *"
          value={value}
          onChangeText={onChange}
          onBlur={onBlur}
          placeholder={today}
          error={errors.date?.message}
        />
      )} />
      <Controller control={control} name="notes" render={({ field: { onChange, onBlur, value } }) => (
        <AppInput label="Notes" value={value} onChangeText={onChange} onBlur={onBlur} error={errors.notes?.message} />
      )} />
      <AppButton
        title="Add Expense"
        onPress={handleSubmit(onSubmit, () => setApiError('Please fix the errors above'))}
        loading={saving}
      />
      <ErrorMessage message={apiError} />
      {expenses.length === 0 ? (
        <EmptyState message="No expenses this month" />
      ) : (
        expenses.map((item) => (
          <Card key={item.id} mode="elevated" style={{ marginBottom: 8, marginTop: 8, borderRadius: theme.roundness }}>
            <Card.Content style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <View style={{ flex: 1 }}>
                <Text variant="titleSmall" style={{ fontWeight: '600' }}>{item.title}</Text>
                <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                  {item.category} · {formatDate(item.date)}
                </Text>
              </View>
              <Text variant="titleSmall" style={{ color: theme.colors.error, fontWeight: '700' }}>
                {formatCurrency(item.amount)}
              </Text>
            </Card.Content>
          </Card>
        ))
      )}
    </KeyboardFormView>
  );
}
