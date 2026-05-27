import React, { useEffect, useState } from 'react';
import { View } from 'react-native';
import { Text, Chip, useTheme } from 'react-native-paper';
import KeyboardFormView from '../../components/common/KeyboardFormView';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { getProduct } from '../../api/products.api';
import AppInput from '../../components/common/AppInput';
import DatePickerField from '../../components/common/DatePickerField';
import AppButton from '../../components/common/AppButton';
import ErrorMessage from '../../components/common/ErrorMessage';
import ConfirmModal from '../../components/common/ConfirmModal';
import { useAuth } from '../../context/AuthContext';
import { useProductsStore } from '../../stores/productsStore';
import {
  PRODUCT_CATEGORIES,
  PRODUCT_UNITS,
  productFormSchema,
  sanitizeAmountInput,
} from '../../utils/validation';

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
      costPrice: initialProduct ? String(Number(initialProduct.costPrice)) : '',
      salePrice: initialProduct ? String(Number(initialProduct.salePrice)) : '',
      currentStock: initialProduct ? String(Number(initialProduct.currentStock)) : '0',
      minStockAlert: initialProduct ? String(Number(initialProduct.minStockAlert)) : '10',
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
  const currentStock = watch('currentStock');
  useEffect(() => {
    trigger('minStockAlert');
  }, [currentStock, trigger]);

  const onSubmit = async (data) => {
    try {
      setLoading(true);
      setError(null);
      if (isEdit) {
        const updated = await saveProduct(productId, data);
        setProductId(updated.id);
      } else {
        await createProduct(data);
      }
      navigation.goBack();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save product');
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
      setError(err.response?.data?.message || 'Failed to delete');
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
