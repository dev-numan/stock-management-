import { createSale } from '../api/sales.api';
import { createCustomer } from '../api/customers.api';
import { createProduct, updateProduct, deleteProduct } from '../api/products.api';
import { useSyncStore } from '../stores/syncStore';
import { useProductsStore } from '../stores/productsStore';
import { useCustomersStore } from '../stores/customersStore';
import { useSalesStore } from '../stores/salesStore';
import { useDashboardStore } from '../stores/dashboardStore';
import { getIsOnline } from '../stores/networkStore';
import { getFriendlyErrorMessage } from '../utils/apiErrors';

// Drop a queued change after this many failed attempts so one permanently
// broken item can't loop forever and block the user's "pending" indicator.
const MAX_RETRIES = 5;

const isLocalId = (id) => typeof id === 'string' && id.startsWith('local-');

// Local→server id maps, populated as offline-created entities are synced.
const customerIdMap = new Map();
const productIdMap = new Map();

const resolveCustomerId = async (customerPayload, localCustomerId) => {
  if (!customerPayload?.name) return null;
  if (localCustomerId && customerIdMap.has(localCustomerId)) {
    return customerIdMap.get(localCustomerId);
  }
  const { data } = await createCustomer(customerPayload);
  const id = data.data.id;
  if (localCustomerId) customerIdMap.set(localCustomerId, id);
  return id;
};

/**
 * Map a possibly-local product id to its synced server id. Throws if the
 * product was created offline but hasn't synced yet, so the dependent item
 * stays queued and retries once the CREATE_PRODUCT ahead of it succeeds.
 */
const resolveProductId = (productId) => {
  if (!isLocalId(productId)) return productId;
  const mapped = productIdMap.get(productId);
  if (!mapped) {
    throw new Error('Linked product is not synced yet — will retry.');
  }
  return mapped;
};

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

const processCreateCustomer = async (payload, localId) => {
  const { data } = await createCustomer(payload);
  const created = data.data;
  if (localId) {
    customerIdMap.set(localId, created.id);
    useCustomersStore.setState({
      customers: useCustomersStore
        .getState()
        .customers.filter((c) => c.id !== localId)
        .concat(created),
    });
  }
  return created;
};

const processCreateProduct = async (payload, localId) => {
  const { data } = await createProduct(payload);
  const created = data.data;
  if (localId) {
    productIdMap.set(localId, created.id);
    useProductsStore.setState({
      products: useProductsStore
        .getState()
        .products.filter((p) => p.id !== localId)
        .concat(created),
    });
  }
  return created;
};

const processItem = async (item) => {
  switch (item.type) {
    case 'CREATE_SALE':
      return processCreateSale(item.payload);
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
        const retries = (item.retries || 0) + 1;
        const message = getFriendlyErrorMessage(err, 'Could not sync this change.');
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

    if (synced > 0) {
      useDashboardStore.getState().invalidateTrends();
      await Promise.all([
        useProductsStore.getState().fetchProducts(true),
        useCustomersStore.getState().fetchCustomers(true),
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
