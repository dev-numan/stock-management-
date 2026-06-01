import React, { useEffect, useState } from 'react';
import { View, Pressable } from 'react-native';
import { Text, useTheme } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import AppInput from '../common/AppInput';
import SupplierPickerModal from './SupplierPickerModal';
import { useSuppliersStore } from '../../stores/suppliersStore';
import { findSupplierByExactName } from '../../utils/supplierLedger';
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
  const fetchSuppliers = useSuppliersStore((s) => s.fetchSuppliers);
  const [pickerVisible, setPickerVisible] = useState(false);

  useEffect(() => {
    fetchSuppliers();
  }, [fetchSuppliers]);

  const showNewHint =
    !disabled &&
    value.trim().length > 0 &&
    !findSupplierByExactName(useSuppliersStore.getState().suppliers, value) &&
    !selectedSupplierId;

  const openPicker = () => {
    if (disabled) return;
    setPickerVisible(true);
  };

  const handleSelect = (supplier) => {
    if (supplier?.isNew) {
      onChangeText(supplier.name);
      onSelectSupplier(null);
      return;
    }
    onChangeText(supplier.name);
    onSelectSupplier(supplier);
  };

  return (
    <View style={{ marginBottom: 12 }}>
      <Pressable onPress={openPicker} disabled={disabled}>
        <View pointerEvents="none" style={{ position: 'relative' }}>
          <AppInput
            label={t('supplier.nameLabel')}
            value={value}
            editable={false}
            error={error}
          />
          {!disabled ? (
            <MaterialCommunityIcons
              name="chevron-down"
              size={24}
              color={theme.colors.onSurfaceVariant}
              style={{ position: 'absolute', right: 14, top: 20 }}
            />
          ) : null}
        </View>
      </Pressable>
      {!disabled ? (
        <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, marginTop: -8, marginBottom: 4, ...textDir }}>
          {t('supplier.tapToSelect')}
        </Text>
      ) : null}
      {showNewHint ? (
        <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, marginTop: 4, ...textDir }}>
          {t('supplier.newSupplierHint')}
        </Text>
      ) : null}

      <SupplierPickerModal
        visible={pickerVisible}
        onClose={() => setPickerVisible(false)}
        onSelect={handleSelect}
      />
    </View>
  );
}
