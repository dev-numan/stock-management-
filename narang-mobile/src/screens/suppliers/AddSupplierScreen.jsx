import React, { useState, useEffect } from 'react';
import { Alert } from 'react-native';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import AppInput from '../../components/common/AppInput';
import AppButton from '../../components/common/AppButton';
import ErrorMessage from '../../components/common/ErrorMessage';
import { getFriendlyErrorMessage } from '../../utils/apiErrors';
import KeyboardFormView from '../../components/common/KeyboardFormView';
import SupplierPickerModal from '../../components/suppliers/SupplierPickerModal';
import { contactToCustomerPayload } from '../../services/customerContactService';
import { supplierSchema } from '../../utils/validation';
import { useSuppliersStore } from '../../stores/suppliersStore';
import { usePartiesStore } from '../../stores/partiesStore';
import {
  findPartyByPhoneEverywhere,
  phoneDuplicateMessage,
  isDuplicatePhoneError,
} from '../../utils/partyDuplicatePhone';
import { useTranslation } from '../../i18n/useTranslation';

export default function AddSupplierScreen({ navigation, route }) {
  const { t } = useTranslation();
  const createSupplier = useSuppliersStore((s) => s.createSupplier);
  const fetchParties = usePartiesStore((s) => s.fetchParties);
  const [saving, setSaving] = useState(false);
  const [apiError, setApiError] = useState(null);
  const [pickerVisible, setPickerVisible] = useState(false);

  const { control, handleSubmit, setValue, setError, clearErrors, formState: { errors } } = useForm({
    resolver: zodResolver(supplierSchema),
    mode: 'onChange',
    defaultValues: { name: '', phone: '', address: '' },
  });

  const handlePickerSelect = (selection) => {
    if (selection?.id && !selection.type) {
      navigation.replace('PartyDetail', {
        partyId: selection.id,
        party: selection,
        initialTab: selection.partyType === 'CUSTOMER' ? 'customer' : 'supplier',
      });
      return;
    }

    if (selection.type === 'app') {
      const party = selection.party;
      navigation.replace('PartyDetail', {
        partyId: party.id,
        party,
        initialTab: party.partyType === 'CUSTOMER' ? 'customer' : 'supplier',
      });
      return;
    }

    if (selection.type === 'contact') {
      const { name, phone, address } = contactToCustomerPayload(selection.contact);
      if (name) setValue('name', name, { shouldValidate: true });
      if (phone) setValue('phone', phone, { shouldValidate: true });
      if (address) setValue('address', address, { shouldValidate: true });
      return;
    }

    if (selection.type === 'new' && selection.name) {
      setValue('name', selection.name.trim(), { shouldValidate: true });
    }
  };

  useEffect(() => {
    const prefill = route.params?.prefill;
    if (!prefill) return;
    if (prefill.name) setValue('name', prefill.name, { shouldValidate: true });
    if (prefill.phone) setValue('phone', prefill.phone, { shouldValidate: true });
    if (prefill.address) setValue('address', prefill.address, { shouldValidate: true });
  }, [route.params?.prefill, setValue]);

  const showDuplicatePhoneError = (existing, serverMessage) => {
    const message = serverMessage || phoneDuplicateMessage(t, existing);
    setError('phone', { type: 'manual', message });
    setApiError(message);
    Alert.alert(t('party.duplicatePhoneTitle'), message);
  };

  const onSubmit = async (formData) => {
    try {
      setSaving(true);
      setApiError(null);
      clearErrors('phone');

      const phone = formData.phone?.trim();
      if (phone) {
        await fetchParties(true);
        const duplicate = findPartyByPhoneEverywhere(phone);
        if (duplicate) {
          showDuplicatePhoneError(duplicate);
          return;
        }
      }

      const created = await createSupplier({
        name: formData.name,
        phone: phone || undefined,
        address: formData.address || undefined,
      });
      navigation.replace('PartyDetail', {
        partyId: created.id,
        party: created,
        initialTab: 'supplier',
      });
    } catch (err) {
      const friendly = getFriendlyErrorMessage(err, t('supplier.addFailed'));
      if (isDuplicatePhoneError(friendly)) {
        showDuplicatePhoneError(null, friendly);
      } else {
        setApiError(friendly);
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <KeyboardFormView insideTab>
        <AppButton
          title={t('supplier.selectTitle')}
          variant="outline"
          icon="contacts"
          onPress={() => setPickerVisible(true)}
          style={{ marginBottom: 12 }}
        />
        <Controller
          control={control}
          name="name"
          render={({ field: { onChange, onBlur, value } }) => (
            <AppInput label={t('supplier.name')} value={value} onChangeText={onChange} onBlur={onBlur} error={errors.name?.message} />
          )}
        />
        <Controller
          control={control}
          name="phone"
          render={({ field: { onChange, onBlur, value } }) => (
            <AppInput
              label={t('common.phone')}
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
              keyboardType="phone-pad"
              error={errors.phone?.message}
            />
          )}
        />
        <Controller
          control={control}
          name="address"
          render={({ field: { onChange, onBlur, value } }) => (
            <AppInput label={t('common.address')} value={value} onChangeText={onChange} onBlur={onBlur} error={errors.address?.message} />
          )}
        />
        <ErrorMessage message={apiError} />
        <AppButton
          title={t('supplier.add')}
          onPress={handleSubmit(onSubmit, () => setApiError(t('common.fixErrors')))}
          loading={saving}
        />
      </KeyboardFormView>
      <SupplierPickerModal
        visible={pickerVisible}
        onClose={() => setPickerVisible(false)}
        onSelect={handlePickerSelect}
        fillFormOnly
      />
    </>
  );
}
