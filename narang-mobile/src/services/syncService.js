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

const customerIdMap = new Map();

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

const processCreateSale = async (payload) => {
  const { sale: salePayload, customer, localCustomerId, localSaleId } = payload;
  let customerId = salePayload.customerId || null;
  if (customer?.name) {
    customerId = await resolveCustomerId(customer, localCustomerId);
  }
  const { data } = await createSale({
    ...salePayload,
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

const processItem = async (item) => {
  switch (item.type) {
    case 'CREATE_SALE':
      return processCreateSale(item.payload);
    case 'CREATE_CUSTOMER':
      return processCreateCustomer(item.payload, item.localId);
    case 'CREATE_PRODUCT': {
      const { data } = await createProduct(item.payload);
      return data.data;
    }
    case 'UPDATE_PRODUCT': {
      const { id, body } = item.payload;
      const { data } = await updateProduct(id, body);
      return data.data;
    }
    case 'DELETE_PRODUCT': {
      await deleteProduct(item.payload.id);
      return { id: item.payload.id };
    }
    default:
      throw new Error(`Unknown sync type: ${item.type}`);
  }
};

export const processSyncQueue = async () => {
  if (!getIsOnline()) {
    return { synced: 0, failed: 0, alreadySynced: false };
  }

  await useSyncStore.getState().hydrate();
  const sync = useSyncStore.getState();
  const { queue } = sync;

  if (!queue.length) {
    return { synced: 0, failed: 0, alreadySynced: true };
  }

  sync.setSyncing(true);
  sync.setLastSyncError(null);

  let synced = 0;
  let failed = 0;
  const remaining = [];

  for (const item of queue) {
    try {
      await processItem(item);
      synced += 1;
    } catch (err) {
      failed += 1;
      const message = getFriendlyErrorMessage(err, 'Could not sync this change.');
      remaining.push({
        ...item,
        error: message,
        retries: (item.retries || 0) + 1,
      });
    }
  }

  sync.setQueue(remaining);
  sync.setSyncing(false);
  sync.setLastSyncAt(new Date().toISOString());

  if (synced > 0) {
    await Promise.all([
      useProductsStore.getState().fetchProducts(true),
      useCustomersStore.getState().fetchCustomers(true),
      useSalesStore.getState().invalidateAll(),
      useDashboardStore.getState().fetchDashboard(true),
    ]);
  }

  if (failed > 0) {
    sync.setLastSyncError(`${failed} item(s) could not sync`);
  }

  return {
    synced,
    failed,
    alreadySynced: synced === 0 && failed === 0 && queue.length === 0,
  };
};
