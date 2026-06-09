import React, { useState, useCallback, useEffect } from 'react';
import { View } from 'react-native';
import { SegmentedButtons, Text, useTheme } from 'react-native-paper';
import { useFocusEffect } from '@react-navigation/native';
import { getParty } from '../../api/parties.api';
import AppButton from '../../components/common/AppButton';
import ConfirmModal from '../../components/common/ConfirmModal';
import ErrorMessage from '../../components/common/ErrorMessage';
import { CustomerDetailSkeleton } from '../../components/common/Skeleton';
import CustomerDetailScreen from '../customers/CustomerDetailScreen';
import SupplierDetailScreen from '../suppliers/SupplierDetailScreen';
import { usePartiesStore } from '../../stores/partiesStore';
import { useCustomersStore } from '../../stores/customersStore';
import { useSuppliersStore } from '../../stores/suppliersStore';
import { getFriendlyErrorMessage } from '../../utils/apiErrors';
import { useTranslation } from '../../i18n/useTranslation';

export default function PartyDetailScreen({ route, navigation }) {
  const theme = useTheme();
  const { t, isRtl } = useTranslation();
  const textDir = { writingDirection: isRtl ? 'rtl' : 'ltr' };

  const partyId =
    route.params?.partyId || route.params?.customerId || route.params?.supplierId;
  const initialParty =
    route.params?.party || route.params?.customer || route.params?.supplier;
  const initialTab =
    route.params?.initialTab ||
    (route.params?.supplierId || initialParty?.partyType === 'SUPPLIER'
      ? 'supplier'
      : 'customer');

  const [party, setParty] = useState(initialParty);
  const [activeTab, setActiveTab] = useState(initialTab);
  const [loading, setLoading] = useState(!initialParty);
  const [error, setError] = useState(null);
  const [converting, setConverting] = useState(false);
  const [showConvertConfirm, setShowConvertConfirm] = useState(false);

  const upsertParty = usePartiesStore((s) => s.upsertParty);
  const convertPartyType = usePartiesStore((s) => s.convertPartyType);
  const patchCustomer = useCustomersStore((s) => s.patchCustomer);
  const upsertSupplier = useSuppliersStore((s) => s.upsertSupplier);
  const fetchCustomers = useCustomersStore((s) => s.fetchCustomers);
  const fetchSuppliers = useSuppliersStore((s) => s.fetchSuppliers);

  const loadParty = useCallback(async () => {
    if (!partyId || String(partyId).startsWith('local-')) {
      setParty(initialParty);
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      setError(null);
      const { data } = await getParty(partyId);
      const fresh = data.data;
      setParty(fresh);
      upsertParty(fresh);
      if (fresh.partyType === 'CUSTOMER') {
        patchCustomer(fresh);
      } else {
        upsertSupplier(fresh);
      }
    } catch (err) {
      setError(getFriendlyErrorMessage(err, t('partyDetail.loadFailed')));
    } finally {
      setLoading(false);
    }
  }, [partyId, initialParty, upsertParty, patchCustomer, upsertSupplier, t]);

  useFocusEffect(
    useCallback(() => {
      loadParty();
    }, [loadParty])
  );

  useEffect(() => {
    if (party?.name) {
      navigation.setOptions({ title: party.name });
    }
  }, [party?.name, navigation]);

  useEffect(() => {
    if (party?.partyType === 'CUSTOMER') setActiveTab('customer');
    else if (party?.partyType === 'SUPPLIER') setActiveTab('supplier');
  }, [party?.partyType]);

  const targetType = party?.partyType === 'CUSTOMER' ? 'SUPPLIER' : 'CUSTOMER';
  const convertLabel =
    party?.partyType === 'CUSTOMER'
      ? t('partyDetail.moveToSupplier')
      : t('partyDetail.moveToCustomer');

  const handleConvert = async () => {
    try {
      setConverting(true);
      setError(null);
      const updated = await convertPartyType(partyId, targetType);
      setParty(updated);
      setShowConvertConfirm(false);
      setActiveTab(targetType === 'CUSTOMER' ? 'customer' : 'supplier');
      await Promise.all([fetchCustomers(true), fetchSuppliers(true)]);
    } catch (err) {
      setError(getFriendlyErrorMessage(err, t('partyDetail.convertFailed')));
    } finally {
      setConverting(false);
    }
  };

  if (loading && !party) {
    return (
      <View style={{ flex: 1, backgroundColor: theme.colors.background, padding: 16 }}>
        <CustomerDetailSkeleton />
      </View>
    );
  }

  const nestedRoute = {
    params: {
      partyId,
      customerId: partyId,
      supplierId: partyId,
      customer: party,
      supplier: party,
      party,
      readOnly: false,
    },
  };

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <View style={{ paddingHorizontal: 16, paddingTop: 8, paddingBottom: 4 }}>
        <ErrorMessage message={error} />
        <SegmentedButtons
          value={activeTab}
          onValueChange={setActiveTab}
          buttons={[
            { value: 'customer', label: t('partyDetail.tabCustomer') },
            { value: 'supplier', label: t('partyDetail.tabSupplier') },
          ]}
          style={{ marginBottom: 8 }}
        />
        {!String(partyId).startsWith('local-') ? (
          <AppButton
            title={convertLabel}
            variant="outline"
            onPress={() => setShowConvertConfirm(true)}
            loading={converting}
            icon="swap-horizontal"
            style={{ marginBottom: 4 }}
          />
        ) : null}
      </View>

      <View style={{ flex: 1 }}>
        {activeTab === 'customer' ? (
          <CustomerDetailScreen route={nestedRoute} navigation={navigation} />
        ) : (
          <SupplierDetailScreen route={nestedRoute} navigation={navigation} />
        )}
      </View>

      <ConfirmModal
        visible={showConvertConfirm}
        title={convertLabel}
        message={t('partyDetail.convertConfirm')}
        onConfirm={handleConvert}
        onCancel={() => setShowConvertConfirm(false)}
        loading={converting}
      />
    </View>
  );
}
