import React from 'react';
import { Portal, Dialog, Text, Button } from 'react-native-paper';
import AppInput from '../common/AppInput';
import { useTranslation } from '../../i18n/useTranslation';
import { sanitizeAmountInput } from '../../utils/validation';

export default function AddSupplierPaymentModal({
  visible,
  supplierName,
  onSubmit,
  onClose,
  loading,
}) {
  const { t, isRtl } = useTranslation();
  const textDir = { writingDirection: isRtl ? 'rtl' : 'ltr' };
  const [amount, setAmount] = React.useState('');
  const [notes, setNotes] = React.useState('');
  const [error, setError] = React.useState(null);

  React.useEffect(() => {
    if (!visible) {
      setAmount('');
      setNotes('');
      setError(null);
    }
  }, [visible]);

  const handleSubmit = () => {
    const value = Number(String(amount).trim());
    if (!value || value <= 0) {
      setError(t('supplier.paymentAmount'));
      return;
    }
    setError(null);
    onSubmit({ amount: value, notes: notes.trim() || undefined });
  };

  return (
    <Portal>
      <Dialog visible={visible} onDismiss={onClose} style={{ borderRadius: 12 }}>
        <Dialog.Title style={textDir}>{t('supplier.addPaymentTitle')}</Dialog.Title>
        <Dialog.Content>
          {supplierName ? (
            <Text variant="bodyMedium" style={{ marginBottom: 12, ...textDir }}>
              {supplierName}
            </Text>
          ) : null}
          <AppInput
            label={t('supplier.paymentAmount')}
            value={amount}
            onChangeText={(v) => setAmount(sanitizeAmountInput(v))}
            keyboardType="decimal-pad"
            error={error}
          />
          <AppInput
            label={t('common.notes')}
            value={notes}
            onChangeText={setNotes}
            multiline
          />
        </Dialog.Content>
        <Dialog.Actions>
          <Button onPress={onClose} disabled={loading}>
            {t('common.cancel')}
          </Button>
          <Button onPress={handleSubmit} loading={loading}>
            {t('common.save')}
          </Button>
        </Dialog.Actions>
      </Dialog>
    </Portal>
  );
}
