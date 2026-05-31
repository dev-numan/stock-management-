import { createSale } from '../api/sales.api';
import { getIsOnline } from '../stores/networkStore';
import { useProductsStore } from '../stores/productsStore';
import { useSalesStore } from '../stores/salesStore';
import { useSyncStore } from '../stores/syncStore';
import { useDashboardStore } from '../stores/dashboardStore';
import { useCustomersStore } from '../stores/customersStore';
import { createClientRequestId } from '../utils/clientRequestId';
import { shouldQueueOffline } from '../utils/connectivity';

const buildLocalInvoiceNumber = () =>
  `LOCAL-${Date.now().toString(36).toUpperCase()}`;

const applySuccessfulSale = (sale, items) => {
  items.forEach((i) => {
    useProductsStore.getState().applyStockDelta(i.product.id, i.stockDeduction ?? i.quantity);
  });
  useSalesStore.getState().invalidateAll();
  useDashboardStore.getState().applySaleToDashboard(sale);
  useDashboardStore.getState().invalidateTrends();
  useDashboardStore.getState().invalidate();
  useDashboardStore.getState().fetchDashboard(true);

  if (sale.customer) {
    useCustomersStore.getState().patchCustomer(sale.customer);
  }

  return sale;
};

const completeSaleOffline = async ({
  items,
  discount,
  paymentMethod,
  notes,
  customer,
  customerId,
  salePayload,
  subtotal,
  totalAmount,
}) => {
  const deductionByProduct = new Map();
  for (const item of items) {
    const deduction = item.stockDeduction ?? item.quantity;
    const prev = deductionByProduct.get(item.product.id) ?? 0;
    deductionByProduct.set(item.product.id, prev + deduction);
  }
  for (const [productId, deduction] of deductionByProduct.entries()) {
    const product = useProductsStore.getState().getById(productId);
    const stock = Number(product?.currentStock ?? 0);
    if (stock < deduction) {
      throw new Error(`Insufficient stock for ${product?.name || 'product'}`);
    }
  }

  const localId = `local-sale-${Date.now()}`;
  const localCustomerId =
    customer?.id && String(customer.id).startsWith('local-') ? customer.id : null;

  const saleItems = items.map((i) => ({
    id: `li-${localId}-${i.lineKey || i.product.id}`,
    productId: i.product.id,
    quantity: i.quantity,
    soldUnit: i.soldUnit || i.product.unit,
    unitPrice: i.unitPrice,
    total: i.total,
    product: i.product,
  }));

  const localSale = {
    id: localId,
    localId,
    pendingSync: true,
    invoiceNumber: buildLocalInvoiceNumber(),
    customer,
    customerId,
    subtotal,
    discount,
    taxPercent: 0,
    taxAmount: 0,
    totalAmount,
    paymentMethod,
    notes: notes || null,
    createdAt: new Date().toISOString(),
    items: saleItems,
    clientRequestId: salePayload.clientRequestId,
  };

  const stockDeltas = new Map();
  items.forEach((i) => {
    const deduction = i.stockDeduction ?? i.quantity;
    stockDeltas.set(i.product.id, (stockDeltas.get(i.product.id) ?? 0) + deduction);
  });
  stockDeltas.forEach((deduction, productId) => {
    useProductsStore.getState().applyStockDelta(productId, deduction);
  });

  useSalesStore.getState().addPendingSale(localSale);
  useDashboardStore.getState().invalidate();
  useDashboardStore.getState().invalidateTrends();

  useSyncStore.getState().enqueue({
    type: 'CREATE_SALE',
    payload: {
      sale: salePayload,
      customer: customer
        ? {
            name: customer.name,
            ...(customer.phone ? { phone: customer.phone } : {}),
            ...(customer.address ? { address: customer.address } : {}),
          }
        : null,
      localCustomerId,
      localSaleId: localId,
    },
  });

  return localSale;
};

export const completeSale = async ({
  items,
  discount,
  paymentMethod,
  notes,
  selectedCustomer,
}) => {
  const subtotal = items.reduce((sum, i) => sum + i.total, 0);
  const totalAmount = subtotal - discount;

  let customerId = null;
  let customer = null;

  if (selectedCustomer?.id) {
    customerId = selectedCustomer.id;
    const address = selectedCustomer.address?.trim() || '';

    if (selectedCustomer.id && !String(selectedCustomer.id).startsWith('local-')) {
      try {
        const updated = await useCustomersStore
          .getState()
          .updateCustomer(selectedCustomer.id, { address });
        customer = updated;
        customerId = updated.id;
      } catch {
        customer = {
          id: selectedCustomer.id,
          name: selectedCustomer.name,
          phone: selectedCustomer.phone,
          address: address || null,
        };
      }
    } else {
      customer = {
        id: selectedCustomer.id,
        name: selectedCustomer.name,
        phone: selectedCustomer.phone,
        address: address || null,
      };
      if (String(selectedCustomer.id).startsWith('local-')) {
        useCustomersStore.getState().updateCustomer(selectedCustomer.id, { address });
      }
    }
  }

  const clientRequestId = createClientRequestId();
  const salePayload = {
    clientRequestId,
    customerId: customerId && !String(customerId).startsWith('local-') ? customerId : null,
    discount,
    taxPercent: 0,
    paymentMethod,
    notes: notes || null,
    items: items.map((i) => ({
      productId: i.product.id,
      quantity: i.quantity,
      soldUnit: i.soldUnit || i.product.unit,
      unitPrice: i.unitPrice,
    })),
  };

  const hasLocalCustomer = String(customerId || '').startsWith('local-');
  const canTryServer = getIsOnline() && !hasLocalCustomer;

  if (canTryServer) {
    try {
      const { data } = await createSale(salePayload);
      return applySuccessfulSale(data.data, items);
    } catch (err) {
      if (!shouldQueueOffline(err)) throw err;
    }
  }

  return completeSaleOffline({
    items,
    discount,
    paymentMethod,
    notes,
    customer,
    customerId,
    salePayload,
    subtotal,
    totalAmount,
  });
};
