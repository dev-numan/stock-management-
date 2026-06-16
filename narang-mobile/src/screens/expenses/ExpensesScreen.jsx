import React, { useState, useCallback } from 'react';
import { View } from 'react-native';
import { Card, Text, useTheme } from 'react-native-paper';
import { useFocusEffect } from '@react-navigation/native';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useExpensesStore } from '../../stores/expensesStore';
import AppInput from '../../components/common/AppInput';
import AppButton from '../../components/common/AppButton';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import EmptyState from '../../components/common/EmptyState';
import ErrorMessage from '../../components/common/ErrorMessage';
import { getFriendlyErrorMessage } from '../../utils/apiErrors';
import KeyboardFormView from '../../components/common/KeyboardFormView';
import { formatCurrency } from '../../utils/formatCurrency';
import { formatDate } from '../../utils/formatDate';
import { expenseSchema, sanitizeAmountInput } from '../../utils/validation';
import { useTranslation } from '../../i18n/useTranslation';

export default function ExpensesScreen() {
  const theme = useTheme();
  const { t } = useTranslation();
  const expenses = useExpensesStore((s) => s.expenses);
  const fetchExpenses = useExpensesStore((s) => s.fetchExpenses);
  const createExpense = useExpensesStore((s) => s.createExpense);
  const storeLoading = useExpensesStore((s) => s.loading);
  const [saving, setSaving] = useState(false);
  const [apiError, setApiError] = useState(null);

  const today = new Date().toISOString().split('T')[0];

  const { control, handleSubmit, reset, formState: { errors } } = useForm({
    resolver: zodResolver(expenseSchema),
    mode: 'onChange',
    defaultValues: { title: '', amount: '', category: '', date: '', notes: '' },
  });

  useFocusEffect(useCallback(() => { fetchExpenses(); }, [fetchExpenses]));

  const onSubmit = async (formData) => {
    try {
      setSaving(true);
      setApiError(null);
      // Store handles online vs offline (queues + optimistic local add) and
      // invalidates the dashboard's profit/expense totals.
      await createExpense(formData);
      reset({ title: '', amount: '', category: '', date: '', notes: '' });
    } catch (err) {
      setApiError(getFriendlyErrorMessage(err, t('expense.addFailed')));
    } finally {
      setSaving(false);
    }
  };

  if (storeLoading && expenses.length === 0) return <LoadingSpinner />;

  return (
    <KeyboardFormView insideTab>
      <Controller control={control} name="title" render={({ field: { onChange, onBlur, value } }) => (
        <AppInput label={t('expense.title')} value={value} onChangeText={onChange} onBlur={onBlur} error={errors.title?.message} />
      )} />
      <Controller control={control} name="amount" render={({ field: { onChange, onBlur, value } }) => (
        <AppInput label={t('expense.amount')} value={value} onChangeText={(text) => onChange(sanitizeAmountInput(text))} onBlur={onBlur} keyboardType="decimal-pad" error={errors.amount?.message} />
      )} />
      <Controller control={control} name="category" render={({ field: { onChange, onBlur, value } }) => (
        <AppInput
          label={t('expense.category')}
          value={value}
          onChangeText={onChange}
          onBlur={onBlur}
          placeholder={t('expense.categoryPlaceholder')}
          error={errors.category?.message}
        />
      )} />
      <Controller control={control} name="date" render={({ field: { onChange, onBlur, value } }) => (
        <AppInput
          label={t('expense.date')}
          value={value}
          onChangeText={onChange}
          onBlur={onBlur}
          placeholder={today}
          error={errors.date?.message}
        />
      )} />
      <Controller control={control} name="notes" render={({ field: { onChange, onBlur, value } }) => (
        <AppInput label={t('common.notes')} value={value} onChangeText={onChange} onBlur={onBlur} error={errors.notes?.message} />
      )} />
      <AppButton
        title={t('expense.add')}
        onPress={handleSubmit(onSubmit, () => setApiError(t('common.fixErrors')))}
        loading={saving}
      />
      <ErrorMessage message={apiError} />
      {expenses.length === 0 ? (
        <EmptyState message={t('expense.empty')} />
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
