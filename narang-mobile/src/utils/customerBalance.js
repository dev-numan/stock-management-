import { useSalesStore } from '../stores/salesStore';

/** Running account balance; negative = customer owes after credit sales. */
export const getEffectiveAdvanceBalance = (customer, { excludePendingSaleId } = {}) => {
  if (!customer?.id) return 0;

  const base = Number(customer.advanceBalance ?? 0);
  const pendingCredit = useSalesStore
    .getState()
    .pendingSales.filter(
      (s) =>
        s.pendingSync &&
        s.paymentMethod === 'CREDIT' &&
        s.id !== excludePendingSaleId &&
        (s.customerId === customer.id ||
          s.customer?.id === customer.id ||
          (customer.phone &&
            s.customer?.phone &&
            s.customer.phone === customer.phone))
    )
    .reduce((sum, s) => sum + Number(s.totalAmount), 0);

  return base - pendingCredit;
};
