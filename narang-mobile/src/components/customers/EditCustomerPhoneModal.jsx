import React, { useEffect, useState } from 'react';
import { ScrollView } from 'react-native';
import { Portal, Dialog, Text } from 'react-native-paper';
import AppInput from '../common/AppInput';
import AppButton from '../common/AppButton';
import { optionalPhone } from '../../utils/validation';
import { useTranslation } from '../../i18n/useTranslation';

export default function EditCustomerPhoneModal({
  visible,
  customer,
  onSubmit,
  onClose,
  loading,
}) {
  const { t, isRtl } = useTranslation();
  const textDir = { writingDirection: isRtl ? 'rtl' : 'ltr' };
  const [phone, setPhone] = useState('');
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!visible) {
      setPhone('');
      setError(null);
      return;
    }
    setPhone(customer?.phone?.trim() || '');
  }, [visible, customer?.phone]);

  const handleSave = () => {
    const parsed = optionalPhone.safeParse(phone);
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message || t('customer.phoneInvalid'));
      return;
    }
    setError(null);
    const trimmed = phone.trim();
    onSubmit(trimmed || null);
  };

  if (!visible) return null;

  return (
    <Portal>
      <Dialog visible={visible} onDismiss={onClose} style={{ borderRadius: 12 }}>
        <Dialog.Title>
          {customer?.phone?.trim() ? t('customer.editPhoneTitle') : t('customer.addPhoneTitle')}
        </Dialog.Title>
        <Dialog.ScrollArea style={{ paddingHorizontal: 0, maxHeight: 200 }}>
          <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingHorizontal: 24 }}>
            <AppInput
              label={t('customer.phoneOptional')}
              value={phone}
              onChangeText={setPhone}
              keyboardType="phone-pad"
              autoFocus
            />
            {error ? (
              <Text variant="bodySmall" style={{ color: '#B00020', ...textDir }}>
                {error}
              </Text>
            ) : null}
          </ScrollView>
        </Dialog.ScrollArea>
        <Dialog.Actions>
          <AppButton title={t('common.cancel')} variant="outline" onPress={onClose} disabled={loading} />
          <AppButton title={t('common.save')} onPress={handleSave} loading={loading} />
        </Dialog.Actions>
      </Dialog>
    </Portal>
  );
}
