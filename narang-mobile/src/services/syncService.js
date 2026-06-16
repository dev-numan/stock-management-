import { createSale } from '../api/sales.api';
import {
  createCustomer,
  updateCustomer as updateCustomerApi,
  deleteCustomer as deleteCustomerApi,
} from '../api/customers.api';
import {
  createParty,
  updateParty as updatePartyApi,
  deleteParty as deletePartyApi,
  convertParty as convertPartyApi,
} from '../api/parties.api';
import {
  createProduct,
  updateProduct,
  deleteProduct,
  addProductStock as addProductStockApi,
} from '../api/products.api';
import {
  createSupplier as createSupplierApi,
  deleteSupplier as deleteSupplierApi,
  addSupplierPayment as addSupplierPaymentApi,
  addSupplierPurchase as addSupplierPurchaseApi,
  deleteSupplierPayment as deleteSupplierPaymentApi,
} from '../api/suppliers.api';
import { createPurchase as createPurchaseApi, deletePurchase as deletePurchaseApi } from '../api/purchases.api';
import {
  addCustomerAdvance as addCustomerAdvanceApi,
  addCustomerCreditCharge as addCustomerCreditChargeApi,
  deleteCustomerAdvanceEntry as deleteCustomerAdvanceEntryApi,
} from '../api/customers.api';
import { createExpense as createExpenseApi, deleteExpense as deleteExpenseApi } from '../api/expenses.api';
import { updateSettings as updateSettingsApi } from '../api/settings.api';
import { useSyncStore } from '../stores/syncStore';
import { useProductsStore } from '../stores/productsStore';
import { useCustomersStore } from '../stores/customersStore';
import { usePartiesStore } from '../stores/partiesStore';
import { useSuppliersStore } from '../stores/suppliersStore';
import { useExpensesStore } from '../stores/expensesStore';
import { usePurchasesStore } from '../stores/purchasesStore';
import { useSalesStore } from '../stores/salesStore';
import { useDashboardStore } from '../stores/dashboardStore';
import { getIsOnline } from '../stores/networkStore';
import { getFriendlyErrorMessage } from '../utils/apiErrors';
import { localDataService } from './localDataService';

// Drop a queued change after this many failed attempts so one permanently
// broken item can't loop forever and block the user's "pending" indicator.
const MAX_RETRIES = 5;

const isLocalId = (id) => typeof id === 'string' && id.startsWith('local-');

// Local→server id map ('local-supplier-123' → real uuid), filled as
// offline-created entities sync. Persisted to disk: a dependent op (e.g. a
// payment against an offline-created supplier) may sit in the queue across an
// app restart AFTER its CREATE already synced in a prior session — without a
// persisted map the in-memory one is empty on restart and the dependent write
// would be unresolvable and silently dropped.
const idMap = new Map();

export const hydrateIdMap = async () => {
  try {
    const meta = await localDataService.getMeta();
    if (meta?.idMap && typeof meta.idMap === 'object') {
      for (const [k, v] of Object.entries(meta.idMap)) idMap.set(k, v);
    }
  } catch {
    /* ignore */
  }
};

const persistIdMap = () => {
  localDataService.setMeta({ idMap: Object.fromEntries(idMap) }).catch(() => {});
};

const clearIdMap = () => {
  idMap.clear();
  localDataService.setMeta({ idMap: {} }).catch(() => {});
};

const registerId = (localId, serverId) => {
  if (!localId || !serverId) return;
  idMap.set(localId, serverId);
  persistIdMap();
};

// A local id whose CREATE hasn't synced yet. Flagged so the queue requeues the
// item WITHOUT counting a retry — waiting on a dependency must never drop the
// dependent write (the bug that lost offline payments after a restart).
const dependencyError = (message) => {
  const err = new Error(message);
  err.dependencyPending = true;
  return err;
};

const resolvePartyId = async (partyPayload, localPartyId) => {
  if (!partyPayload?.name) return null;
  if (localPartyId && idMap.has(localPartyId)) {
    return idMap.get(localPartyId);
  }
  const createFn =
    partyPayload.partyType === 'SUPPLIER'
      ? () => createParty({ ...partyPayload, partyType: 'SUPPLIER' })
      : () => createCustomer(partyPayload);
  const { data } = await createFn();
  const id = data.data.id;
  registerId(localPartyId, id);
  return id;
};

const resolveCustomerId = async (customerPayload, localCustomerId) =>
  resolvePartyId({ ...customerPayload, partyType: 'CUSTOMER' }, localCustomerId);

/** Map a possibly-local product id to its synced server id. */
const resolveProductId = (productId) => {
  if (!isLocalId(productId)) return productId;
  const mapped = idMap.get(productId);
  if (!mapped) throw dependencyError('Linked product is not synced yet — will retry.');
  return mapped;
};

/** Map a possibly-local party/customer/supplier id to its synced server id. */
const resolvePartyLikeId = (id) => {
  if (!isLocalId(id)) return id;
  const mapped = idMap.get(id);
  if (!mapped) throw dependencyError('Linked contact is not synced yet — will retry.');
  return mapped;
};

// supplierId on a payload may be absent (e.g. a purchase entered by supplier
// name only) — leave it untouched in that case.
const resolveOptionalPartyLikeId = (id) => (id == null ? id : resolvePartyLikeId(id));

const processCreateSale = async (payload) => {
  const { sale: salePayload, customer, localCustomerId, localSaleId } = payload;
  let customerId = salePayload.customerId || null;
  if (customer?.name) {
    customerId = await resolveCustomerId(customer, localCustomerId);
  }
  // Re-point any offline-created products to their real server ids.
  const items = (salePayload.items || []).map((i) => ({
    ...i,
    productId: resolveProductId(i.productId),
  }));
  const { data } = await createSale({
    ...salePayload,
    items,
    customerId,
    partyId: customerId,
  });
  if (localSaleId) {
    useSalesStore.getState().removePendingSale(localSaleId);
  }
  const createdSale = data.data;
  if (createdSale?.customer) {
    useCustomersStore.getState().patchCustomer(createdSale.customer);
  }
  return createdSale;
};

const processCreateParty = async (payload, localId) => {
  const { data } = await createParty(payload);
  const created = data.data;
  if (localId) {
    registerId(localId, created.id);
    usePartiesStore.setState({
      parties: usePartiesStore
        .getState()
        .parties.filter((p) => p.id !== localId)
        .concat(created),
    });
    if (created.partyType === 'CUSTOMER') {
      useCustomersStore.setState({
        customers: useCustomersStore
          .getState()
          .customers.filter((c) => c.id !== localId)
          .concat(created),
      });
    }
  }
  return created;
};

const processCreateCustomer = async (payload, localId) =>
  processCreateParty({ ...payload, partyType: 'CUSTOMER' }, localId);

const processCreateProduct = async (payload, localId) => {
  const { data } = await createProduct(payload);
  const created = data.data;
  if (localId) {
    registerId(localId, created.id);
    useProductsStore.setState({
      products: useProductsStore
        .getState()
        .products.filter((p) => p.id !== localId)
        .concat(created),
    });
  }
  return created;
};

const processCreateSupplier = async (payload, localId) => {
  const { data } = await createSupplierApi(payload);
  const created = data.data;
  if (localId) {
    registerId(localId, created.id);
    useSuppliersStore.setState({
      suppliers: useSuppliersStore
        .getState()
        .suppliers.filter((s) => s.id !== localId)
        .concat({ ...created, partyType: 'SUPPLIER' }),
    });
  }
  return created;
};

const processCreateExpense = async (payload, localId) => {
  const { data } = await createExpenseApi(payload);
  const created = data.data;
  if (localId) {
    // Drop the local placeholder; concat the server row unless this was a
    // duplicate replay (sentinel has no id — the post-sync refresh reloads it).
    const rest = useExpensesStore.getState().expenses.filter((e) => e.id !== localId);
    useExpensesStore.setState({
      expenses: created?.id ? rest.concat(created) : rest,
    });
  }
  return created;
};

const processCreatePurchase = async (payload, localId) => {
  const body = {
    ...payload,
    supplierId: resolveOptionalPartyLikeId(payload.supplierId),
    items: (payload.items || []).map((i) => ({ ...i, productId: resolveProductId(i.productId) })),
  };
  const { data } = await createPurchaseApi(body);
  const created = data.data;
  if (localId) {
    const rest = usePurchasesStore.getState().purchases.filter((p) => p.id !== localId);
    usePurchasesStore.setState({
      purchases: created?.id ? rest.concat(created) : rest,
    });
  }
  return created;
};

const processItem = async (item) => {
  switch (item.type) {
    case 'CREATE_SALE':
      return processCreateSale(item.payload);
    case 'CREATE_PARTY':
      return processCreateParty(item.payload, item.localId);
    case 'CREATE_CUSTOMER':
      return processCreateCustomer(item.payload, item.localId);
    case 'CREATE_PRODUCT':
      return processCreateProduct(item.payload, item.localId);
    case 'UPDATE_PRODUCT': {
      const { id, body } = item.payload;
      const { data } = await updateProduct(resolveProductId(id), body);
      return data.data;
    }
    case 'DELETE_PRODUCT': {
      const id = resolveProductId(item.payload.id);
      await deleteProduct(id);
      return { id };
    }
    case 'UPDATE_CUSTOMER': {
      const { id, body } = item.payload;
      const { data } = await updateCustomerApi(resolvePartyLikeId(id), body);
      return data.data;
    }
    case 'DELETE_CUSTOMER': {
      const id = resolvePartyLikeId(item.payload.id);
      await deleteCustomerApi(id);
      return { id };
    }
    case 'UPDATE_PARTY': {
      const { id, body } = item.payload;
      const { data } = await updatePartyApi(resolvePartyLikeId(id), body);
      return data.data;
    }
    case 'DELETE_PARTY': {
      const id = resolvePartyLikeId(item.payload.id);
      await deletePartyApi(id);
      return { id };
    }
    case 'CONVERT_PARTY': {
      const { id, partyType } = item.payload;
      const { data } = await convertPartyApi(resolvePartyLikeId(id), partyType);
      return data.data;
    }
    case 'ADD_PRODUCT_STOCK': {
      const { productId, body } = item.payload;
      const { data } = await addProductStockApi(resolveProductId(productId), {
        ...body,
        supplierId: resolveOptionalPartyLikeId(body.supplierId),
      });
      return data.data;
    }
    case 'CREATE_SUPPLIER':
      return processCreateSupplier(item.payload, item.localId);
    case 'DELETE_SUPPLIER': {
      const id = resolvePartyLikeId(item.payload.id);
      await deleteSupplierApi(id);
      return { id };
    }
    case 'ADD_SUPPLIER_PAYMENT': {
      const { supplierId, body } = item.payload;
      const { data } = await addSupplierPaymentApi(resolvePartyLikeId(supplierId), body);
      return data.data;
    }
    case 'ADD_SUPPLIER_PURCHASE': {
      const { supplierId, body } = item.payload;
      const { data } = await addSupplierPurchaseApi(resolvePartyLikeId(supplierId), body);
      return data.data;
    }
    case 'DELETE_SUPPLIER_PAYMENT': {
      const { supplierId, paymentId } = item.payload;
      await deleteSupplierPaymentApi(resolvePartyLikeId(supplierId), paymentId);
      return { id: paymentId };
    }
    case 'CREATE_PURCHASE':
      return processCreatePurchase(item.payload, item.localId);
    case 'DELETE_PURCHASE': {
      const { id } = item.payload;
      await deletePurchaseApi(id);
      return { id };
    }
    case 'ADD_CUSTOMER_ADVANCE': {
      const { customerId, body } = item.payload;
      const { data } = await addCustomerAdvanceApi(resolvePartyLikeId(customerId), body);
      return data.data;
    }
    case 'ADD_CUSTOMER_CREDIT_CHARGE': {
      const { customerId, body } = item.payload;
      const { data } = await addCustomerCreditChargeApi(resolvePartyLikeId(customerId), body);
      return data.data;
    }
    case 'DELETE_CUSTOMER_ADVANCE_ENTRY': {
      const { customerId, entryId } = item.payload;
      await deleteCustomerAdvanceEntryApi(resolvePartyLikeId(customerId), entryId);
      return { id: entryId };
    }
    case 'CREATE_EXPENSE':
      return processCreateExpense(item.payload, item.localId);
    case 'DELETE_EXPENSE': {
      const { id } = item.payload;
      await deleteExpenseApi(id);
      return { id };
    }
    case 'UPDATE_SETTINGS': {
      const { data } = await updateSettingsApi(item.payload);
      return data.data;
    }
    default:
      throw new Error(`Unknown sync type: ${item.type}`);
  }
};

export const processSyncQueue = async () => {
  if (!getIsOnline()) {
    return { synced: 0, failed: 0, alreadySynced: false };
  }

  // Guard against overlapping runs (e.g. rapid network flapping firing the
  // online handler repeatedly), which could process the queue twice.
  if (useSyncStore.getState().syncing) {
    return { synced: 0, failed: 0, alreadySynced: true };
  }
  useSyncStore.getState().setSyncing(true);

  try {
    await useSyncStore.getState().hydrate();
    // Restore local→server id mappings so dependent ops still resolve after a
    // restart, even when their CREATE synced in an earlier session.
    await hydrateIdMap();
    const sync = useSyncStore.getState();
    const { queue } = sync;

    if (!queue.length) {
      return { synced: 0, failed: 0, alreadySynced: true };
    }

    sync.setLastSyncError(null);

    let synced = 0;
    let failed = 0;
    let dropped = 0;
    const remaining = [];

    for (const item of queue) {
      try {
        await processItem(item);
        synced += 1;
      } catch (err) {
        const message = getFriendlyErrorMessage(err, 'Could not sync this change.');
        if (err?.dependencyPending) {
          // Waiting on a not-yet-synced CREATE — requeue as-is WITHOUT counting
          // a retry, so a legitimate dependency wait can never drop the write.
          remaining.push({ ...item, error: message });
          continue;
        }
        const retries = (item.retries || 0) + 1;
        if (retries >= MAX_RETRIES) {
          // Give up on this item so it stops blocking the queue forever.
          dropped += 1;
          console.error(`[sync] dropping ${item.type} after ${retries} attempts: ${message}`);
        } else {
          failed += 1;
          remaining.push({ ...item, error: message, retries });
        }
      }
    }

    sync.setQueue(remaining);
    sync.setLastSyncAt(new Date().toISOString());
    // Queue fully drained → no local ids can still be referenced; drop the
    // persisted map so it can't grow without bound.
    if (remaining.length === 0) clearIdMap();

    if (synced > 0) {
      useDashboardStore.getState().invalidateTrends();
      await Promise.all([
        useProductsStore.getState().fetchProducts(true),
        useCustomersStore.getState().fetchCustomers(true),
        usePartiesStore.getState().fetchParties(true),
        useSuppliersStore.getState().fetchSuppliers(true),
        useExpensesStore.getState().fetchExpenses(true),
        usePurchasesStore.getState().fetchPurchases(true),
        useSalesStore.getState().invalidateAll(),
        useDashboardStore.getState().fetchDashboard(true),
      ]);
    }

    if (dropped > 0) {
      sync.setLastSyncError(`${dropped} change(s) could not be synced and were discarded.`);
    } else if (failed > 0) {
      sync.setLastSyncError(`${failed} item(s) could not sync — will retry.`);
    }

    return {
      synced,
      failed,
      dropped,
      alreadySynced: synced === 0 && failed === 0 && dropped === 0,
    };
  } finally {
    useSyncStore.getState().setSyncing(false);
  }
};
