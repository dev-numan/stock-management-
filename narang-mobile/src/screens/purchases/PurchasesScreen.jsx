import React, { useState, useCallback } from 'react';
import { View, FlatList } from 'react-native';
import { Card, Text, FAB, IconButton, useTheme } from 'react-native-paper';
import { useFocusEffect } from '@react-navigation/native';
import { getPurchases, deletePurchase } from '../../api/purchases.api';
import ConfirmModal from '../../components/common/ConfirmModal';
import { useAuth } from '../../context/AuthContext';
import { useProductsStore } from '../../stores/productsStore';
import { formatCurrency } from '../../utils/formatCurrency';
import { formatDateTime } from '../../utils/formatDate';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import EmptyState from '../../components/common/EmptyState';
import ErrorMessage from '../../components/common/ErrorMessage';
import { getFriendlyErrorMessage } from '../../utils/apiErrors';
import { useTranslation } from '../../i18n/useTranslation';

export default function PurchasesScreen({ navigation }) {
  const theme = useTheme();
  const { t } = useTranslation();
  const { isAdmin } = useAuth();
  const fetchProducts = useProductsStore((s) => s.fetchProducts);
  const [purchases, setPurchases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      setError(null);
      getPurchases()
        .then(({ data }) => {
          setPurchases(data.data || []);
        })
        .catch((err) => {
          setError(getFriendlyErrorMessage(err, t('purchases.loadFailed')));
          setPurchases([]);
        })
        .finally(() => setLoading(false));
    }, [t])
  );

  const handleDeletePurchase = async () => {
    if (!deleteTarget) return;
    try {
      setDeleting(true);
      setError(null);
      await deletePurchase(deleteTarget.id);
      await fetchProducts(true);
      setDeleteTarget(null);
      const { data } = await getPurchases();
      setPurchases(data.data || []);
    } catch (err) {
      setError(getFriendlyErrorMessage(err, t('purchases.deleteFailed')));
    } finally {
      setDeleting(false);
    }
  };

  if (loading) return <LoadingSpinner />;

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <ErrorMessage message={error} />
      <FlatList
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 16, paddingBottom: 80 }}
        data={purchases}
        keyExtractor={(item) => item.id}
        ListEmptyComponent={<EmptyState message={t('purchases.empty')} />}
        renderItem={({ item }) => (
          <Card mode="elevated" style={{ marginBottom: 12, borderRadius: theme.roundness }}>
            <Card.Content>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <View style={{ flex: 1, marginRight: 8 }}>
                  <Text variant="titleMedium" style={{ fontWeight: '600' }}>
                    {item.supplier?.name || t('purchases.noSupplier')}
                  </Text>
                  <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                    {formatDateTime(item.createdAt)}
                  </Text>
                </View>
                <Text variant="titleMedium" style={{ color: theme.colors.primary, fontWeight: '700' }}>
                  {formatCurrency(item.totalAmount)}
                </Text>
                {isAdmin ? (
                  <IconButton
                    icon="delete-outline"
                    size={20}
                    onPress={() => setDeleteTarget(item)}
                    accessibilityLabel={t('common.delete')}
                  />
                ) : null}
              </View>
              <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, marginTop: 4 }}>
                {t('purchases.itemCount', { count: item.items?.length ?? 0 })}
              </Text>
            </Card.Content>
          </Card>
        )}
      />
      <FAB
        icon="plus"
        label={t('purchases.addFab')}
        style={{ position: 'absolute', right: 16, bottom: 16, backgroundColor: theme.colors.primary }}
        color={theme.colors.onPrimary}
        onPress={() => navigation.navigate('AddPurchase')}
      />
      <ConfirmModal
        visible={Boolean(deleteTarget)}
        title={t('purchases.deleteConfirmTitle')}
        message={t('purchases.deleteConfirmMessage')}
        onConfirm={handleDeletePurchase}
        onCancel={() => setDeleteTarget(null)}
        loading={deleting}
      />
    </View>
  );
}
