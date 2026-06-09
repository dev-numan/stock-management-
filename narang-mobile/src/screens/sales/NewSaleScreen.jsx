import React, { useState, useEffect } from 'react';
import { View } from 'react-native';
import { Text, SegmentedButtons, Card, Button, useTheme } from 'react-native-paper';
import { useCart } from '../../context/CartContext';
import { completeSale } from '../../services/saleService';
import CartItem from '../../components/sales/CartItem';
import ProductSearchModal from '../../components/sales/ProductSearchModal';
import SaleUnitPickerModal from '../../components/sales/SaleUnitPickerModal';
import AppButton from '../../components/common/AppButton';
import AppInput from '../../components/common/AppInput';
import ErrorMessage from '../../components/common/ErrorMessage';
import { getFriendlyErrorMessage } from '../../utils/apiErrors';
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
import { hasAlternateSale } from '../../utils/productUnits';
import { useTranslation } from '../../i18n/useTranslation';

export default function NewSaleScreen({ navigation }) {
  const theme = useTheme();
  const { t, isRtl } = useTranslation();
  const textDir = { writingDirection: isRtl ? 'rtl' : 'ltr' };
  const cart = useCart();
  const isOnline = useNetworkStore((s) => s.isOnline);
  const fetchProducts = useProductsStore((s) => s.fetchProducts);
  const getProductById = useProductsStore((s) => s.getById);
  const customers = useCustomersStore((s) => s.customers);
  useSalesStore((s) => s.pendingSales);
  const [modalVisible, setModalVisible] = useState(false);
  const [unitPicker, setUnitPicker] = useState(null);
  const [customerPickerVisible, setCustomerPickerVisible] = useState(false);
  const [resolvingCustomer, setResolvingCustomer] = useState(false);
  const [error, setError] = useState(null);
  const [discountError, setDiscountError] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchProducts(true);
  }, [fetchProducts]);

  const resolveProduct = (product) => getProductById(product?.id) ?? product;

  const openUnitPicker = (product, options = {}) => {
    const fresh = resolveProduct(product);
    setUnitPicker({
      product: fresh,
      replaceLineKey: options.replaceLineKey ?? null,
      initialSoldUnit: options.initialSoldUnit ?? fresh.unit,
      initialQuantity: options.initialQuantity ?? '1',
    });
  };

  const handleProductSelect = (product) => {
    setModalVisible(false);
    const fresh = resolveProduct(product);
    if (hasAlternateSale(fresh)) {
      openUnitPicker(fresh);
      return;
    }
    const result = cart.addProduct(fresh);
    if (result === 'out_of_stock') {
      setError(t('sale.productOutOfStock', { name: fresh.name }));
    } else {
      setError(null);
    }
  };

  const handleUnitPickerConfirm = (product, quantity, soldUnit) => {
    if (unitPicker?.replaceLineKey) {
      cart.removeItem(unitPicker.replaceLineKey);
    }
    const fresh = resolveProduct(product);
    const added = cart.addItem(fresh, quantity, soldUnit);
    if (!added) setError(t('sale.productOutOfStock', { name: fresh.name }));
    else setError(null);
    setUnitPicker(null);
  };

  useEffect(() => {
    if (cart.discount > cart.subtotal) {
      setDiscountError(t('sale.discountExceedsSubtotal'));
    } else if (cart.discount < 0) {
      setDiscountError(t('sale.discountNegative'));
    } else {
      setDiscountError(null);
    }
  }, [cart.subtotal, cart.discount]);

  const handleDiscountChange = (text) => {
    const cleaned = sanitizeAmountInput(text);
    const num = cleaned === '' ? 0 : Number(cleaned);
    cart.setDiscount(num);
    if (num > cart.subtotal) {
      setDiscountError(t('sale.discountExceedsSubtotal'));
    } else if (num < 0) {
      setDiscountError(t('sale.discountNegative'));
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
      setError(getFriendlyErrorMessage(err, t('sale.completeFailed')));
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
    <KeyboardFormView
      insideTab
      footer={
        <View style={{ paddingHorizontal: 16, paddingTop: 8, backgroundColor: theme.colors.background }}>
          <AppButton title={t('sale.completeSale')} onPress={handleCheckout} loading={loading} />
          <ErrorMessage message={error} />
        </View>
      }
    >
      {!isOnline ? (
        <Text variant="bodySmall" style={{ color: theme.colors.secondary, marginBottom: 8, textAlign: 'center' }}>
          {t('sale.offlineHint')}
        </Text>
      ) : null}
      <Button
        mode="contained"
        icon="plus"
        buttonColor={theme.colors.secondary}
        style={{ marginBottom: 12, borderRadius: theme.roundness }}
        onPress={async () => {
          await fetchProducts(true);
          setModalVisible(true);
        }}
      >
        {t('sale.addProduct')}
      </Button>
      <Text variant="labelLarge" style={{ marginBottom: 4, ...textDir }}>
        {cart.paymentMethod === 'CREDIT' ? t('sale.customerRequired') : t('sale.customerOptional')}
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
            {cart.selectedCustomer ? cart.selectedCustomer.name : t('sale.tapSearchCustomers')}
          </Text>
        </Card.Content>
      </Card>
      {cart.selectedCustomer ? (
        <>
          <AppInput
            label={t('customer.phoneOptional')}
            value={cart.selectedCustomer.phone || ''}
            onChangeText={cart.updateSelectedCustomerPhone}
            keyboardType="phone-pad"
            placeholder={t('customer.addPhone')}
          />
          <AppInput
            label={t('common.address')}
            value={cart.selectedCustomer.address || ''}
            onChangeText={cart.updateSelectedCustomerAddress}
            placeholder={t('sale.addressPlaceholder')}
            multiline
          />
          <Button compact mode="text" textColor={theme.colors.error} onPress={cart.clearSelectedCustomer} style={{ marginBottom: 12 }}>
            {t('sale.clearCustomer')}
          </Button>
        </>
      ) : null}
      {cart.items.map((item) => (
        <CartItem
          key={item.lineKey}
          item={item}
          onUpdateQty={cart.updateQuantity}
          onRemove={cart.removeItem}
          onChangeUnit={(line) =>
            openUnitPicker(line.product, {
              replaceLineKey: line.lineKey,
              initialSoldUnit: line.soldUnit,
              initialQuantity: String(line.quantity),
            })
          }
        />
      ))}
      <AppInput
        label={t('sale.discountLabel')}
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
          { value: 'CASH', label: t('payment.cash'), icon: 'cash' },
          { value: 'CREDIT', label: t('payment.credit'), icon: 'credit-card-outline' },
        ]}
        style={{ marginBottom: 12 }}
      />
      {cart.paymentMethod === 'CREDIT' && storeCustomer && accountBalance !== null ? (
        <Card mode="elevated" style={{ marginBottom: 12, borderRadius: theme.roundness, backgroundColor: theme.colors.primaryContainer }}>
          <Card.Content>
            <Text variant="titleSmall" style={{ fontWeight: '600' }}>
              {t('sale.accountBalance')}
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
              {t('sale.afterThisSale')}{' '}
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
            <Text variant="bodyLarge">{t('invoice.subtotal')}</Text>
            <Text variant="bodyLarge">{formatCurrency(cart.subtotal)}</Text>
          </View>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 }}>
            <Text variant="bodyLarge">{t('invoice.discount')}</Text>
            <Text variant="bodyLarge">-{formatCurrency(cart.discount)}</Text>
          </View>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 }}>
            <Text variant="titleLarge" style={{ fontWeight: '700' }}>
              {t('invoice.total')}
            </Text>
            <Text variant="titleLarge" style={{ fontWeight: '700', color: theme.colors.primary }}>
              {formatCurrency(cart.total)}
            </Text>
          </View>
        </Card.Content>
      </Card>
    </KeyboardFormView>
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
          setError(getFriendlyErrorMessage(err, t('customer.addFailed')));
        } finally {
          setResolvingCustomer(false);
        }
      }}
    />
    <ProductSearchModal
      visible={modalVisible}
      onClose={() => setModalVisible(false)}
      onSelect={handleProductSelect}
    />
    <SaleUnitPickerModal
      visible={Boolean(unitPicker?.product)}
      product={unitPicker?.product}
      initialSoldUnit={unitPicker?.initialSoldUnit}
      initialQuantity={unitPicker?.initialQuantity}
      confirmLabel={unitPicker?.replaceLineKey ? t('unitPicker.update') : t('unitPicker.addToCart')}
      onClose={() => setUnitPicker(null)}
      onConfirm={handleUnitPickerConfirm}
    />
    </>
  );
}
