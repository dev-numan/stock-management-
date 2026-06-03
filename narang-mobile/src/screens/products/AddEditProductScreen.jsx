import React, { useEffect, useMemo, useState } from 'react';
import { View } from 'react-native';
import { Text, Chip, Switch, Card, useTheme } from 'react-native-paper';
import KeyboardFormView from '../../components/common/KeyboardFormView';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { getProduct, getProductDeletionBlockers } from '../../api/products.api';
import AddStockModal from '../../components/products/AddStockModal';
import SupplierNameAutocomplete from '../../components/suppliers/SupplierNameAutocomplete';
import { useSuppliersStore } from '../../stores/suppliersStore';
import { findSupplierByExactName } from '../../utils/supplierLedger';
import AppInput from '../../components/common/AppInput';
import DatePickerField from '../../components/common/DatePickerField';
import AppButton from '../../components/common/AppButton';
import ErrorMessage from '../../components/common/ErrorMessage';
import { getFriendlyErrorMessage } from '../../utils/apiErrors';
import ConfirmModal from '../../components/common/ConfirmModal';
import ProductDeletionBlockedModal from '../../components/products/ProductDeletionBlockedModal';
import { useAuth } from '../../context/AuthContext';
import { useProductsStore } from '../../stores/productsStore';
import {
  PRODUCT_CATEGORIES,
  PRODUCT_UNITS,
  buildProductFormSchema,
  productFormToPayload,
  sanitizeAmountInput,
} from '../../utils/validation';
import { getAllowedAlternateUnits, getUnitPrice } from '../../utils/productUnits';
import { formatCurrency } from '../../utils/formatCurrency';
import { useTranslation } from '../../i18n/useTranslation';

const categoryKey = (cat) => {
  const slug = String(cat).toLowerCase().replace(/\s+/g, '');
  const map = {
    fertilizers: 'product.category.fertilizers',
    pesticides: 'product.category.pesticides',
    seeds: 'product.category.seeds',
    other: 'product.category.other',
  };
  return map[slug] || null;
};

export default function AddEditProductScreen({ route, navigation }) {
  const theme = useTheme();
  const { t } = useTranslation();
  const initialProduct = route.params?.product;
  const readOnly = Boolean(route.params?.readOnly);
  const [productId, setProductId] = useState(initialProduct?.id ?? null);
  const isEdit = Boolean(productId);
  const { isAdmin } = useAuth();
  const canEdit = isAdmin && !readOnly;
  const fetchSuppliers = useSuppliersStore((s) => s.fetchSuppliers);
  const suppliers = useSuppliersStore((s) => s.suppliers);
  const saveProduct = useProductsStore((s) => s.saveProduct);
  const createProduct = useProductsStore((s) => s.createProduct);
  const addProductStock = useProductsStore((s) => s.addProductStock);
  const deleteProduct = useProductsStore((s) => s.deleteProduct);
  const [productLoading, setProductLoading] = useState(Boolean(initialProduct?.id));
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [showDeleteBlocked, setShowDeleteBlocked] = useState(false);
  const [deleteChecking, setDeleteChecking] = useState(false);
  const [deleteBlockers, setDeleteBlockers] = useState({ sales: [], purchases: [] });
  const [displayStock, setDisplayStock] = useState(
    initialProduct ? Number(initialProduct.currentStock ?? 0) : 0
  );
  const [supplierName, setSupplierName] = useState(initialProduct?.supplier?.name || '');
  const [selectedSupplier, setSelectedSupplier] = useState(initialProduct?.supplier || null);
  const [initialQty, setInitialQty] = useState('');
  const [addStockVisible, setAddStockVisible] = useState(false);
  const [addStockLoading, setAddStockLoading] = useState(false);
  const [loadedSupplier, setLoadedSupplier] = useState(initialProduct?.supplier || null);

  const formSchema = useMemo(() => buildProductFormSchema(displayStock), [displayStock]);

  const {
    control,
    handleSubmit,
    setValue,
    watch,
    trigger,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(formSchema),
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
      minStockAlert: initialProduct ? String(Number(initialProduct.minStockAlert)) : '',
      expiryDate: initialProduct?.expiryDate
        ? new Date(initialProduct.expiryDate).toISOString().slice(0, 10)
        : '',
    },
  });

  useEffect(() => {
    fetchSuppliers();
  }, [fetchSuppliers]);

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
        setDisplayStock(Number(p.currentStock));
        setValue('minStockAlert', String(Number(p.minStockAlert)));
        setValue('expiryDate', p.expiryDate ? new Date(p.expiryDate).toISOString().slice(0, 10) : '');
        setLoadedSupplier(p.supplier || null);
        setSupplierName(p.supplier?.name || '');
        setSelectedSupplier(p.supplier || null);
      })
      .catch(() => {
        if (!cancelled) setError(t('product.loadFailed'));
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
  }, [displayStock, trigger]);

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

      if (!isEdit) {
        const trimmedSupplier = supplierName.trim();
        const match = selectedSupplier || findSupplierByExactName(suppliers, trimmedSupplier);
        const qty = Number(String(initialQty).trim());
        const created = await createProduct(payload);
        if (qty > 0) {
          await addProductStock(created.id, {
            quantity: qty,
            costPrice: data.costPrice,
            salePrice: data.salePrice,
            supplierId: match?.id,
            supplierName: match ? undefined : trimmedSupplier || undefined,
          });
        }
          if (qty > 0 && (match || trimmedSupplier)) {
          await fetchSuppliers(true);
        }
      } else {
        const updated = await saveProduct(productId, payload);
        setProductId(updated.id);
      }
      navigation.goBack();
    } catch (err) {
      setError(getFriendlyErrorMessage(err, t('product.saveFailed')));
    } finally {
      setLoading(false);
    }
  };

  const handleAddStock = async ({ quantity, costPrice, salePrice, supplierId, supplierName: name }) => {
    if (!productId) return;
    const usedSupplier = Boolean(supplierId || name?.trim());
    try {
      setAddStockLoading(true);
      setError(null);
      const updated = await addProductStock(productId, {
        quantity,
        costPrice,
        salePrice,
        supplierId,
        supplierName: name,
      });
      if (updated) {
        setDisplayStock(Number(updated.currentStock));
        setValue('costPrice', String(Number(updated.costPrice)));
        setValue('salePrice', String(Number(updated.salePrice)));
        setLoadedSupplier(updated.supplier || null);
        setSupplierName(updated.supplier?.name || '');
        setSelectedSupplier(updated.supplier || null);
      }
      if (usedSupplier) {
        await fetchSuppliers(true);
      }
      setAddStockVisible(false);
    } catch (err) {
      setError(getFriendlyErrorMessage(err, t('product.addStockFailed')));
    } finally {
      setAddStockLoading(false);
    }
  };

  const onDelete = async () => {
    if (!productId) {
      setError(t('product.missingId'));
      setShowDelete(false);
      return;
    }
    try {
      setLoading(true);
      setError(null);
      await deleteProduct(productId);
      navigation.goBack();
    } catch (err) {
      const blockerData = err?.response?.data?.data;
      if (err?.response?.status === 409 && blockerData?.sales) {
        setDeleteBlockers({
          sales: blockerData.sales || [],
          purchases: blockerData.purchases || [],
        });
        setShowDelete(false);
        setShowDeleteBlocked(true);
        return;
      }
      setError(getFriendlyErrorMessage(err, t('product.deleteFailed')));
    } finally {
      setLoading(false);
      setShowDelete(false);
    }
  };

  const handleDeletePress = async () => {
    if (!productId) return;
    try {
      setDeleteChecking(true);
      setError(null);
      const { data } = await getProductDeletionBlockers(productId);
      const blockers = data.data;
      if (!blockers?.canDelete) {
        setDeleteBlockers({
          sales: blockers?.sales || [],
          purchases: blockers?.purchases || [],
        });
        setShowDeleteBlocked(true);
        return;
      }
      setShowDelete(true);
    } catch (err) {
      setError(getFriendlyErrorMessage(err, t('product.deleteFailed')));
    } finally {
      setDeleteChecking(false);
    }
  };

  const openBlockedSale = (sale) => {
    setShowDeleteBlocked(false);
    navigation.navigate('History', {
      screen: 'Invoice',
      params: { saleId: sale.id, sale },
    });
  };

  const stockHint =
    displayStock > 0 ? ` (max ${displayStock} based on current stock)` : '';

  if (productLoading) {
    return (
      <KeyboardFormView insideTab>
        <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant, textAlign: 'center', paddingVertical: 32 }}>
          {t('product.loading')}
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
          <AppInput label={t('product.nameLabel')} value={value} onChangeText={onChange} onBlur={onBlur} error={errors.name?.message} />
        )}
      />
      <Text variant="labelLarge" style={{ marginBottom: 8 }}>{t('product.categoryLabel')}</Text>
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
      <Text variant="labelLarge" style={{ marginBottom: 8 }}>{t('product.unitLabel')}</Text>
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
            <Text variant="labelLarge">{t('product.alternateUnitToggle')}</Text>
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
            label={t('product.costPrice')}
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
            label={t('product.salePrice')}
            value={value}
            onChangeText={(t) => onChange(sanitizeAmountInput(t))}
            onBlur={onBlur}
            keyboardType="decimal-pad"
            error={errors.salePrice?.message}
          />
        )}
      />
      {isEdit ? (
        <Card mode="elevated" style={{ marginBottom: 12, borderRadius: theme.roundness }}>
          <Card.Content>
            <Text variant="labelMedium" style={{ color: theme.colors.onSurfaceVariant }}>
              {t('product.currentStock')}
            </Text>
            <Text variant="headlineSmall" style={{ fontWeight: '700', marginTop: 4 }}>
              {displayStock} {selectedUnit}
            </Text>
            {loadedSupplier?.name ? (
              <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, marginTop: 6 }}>
                {t('supplier.selectSupplier')}: {loadedSupplier.name}
              </Text>
            ) : null}
            {canEdit ? (
              <AppButton
                title={t('product.addStock')}
                onPress={() => setAddStockVisible(true)}
                style={{ marginTop: 12 }}
                icon="package-variant-plus"
              />
            ) : null}
          </Card.Content>
        </Card>
      ) : (
        <>
          <SupplierNameAutocomplete
            value={supplierName}
            onChangeText={setSupplierName}
            onSelectSupplier={setSelectedSupplier}
            selectedSupplierId={selectedSupplier?.id}
            disabled={!canEdit}
            optional
          />
          <AppInput
            label={t('product.initialStockOptional')}
            value={initialQty}
            onChangeText={(v) => setInitialQty(sanitizeAmountInput(v))}
            keyboardType="decimal-pad"
            placeholder="0"
          />
          <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, marginBottom: 12 }}>
            {t('product.noSupplierStockHint')}
          </Text>
        </>
      )}
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
            label={t('product.expiryLabel')}
            value={value || ''}
            onChange={onChange}
            onBlur={onBlur}
            placeholder={t('product.expiryPlaceholder')}
            error={errors.expiryDate?.message}
            clearable
          />
        )}
      />
      {canEdit ? (
        <AppButton
          title={isEdit ? t('product.update') : t('product.add')}
          onPress={handleSubmit(onSubmit, () => setError(t('common.fixErrors')))}
          loading={loading}
        />
      ) : null}
      <ErrorMessage message={error} />
      {isEdit && canEdit && (
        <AppButton
          title={t('product.delete')}
          variant="danger"
          onPress={handleDeletePress}
          loading={deleteChecking}
          style={{ marginTop: 8 }}
        />
      )}
      <ProductDeletionBlockedModal
        visible={showDeleteBlocked}
        productName={watch('name')}
        sales={deleteBlockers.sales}
        purchases={deleteBlockers.purchases}
        onClose={() => setShowDeleteBlocked(false)}
        onOpenSale={openBlockedSale}
      />
      <ConfirmModal
        visible={showDelete}
        title={t('product.deleteConfirmTitle')}
        message={t('product.deleteConfirmMessage')}
        onConfirm={onDelete}
        onCancel={() => setShowDelete(false)}
        loading={loading}
      />
      <AddStockModal
        visible={addStockVisible}
        productName={watch('name')}
        defaultSupplierName={loadedSupplier?.name || supplierName}
        defaultSupplierId={loadedSupplier?.id || selectedSupplier?.id}
        defaultCostPrice={watch('costPrice')}
        defaultSalePrice={watch('salePrice')}
        onSubmit={handleAddStock}
        onClose={() => setAddStockVisible(false)}
        loading={addStockLoading}
      />
    </KeyboardFormView>
  );
}
