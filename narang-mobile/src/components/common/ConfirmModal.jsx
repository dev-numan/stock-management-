import React from 'react';
import { Portal, Dialog, Button, Text } from 'react-native-paper';

export default function ConfirmModal({ visible, title, message, onConfirm, onCancel, loading }) {
  return (
    <Portal>
      <Dialog visible={visible} onDismiss={onCancel} style={{ borderRadius: 12 }}>
        <Dialog.Title>{title}</Dialog.Title>
        <Dialog.Content>
          <Text variant="bodyMedium">{message}</Text>
        </Dialog.Content>
        <Dialog.Actions>
          <Button onPress={onCancel} disabled={loading}>
            Cancel
          </Button>
          <Button onPress={onConfirm} loading={loading} textColor="#DC2626">
            Delete
          </Button>
        </Dialog.Actions>
      </Dialog>
    </Portal>
  );
}
