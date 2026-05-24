import React, { useState, useEffect } from 'react';
import { View, Keyboard, Platform } from 'react-native';
import { Portal, Dialog, Text, Button } from 'react-native-paper';
import AppInput from '../common/AppInput';

export default function AddAdvanceModal({ visible, customerName, onSubmit, onClose, loading }) {
  const [amount, setAmount] = useState('');

  useEffect(() => {
    if (!visible) {
      setAmount('');
    }
  }, [visible]);

  const handleClose = () => {
    setAmount('');
    onClose();
  };

  const handleSubmit = () => {
    onSubmit({ amount: parseFloat(amount) });
  };

  return (
    <Portal>
      <Dialog visible={visible} onDismiss={handleClose} style={{ borderRadius: 12, maxHeight: '92%' }}>
        <Dialog.Title>Add Credit Balance</Dialog.Title>
        <Dialog.ScrollArea
          style={{ maxHeight: 320 }}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
          automaticallyAdjustKeyboardInsets
          onScrollBeginDrag={Keyboard.dismiss}
          contentContainerStyle={{ paddingBottom: 32 }}
        >
          <View style={{ paddingHorizontal: 24, paddingTop: 8 }}>
            <Text variant="bodyMedium" style={{ marginBottom: 12 }}>
              {customerName
                ? `Record money paid in advance by ${customerName}. This increases their prepaid balance.`
                : 'Record money the client paid in advance (prepaid credit).'}
            </Text>
            <AppInput
              label="Amount (Rs)"
              value={amount}
              onChangeText={setAmount}
              keyboardType="decimal-pad"
              placeholder="0"
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
                Cancel
              </Button>
              <Button onPress={handleSubmit} loading={loading} disabled={!amount || Number(amount) <= 0}>
                Save
              </Button>
            </View>
          </View>
        </Dialog.ScrollArea>
      </Dialog>
    </Portal>
  );
}
