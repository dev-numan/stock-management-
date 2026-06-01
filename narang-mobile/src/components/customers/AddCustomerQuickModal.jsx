import React, { useEffect, useState } from 'react';
import { ScrollView } from 'react-native';
import { Portal, Dialog, Text } from 'react-native-paper';
import AppInput from '../common/AppInput';
import AppButton from '../common/AppButton';
import { useTranslation } from '../../i18n/useTranslation';

export default function AddCustomerQuickModal({
  visible,
  initialName = '',
  onSubmit,
  onClose,
  loading,
}) {
  const { t, isRtl } = useTranslation();
  const textDir = { writingDirection: isRtl ? 'rtl' : 'ltr' };
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!visible) {
      setName('');
      setPhone('');
      setError(null);
      return;
    }
    setName(initialName.trim());
    setPhone('');
  }, [visible, initialName]);

  const handleSave = () => {
    const trimmedName = name.trim();
    if (!trimmedName) {
      setError(t('customer.name'));
      return;
    }
    setError(null);
    onSubmit({
      name: trimmedName,
      phone: phone.trim() || undefined,
    });
  };

  if (!visible) return null;

  return (
    <Portal>
      <Dialog visible={visible} onDismiss={onClose} style={{ borderRadius: 12 }}>
        <Dialog.Title>{t('customer.addQuickTitle')}</Dialog.Title>
        <Dialog.ScrollArea style={{ paddingHorizontal: 0, maxHeight: 280 }}>
          <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingHorizontal: 24 }}>
            <AppInput
              label={t('customer.name')}
              value={name}
              onChangeText={setName}
              autoFocus={!initialName.trim()}
            />
            <AppInput
              label={t('customer.phoneOptional')}
              value={phone}
              onChangeText={setPhone}
              keyboardType="phone-pad"
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
          <AppButton title={t('customer.save')} onPress={handleSave} loading={loading} />
        </Dialog.Actions>
      </Dialog>
    </Portal>
  );
}
