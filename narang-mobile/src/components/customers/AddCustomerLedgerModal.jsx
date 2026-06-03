import React, { useState, useEffect } from 'react';
import { View, Keyboard, Platform } from 'react-native';
import { Portal, Dialog, Text, Button } from 'react-native-paper';
import AppInput from '../common/AppInput';
import { useTranslation } from '../../i18n/useTranslation';
import { sanitizeAmountInput } from '../../utils/validation';

/** @param {'payment' | 'credit'} variant */
export default function AddCustomerLedgerModal({
  visible,
  variant = 'payment',
  customerName,
  onSubmit,
  onClose,
  loading,
}) {
  const { t, isRtl } = useTranslation();
  const textDir = { writingDirection: isRtl ? 'rtl' : 'ltr' };
  const [amount, setAmount] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState(null);
  const isPayment = variant === 'payment';

  useEffect(() => {
    if (!visible) {
      setAmount('');
      setNotes('');
      setError(null);
    }
  }, [visible]);

  const handleClose = () => {
    setAmount('');
    setNotes('');
    setError(null);
    onClose();
  };

  const handleSubmit = () => {
    const value = Number(String(amount).trim());
    if (!value || value <= 0) {
      setError(t('advance.amountRequired'));
      return;
    }
    setError(null);
    onSubmit({
      amount: value,
      notes: notes.trim() || undefined,
    });
  };

  const title = isPayment ? t('advance.title') : t('advance.creditChargeTitle');
  const description = customerName
    ? isPayment
      ? t('advance.descriptionNamed', { name: customerName })
      : t('advance.creditChargeNamed', { name: customerName })
    : isPayment
      ? t('advance.descriptionGeneric')
      : t('advance.creditChargeGeneric');

  return (
    <Portal>
      <Dialog visible={visible} onDismiss={handleClose} style={{ borderRadius: 12, maxHeight: '92%' }}>
        <Dialog.Title style={textDir}>{title}</Dialog.Title>
        <Dialog.ScrollArea
          style={{ maxHeight: 360 }}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
          automaticallyAdjustKeyboardInsets
          onScrollBeginDrag={Keyboard.dismiss}
          contentContainerStyle={{ paddingBottom: 32 }}
        >
          <View style={{ paddingHorizontal: 24, paddingTop: 8 }}>
            <Text variant="bodyMedium" style={{ marginBottom: 12, ...textDir }}>
              {description}
            </Text>
            <AppInput
              label={t('advance.amountLabel')}
              value={amount}
              onChangeText={(v) => setAmount(sanitizeAmountInput(v))}
              keyboardType="decimal-pad"
              placeholder="0"
              error={error}
            />
            <AppInput
              label={t('advance.notesLabel')}
              value={notes}
              onChangeText={setNotes}
              multiline
              placeholder={t('advance.notesPlaceholder')}
            />
            <View
              style={{
                flexDirection: 'row',
                justifyContent: 'flex-end',
                alignItems: 'center',
                marginTop: 8,
                paddingBottom: 24,
                gap: 8,
              }}
            >
              <Button onPress={handleClose} disabled={loading}>
                {t('common.cancel')}
              </Button>
              <Button onPress={handleSubmit} loading={loading} disabled={!amount || Number(amount) <= 0}>
                {t('common.save')}
              </Button>
            </View>
          </View>
        </Dialog.ScrollArea>
      </Dialog>
    </Portal>
  );
}
