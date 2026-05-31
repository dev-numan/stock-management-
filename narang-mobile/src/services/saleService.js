import { createSale } from '../api/sales.api';
import { getIsOnline } from '../stores/networkStore';
import { useProductsStore } from '../stores/productsStore';
import { useSalesStore } from '../stores/salesStore';
import { useSyncStore } from '../stores/syncStore';
import { useDashboardStore } from '../stores/dashboardStore';
import { useCustomersStore } from '../stores/customersStore';

const buildLocalInvoiceNumber = () =>
  `LOCAL-${Date.now().toString(36).toUpperCase()}`;

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

  const salePayload = {
    customerId: customerId && !String(customerId).startsWith('local-') ? customerId : null,
    discount,
    taxPercent: 0,
    paymentMethod,
    notes: notes || null,
    items: items.map((i) => ({
      productId: i.product.id,
      quantity: i.quantity,
      unitPrice: i.unitPrice,
    })),
  };

  if (getIsOnline() && !String(customerId || '').startsWith('local-')) {
    const { data } = await createSale(salePayload);
    const sale = data.data;

    items.forEach((i) => {
      useProductsStore.getState().applyStockDelta(i.product.id, i.quantity);
    });
    useSalesStore.getState().invalidateAll();
    // Instant UI updates (Dashboard + graph) without waiting for refetch.
    useDashboardStore.getState().applySaleToDashboard(sale);
    useDashboardStore.getState().invalidateTrends();
    // Still refetch dashboard to ensure server-calculated fields stay correct.
    useDashboardStore.getState().invalidate();
    useDashboardStore.getState().fetchDashboard(true);

    if (sale.customer) {
      useCustomersStore.getState().patchCustomer(sale.customer);
    }

    return sale;
  }

  for (const item of items) {
    const product = useProductsStore.getState().getById(item.product.id);
    const stock = Number(product?.currentStock ?? 0);
    if (stock < item.quantity) {
      throw new Error(`Insufficient stock for ${product?.name || 'product'}`);
    }
  }

  const localId = `local-sale-${Date.now()}`;
  const localCustomerId =
    customer?.id && String(customer.id).startsWith('local-') ? customer.id : null;

  const saleItems = items.map((i) => ({
    id: `li-${localId}-${i.product.id}`,
    productId: i.product.id,
    quantity: i.quantity,
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
  };

  items.forEach((i) => {
    useProductsStore.getState().applyStockDelta(i.product.id, i.quantity);
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
