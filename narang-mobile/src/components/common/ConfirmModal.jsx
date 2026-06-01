import React from 'react';
import { Portal, Dialog, Button, Text } from 'react-native-paper';
import { useTranslation } from '../../i18n/useTranslation';

export default function ConfirmModal({ visible, title, message, onConfirm, onCancel, loading }) {
  const { t, isRtl } = useTranslation();

  return (
    <Portal>
      <Dialog visible={visible} onDismiss={onCancel} style={{ borderRadius: 12 }}>
        <Dialog.Title style={{ writingDirection: isRtl ? 'rtl' : 'ltr' }}>{title}</Dialog.Title>
        <Dialog.Content>
          <Text variant="bodyMedium" style={{ writingDirection: isRtl ? 'rtl' : 'ltr' }}>{message}</Text>
        </Dialog.Content>
        <Dialog.Actions>
          <Button onPress={onCancel} disabled={loading}>
            {t('common.cancel')}
          </Button>
          <Button onPress={onConfirm} loading={loading} textColor="#DC2626">
            {t('common.delete')}
          </Button>
        </Dialog.Actions>
      </Dialog>
    </Portal>
  );
}
