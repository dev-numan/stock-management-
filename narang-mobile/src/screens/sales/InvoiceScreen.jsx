import React, { useState, useEffect, useRef } from 'react';
import { View, ScrollView, Alert } from 'react-native';
import { Text, Card, useTheme } from 'react-native-paper';
import ViewShot from 'react-native-view-shot';
import AppLogo from '../../components/common/AppLogo';
import InvoiceReceiptUrduCard from '../../components/invoice/InvoiceReceiptUrduCard';
import InvoiceReceiptEnglishCard from '../../components/invoice/InvoiceReceiptEnglishCard';
import { SHOP_NAME } from '../../constants/branding';
import { getSale } from '../../api/sales.api';
import { getSettings } from '../../api/settings.api';
import { useAuth } from '../../context/AuthContext';
import { useSalesStore } from '../../stores/salesStore';
import { useProductsStore } from '../../stores/productsStore';
import { useCustomersStore } from '../../stores/customersStore';
import { useDashboardStore } from '../../stores/dashboardStore';
import ConfirmModal from '../../components/common/ConfirmModal';
import { captureAndShareInvoiceImage } from '../../utils/generateInvoiceImage';
import { printInvoice, printInvoiceUrdu } from '../../utils/printInvoice';
import { formatCurrency } from '../../utils/formatCurrency';
import { formatDateTime } from '../../utils/formatDate';
import AppButton from '../../components/common/AppButton';
import { InvoiceSkeleton } from '../../components/common/Skeleton';
import AppCard from '../../components/common/AppCard';
import ErrorMessage from '../../components/common/ErrorMessage';
import { getFriendlyErrorMessage, isTechnicalMessage } from '../../utils/apiErrors';
import { getIsOnline } from '../../stores/networkStore';
import { useTranslation } from '../../i18n/useTranslation';

export default function InvoiceScreen({ route, navigation }) {
  const theme = useTheme();
  const { t, locale, isRtl } = useTranslation();
  const { isAdmin } = useAuth();
  const textDir = { writingDirection: isRtl ? 'rtl' : 'ltr' };
  const initialSale = route.params?.sale;
  const saleId = route.params?.saleId;
  const [sale, setSale] = useState(initialSale);
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(!initialSale && !!saleId);
  const [sharing, setSharing] = useState(false);
  const [printing, setPrinting] = useState(false);
  const [printingUrdu, setPrintingUrdu] = useState(false);
  const [loadError, setLoadError] = useState(null);
  const [showDelete, setShowDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const deleteSale = useSalesStore((s) => s.deleteSale);
  const fetchProducts = useProductsStore((s) => s.fetchProducts);
  const fetchCustomers = useCustomersStore((s) => s.fetchCustomers);
  const invalidateDashboard = useDashboardStore((s) => s.invalidate);
  const englishCaptureRef = useRef(null);
  const urduCaptureRef = useRef(null);
  const shareCaptureRef = locale === 'ur' ? urduCaptureRef : englishCaptureRef;

  useEffect(() => {
    const load = async () => {
      try {
        if (initialSale?.pendingSync) {
          setSale(initialSale);
          if (getIsOnline()) {
            try {
              const settingsRes = await getSettings();
              setSettings(settingsRes.data.data);
            } catch {
              setSettings({ shopName: SHOP_NAME });
            }
          } else {
            setSettings({ shopName: SHOP_NAME });
          }
          return;
        }

        const [saleRes, settingsRes] = await Promise.all([
          saleId ? getSale(saleId) : Promise.resolve({ data: { data: initialSale } }),
          getSettings(),
        ]);
        setSale(saleRes.data.data);
        setSettings(settingsRes.data.data);
        setLoadError(null);
      } catch (err) {
        if (!initialSale) {
          setSale(null);
          setLoadError(getFriendlyErrorMessage(err, t('invoice.loadFailed')));
        }
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [saleId, initialSale]);

  const handleShare = async () => {
    try {
      setSharing(true);
      await captureAndShareInvoiceImage(shareCaptureRef, sale.invoiceNumber, {
        phone: sale.customer?.phone,
        text: `${t('invoice.invoiceLabel')} ${sale.invoiceNumber}`,
      });
    } catch (err) {
      const msg = typeof err?.message === 'string' ? err.message.trim() : '';
      console.error('[InvoiceShare] failed:', err);
      Alert.alert(
        t('invoice.shareFailedTitle'),
        msg && !isTechnicalMessage(msg) ? msg : t('invoice.shareFailedMessage')
      );
    } finally {
      setSharing(false);
    }
  };

  const handlePrint = async () => {
    try {
      setPrinting(true);
      await printInvoice({ englishCaptureRef });
    } catch (err) {
      if (err?.message === 'printer-not-available' || err?.message === 'capture-failed') return;
      const msg = typeof err?.message === 'string' ? err.message.trim() : '';
      if (msg && !isTechnicalMessage(msg)) {
        Alert.alert(t('invoice.printFailedTitle'), msg);
      }
    } finally {
      setPrinting(false);
    }
  };

  const handlePrintUrdu = async () => {
    try {
      setPrintingUrdu(true);
      await printInvoiceUrdu({ urduCaptureRef });
    } catch (err) {
      if (err?.message === 'printer-not-available' || err?.message === 'capture-failed') return;
      const msg = typeof err?.message === 'string' ? err.message.trim() : '';
      if (msg && !isTechnicalMessage(msg)) {
        Alert.alert(t('invoice.printFailedTitle'), msg);
      }
    } finally {
      setPrintingUrdu(false);
    }
  };

  const handleDelete = async () => {
    if (!sale) return;
    try {
      setDeleting(true);
      const result = await deleteSale(sale);
      await fetchProducts(true);
      if (result?.customerId || sale.customerId) {
        await fetchCustomers(true);
      }
      invalidateDashboard();
      setShowDelete(false);
      navigation.goBack();
    } catch (err) {
      Alert.alert(
        t('sale.deleteFailedTitle'),
        getFriendlyErrorMessage(err, t('sale.deleteFailed'))
      );
    } finally {
      setDeleting(false);
    }
  };

  if (loading) return <InvoiceSkeleton />;
  if (loadError) {
    return (
      <View style={{ flex: 1, padding: 16, backgroundColor: theme.colors.background }}>
        <ErrorMessage message={loadError} />
      </View>
    );
  }
  if (!sale) return <InvoiceSkeleton />;

  return (
    <ScrollView style={{ flex: 1, backgroundColor: theme.colors.background }} contentContainerStyle={{ padding: 16, paddingTop: 16 }}>
      <View style={{ position: 'absolute', left: -4000, top: 0, opacity: 0 }} pointerEvents="none" collapsable={false}>
        <ViewShot ref={englishCaptureRef} options={{ format: 'jpg', quality: 0.92 }} collapsable={false}>
          <InvoiceReceiptEnglishCard sale={sale} settings={settings} />
        </ViewShot>
        <ViewShot ref={urduCaptureRef} options={{ format: 'jpg', quality: 0.92 }} collapsable={false}>
          <InvoiceReceiptUrduCard sale={sale} settings={settings} />
        </ViewShot>
      </View>

      <AppCard>
        {sale.pendingSync ? (
          <Text variant="bodySmall" style={{ color: theme.colors.secondary, textAlign: 'center', marginBottom: 8 }}>
            {t('invoice.pendingSync')}
          </Text>
        ) : null}
        <AppLogo size={80} style={{ alignSelf: 'center', marginBottom: 8 }} />
        <Text variant="headlineSmall" style={{ textAlign: 'center', color: theme.colors.primary, fontWeight: '700' }}>
          {SHOP_NAME}
        </Text>
        <Text variant="bodySmall" style={{ textAlign: 'center', color: theme.colors.onSurfaceVariant }}>
          {settings?.address}
        </Text>
        <Text variant="titleMedium" style={{ textAlign: 'center', fontWeight: '600', marginTop: 16 }}>
          {sale.invoiceNumber}
        </Text>
        <Text variant="bodySmall" style={{ textAlign: 'center', color: theme.colors.onSurfaceVariant }}>
          {formatDateTime(sale.createdAt)}
        </Text>
        {sale.customer ? (
          <View style={{ marginTop: 8, alignItems: 'center' }}>
            <Text variant="bodyMedium" style={{ textAlign: 'center' }}>
              {t('invoice.customerLine', { name: sale.customer.name })}
            </Text>
            {sale.customer.phone ? (
              <Text variant="bodySmall" style={{ textAlign: 'center', color: theme.colors.onSurfaceVariant }}>
                {sale.customer.phone}
              </Text>
            ) : null}
          </View>
        ) : null}
      </AppCard>
      {sale.items?.map((item) => (
        <Card key={item.id} mode="elevated" style={{ marginBottom: 8, borderRadius: theme.roundness }}>
          <Card.Content style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <View style={{ flex: 1 }}>
              <Text variant="titleSmall" style={{ fontWeight: '600' }}>{item.product?.name}</Text>
              <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                {Number(item.quantity)} {item.soldUnit || item.product?.unit} × {formatCurrency(item.unitPrice)}
              </Text>
            </View>
            <Text variant="titleSmall" style={{ color: theme.colors.primary, fontWeight: '700' }}>
              {formatCurrency(item.total)}
            </Text>
          </Card.Content>
        </Card>
      ))}
      <AppCard>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          <Text variant="bodyLarge" style={textDir}>{t('invoice.subtotal')}</Text>
          <Text variant="bodyLarge">{formatCurrency(sale.subtotal)}</Text>
        </View>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 }}>
          <Text variant="bodyLarge" style={textDir}>{t('invoice.discount')}</Text>
          <Text variant="bodyLarge">{formatCurrency(sale.discount)}</Text>
        </View>
        <Text variant="titleLarge" style={{ color: theme.colors.primary, fontWeight: '700', marginTop: 8 }}>
          {t('invoice.total')}: {formatCurrency(sale.totalAmount)}
        </Text>
        <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant, marginTop: 8, ...textDir }}>
          {t('invoice.payment', {
            method: sale.paymentMethod === 'CREDIT' ? t('payment.credit') : sale.paymentMethod,
          })}
        </Text>
      </AppCard>
      <View style={{ flexDirection: 'row', gap: 8, marginBottom: 8 }}>
        <View style={{ flex: 1 }}>
          <AppButton
            title={t('invoice.printEnglish')}
            onPress={handlePrint}
            loading={printing}
            disabled={sharing || printingUrdu}
            icon="printer"
          />
        </View>
        <View style={{ flex: 1 }}>
          <AppButton
            title={t('invoice.printUrdu')}
            onPress={handlePrintUrdu}
            loading={printingUrdu}
            disabled={sharing || printing}
            icon="printer"
          />
        </View>
      </View>
      <View style={{ marginBottom: 24 }}>
        <AppButton
          title={t('invoice.shareImage')}
          variant="outline"
          onPress={handleShare}
          loading={sharing}
          disabled={printing || printingUrdu}
          icon="share-variant"
        />
      </View>
      {isAdmin ? (
        <AppButton
          title={t('sale.delete')}
          variant="danger"
          onPress={() => setShowDelete(true)}
          disabled={sharing || printing || printingUrdu || deleting}
          icon="delete-outline"
          style={{ marginBottom: 24 }}
        />
      ) : null}
      <ConfirmModal
        visible={showDelete}
        title={t('sale.deleteConfirmTitle')}
        message={t('sale.deleteConfirmMessage')}
        onConfirm={handleDelete}
        onCancel={() => setShowDelete(false)}
        loading={deleting}
      />
    </ScrollView>
  );
}
