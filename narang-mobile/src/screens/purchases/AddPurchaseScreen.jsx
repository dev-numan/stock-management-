import React, { useState } from 'react';
import { Card, Text, Button, useTheme } from 'react-native-paper';
import { createPurchase } from '../../api/purchases.api';
import AppInput from '../../components/common/AppInput';
import AppButton from '../../components/common/AppButton';
import ErrorMessage from '../../components/common/ErrorMessage';
import { getFriendlyErrorMessage } from '../../utils/apiErrors';
import ProductSearchModal from '../../components/sales/ProductSearchModal';
import KeyboardFormView from '../../components/common/KeyboardFormView';
import { sanitizeAmountInput, validatePurchaseItems } from '../../utils/validation';

export default function AddPurchaseScreen({ navigation }) {
  const theme = useTheme();
  const [items, setItems] = useState([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [notes, setNotes] = useState('');
  const [error, setError] = useState(null);
  const [fieldErrors, setFieldErrors] = useState({});
  const [loading, setLoading] = useState(false);

  const addProduct = (product) => {
    setItems((prev) => {
      if (prev.find((i) => i.productId === product.id)) return prev;
      return [
        ...prev,
        {
          productId: product.id,
          name: product.name,
          quantity: '',
          costPrice: '',
          suggestedCost: String(Number(product.costPrice)),
        },
      ];
    });
  };

  const updateItem = (productId, field, value) => {
    const sanitized = field === 'quantity' || field === 'costPrice'
      ? sanitizeAmountInput(value)
      : value;
    setItems((prev) => prev.map((i) => (i.productId === productId ? { ...i, [field]: sanitized } : i)));
    setFieldErrors((prev) => {
      const next = { ...prev };
      delete next[`${productId}-${field}`];
      return next;
    });
  };

  const onSubmit = async () => {
    const { errors: validationErrors, fieldErrors: itemFieldErrors } = validatePurchaseItems(items);
    setFieldErrors(itemFieldErrors);
    if (validationErrors.length) {
      setError(validationErrors[0]);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      await createPurchase({
        notes,
        items: items.map((i) => ({
          productId: i.productId,
          quantity: Number(String(i.quantity).trim() || '1'),
          costPrice: Number(
            String(i.costPrice).trim() || i.suggestedCost || 0
          ),
        })),
      });
      navigation.goBack();
    } catch (err) {
      setError(getFriendlyErrorMessage(err, 'Could not save purchase.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardFormView insideTab>
      <Button
        mode="contained"
        icon="plus"
        buttonColor={theme.colors.secondary}
        style={{ marginBottom: 16, borderRadius: theme.roundness }}
        onPress={() => setModalVisible(true)}
      >
        Add Product
      </Button>
      {items.map((item) => (
        <Card key={item.productId} mode="elevated" style={{ marginBottom: 8, borderRadius: theme.roundness }}>
          <Card.Content>
            <Text variant="titleSmall" style={{ fontWeight: '600', marginBottom: 8 }}>{item.name}</Text>
            <AppInput
              label="Quantity *"
              value={item.quantity === '' ? '' : String(item.quantity)}
              onChangeText={(v) => updateItem(item.productId, 'quantity', v)}
              keyboardType="decimal-pad"
              placeholder="1"
              error={fieldErrors[`${item.productId}-quantity`]}
            />
            <AppInput
              label="Cost Price (PKR) *"
              value={item.costPrice === '' ? '' : String(item.costPrice)}
              onChangeText={(v) => updateItem(item.productId, 'costPrice', v)}
              keyboardType="decimal-pad"
              placeholder={item.suggestedCost || '0'}
              error={fieldErrors[`${item.productId}-costPrice`]}
            />
          </Card.Content>
        </Card>
      ))}
      <AppInput label="Notes" value={notes} onChangeText={setNotes} multiline />
      <AppButton title="Save Purchase" onPress={onSubmit} loading={loading} />
      <ErrorMessage message={error} />
      <ProductSearchModal visible={modalVisible} onClose={() => setModalVisible(false)} onSelect={addProduct} />
    </KeyboardFormView>
  );
}
