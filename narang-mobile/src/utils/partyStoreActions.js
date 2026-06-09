import { usePartiesStore } from '../stores/partiesStore';
import { useCustomersStore } from '../stores/customersStore';
import { useSuppliersStore } from '../stores/suppliersStore';

/** Drop a party from parties, customers, and suppliers caches immediately after delete. */
export function removePartyEverywhere(id) {
  if (!id) return;

  usePartiesStore.setState({
    parties: usePartiesStore.getState().parties.filter((p) => p.id !== id),
    lastFetched: Date.now(),
  });

  useCustomersStore.setState({
    customers: useCustomersStore.getState().customers.filter((c) => c.id !== id),
    lastFetched: Date.now(),
  });

  useSuppliersStore.setState({
    suppliers: useSuppliersStore.getState().suppliers.filter((s) => s.id !== id),
  });
}
