import React, { useState, useEffect } from 'react';
import { View, ScrollView } from 'react-native';
import { Text, Card, useTheme } from 'react-native-paper';
import AppLogo from '../../components/common/AppLogo';
import { SHOP_NAME } from '../../constants/branding';
import { getSale } from '../../api/sales.api';
import { getSettings } from '../../api/settings.api';
import { generateAndShareInvoice } from '../../utils/generateInvoicePDF';
import { formatCurrency } from '../../utils/formatCurrency';
import { formatDate, formatDateTime } from '../../utils/formatDate';
import AppButton from '../../components/common/AppButton';
import { InvoiceSkeleton } from '../../components/common/Skeleton';
import AppCard from '../../components/common/AppCard';
import { getIsOnline } from '../../stores/networkStore';

export default function InvoiceScreen({ route }) {
  const theme = useTheme();
  const initialSale = route.params?.sale;
  const saleId = route.params?.saleId;
  const [sale, setSale] = useState(initialSale);
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(!initialSale && !!saleId);
  const [sharing, setSharing] = useState(false);

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
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [saleId, initialSale]);

  const handleShare = async () => {
    try {
      setSharing(true);
      await generateAndShareInvoice(sale, settings);
    } finally {
      setSharing(false);
    }
  };

  if (loading || !sale) return <InvoiceSkeleton />;

  return (
    <ScrollView style={{ flex: 1, backgroundColor: theme.colors.background }} contentContainerStyle={{ padding: 16, paddingTop: 16 }}>
      <AppCard>
        {sale.pendingSync ? (
          <Text variant="bodySmall" style={{ color: theme.colors.secondary, textAlign: 'center', marginBottom: 8 }}>
            Pending sync — will upload when online
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
              Customer: {sale.customer.name}
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
                {Number(item.quantity)} × {formatCurrency(item.unitPrice)}
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
          <Text variant="bodyLarge">Subtotal</Text>
          <Text variant="bodyLarge">{formatCurrency(sale.subtotal)}</Text>
        </View>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 }}>
          <Text variant="bodyLarge">Discount</Text>
          <Text variant="bodyLarge">{formatCurrency(sale.discount)}</Text>
        </View>
        <Text variant="titleLarge" style={{ color: theme.colors.primary, fontWeight: '700', marginTop: 8 }}>
          Total: {formatCurrency(sale.totalAmount)}
        </Text>
        <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant, marginTop: 8 }}>
          Payment: {sale.paymentMethod === 'CREDIT' ? 'Credit' : sale.paymentMethod}
        </Text>
      </AppCard>
      <AppButton title="Share PDF" onPress={handleShare} loading={sharing} style={{ marginBottom: 24 }} />
    </ScrollView>
  );
}
