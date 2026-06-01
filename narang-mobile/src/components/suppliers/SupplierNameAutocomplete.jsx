import React, { useEffect, useMemo, useState } from 'react';
import { View, Pressable } from 'react-native';
import { Text, Card, useTheme } from 'react-native-paper';
import AppInput from '../common/AppInput';
import { useSuppliersStore } from '../../stores/suppliersStore';
import { filterSuppliersByName, findSupplierByExactName } from '../../utils/supplierLedger';
import { useTranslation } from '../../i18n/useTranslation';

export default function SupplierNameAutocomplete({
  value,
  onChangeText,
  onSelectSupplier,
  selectedSupplierId,
  disabled = false,
  error,
}) {
  const theme = useTheme();
  const { t, isRtl } = useTranslation();
  const textDir = { writingDirection: isRtl ? 'rtl' : 'ltr' };
  const suppliers = useSuppliersStore((s) => s.suppliers);
  const fetchSuppliers = useSuppliersStore((s) => s.fetchSuppliers);
  const [focused, setFocused] = useState(false);

  useEffect(() => {
    fetchSuppliers();
  }, [fetchSuppliers]);

  const suggestions = useMemo(
    () => (focused && !disabled ? filterSuppliersByName(suppliers, value) : []),
    [focused, disabled, suppliers, value]
  );

  const showNewHint =
    !disabled &&
    value.trim().length > 0 &&
    !findSupplierByExactName(suppliers, value) &&
    !selectedSupplierId;

  const handlePick = (supplier) => {
    onChangeText(supplier.name);
    onSelectSupplier(supplier);
    setFocused(false);
  };

  const handleChange = (text) => {
    onChangeText(text);
    const exact = findSupplierByExactName(suppliers, text);
    onSelectSupplier(exact);
  };

  return (
    <View style={{ marginBottom: 12, zIndex: 10 }}>
      <AppInput
        label={t('supplier.nameLabel')}
        value={value}
        onChangeText={handleChange}
        onFocus={() => setFocused(true)}
        onBlur={() => setTimeout(() => setFocused(false), 200)}
        editable={!disabled}
        error={error}
      />
      {showNewHint ? (
        <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, marginTop: 4, ...textDir }}>
          {t('supplier.newSupplierHint')}
        </Text>
      ) : null}
      {suggestions.length > 0 ? (
        <Card
          mode="elevated"
          style={{
            marginTop: 4,
            borderRadius: theme.roundness,
            maxHeight: 200,
            overflow: 'hidden',
          }}
        >
          {suggestions.map((s) => (
            <Pressable
              key={s.id}
              onPress={() => handlePick(s)}
              style={({ pressed }) => ({
                paddingVertical: 12,
                paddingHorizontal: 16,
                backgroundColor: pressed ? theme.colors.surfaceVariant : theme.colors.surface,
                borderBottomWidth: 1,
                borderBottomColor: theme.colors.outlineVariant,
              })}
            >
              <Text variant="bodyLarge" style={{ fontWeight: '600' }}>
                {s.name}
              </Text>
              {s.phone ? (
                <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, marginTop: 2 }}>
                  {s.phone}
                </Text>
              ) : null}
            </Pressable>
          ))}
        </Card>
      ) : null}
    </View>
  );
}
