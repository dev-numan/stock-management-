import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { View, ScrollView, RefreshControl, Keyboard, Platform, Alert } from 'react-native';
import ViewShot from 'react-native-view-shot';
import { Text, Card, useTheme } from 'react-native-paper';
import { useFocusEffect } from '@react-navigation/native';
import {
  getCustomer,
  getCustomerAdvanceEntries,
  getCustomerDeletionBlockers,
} from '../../api/customers.api';
import { getSales } from '../../api/sales.api';
import { formatCurrency } from '../../utils/formatCurrency';
import { formatDate, getPeriodQueryParams, getPeriodLabel, isDateInPeriod } from '../../utils/formatDate';
import PeriodFilter from '../../components/common/PeriodFilter';
import { formatPhoneDisplay } from '../../utils/phone';
import AppCard from '../../components/common/AppCard';
import SaleListItem from '../../components/sales/SaleListItem';
import { CustomerDetailSkeleton, SaleListSkeleton, SkeletonCard, SkeletonLine } from '../../components/common/Skeleton';
import EmptyState from '../../components/common/EmptyState';
import ErrorMessage from '../../components/common/ErrorMessage';
import { getFriendlyErrorMessage } from '../../utils/apiErrors';
import AppButton from '../../components/common/AppButton';
import AddCustomerLedgerModal from '../../components/customers/AddCustomerLedgerModal';
import CustomerAccountEntryRow from '../../components/customers/CustomerAccountEntryRow';
import CustomerDeletionBlockedModal from '../../components/customers/CustomerDeletionBlockedModal';
import ConfirmModal from '../../components/common/ConfirmModal';
import { buildCustomerAccountHistory } from '../../utils/customerAccountHistory';
import { useAuth } from '../../context/AuthContext';
import PaymentReminderCard from '../../components/customers/PaymentReminderCard';
import EditCustomerPhoneModal from '../../components/customers/EditCustomerPhoneModal';
import PartyNetBalanceCard from '../../components/parties/PartyNetBalanceCard';
import { APP_NAME_URDU } from '../../constants/branding';
import {
  sendPaymentReminderSms,
  sharePaymentReminderWhatsApp,
  getPaymentReminderShopSettings,
} from '../../utils/sharePaymentReminder';
import { useSalesStore } from '../../stores/salesStore';
import { useCustomersStore } from '../../stores/customersStore';
import { getIsOnline } from '../../stores/networkStore';
import { getEffectiveAdvanceBalance } from '../../utils/customerBalance';
import { sumMoney } from '../../utils/money';
import { useTranslation } from '../../i18n/useTranslation';
import { exportCustomerLedgerPdf } from '../../utils/generateDetailPDF';

const now = new Date();

function SummarySkeleton() {
  return (
    <SkeletonCard>
      <SkeletonLine width="40%" height={18} style={{ marginBottom: 12 }} />
      <SkeletonLine width="70%" height={14} style={{ marginBottom: 8 }} />
      <SkeletonLine width="60%" height={14} style={{ marginBottom: 8 }} />
      <SkeletonLine width="75%" height={14} />
    </SkeletonCard>
  );
}

export default function CustomerDetailScreen({ route, navigation }) {
  const theme = useTheme();
  const { customerId, customer: initialCustomer, readOnly = false } = route.params;
  const [customer, setCustomer] = useState(initialCustomer);
  const [sales, setSales] = useState([]);
  const [advanceEntries, setAdvanceEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [advanceModalVisible, setAdvanceModalVisible] = useState(false);
  const [creditModalVisible, setCreditModalVisible] = useState(false);
  const [advanceSaving, setAdvanceSaving] = useState(false);
  const [mode, setMode] = useState('all');
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [day, setDay] = useState(now.getDate());
  const [shopSettings, setShopSettings] = useState(null);
  const [reminderLoading, setReminderLoading] = useState(null);
  const reminderCaptureRef = useRef(null);
  const { t, isRtl } = useTranslation();
  const { isAdmin } = useAuth();
  const patchCustomer = useCustomersStore((s) => s.patchCustomer);
  const updateCustomer = useCustomersStore((s) => s.updateCustomer);
  const deleteCustomer = useCustomersStore((s) => s.deleteCustomer);
  const addAdvance = useCustomersStore((s) => s.addAdvance);
  const addCreditCharge = useCustomersStore((s) => s.addCreditCharge);
  const deleteAdvanceEntry = useCustomersStore((s) => s.deleteAdvanceEntry);
  const textDir = { writingDirection: isRtl ? 'rtl' : 'ltr' };
  const [deletePaymentTarget, setDeletePaymentTarget] = useState(null);
  const [deletingPayment, setDeletingPayment] = useState(false);
  const [showDeleteCustomer, setShowDeleteCustomer] = useState(false);
  const [showDeleteCustomerBlocked, setShowDeleteCustomerBlocked] = useState(false);
  const [deleteCustomerBlockers, setDeleteCustomerBlockers] = useState({ sales: [] });
  const [deleteCustomerChecking, setDeleteCustomerChecking] = useState(false);
  const [deletingCustomer, setDeletingCustomer] = useState(false);
  const [phoneModalVisible, setPhoneModalVisible] = useState(false);
  const [phoneSaving, setPhoneSaving] = useState(false);
  const [exportingPdf, setExportingPdf] = useState(false);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      let detail = initialCustomer;
      const isLocal = String(customerId).startsWith('local-');

      if (!isLocal && getIsOnline()) {
        const { data } = await getCustomer(customerId);
        detail = data.data;
        setCustomer(detail);
        // Keep the customers list balance in sync with the fresh detail.
        patchCustomer(detail);
      } else {
        setCustomer(detail);
      }

      let apiSales = [];
      let entries = [];
      const periodParams = getPeriodQueryParams(mode, year, month, day);

      if (!isLocal && getIsOnline()) {
        const [salesRes, advanceRes] = await Promise.all([
          getSales({ customerId, ...periodParams }),
          getCustomerAdvanceEntries(customerId),
        ]);
        apiSales = salesRes.data.data || [];
        entries = advanceRes.data.data || [];
      }
      setAdvanceEntries(entries);

      const merged = useSalesStore
        .getState()
        .mergePendingForCustomer(apiSales, customerId)
        .filter((s) => isDateInPeriod(s.createdAt, mode, year, month, day));
      setSales(merged);
    } catch (err) {
      setError(getFriendlyErrorMessage(err, t('customer.loadFailed')));
    } finally {
      setLoading(false);
    }
  }, [customerId, initialCustomer, mode, year, month, day, patchCustomer]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const totalSpent = sumMoney(sales.map((s) => s.totalAmount));
  const creditSales = sales.filter((s) => s.paymentMethod === 'CREDIT');
  const creditTotal = sumMoney(creditSales.map((s) => s.totalAmount));
  const advanceBalance = customer ? getEffectiveAdvanceBalance(customer) : 0;
  const accountHistory = useMemo(
    () => buildCustomerAccountHistory(advanceEntries),
    [advanceEntries]
  );
  const isLocalCustomer = String(customerId).startsWith('local-');
  const canSendMessages = !isLocalCustomer && Boolean(customer?.phone?.trim());

  useEffect(() => {
    if (canSendMessages) {
      getPaymentReminderShopSettings()
        .then(setShopSettings)
        .catch(() => setShopSettings(null));
    }
  }, [canSendMessages]);

  const handleSavePhone = async (phone) => {
    if (!customer?.id) return;
    try {
      setPhoneSaving(true);
      setError(null);
      const updated = await updateCustomer(customer.id, {
        name: customer.name,
        address: customer.address?.trim() || null,
        phone,
      });
      setCustomer(updated);
      patchCustomer(updated);
      setPhoneModalVisible(false);
    } catch (err) {
      setError(getFriendlyErrorMessage(err, t('customer.phoneSaveFailed')));
    } finally {
      setPhoneSaving(false);
    }
  };

  const handleSendReminderSms = async () => {
    try {
      setReminderLoading('sms');
      setError(null);
      await sendPaymentReminderSms({
        customerPhone: customer.phone,
        advanceBalance,
        shopSettings: { ...shopSettings, shopNameUrdu: APP_NAME_URDU },
      });
    } catch (err) {
      setError(err.message || t('customer.smsFailed'));
    } finally {
      setReminderLoading(null);
    }
  };

  const handleShareReminderWhatsApp = async () => {
    try {
      setReminderLoading('whatsapp');
      setError(null);
      await sharePaymentReminderWhatsApp({
        captureViewRef: reminderCaptureRef,
        customerPhone: customer.phone,
        advanceBalance,
        shopSettings: { ...shopSettings, shopNameUrdu: APP_NAME_URDU },
      });
    } catch (err) {
      setError(err.message || t('customer.reminderFailed'));
    } finally {
      setReminderLoading(null);
    }
  };

  const handleDeletePayment = async () => {
    if (!deletePaymentTarget) return;
    // Deleting an entry undoes its signed effect on the running balance.
    const reversal = -Number(deletePaymentTarget.amount ?? 0);
    const removedId = deletePaymentTarget.id;
    try {
      setDeletingPayment(true);
      setError(null);
      const { queued, result } = await deleteAdvanceEntry(customerId, removedId, reversal);
      setDeletePaymentTarget(null);
      if (queued) {
        setCustomer((c) => (c ? { ...c, advanceBalance: Number(c.advanceBalance ?? 0) + reversal } : c));
        setAdvanceEntries((prev) => prev.filter((e) => e.id !== removedId));
      } else {
        if (result) setCustomer(result);
        await load();
      }
    } catch (err) {
      setError(getFriendlyErrorMessage(err, t('customer.deletePaymentFailed')));
    } finally {
      setDeletingPayment(false);
    }
  };

  const handleAddAdvance = async ({ amount, notes }) => {
    try {
      setAdvanceSaving(true);
      setError(null);
      const { queued, result } = await addAdvance(customerId, { amount, notes });
      setAdvanceModalVisible(false);
      if (queued) {
        setCustomer((c) => (c ? { ...c, advanceBalance: Number(c.advanceBalance ?? 0) + Number(amount) } : c));
      } else {
        setCustomer(result);
        await load();
      }
    } catch (err) {
      setError(getFriendlyErrorMessage(err, t('customer.advanceFailed')));
    } finally {
      setAdvanceSaving(false);
    }
  };

  const handleAddCreditCharge = async ({ amount, notes }) => {
    try {
      setAdvanceSaving(true);
      setError(null);
      const { queued, result } = await addCreditCharge(customerId, { amount, notes });
      setCreditModalVisible(false);
      if (queued) {
        setCustomer((c) => (c ? { ...c, advanceBalance: Number(c.advanceBalance ?? 0) - Number(amount) } : c));
      } else {
        setCustomer(result);
        await load();
      }
    } catch (err) {
      setError(getFriendlyErrorMessage(err, t('customer.creditChargeFailed')));
    } finally {
      setAdvanceSaving(false);
    }
  };

  const openSaleFromEntry = (entry) => {
    if (!entry.linkedSaleId) return;
    navigation.navigate('Invoice', {
      saleId: entry.linkedSaleId,
      sale: entry.sale,
    });
  };

  const openBlockedSale = (sale) => {
    setShowDeleteCustomerBlocked(false);
    navigation.navigate('Invoice', { saleId: sale.id, sale });
  };

  const handleDeleteCustomerPress = async () => {
    if (isLocalCustomer) return;
    try {
      setDeleteCustomerChecking(true);
      setError(null);
      const { data } = await getCustomerDeletionBlockers(customerId);
      const blockers = data.data;
      if (!blockers?.canDelete) {
        setDeleteCustomerBlockers({ sales: blockers?.sales || [] });
        setShowDeleteCustomerBlocked(true);
        return;
      }
      setShowDeleteCustomer(true);
    } catch (err) {
      setError(getFriendlyErrorMessage(err, t('customer.deleteFailed')));
    } finally {
      setDeleteCustomerChecking(false);
    }
  };

  const handleDeleteCustomer = async () => {
    try {
      setDeletingCustomer(true);
      setError(null);
      await deleteCustomer(customerId);
      setShowDeleteCustomer(false);
      navigation.goBack();
    } catch (err) {
      const blockerData = err?.response?.data?.data;
      if (err?.response?.status === 409 && blockerData?.sales) {
        setDeleteCustomerBlockers({ sales: blockerData.sales || [] });
        setShowDeleteCustomer(false);
        setShowDeleteCustomerBlocked(true);
        return;
      }
      setError(getFriendlyErrorMessage(err, t('customer.deleteFailed')));
    } finally {
      setDeletingCustomer(false);
    }
  };

  const periodLabel = getPeriodLabel(mode, year, month, day);
  const salesSummaryText =
    mode === 'all'
      ? `${sales.length} sale(s) · ${formatCurrency(totalSpent)}`
      : `${periodLabel} · ${sales.length} sale(s) · ${formatCurrency(totalSpent)}`;

  const handleExportPdf = useCallback(async () => {
    if (!customer) return;
    setExportingPdf(true);
    try {
      await exportCustomerLedgerPdf({
        customer,
        sales,
        accountHistory,
        periodLabel: mode === 'all' ? '' : periodLabel,
      });
    } catch {
      Alert.alert(t('ledgerReport.export'), t('reports.exportFailed'));
    } finally {
      setExportingPdf(false);
    }
  }, [customer, sales, accountHistory, mode, periodLabel, t]);

  const showFullSkeleton = loading && !customer;
  const showSalesSkeleton = loading && sales.length === 0;

  if (showFullSkeleton) {
    return (
      <ScrollView
        style={{ flex: 1, backgroundColor: theme.colors.background }}
        contentContainerStyle={{ padding: 16 }}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
        automaticallyAdjustKeyboardInsets
        onScrollBeginDrag={Keyboard.dismiss}
      >
        <CustomerDetailSkeleton />
      </ScrollView>
    );
  }

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: theme.colors.background }}
      contentContainerStyle={{ padding: 16, paddingTop: 16 }}
      refreshControl={<RefreshControl refreshing={loading} onRefresh={load} />}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
      automaticallyAdjustKeyboardInsets
      onScrollBeginDrag={Keyboard.dismiss}
    >
      <ErrorMessage message={error} />
      <PartyNetBalanceCard party={customer} style={{ marginTop: 16 }} />
      {!isLocalCustomer ? (
        <AppButton
          title={t('ledgerReport.export')}
          variant="outline"
          icon="file-pdf-box"
          loading={exportingPdf}
          disabled={exportingPdf}
          onPress={handleExportPdf}
          style={{ marginTop: 12, marginBottom: 4 }}
        />
      ) : null}
      {!readOnly || canSendMessages ? (
      <Card
        mode="elevated"
        style={{
          marginBottom: 12,
          borderRadius: theme.roundness,
        }}
      >
        <Card.Content>
        {!readOnly && !isLocalCustomer ? (
          <View style={{ gap: 8 }}>
            <AppButton
              title={t('customer.recordPayment')}
              variant="outline"
              onPress={() => setAdvanceModalVisible(true)}
              icon="plus"
            />
            <AppButton
              title={t('customer.addCreditOwed')}
              variant="outline"
              onPress={() => setCreditModalVisible(true)}
              icon="minus"
            />
          </View>
        ) : isLocalCustomer ? (
          <Text variant="labelSmall" style={{ color: theme.colors.secondary }}>
            {t('customer.syncBeforeAdvance')}
          </Text>
        ) : null}
        {canSendMessages ? (
          <View style={{ marginTop: 12 }}>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <View style={{ flex: 1 }}>
                <AppButton
                  title={t('customer.sms')}
                  variant="outline"
                  loading={reminderLoading === 'sms'}
                  disabled={reminderLoading === 'whatsapp'}
                  onPress={handleSendReminderSms}
                />
              </View>
              <View style={{ flex: 1 }}>
                <AppButton
                  title={t('customer.whatsapp')}
                  loading={reminderLoading === 'whatsapp'}
                  disabled={reminderLoading === 'sms'}
                  onPress={handleShareReminderWhatsApp}
                />
              </View>
            </View>
          </View>
        ) : !isLocalCustomer ? (
          <Text variant="labelSmall" style={{ color: theme.colors.outline, marginTop: 8 }}>
            {t('customer.addPhoneForReminders')}
          </Text>
        ) : null}
        </Card.Content>
      </Card>
      ) : null}

      {canSendMessages ? (
        <View style={{ position: 'absolute', left: -2000, top: 0, opacity: 0, width: 360 }} pointerEvents="none">
          <ViewShot ref={reminderCaptureRef} options={{ format: 'png', quality: 1 }}>
            <PaymentReminderCard
              advanceBalance={advanceBalance}
              shopNameUrdu={APP_NAME_URDU}
              shopPhone={shopSettings?.phone}
            />
          </ViewShot>
        </View>
      ) : null}

      <AppCard>
        <Text variant="headlineSmall" style={{ color: theme.colors.primary, fontWeight: '700' }}>
          {customer?.name || t('customer.fallbackName')}
        </Text>
        {customer?._local ? (
          <Text variant="labelSmall" style={{ color: theme.colors.secondary, marginTop: 4 }}>
            {t('common.pendingSync')}
          </Text>
        ) : null}
        <View style={{ marginTop: 16 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text variant="labelMedium" style={{ color: theme.colors.onSurfaceVariant, ...textDir }}>
              {t('common.phone')}
            </Text>
            <AppButton
              compact
              mode="text"
              title={customer?.phone?.trim() ? t('customer.editPhone') : t('customer.addPhone')}
              onPress={() => setPhoneModalVisible(true)}
            />
          </View>
          <Text variant="bodyLarge" style={{ fontWeight: '500' }}>
            {customer?.phone ? formatPhoneDisplay(customer.phone) : '—'}
          </Text>
        </View>
        <View style={{ marginTop: 12 }}>
          <Text variant="labelMedium" style={{ color: theme.colors.onSurfaceVariant, ...textDir }}>{t('common.address')}</Text>
          <Text variant="bodyLarge">{customer?.address?.trim() || '—'}</Text>
        </View>
        {customer?.createdAt ? (
          <View style={{ marginTop: 12 }}>
            <Text variant="labelMedium" style={{ color: theme.colors.onSurfaceVariant, ...textDir }}>{t('customer.since')}</Text>
            <Text variant="bodyLarge">{formatDate(customer.createdAt)}</Text>
          </View>
        ) : null}
      </AppCard>

     
      {accountHistory.length > 0 ? (
        <Card mode="elevated" style={{ marginTop: 16, borderRadius: theme.roundness }}>
          <Card.Content style={{ paddingBottom: 8 }}>
            <Text variant="titleLarge" style={{ fontWeight: '700', marginBottom: 12, ...textDir }}>
              {t('customer.accountHistory')}
            </Text>
            <View
              style={{
                flexDirection: 'row',
                paddingVertical: 8,
                paddingHorizontal: 4,
                backgroundColor: theme.colors.surfaceVariant,
                borderRadius: theme.roundness,
                marginBottom: 4,
              }}
            >
              <Text style={{ flex: 1.1, fontWeight: '700', fontSize: 12, ...textDir }}>
                {t('customer.col.date')}
              </Text>
              <Text
                style={{
                  width: 88,
                  fontWeight: '700',
                  fontSize: 12,
                  textAlign: isRtl ? 'left' : 'right',
                  ...textDir,
                }}
              >
                {t('customer.col.amount')}
              </Text>
              <Text style={{ flex: 1.2, fontWeight: '700', fontSize: 12, paddingHorizontal: 6, ...textDir }}>
                {t('customer.col.note')}
              </Text>
            </View>
            {accountHistory.map((entry) => (
              <CustomerAccountEntryRow
                key={entry.id}
                entry={entry}
                canDelete={isAdmin && !readOnly}
                onDelete={setDeletePaymentTarget}
                onOpenSale={openSaleFromEntry}
              />
            ))}
          </Card.Content>
        </Card>
      ) : null}

      <AddCustomerLedgerModal
        visible={advanceModalVisible}
        variant="payment"
        customerName={customer?.name}
        onSubmit={handleAddAdvance}
        onClose={() => setAdvanceModalVisible(false)}
        loading={advanceSaving}
      />
      <AddCustomerLedgerModal
        visible={creditModalVisible}
        variant="credit"
        customerName={customer?.name}
        onSubmit={handleAddCreditCharge}
        onClose={() => setCreditModalVisible(false)}
        loading={advanceSaving}
      />
      <ConfirmModal
        visible={Boolean(deletePaymentTarget)}
        title={t('customer.deletePaymentConfirmTitle')}
        message={t('customer.deletePaymentConfirmMessage')}
        onConfirm={handleDeletePayment}
        onCancel={() => setDeletePaymentTarget(null)}
        loading={deletingPayment}
      />
      <ConfirmModal
        visible={showDeleteCustomer}
        title={t('customer.deleteConfirmTitle')}
        message={t('customer.deleteConfirmMessage')}
        onConfirm={handleDeleteCustomer}
        onCancel={() => setShowDeleteCustomer(false)}
        loading={deletingCustomer}
      />
      <CustomerDeletionBlockedModal
        visible={showDeleteCustomerBlocked}
        customerName={customer?.name}
        sales={deleteCustomerBlockers.sales}
        onClose={() => setShowDeleteCustomerBlocked(false)}
        onOpenSale={openBlockedSale}
      />
      <EditCustomerPhoneModal
        visible={phoneModalVisible}
        customer={customer}
        onSubmit={handleSavePhone}
        onClose={() => setPhoneModalVisible(false)}
        loading={phoneSaving}
      />

      {showSalesSkeleton ? (
        <>
          <Text variant="titleLarge" style={{ fontWeight: '700', marginTop: 8, marginBottom: 8, ...textDir }}>{t('customer.salesHistory')}</Text>
          <PeriodFilter
            mode={mode}
            year={year}
            month={month}
            day={day}
            onModeChange={setMode}
            onYearChange={setYear}
            onMonthChange={setMonth}
            onDayChange={setDay}
            summaryText={t('customer.loadingSales')}
          />
          <SummarySkeleton />
          <SaleListSkeleton count={4} />
        </>
      ) : (
        <>
          <Text variant="titleLarge" style={{ fontWeight: '700', marginTop: 8, marginBottom: 8, ...textDir }}>{t('customer.salesHistory')}</Text>
          <PeriodFilter
            mode={mode}
            year={year}
            month={month}
            day={day}
            onModeChange={setMode}
            onYearChange={setYear}
            onMonthChange={setMonth}
            onDayChange={setDay}
            summaryText={loading ? t('customer.loadingSales') : salesSummaryText}
          />

          <AppCard>
            <Text variant="titleMedium" style={{ fontWeight: '700', marginBottom: 8, ...textDir }}>{t('common.summary')}</Text>
            <Text variant="bodyLarge" style={textDir}>{t('customer.totalSales')} {sales.length}</Text>
            <Text variant="bodyLarge" style={textDir}>{t('customer.totalSpent')} {formatCurrency(totalSpent)}</Text>
            <Text variant="bodyLarge" style={{ marginTop: 4, ...textDir }}>
              {t('customer.creditSalesPeriod', { count: creditSales.length, total: formatCurrency(creditTotal) })}
            </Text>
            <Text
              variant="bodyLarge"
              style={{ marginTop: 4, color: advanceBalance < 0 ? theme.colors.error : theme.colors.onSurface, ...textDir }}
            >
              {t('customer.accountBalance')} {formatCurrency(advanceBalance)}
            </Text>
          </AppCard>

          {sales.length === 0 ? (
            <EmptyState
              message={
                mode === 'all'
                  ? t('customer.noSales')
                  : t('customer.noSalesPeriod')
              }
            />
          ) : (
            sales.map((sale) => (
              <SaleListItem
                key={sale.id}
                sale={sale}
                onPress={() => navigation.navigate('Invoice', { saleId: sale.id, sale })}
              />
            ))
          )}
        </>
      )}
      {isAdmin && !isLocalCustomer && !readOnly ? (
        <AppButton
          title={t('customer.delete')}
          variant="danger"
          onPress={handleDeleteCustomerPress}
          loading={deleteCustomerChecking}
          style={{ marginTop: 16, marginBottom: 8 }}
          icon="delete-outline"
        />
      ) : null}
      <View style={{ height: 24 }} />
    </ScrollView>
  );
}
