import React, { useState, useCallback, useRef, useEffect } from 'react';
import { View, ScrollView, RefreshControl, Keyboard, Platform } from 'react-native';
import ViewShot from 'react-native-view-shot';
import { Text, Card, useTheme } from 'react-native-paper';
import { useFocusEffect } from '@react-navigation/native';
import { getCustomer, getCustomerAdvanceEntries, addCustomerAdvance } from '../../api/customers.api';
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
import AddAdvanceModal from '../../components/customers/AddAdvanceModal';
import PaymentReminderCard from '../../components/customers/PaymentReminderCard';
import { APP_NAME_URDU } from '../../constants/branding';
import {
  sendPaymentReminderSms,
  sharePaymentReminderWhatsApp,
  getPaymentReminderShopSettings,
} from '../../utils/sharePaymentReminder';
import { useSalesStore } from '../../stores/salesStore';
import { getIsOnline } from '../../stores/networkStore';

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
  const { customerId, customer: initialCustomer } = route.params;
  const [customer, setCustomer] = useState(initialCustomer);
  const [sales, setSales] = useState([]);
  const [advanceEntries, setAdvanceEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [advanceModalVisible, setAdvanceModalVisible] = useState(false);
  const [advanceSaving, setAdvanceSaving] = useState(false);
  const [mode, setMode] = useState('all');
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [day, setDay] = useState(now.getDate());
  const [shopSettings, setShopSettings] = useState(null);
  const [reminderLoading, setReminderLoading] = useState(null);
  const reminderCaptureRef = useRef(null);

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

      const pending = useSalesStore
        .getState()
        .pendingSales.filter(
          (s) =>
            (s.customerId === customerId || s.customer?.id === customerId) &&
            isDateInPeriod(s.createdAt, mode, year, month, day)
        );

      const merged = [...pending, ...apiSales].sort(
        (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
      );
      setSales(merged);
    } catch (err) {
      setError(getFriendlyErrorMessage(err, 'Could not load customer.'));
    } finally {
      setLoading(false);
    }
  }, [customerId, initialCustomer, mode, year, month, day]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const totalSpent = sales.reduce((sum, s) => sum + Number(s.totalAmount), 0);
  const creditSales = sales.filter((s) => s.paymentMethod === 'CREDIT');
  const creditTotal = creditSales.reduce((sum, s) => sum + Number(s.totalAmount), 0);
  const advanceBalance = Number(customer?.advanceBalance || 0);
  const isLocalCustomer = String(customerId).startsWith('local-');
  const amountDue = Math.abs(advanceBalance);
  const showPaymentReminders = advanceBalance < 0 && !isLocalCustomer;
  const canSmsReminder = Boolean(customer?.phone?.trim());

  useEffect(() => {
    if (showPaymentReminders) {
      getPaymentReminderShopSettings().then(setShopSettings);
    }
  }, [showPaymentReminders]);

  const handleSendReminderSms = async () => {
    try {
      setReminderLoading('sms');
      setError(null);
      await sendPaymentReminderSms({
        customerPhone: customer.phone,
        amountDue,
        shopSettings: { ...shopSettings, shopNameUrdu: APP_NAME_URDU },
      });
    } catch (err) {
      setError(err.message || 'Could not open SMS');
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
        amountDue,
        shopSettings: { ...shopSettings, shopNameUrdu: APP_NAME_URDU },
      });
    } catch (err) {
      setError(err.message || 'Could not share reminder');
    } finally {
      setReminderLoading(null);
    }
  };

  const handleAddAdvance = async ({ amount, notes }) => {
    try {
      setAdvanceSaving(true);
      setError(null);
      const { data } = await addCustomerAdvance(customerId, { amount, notes });
      setCustomer(data.data);
      setAdvanceModalVisible(false);
      await load();
    } catch (err) {
      setError(getFriendlyErrorMessage(err, 'Could not record advance.'));
    } finally {
      setAdvanceSaving(false);
    }
  };

  const periodLabel = getPeriodLabel(mode, year, month, day);
  const salesSummaryText =
    mode === 'all'
      ? `${sales.length} sale(s) · ${formatCurrency(totalSpent)}`
      : `${periodLabel} · ${sales.length} sale(s) · ${formatCurrency(totalSpent)}`;

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
      <Card
        mode="elevated"
        style={{
          marginTop: 16,
          marginBottom: 12,
          borderRadius: theme.roundness,
          backgroundColor: advanceBalance < 0 ? theme.colors.errorContainer : theme.colors.primaryContainer,
        }}
      >
        <Card.Content>
        <Text variant="titleMedium" style={{ fontWeight: '700', color: advanceBalance < 0 ? theme.colors.error : theme.colors.primary }}>
          Balance
        </Text>
        <Text
          variant="headlineMedium"
          style={{
            fontWeight: '700',
            marginTop: 4,
            color: advanceBalance < 0 ? theme.colors.error : theme.colors.primary,
          }}
        >
          {formatCurrency(advanceBalance)}
        </Text>
        <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, marginTop: 4 }}>
          {advanceBalance >= 0
            ? 'Prepaid by client, or zero. Credit sales reduce this amount.'
            : 'Customer owes this amount (credit sales exceeded prepaid).'}
        </Text>
        {!isLocalCustomer && getIsOnline() ? (
          <View style={{ marginTop: 12 }}>
            <AppButton
              title="Add Credit Balance"
              variant="outline"
              onPress={() => setAdvanceModalVisible(true)}
            />
          </View>
        ) : isLocalCustomer ? (
          <Text variant="labelSmall" style={{ color: theme.colors.secondary, marginTop: 8 }}>
            Sync customer before adding advance
          </Text>
        ) : null}
        {showPaymentReminders && canSmsReminder ? (
          <View style={{ marginTop: 12 }}>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <View style={{ flex: 1 }}>
                <AppButton
                  title="Send SMS reminder"
                  variant="outline"
                  loading={reminderLoading === 'sms'}
                  disabled={reminderLoading === 'whatsapp'}
                  onPress={handleSendReminderSms}
                />
              </View>
              <View style={{ flex: 1 }}>
                <AppButton
                  title="WhatsApp reminder"
                  loading={reminderLoading === 'whatsapp'}
                  disabled={reminderLoading === 'sms'}
                  onPress={handleShareReminderWhatsApp}
                />
              </View>
            </View>
          </View>
        ) : showPaymentReminders ? (
          <Text variant="labelSmall" style={{ color: theme.colors.outline, marginTop: 8 }}>
            Add customer phone to send reminders
          </Text>
        ) : null}
        </Card.Content>
      </Card>

      {showPaymentReminders ? (
        <View style={{ position: 'absolute', left: -2000, top: 0, opacity: 0 }} pointerEvents="none">
          <ViewShot ref={reminderCaptureRef} options={{ format: 'png', quality: 1 }}>
            <PaymentReminderCard
              amountDue={amountDue}
              shopNameUrdu={APP_NAME_URDU}
              shopPhone={shopSettings?.phone}
            />
          </ViewShot>
        </View>
      ) : null}

      <AppCard>
        <Text variant="headlineSmall" style={{ color: theme.colors.primary, fontWeight: '700' }}>
          {customer?.name || 'Customer'}
        </Text>
        {customer?._local ? (
          <Text variant="labelSmall" style={{ color: theme.colors.secondary, marginTop: 4 }}>
            Pending sync
          </Text>
        ) : null}
        <View style={{ marginTop: 16 }}>
          <Text variant="labelMedium" style={{ color: theme.colors.onSurfaceVariant }}>Phone</Text>
          <Text variant="bodyLarge" style={{ fontWeight: '500' }}>
            {customer?.phone ? formatPhoneDisplay(customer.phone) : '—'}
          </Text>
        </View>
        <View style={{ marginTop: 12 }}>
          <Text variant="labelMedium" style={{ color: theme.colors.onSurfaceVariant }}>Address</Text>
          <Text variant="bodyLarge">{customer?.address?.trim() || '—'}</Text>
        </View>
        {customer?.createdAt ? (
          <View style={{ marginTop: 12 }}>
            <Text variant="labelMedium" style={{ color: theme.colors.onSurfaceVariant }}>Customer since</Text>
            <Text variant="bodyLarge">{formatDate(customer.createdAt)}</Text>
          </View>
        ) : null}
      </AppCard>

     
      {advanceEntries.length > 0 ? (
        <View style={{ marginTop: 16 }}>
          <Text variant="titleLarge" style={{ fontWeight: '700', marginBottom: 8 }}>Advance payments</Text>
          {advanceEntries.map((entry) => {
            const amt = Number(entry.amount);
            const isCharge = amt < 0;
            return (
              <AppCard key={entry.id} style={{ marginBottom: 8 }}>
                <Text variant="titleSmall" style={{ fontWeight: '600', color: isCharge ? theme.colors.error : theme.colors.primary }}>
                  {isCharge ? '−' : '+'}
                  {formatCurrency(Math.abs(amt))}
                </Text>
                <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, marginTop: 4 }}>
                  {formatDate(entry.createdAt)}
                </Text>
                {entry.notes ? (
                  <Text variant="bodySmall" style={{ marginTop: 4 }}>{entry.notes}</Text>
                ) : null}
              </AppCard>
            );
          })}
        </View>
      ) : null}

      <AddAdvanceModal
        visible={advanceModalVisible}
        customerName={customer?.name}
        onSubmit={handleAddAdvance}
        onClose={() => setAdvanceModalVisible(false)}
        loading={advanceSaving}
      />

      {showSalesSkeleton ? (
        <>
          <Text variant="titleLarge" style={{ fontWeight: '700', marginTop: 8, marginBottom: 8 }}>Sales history</Text>
          <PeriodFilter
            mode={mode}
            year={year}
            month={month}
            day={day}
            onModeChange={setMode}
            onYearChange={setYear}
            onMonthChange={setMonth}
            onDayChange={setDay}
            summaryText="Loading sales..."
            title="Filter by period"
          />
          <SummarySkeleton />
          <SaleListSkeleton count={4} />
        </>
      ) : (
        <>
          <Text variant="titleLarge" style={{ fontWeight: '700', marginTop: 8, marginBottom: 8 }}>Sales history</Text>
          <PeriodFilter
            mode={mode}
            year={year}
            month={month}
            day={day}
            onModeChange={setMode}
            onYearChange={setYear}
            onMonthChange={setMonth}
            onDayChange={setDay}
            summaryText={loading ? 'Loading sales...' : salesSummaryText}
            title="Filter by period"
          />

          <AppCard>
            <Text variant="titleMedium" style={{ fontWeight: '700', marginBottom: 8 }}>Summary</Text>
            <Text variant="bodyLarge">Total sales: {sales.length}</Text>
            <Text variant="bodyLarge">Total spent: {formatCurrency(totalSpent)}</Text>
            <Text variant="bodyLarge" style={{ marginTop: 4 }}>
              Credit: {creditSales.length} · {formatCurrency(creditTotal)}
            </Text>
            <Text
              variant="bodyLarge"
              style={{ marginTop: 4, color: advanceBalance < 0 ? theme.colors.error : theme.colors.onSurface }}
            >
              Balance: {formatCurrency(advanceBalance)}
            </Text>
          </AppCard>

          {sales.length === 0 ? (
            <EmptyState
              message={
                mode === 'all'
                  ? 'No sales for this customer yet'
                  : 'No sales for this period'
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
      <View style={{ height: 24 }} />
    </ScrollView>
  );
}
