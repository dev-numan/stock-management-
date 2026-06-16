import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  ScrollView,
  RefreshControl,
  Platform,
  Keyboard,
  Alert,
} from 'react-native';
import { Text, Card, Searchbar, Chip, useTheme } from 'react-native-paper';
import { useFocusEffect } from '@react-navigation/native';
import {
  getSupplier,
  getSupplierLedger,
  getSupplierDeletionBlockers,
} from '../../api/suppliers.api';
import { formatCurrency } from '../../utils/formatCurrency';
import AppButton from '../../components/common/AppButton';
import ErrorMessage from '../../components/common/ErrorMessage';
import EmptyState from '../../components/common/EmptyState';
import { CustomerDetailSkeleton, SkeletonCard, SkeletonLine } from '../../components/common/Skeleton';
import SupplierLedgerEntryRow from '../../components/suppliers/SupplierLedgerEntryRow';
import AddSupplierPaymentModal from '../../components/suppliers/AddSupplierPaymentModal';
import AddSupplierPurchaseModal from '../../components/suppliers/AddSupplierPurchaseModal';
import ConfirmModal from '../../components/common/ConfirmModal';
import SupplierDeletionBlockedModal from '../../components/suppliers/SupplierDeletionBlockedModal';
import PartyNetBalanceCard from '../../components/parties/PartyNetBalanceCard';
import { RECEIPT_GREEN } from '../../components/invoice/thermalReceiptShared';
import { collectSupplierProductNames } from '../../utils/supplierLedger';
import { getFriendlyErrorMessage } from '../../utils/apiErrors';
import { useAuth } from '../../context/AuthContext';
import { useProductsStore } from '../../stores/productsStore';
import { useSuppliersStore } from '../../stores/suppliersStore';
import { usePurchasesStore } from '../../stores/purchasesStore';
import { useDashboardStore } from '../../stores/dashboardStore';
import { useTranslation } from '../../i18n/useTranslation';
import { exportSupplierLedgerPdf } from '../../utils/generateDetailPDF';
import { useOfflineCacheStore } from '../../stores/offlineCacheStore';
import { getIsOnline } from '../../stores/networkStore';
import { mergePendingSupplierLedger } from '../../utils/pendingLedgerMerge';

export default function SupplierDetailScreen({ route, navigation }) {
  const theme = useTheme();
  const { supplierId, supplier: initialSupplier, readOnly = false } = route.params;
  const { t, isRtl } = useTranslation();
  const { isAdmin } = useAuth();
  const fetchProducts = useProductsStore((s) => s.fetchProducts);
  const upsertSupplier = useSuppliersStore((s) => s.upsertSupplier);
  const deleteSupplier = useSuppliersStore((s) => s.deleteSupplier);
  const addPayment = useSuppliersStore((s) => s.addPayment);
  const addPurchase = useSuppliersStore((s) => s.addPurchase);
  const deletePayment = useSuppliersStore((s) => s.deletePayment);
  const deletePurchaseEntry = usePurchasesStore((s) => s.deletePurchase);
  const invalidateDashboard = useDashboardStore((s) => s.invalidate);
  const textDir = { writingDirection: isRtl ? 'rtl' : 'ltr' };

  const [supplier, setSupplier] = useState(initialSupplier);
  const [allLedger, setAllLedger] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [paymentVisible, setPaymentVisible] = useState(false);
  const [paymentSaving, setPaymentSaving] = useState(false);
  const [purchaseVisible, setPurchaseVisible] = useState(false);
  const [purchaseSaving, setPurchaseSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [showDeleteSupplier, setShowDeleteSupplier] = useState(false);
  const [showDeleteSupplierBlocked, setShowDeleteSupplierBlocked] = useState(false);
  const [deleteSupplierBlockers, setDeleteSupplierBlockers] = useState({ products: [], purchases: [] });
  const [deleteSupplierChecking, setDeleteSupplierChecking] = useState(false);
  const [deletingSupplier, setDeletingSupplier] = useState(false);
  const [exportingPdf, setExportingPdf] = useState(false);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const isLocal = String(supplierId).startsWith('local-');

      if (!isLocal && getIsOnline()) {
        const [supplierRes, ledgerRes] = await Promise.all([
          getSupplier(supplierId),
          getSupplierLedger(supplierId),
        ]);
        const freshSupplier = supplierRes.data.data;
        const ledgerData = ledgerRes.data.data || [];
        setSupplier(freshSupplier);
        setAllLedger(ledgerData);
        useOfflineCacheStore.getState().patchSupplierLedger(supplierId, ledgerData);
        upsertSupplier(freshSupplier);
      } else {
        let freshSupplier = initialSupplier || useSuppliersStore.getState().getById(supplierId);
        setSupplier(freshSupplier);
        if (!isLocal) {
          const cached = mergePendingSupplierLedger(
            supplierId,
            useOfflineCacheStore.getState().getSupplierLedger(supplierId)
          );
          setAllLedger(cached);
        } else {
          setAllLedger([]);
        }
        if (freshSupplier) upsertSupplier(freshSupplier);
      }
    } catch (err) {
      setError(getFriendlyErrorMessage(err, t('supplier.loadFailed')));
    } finally {
      setLoading(false);
    }
  }, [supplierId, initialSupplier, t, upsertSupplier]);

  const ledger = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return allLedger;
    return allLedger.filter(
      (e) =>
        (e.notes && e.notes.toLowerCase().includes(q)) ||
        String(e.amount).includes(q)
    );
  }, [allLedger, search]);

  const stockProducts = useMemo(() => collectSupplierProductNames(allLedger), [allLedger]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const payableBalance = Number(supplier?.payableBalance ?? 0);
  const totalPurchases = Number(supplier?.totalPurchases ?? 0);
  const totalPayments = Number(supplier?.totalPayments ?? 0);

  // Reflect a queued (offline) ledger change on this screen immediately, since
  // the server ledger can't be re-fetched until we're back online.
  const applyLocalLedger = (type, amount, notes) => {
    const purchase = type === 'PURCHASE' ? Number(amount) : 0;
    const payment = type === 'PAYMENT' ? Number(amount) : 0;
    setSupplier((s) =>
      s
        ? {
            ...s,
            totalPurchases: Number(s.totalPurchases ?? 0) + purchase,
            totalPayments: Number(s.totalPayments ?? 0) + payment,
            payableBalance: Number(s.payableBalance ?? 0) + purchase - payment,
          }
        : s
    );
    const entry = {
      id: `local-ledger-${Date.now()}`,
      type,
      amount: Number(amount),
      notes: notes || null,
      createdAt: new Date().toISOString(),
      _pending: true,
    };
    useOfflineCacheStore.getState().appendSupplierLedgerEntry(supplierId, entry);
    setAllLedger((prev) => [entry, ...prev]);
  };

  const handlePayment = async ({ amount, notes }) => {
    try {
      setPaymentSaving(true);
      setError(null);
      const { queued } = await addPayment(supplierId, { amount, notes });
      setPaymentVisible(false);
      if (queued) applyLocalLedger('PAYMENT', amount, notes);
      else await load();
    } catch (err) {
      setError(getFriendlyErrorMessage(err, t('supplier.paymentFailed')));
    } finally {
      setPaymentSaving(false);
    }
  };

  const handlePurchase = async ({ amount, notes }) => {
    try {
      setPurchaseSaving(true);
      setError(null);
      const { queued } = await addPurchase(supplierId, { amount, notes });
      setPurchaseVisible(false);
      if (queued) applyLocalLedger('PURCHASE', amount, notes);
      else await load();
    } catch (err) {
      setError(getFriendlyErrorMessage(err, t('supplier.purchaseFailed')));
    } finally {
      setPurchaseSaving(false);
    }
  };

  const handleConfirmDeleteEntry = async () => {
    if (!deleteTarget) return;
    try {
      setDeleting(true);
      setError(null);
      let queued = false;
      if (deleteTarget.type === 'PAYMENT') {
        ({ queued } = await deletePayment(supplierId, deleteTarget.id, Number(deleteTarget.amount ?? 0)));
      } else {
        ({ queued } = await deletePurchaseEntry(deleteTarget.id, {
          supplierId,
          amount: Number(deleteTarget.amount ?? 0),
        }));
        // Deleting a stock purchase reverses stock — refresh products and let
        // the dashboard recompute inventory valuation / low-stock counts.
        if (!queued) await fetchProducts(true);
        invalidateDashboard();
      }
      const removedId = deleteTarget.id;
      setDeleteTarget(null);
      if (queued) {
        setAllLedger((prev) => prev.filter((e) => e.id !== removedId));
        useOfflineCacheStore.getState().removeSupplierLedgerEntry(supplierId, removedId);
      } else {
        await load();
      }
    } catch (err) {
      setError(getFriendlyErrorMessage(err, t('ledgerEntry.deleteFailed')));
    } finally {
      setDeleting(false);
    }
  };

  const deleteConfirmMessage =
    deleteTarget?.type === 'PAYMENT'
      ? t('supplier.deletePaymentConfirmMessage')
      : t('supplier.deletePurchaseConfirmMessage');

  const handleDeleteSupplierPress = async () => {
    if (!getIsOnline()) {
      setShowDeleteSupplier(true);
      return;
    }
    try {
      setDeleteSupplierChecking(true);
      setError(null);
      const { data } = await getSupplierDeletionBlockers(supplierId);
      const blockers = data.data;
      if (!blockers?.canDelete) {
        setDeleteSupplierBlockers({
          products: blockers?.products || [],
          purchases: blockers?.purchases || [],
        });
        setShowDeleteSupplierBlocked(true);
        return;
      }
      setShowDeleteSupplier(true);
    } catch (err) {
      setError(getFriendlyErrorMessage(err, t('supplier.deleteFailed')));
    } finally {
      setDeleteSupplierChecking(false);
    }
  };

  const handleDeleteSupplier = async () => {
    try {
      setDeletingSupplier(true);
      setError(null);
      await deleteSupplier(supplierId);
      setShowDeleteSupplier(false);
      navigation.goBack();
    } catch (err) {
      const blockerData = err?.response?.data?.data;
      if (err?.response?.status === 409 && blockerData) {
        setDeleteSupplierBlockers({
          products: blockerData.products || [],
          purchases: blockerData.purchases || [],
        });
        setShowDeleteSupplier(false);
        setShowDeleteSupplierBlocked(true);
        return;
      }
      setError(getFriendlyErrorMessage(err, t('supplier.deleteFailed')));
    } finally {
      setDeletingSupplier(false);
    }
  };

  const openBlockedProduct = (product) => {
    setShowDeleteSupplierBlocked(false);
    navigation.navigate('Stock', {
      screen: 'AddEditProduct',
      params: { product: { id: product.id, name: product.name } },
    });
  };

  const handleExportPdf = useCallback(async () => {
    if (!supplier) return;
    setExportingPdf(true);
    try {
      await exportSupplierLedgerPdf({ supplier, ledger: allLedger });
    } catch {
      Alert.alert(t('ledgerReport.export'), t('reports.exportFailed'));
    } finally {
      setExportingPdf(false);
    }
  }, [supplier, allLedger, t]);

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

        <PartyNetBalanceCard party={supplier} />

        <AppButton
          title={t('ledgerReport.export')}
          variant="outline"
          icon="file-pdf-box"
          loading={exportingPdf}
          disabled={exportingPdf}
          onPress={handleExportPdf}
          style={{ marginTop: 12, marginBottom: 12 }}
        />

        <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12 }}>
          <Card mode="elevated" style={{ flex: 1, borderRadius: theme.roundness }}>
            <Card.Content>
              <Text variant="labelMedium" style={{ color: theme.colors.onSurfaceVariant, ...textDir }}>
                {t('supplier.col.purchase')}
              </Text>
              <Text variant="titleMedium" style={{ fontWeight: '700', color: theme.colors.error, marginTop: 4 }}>
                {formatCurrency(totalPurchases)}
              </Text>
            </Card.Content>
          </Card>
          <Card mode="elevated" style={{ flex: 1, borderRadius: theme.roundness }}>
            <Card.Content>
              <Text variant="labelMedium" style={{ color: theme.colors.onSurfaceVariant, ...textDir }}>
                {t('supplier.col.payment')}
              </Text>
              <Text variant="titleMedium" style={{ fontWeight: '700', color: RECEIPT_GREEN, marginTop: 4 }}>
                {formatCurrency(totalPayments)}
              </Text>
            </Card.Content>
          </Card>
        </View>

        {stockProducts.length > 0 ? (
          <Card mode="elevated" style={{ marginBottom: 12, borderRadius: theme.roundness }}>
            <Card.Content>
              <Text variant="titleSmall" style={{ fontWeight: '700', marginBottom: 8, ...textDir }}>
                {t('supplier.stockFrom')}
              </Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                {stockProducts.map((name) => (
                  <Chip key={name} compact style={{ marginBottom: 2 }}>
                    {name}
                  </Chip>
                ))}
              </View>
            </Card.Content>
          </Card>
        ) : null}

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
            <Text style={{ width: 72, textAlign: 'center', fontWeight: '700', fontSize: 12, color: RECEIPT_GREEN, ...textDir }}>
              {t('supplier.col.payment')}
            </Text>
            <Text style={{ width: 72, textAlign: 'center', fontWeight: '700', fontSize: 12, color: theme.colors.error, ...textDir }}>
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
            ledger.map((entry) => (
              <SupplierLedgerEntryRow
                key={`${entry.type}-${entry.id}`}
                entry={entry}
                canDelete={isAdmin && !readOnly}
                onDelete={setDeleteTarget}
              />
            ))
          )}
        </Card>

        {isAdmin && !readOnly ? (
          <AppButton
            title={t('supplier.delete')}
            variant="danger"
            onPress={handleDeleteSupplierPress}
            loading={deleteSupplierChecking}
            style={{ marginTop: 16 }}
            icon="delete-outline"
          />
        ) : null}
      </ScrollView>

      {!readOnly ? (
      <View
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 0,
          padding: 12,
          paddingBottom: Platform.OS === 'ios' ? 24 : 12,
          backgroundColor: theme.colors.surface,
          borderTopWidth: 1,
          borderTopColor: theme.colors.outlineVariant,
        }}
      >
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <View style={{ flex: 1 }}>
            <AppButton
              title={t('supplier.purchaseRs')}
              onPress={() => setPurchaseVisible(true)}
              buttonColor={theme.colors.error}
              icon="cart-plus"
            />
          </View>
          <View style={{ flex: 1 }}>
            <AppButton
              title={t('supplier.paymentRs')}
              onPress={() => setPaymentVisible(true)}
              buttonColor={RECEIPT_GREEN}
              icon="cash-minus"
            />
          </View>
        </View>
      </View>
      ) : null}

      <AddSupplierPurchaseModal
        visible={purchaseVisible}
        supplierName={supplier?.name}
        onSubmit={handlePurchase}
        onClose={() => setPurchaseVisible(false)}
        loading={purchaseSaving}
      />
      <AddSupplierPaymentModal
        visible={paymentVisible}
        supplierName={supplier?.name}
        onSubmit={handlePayment}
        onClose={() => setPaymentVisible(false)}
        loading={paymentSaving}
      />
      <ConfirmModal
        visible={Boolean(deleteTarget)}
        title={
          deleteTarget?.type === 'PAYMENT'
            ? t('supplier.deletePaymentConfirmTitle')
            : t('supplier.deletePurchaseConfirmTitle')
        }
        message={deleteConfirmMessage}
        onConfirm={handleConfirmDeleteEntry}
        onCancel={() => setDeleteTarget(null)}
        loading={deleting}
      />
      <ConfirmModal
        visible={showDeleteSupplier}
        title={t('supplier.deleteConfirmTitle')}
        message={t('supplier.deleteConfirmMessage')}
        onConfirm={handleDeleteSupplier}
        onCancel={() => setShowDeleteSupplier(false)}
        loading={deletingSupplier}
      />
      <SupplierDeletionBlockedModal
        visible={showDeleteSupplierBlocked}
        supplierName={supplier?.name}
        products={deleteSupplierBlockers.products}
        purchases={deleteSupplierBlockers.purchases}
        onClose={() => setShowDeleteSupplierBlocked(false)}
        onOpenProduct={openBlockedProduct}
      />
    </View>
  );
}
