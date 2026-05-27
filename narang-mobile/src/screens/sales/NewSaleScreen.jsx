import React, { useState, useEffect } from 'react';
import { View } from 'react-native';
import { Text, SegmentedButtons, Card, Button, useTheme } from 'react-native-paper';
import { useCart } from '../../context/CartContext';
import { completeSale } from '../../services/saleService';
import CartItem from '../../components/sales/CartItem';
import ProductSearchModal from '../../components/sales/ProductSearchModal';
import AppButton from '../../components/common/AppButton';
import AppInput from '../../components/common/AppInput';
import ErrorMessage from '../../components/common/ErrorMessage';
import KeyboardFormView from '../../components/common/KeyboardFormView';
import { formatCurrency } from '../../utils/formatCurrency';
import { sanitizeAmountInput, validateSaleCheckout } from '../../utils/validation';
import { useNetworkStore } from '../../stores/networkStore';
import { useProductsStore } from '../../stores/productsStore';
import { useCustomersStore } from '../../stores/customersStore';
import { useSalesStore } from '../../stores/salesStore';
import { getEffectiveAdvanceBalance } from '../../utils/customerBalance';
import CustomerContactPickerModal from '../../components/sales/CustomerContactPickerModal';
import { resolveContactToCustomer } from '../../services/customerContactService';
import { formatPhoneDisplay } from '../../utils/phone';

export default function NewSaleScreen({ navigation }) {
  const theme = useTheme();
  const cart = useCart();
  const isOnline = useNetworkStore((s) => s.isOnline);
  const fetchProducts = useProductsStore((s) => s.fetchProducts);
  const customers = useCustomersStore((s) => s.customers);
  useSalesStore((s) => s.pendingSales);
  const [modalVisible, setModalVisible] = useState(false);
  const [customerPickerVisible, setCustomerPickerVisible] = useState(false);
  const [resolvingCustomer, setResolvingCustomer] = useState(false);
  const [error, setError] = useState(null);
  const [discountError, setDiscountError] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  useEffect(() => {
    if (cart.discount > cart.subtotal) {
      setDiscountError('Discount cannot exceed subtotal');
    } else if (cart.discount < 0) {
      setDiscountError('Discount cannot be negative');
    } else {
      setDiscountError(null);
    }
  }, [cart.subtotal, cart.discount]);

  const handleDiscountChange = (text) => {
    const cleaned = sanitizeAmountInput(text);
    const num = cleaned === '' ? 0 : Number(cleaned);
    cart.setDiscount(num);
    if (num > cart.subtotal) {
      setDiscountError('Discount cannot exceed subtotal');
    } else if (num < 0) {
      setDiscountError('Discount cannot be negative');
    } else {
      setDiscountError(null);
    }
  };

  const storeCustomer = cart.selectedCustomer
    ? customers.find((c) => c.id === cart.selectedCustomer.id) || cart.selectedCustomer
    : null;
  const accountBalance =
    cart.paymentMethod === 'CREDIT' && storeCustomer
      ? getEffectiveAdvanceBalance(storeCustomer)
      : null;
  const balanceAfterSale =
    accountBalance !== null ? accountBalance - cart.total : null;

  const handleCheckout = async () => {
    const validationErrors = validateSaleCheckout({
      items: cart.items,
      discount: cart.discount,
      subtotal: cart.subtotal,
      selectedCustomer: cart.selectedCustomer,
      paymentMethod: cart.paymentMethod,
    });
    if (validationErrors.length) {
      setError(validationErrors.join('. '));
      return;
    }
    if (discountError) {
      setError(discountError);
      return;
    }
    try {
      setLoading(true);
      setError(null);

      const sale = await completeSale({
        items: cart.items,
        discount: cart.discount,
        paymentMethod: cart.paymentMethod,
        notes: cart.notes,
        selectedCustomer: cart.selectedCustomer,
      });

      cart.clearCart();
      navigation.navigate('Invoice', { sale });
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to create sale');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardFormView
      insideTab
      footer={
        <View style={{ paddingHorizontal: 16, paddingTop: 8, backgroundColor: theme.colors.background }}>
          <AppButton title="Complete Sale" onPress={handleCheckout} loading={loading} />
          <ErrorMessage message={error} />
        </View>
      }
    >
      {!isOnline ? (
        <Text variant="bodySmall" style={{ color: theme.colors.secondary, marginBottom: 8, textAlign: 'center' }}>
          Offline — sale will sync when internet is back
        </Text>
      ) : null}
      <Button
        mode="contained"
        icon="plus"
        buttonColor={theme.colors.secondary}
        style={{ marginBottom: 12, borderRadius: theme.roundness }}
        onPress={() => setModalVisible(true)}
      >
        Add Product
      </Button>
      <Text variant="labelLarge" style={{ marginBottom: 4 }}>
        Customer {cart.paymentMethod === 'CREDIT' ? '*' : '(optional)'}
      </Text>
      <Card
        mode="outlined"
        style={{ marginBottom: 4, borderRadius: theme.roundness }}
        onPress={() => setCustomerPickerVisible(true)}
      >
        <Card.Content style={{ minHeight: 48, justifyContent: 'center' }}>
          <Text
            variant="bodyLarge"
            style={{ color: cart.selectedCustomer ? theme.colors.onSurface : theme.colors.outline }}
          >
            {cart.selectedCustomer ? cart.selectedCustomer.name : 'Tap to search customers'}
          </Text>
        </Card.Content>
      </Card>
      {cart.selectedCustomer ? (
        <>
          <AppInput
            label="Phone"
            value={formatPhoneDisplay(cart.selectedCustomer.phone)}
            editable={false}
          />
          <AppInput
            label="Address"
            value={cart.selectedCustomer.address || ''}
            onChangeText={cart.updateSelectedCustomerAddress}
            placeholder="Add or edit address"
            multiline
          />
          <Button compact mode="text" textColor={theme.colors.error} onPress={cart.clearSelectedCustomer} style={{ marginBottom: 12 }}>
            Clear customer
          </Button>
        </>
      ) : null}
      <CustomerContactPickerModal
        visible={customerPickerVisible}
        onClose={() => setCustomerPickerVisible(false)}
        resolving={resolvingCustomer}
        onSelect={async (selection) => {
          try {
            setResolvingCustomer(true);
            setError(null);
            if (selection.type === 'app') {
              cart.setSelectedCustomer(selection.customer);
              setCustomerPickerVisible(false);
              return;
            }
            const customer = await resolveContactToCustomer(selection.contact);
            cart.setSelectedCustomer(customer);
            setCustomerPickerVisible(false);
          } catch (err) {
            setError(err.message || 'Could not add customer');
          } finally {
            setResolvingCustomer(false);
          }
        }}
      />
      {cart.items.map((item) => (
        <CartItem key={item.product.id} item={item} onUpdateQty={cart.updateQuantity} onRemove={cart.removeItem} />
      ))}
      <AppInput
        label="Discount (PKR)"
        value={cart.discount === 0 ? '' : String(cart.discount)}
        onChangeText={handleDiscountChange}
        keyboardType="decimal-pad"
        placeholder="0"
        error={discountError}
      />
      <SegmentedButtons
        value={cart.paymentMethod}
        onValueChange={cart.setPaymentMethod}
        buttons={[
          { value: 'CASH', label: 'Cash', icon: 'cash' },
          { value: 'CREDIT', label: 'Credit', icon: 'credit-card-outline' },
        ]}
        style={{ marginBottom: 12 }}
      />
      {cart.paymentMethod === 'CREDIT' && storeCustomer && accountBalance !== null ? (
        <Card mode="elevated" style={{ marginBottom: 12, borderRadius: theme.roundness, backgroundColor: theme.colors.primaryContainer }}>
          <Card.Content>
            <Text variant="titleSmall" style={{ fontWeight: '600' }}>
              Customer account balance
            </Text>
            <Text
              variant="headlineSmall"
              style={{
                fontWeight: '700',
                marginTop: 4,
                color: accountBalance < 0 ? theme.colors.error : theme.colors.primary,
              }}
            >
              {formatCurrency(accountBalance)}
            </Text>
            <Text variant="bodySmall" style={{ marginTop: 8, color: theme.colors.onSurfaceVariant }}>
              After this sale:{' '}
              <Text
                style={{
                  fontWeight: '600',
                  color: balanceAfterSale < 0 ? theme.colors.error : theme.colors.primary,
                }}
              >
                {formatCurrency(balanceAfterSale)}
              </Text>
            </Text>
          </Card.Content>
        </Card>
      ) : null}
      <Card mode="elevated" style={{ marginBottom: 16, borderRadius: theme.roundness }}>
        <Card.Content>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <Text variant="bodyLarge">Subtotal</Text>
            <Text variant="bodyLarge">{formatCurrency(cart.subtotal)}</Text>
          </View>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 }}>
            <Text variant="bodyLarge">Discount</Text>
            <Text variant="bodyLarge">-{formatCurrency(cart.discount)}</Text>
          </View>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 }}>
            <Text variant="titleLarge" style={{ fontWeight: '700' }}>
              Total
            </Text>
            <Text variant="titleLarge" style={{ fontWeight: '700', color: theme.colors.primary }}>
              {formatCurrency(cart.total)}
            </Text>
          </View>
        </Card.Content>
      </Card>
      <ProductSearchModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        onSelect={(p) => {
          const added = cart.addItem(p);
          if (!added) setError(`${p.name} is out of stock`);
          else setError(null);
        }}
      />
    </KeyboardFormView>
  );
}
