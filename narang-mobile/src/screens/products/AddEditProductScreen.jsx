import React, { useEffect, useState } from 'react';
import { View } from 'react-native';
import { Text, Chip, Switch, useTheme } from 'react-native-paper';
import KeyboardFormView from '../../components/common/KeyboardFormView';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { getProduct } from '../../api/products.api';
import AppInput from '../../components/common/AppInput';
import DatePickerField from '../../components/common/DatePickerField';
import AppButton from '../../components/common/AppButton';
import ErrorMessage from '../../components/common/ErrorMessage';
import { getFriendlyErrorMessage } from '../../utils/apiErrors';
import ConfirmModal from '../../components/common/ConfirmModal';
import { useAuth } from '../../context/AuthContext';
import { useProductsStore } from '../../stores/productsStore';
import {
  PRODUCT_CATEGORIES,
  PRODUCT_UNITS,
  productFormSchema,
  productFormToPayload,
  sanitizeAmountInput,
} from '../../utils/validation';
import { getAllowedAlternateUnits, getUnitPrice } from '../../utils/productUnits';
import { formatCurrency } from '../../utils/formatCurrency';

export default function AddEditProductScreen({ route, navigation }) {
  const theme = useTheme();
  const initialProduct = route.params?.product;
  const [productId, setProductId] = useState(initialProduct?.id ?? null);
  const isEdit = Boolean(productId);
  const { isAdmin } = useAuth();
  const saveProduct = useProductsStore((s) => s.saveProduct);
  const createProduct = useProductsStore((s) => s.createProduct);
  const deleteProduct = useProductsStore((s) => s.deleteProduct);
  const [productLoading, setProductLoading] = useState(Boolean(initialProduct?.id));
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showDelete, setShowDelete] = useState(false);

  const {
    control,
    handleSubmit,
    setValue,
    watch,
    trigger,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(productFormSchema),
    mode: 'onChange',
    defaultValues: {
      name: initialProduct?.name || '',
      category:
        initialProduct?.category ||
        initialProduct?.category?.name ||
        PRODUCT_CATEGORIES[0],
      unit: initialProduct?.unit || 'BAG',
      sellByAlternate: Boolean(initialProduct?.alternateSaleUnit),
      alternateSaleUnit: initialProduct?.alternateSaleUnit || '',
      unitsPerStockUnit: initialProduct?.unitsPerStockUnit
        ? String(Number(initialProduct.unitsPerStockUnit))
        : '',
      costPrice: initialProduct ? String(Number(initialProduct.costPrice)) : '',
      salePrice: initialProduct ? String(Number(initialProduct.salePrice)) : '',
      currentStock: initialProduct ? String(Number(initialProduct.currentStock)) : '',
      minStockAlert: initialProduct ? String(Number(initialProduct.minStockAlert)) : '',
      expiryDate: initialProduct?.expiryDate
        ? new Date(initialProduct.expiryDate).toISOString().slice(0, 10)
        : '',
    },
  });

  useEffect(() => {
    if (!initialProduct?.id) return undefined;

    let cancelled = false;
    setProductLoading(true);
    getProduct(initialProduct.id)
      .then(({ data }) => {
        if (cancelled) return;
        const p = data.data;
        setProductId(p.id);
        setValue('name', p.name);
        setValue('category', p.category || p.category?.name || PRODUCT_CATEGORIES[0]);
        setValue('unit', p.unit);
        setValue('sellByAlternate', Boolean(p.alternateSaleUnit));
        setValue('alternateSaleUnit', p.alternateSaleUnit || '');
        setValue('unitsPerStockUnit', p.unitsPerStockUnit ? String(Number(p.unitsPerStockUnit)) : '');
        setValue('costPrice', String(Number(p.costPrice)));
        setValue('salePrice', String(Number(p.salePrice)));
        setValue('currentStock', String(Number(p.currentStock)));
        setValue('minStockAlert', String(Number(p.minStockAlert)));
        setValue('expiryDate', p.expiryDate ? new Date(p.expiryDate).toISOString().slice(0, 10) : '');
      })
      .catch(() => {
        if (!cancelled) setError('Could not load product');
      })
      .finally(() => {
        if (!cancelled) setProductLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [initialProduct?.id, setValue]);

  const selectedCategory = watch('category');
  const selectedUnit = watch('unit');
  const sellByAlternate = watch('sellByAlternate');
  const alternateSaleUnit = watch('alternateSaleUnit');
  const unitsPerStockUnit = watch('unitsPerStockUnit');
  const salePrice = watch('salePrice');
  const currentStock = watch('currentStock');
  const allowedAlternateUnits = getAllowedAlternateUnits(selectedUnit);

  useEffect(() => {
    if (!allowedAlternateUnits.length) {
      setValue('sellByAlternate', false);
      setValue('alternateSaleUnit', '');
      setValue('unitsPerStockUnit', '');
      return;
    }
    if (alternateSaleUnit && !allowedAlternateUnits.includes(alternateSaleUnit)) {
      setValue('alternateSaleUnit', allowedAlternateUnits[0] || '');
    }
  }, [selectedUnit, allowedAlternateUnits, alternateSaleUnit, setValue]);

  useEffect(() => {
    trigger('minStockAlert');
  }, [currentStock, trigger]);

  const alternatePricePreview =
    sellByAlternate && salePrice && unitsPerStockUnit && Number(unitsPerStockUnit) > 0
      ? getUnitPrice(
          {
            unit: selectedUnit,
            salePrice: Number(salePrice),
            alternateSaleUnit,
            unitsPerStockUnit: Number(unitsPerStockUnit),
          },
          alternateSaleUnit
        )
      : null;

  const onSubmit = async (data) => {
    try {
      setLoading(true);
      setError(null);
      const payload = productFormToPayload(data);
      if (isEdit) {
        const updated = await saveProduct(productId, payload);
        setProductId(updated.id);
      } else {
        await createProduct(payload);
      }
      navigation.goBack();
    } catch (err) {
      setError(getFriendlyErrorMessage(err, 'Could not save product.'));
    } finally {
      setLoading(false);
    }
  };

  const onDelete = async () => {
    if (!productId) {
      setError('Product ID is missing. Go back and open the product again.');
      setShowDelete(false);
      return;
    }
    try {
      setLoading(true);
      setError(null);
      await deleteProduct(productId);
      navigation.goBack();
    } catch (err) {
      setError(getFriendlyErrorMessage(err, 'Could not delete product.'));
    } finally {
      setLoading(false);
      setShowDelete(false);
    }
  };

  const stockHint = currentStock !== '' && !Number.isNaN(Number(currentStock))
    ? ` (max ${Number(currentStock)} based on current stock)`
    : '';

  if (productLoading) {
    return (
      <KeyboardFormView insideTab>
        <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant, textAlign: 'center', paddingVertical: 32 }}>
          Loading product...
        </Text>
      </KeyboardFormView>
    );
  }

  return (
    <KeyboardFormView insideTab>
      <Controller
        control={control}
        name="name"
        render={({ field: { onChange, onBlur, value } }) => (
          <AppInput label="Product Name *" value={value} onChangeText={onChange} onBlur={onBlur} error={errors.name?.message} />
        )}
      />
      <Text variant="labelLarge" style={{ marginBottom: 8 }}>Category *</Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 4 }}>
        {PRODUCT_CATEGORIES.map((cat) => {
          const selected = selectedCategory === cat;
          return (
            <Chip
              key={cat}
              selected={selected}
              onPress={() => setValue('category', cat, { shouldValidate: true, shouldDirty: true })}
              style={{ marginBottom: 4 }}
            >
              {cat}
            </Chip>
          );
        })}
      </View>
      {errors.category ? (
        <Text variant="bodySmall" style={{ color: theme.colors.error, marginBottom: 8 }}>{errors.category.message}</Text>
      ) : null}
      <Text variant="labelLarge" style={{ marginBottom: 8 }}>Unit *</Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 4 }}>
        {PRODUCT_UNITS.map((u) => {
          const selected = selectedUnit === u;
          return (
            <Chip
              key={u}
              selected={selected}
              onPress={() => setValue('unit', u, { shouldValidate: true, shouldDirty: true })}
              style={{ marginBottom: 4 }}
            >
              {u}
            </Chip>
          );
        })}
      </View>
      {errors.unit ? (
        <Text variant="bodySmall" style={{ color: theme.colors.error, marginBottom: 8 }}>{errors.unit.message}</Text>
      ) : null}
      {allowedAlternateUnits.length > 0 ? (
        <>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <Text variant="labelLarge">Also sell by alternate unit</Text>
            <Controller
              control={control}
              name="sellByAlternate"
              render={({ field: { onChange, value } }) => (
                <Switch
                  value={value}
                  onValueChange={(enabled) => {
                    onChange(enabled);
                    if (enabled && allowedAlternateUnits.length > 0) {
                      setValue('alternateSaleUnit', allowedAlternateUnits[0], {
                        shouldValidate: true,
                        shouldDirty: true,
                      });
                    } else if (!enabled) {
                      setValue('alternateSaleUnit', '');
                      setValue('unitsPerStockUnit', '');
                    }
                  }}
                />
              )}
            />
          </View>
          {sellByAlternate ? (
            <>
              <Text variant="labelMedium" style={{ marginBottom: 8, color: theme.colors.onSurfaceVariant }}>
                Alternate unit
              </Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 4 }}>
                {allowedAlternateUnits.map((u) => {
                  const selected = alternateSaleUnit === u;
                  return (
                    <Chip
                      key={u}
                      selected={selected}
                      onPress={() => setValue('alternateSaleUnit', u, { shouldValidate: true, shouldDirty: true })}
                      style={{ marginBottom: 4 }}
                    >
                      {u}
                    </Chip>
                  );
                })}
              </View>
              {errors.alternateSaleUnit ? (
                <Text variant="bodySmall" style={{ color: theme.colors.error, marginBottom: 8 }}>
                  {errors.alternateSaleUnit.message}
                </Text>
              ) : null}
              <Controller
                control={control}
                name="unitsPerStockUnit"
                render={({ field: { onChange, onBlur, value } }) => (
                  <AppInput
                    label={`${alternateSaleUnit || 'Units'} per ${selectedUnit} *`}
                    value={value}
                    onChangeText={(t) => onChange(sanitizeAmountInput(t))}
                    onBlur={onBlur}
                    keyboardType="decimal-pad"
                    placeholder="e.g. 50"
                    error={errors.unitsPerStockUnit?.message}
                  />
                )}
              />
              {alternatePricePreview != null ? (
                <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, marginBottom: 12 }}>
                  Sale price per {alternateSaleUnit}: {formatCurrency(alternatePricePreview)} (auto from bag price)
                </Text>
              ) : null}
            </>
          ) : null}
        </>
      ) : null}
      <Controller
        control={control}
        name="costPrice"
        render={({ field: { onChange, onBlur, value } }) => (
          <AppInput
            label="Cost Price (PKR) *"
            value={value}
            onChangeText={(t) => onChange(sanitizeAmountInput(t))}
            onBlur={onBlur}
            keyboardType="decimal-pad"
            error={errors.costPrice?.message}
          />
        )}
      />
      <Controller
        control={control}
        name="salePrice"
        render={({ field: { onChange, onBlur, value } }) => (
          <AppInput
            label="Sale Price (PKR) *"
            value={value}
            onChangeText={(t) => onChange(sanitizeAmountInput(t))}
            onBlur={onBlur}
            keyboardType="decimal-pad"
            error={errors.salePrice?.message}
          />
        )}
      />
      <Controller
        control={control}
        name="currentStock"
        render={({ field: { onChange, onBlur, value } }) => (
          <AppInput
            label="Current Stock *"
            value={value}
            onChangeText={(t) => onChange(sanitizeAmountInput(t))}
            onBlur={onBlur}
            keyboardType="decimal-pad"
            placeholder="0"
            error={errors.currentStock?.message}
          />
        )}
      />
      <Controller
        control={control}
        name="minStockAlert"
        render={({ field: { onChange, onBlur, value } }) => (
          <AppInput
            label={`Low Stock Alert *${stockHint}`}
            value={value}
            onChangeText={(t) => onChange(sanitizeAmountInput(t))}
            onBlur={onBlur}
            keyboardType="decimal-pad"
            placeholder="10"
            error={errors.minStockAlert?.message}
          />
        )}
      />
      <Controller
        control={control}
        name="expiryDate"
        render={({ field: { onChange, onBlur, value } }) => (
          <DatePickerField
            label="Expiry Date (optional)"
            value={value || ''}
            onChange={onChange}
            onBlur={onBlur}
            placeholder="Tap to pick expiry date"
            error={errors.expiryDate?.message}
            clearable
          />
        )}
      />
      <AppButton
        title={isEdit ? 'Update Product' : 'Add Product'}
        onPress={handleSubmit(onSubmit, () => setError('Please fix the errors above'))}
        loading={loading}
      />
      <ErrorMessage message={error} />
      {isEdit && isAdmin && (
        <AppButton title="Delete Product" variant="danger" onPress={() => setShowDelete(true)} style={{ marginTop: 8 }} />
      )}
      <ConfirmModal
        visible={showDelete}
        title="Delete Product"
        message="This cannot be undone. The product will be removed from stock."
        onConfirm={onDelete}
        onCancel={() => setShowDelete(false)}
        loading={loading}
      />
    </KeyboardFormView>
  );
}
