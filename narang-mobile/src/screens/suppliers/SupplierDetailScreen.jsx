import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  ScrollView,
  RefreshControl,
  Linking,
  Alert,
  Platform,
  Keyboard,
} from 'react-native';
import { Text, Card, Searchbar, useTheme } from 'react-native-paper';
import { useFocusEffect } from '@react-navigation/native';
import { getSupplier, getSupplierLedger, addSupplierPayment } from '../../api/suppliers.api';
import { formatCurrency } from '../../utils/formatCurrency';
import { formatPhoneDisplay } from '../../utils/phone';
import AppButton from '../../components/common/AppButton';
import ErrorMessage from '../../components/common/ErrorMessage';
import EmptyState from '../../components/common/EmptyState';
import { CustomerDetailSkeleton, SkeletonCard, SkeletonLine } from '../../components/common/Skeleton';
import SupplierLedgerEntryRow from '../../components/suppliers/SupplierLedgerEntryRow';
import AddSupplierPaymentModal from '../../components/suppliers/AddSupplierPaymentModal';
import { getFriendlyErrorMessage } from '../../utils/apiErrors';
import { useTranslation } from '../../i18n/useTranslation';

export default function SupplierDetailScreen({ route, navigation }) {
  const theme = useTheme();
  const { supplierId, supplier: initialSupplier } = route.params;
  const { t, isRtl } = useTranslation();
  const textDir = { writingDirection: isRtl ? 'rtl' : 'ltr' };

  const [supplier, setSupplier] = useState(initialSupplier);
  const [allLedger, setAllLedger] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [paymentVisible, setPaymentVisible] = useState(false);
  const [paymentSaving, setPaymentSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const [supplierRes, ledgerRes] = await Promise.all([
        getSupplier(supplierId),
        getSupplierLedger(supplierId),
      ]);
      setSupplier(supplierRes.data.data);
      setAllLedger(ledgerRes.data.data || []);
    } catch (err) {
      setError(getFriendlyErrorMessage(err, t('supplier.loadFailed')));
    } finally {
      setLoading(false);
    }
  }, [supplierId, t]);

  const ledger = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return allLedger;
    return allLedger.filter(
      (e) =>
        (e.notes && e.notes.toLowerCase().includes(q)) ||
        String(e.amount).includes(q)
    );
  }, [allLedger, search]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const payableBalance = Number(supplier?.payableBalance ?? 0);

  const handlePayment = async ({ amount, notes }) => {
    try {
      setPaymentSaving(true);
      setError(null);
      await addSupplierPayment(supplierId, { amount, notes });
      setPaymentVisible(false);
      await load();
    } catch (err) {
      setError(getFriendlyErrorMessage(err, t('supplier.paymentFailed')));
    } finally {
      setPaymentSaving(false);
    }
  };

  const handleSms = () => {
    if (!supplier?.phone?.trim()) {
      Alert.alert(t('reminder.noPhoneTitle'), t('reminder.noPhoneMessage'));
      return;
    }
    const phone = supplier.phone.replace(/\D/g, '');
    const body = encodeURIComponent(
      `${supplier.name}: ${t('supplier.balance')} ${formatCurrency(payableBalance)} (${t('supplier.youWillGive')})`
    );
    Linking.openURL(`sms:${phone}?body=${body}`).catch(() => {
      Alert.alert(t('reminder.smsUnavailableTitle'), t('reminder.smsUnavailableMessage'));
    });
  };

  const handleReport = () => {
    Alert.alert(t('supplier.report'), t('supplier.reportSoon'));
  };

  if (loading && !supplier) {
    return (
      <ScrollView style={{ flex: 1, backgroundColor: theme.colors.background }} contentContainerStyle={{ padding: 16 }}>
        <CustomerDetailSkeleton />
      </ScrollView>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={load} />}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
        onScrollBeginDrag={Keyboard.dismiss}
      >
        <ErrorMessage message={error} />

        <Card
          mode="elevated"
          style={{
            marginBottom: 12,
            borderRadius: theme.roundness,
            backgroundColor: theme.colors.primaryContainer,
          }}
        >
          <Card.Content style={{ alignItems: 'center', paddingVertical: 16 }}>
            <Text variant="titleMedium" style={{ fontWeight: '700', color: theme.colors.primary, ...textDir }}>
              {t('supplier.balance')}
            </Text>
            <Text
              variant="headlineLarge"
              style={{ fontWeight: '800', color: theme.colors.primary, marginTop: 4 }}
            >
              {formatCurrency(payableBalance)}
            </Text>
            <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant, marginTop: 4, ...textDir }}>
              {t('supplier.youWillGive')}
            </Text>
          </Card.Content>
        </Card>

        <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12 }}>
          <View style={{ flex: 1 }}>
            <AppButton title={t('supplier.sms')} variant="outline" onPress={handleSms} icon="message-text" />
          </View>
          <View style={{ flex: 1 }}>
            <AppButton
              title={t('customer.whatsapp')}
              variant="outline"
              onPress={handleSms}
              icon="whatsapp"
            />
          </View>
          <View style={{ flex: 1 }}>
            <AppButton title={t('supplier.report')} variant="outline" onPress={handleReport} icon="file-download" />
          </View>
        </View>

        <Searchbar
          placeholder={t('supplier.searchPlaceholder')}
          value={search}
          onChangeText={setSearch}
          style={{ marginBottom: 8, backgroundColor: theme.colors.surface }}
        />

        <Card mode="elevated" style={{ borderRadius: theme.roundness }}>
          <View
            style={{
              flexDirection: 'row',
              paddingVertical: 10,
              paddingHorizontal: 8,
              backgroundColor: theme.colors.surfaceVariant,
              borderTopLeftRadius: theme.roundness,
              borderTopRightRadius: theme.roundness,
            }}
          >
            <Text style={{ width: 72, textAlign: 'center', fontWeight: '700', fontSize: 12, ...textDir }}>
              {t('supplier.col.payment')}
            </Text>
            <Text style={{ width: 72, textAlign: 'center', fontWeight: '700', fontSize: 12, ...textDir }}>
              {t('supplier.col.purchase')}
            </Text>
            <Text style={{ flex: 1, textAlign: isRtl ? 'right' : 'left', fontWeight: '700', fontSize: 12, paddingLeft: 8, ...textDir }}>
              {t('supplier.col.entries')}
            </Text>
          </View>
          {loading && ledger.length === 0 ? (
            <View style={{ padding: 16 }}>
              <SkeletonCard>
                <SkeletonLine width="100%" />
                <SkeletonLine width="80%" style={{ marginTop: 8 }} />
              </SkeletonCard>
            </View>
          ) : ledger.length === 0 ? (
            <EmptyState message={t('supplier.ledgerEmpty')} />
          ) : (
            ledger.map((entry) => <SupplierLedgerEntryRow key={`${entry.type}-${entry.id}`} entry={entry} />)
          )}
        </Card>
      </ScrollView>

      <View
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 0,
          flexDirection: 'row',
          gap: 8,
          padding: 12,
          paddingBottom: Platform.OS === 'ios' ? 24 : 12,
          backgroundColor: theme.colors.surface,
          borderTopWidth: 1,
          borderTopColor: theme.colors.outlineVariant,
        }}
      >
        <View style={{ flex: 1 }}>
          <AppButton
            title={t('supplier.paymentRs')}
            onPress={() => setPaymentVisible(true)}
            buttonColor={theme.colors.error}
            icon="cash-minus"
          />
        </View>
        <View style={{ flex: 1 }}>
          <AppButton
            title={t('supplier.purchaseRs')}
            onPress={() => navigation.navigate('AddPurchase', { supplierId, supplier })}
            buttonColor={theme.colors.primary}
            icon="cart-plus"
          />
        </View>
      </View>

      <AddSupplierPaymentModal
        visible={paymentVisible}
        supplierName={supplier?.name}
        onSubmit={handlePayment}
        onClose={() => setPaymentVisible(false)}
        loading={paymentSaving}
      />
    </View>
  );
}
