import { useMemo, useCallback, useEffect } from 'react';
import { usePartiesStore } from '../stores/partiesStore';
import { usePhoneContacts } from './usePhoneContacts';
import { buildPartyContactPickerItems } from '../utils/partyPickerItems';
import { getPartyNetDisplayBalance } from '../utils/partyNetBalance';

/** Saved parties + phone contacts for customer/supplier list screens. */
export function usePartyContactList() {
  const parties = usePartiesStore((s) => s.parties);
  const partiesLoading = usePartiesStore((s) => s.loading);
  const partiesError = usePartiesStore((s) => s.error);
  const fetchParties = usePartiesStore((s) => s.fetchParties);

  const { contacts, loading: contactsLoading, permissionDenied, error: contactsError, loadContacts } =
    usePhoneContacts();

  const refresh = useCallback(() => {
    fetchParties(true);
    loadContacts();
  }, [fetchParties, loadContacts]);

  useEffect(() => {
    fetchParties();
    loadContacts();
  }, [fetchParties, loadContacts]);

  const rows = useMemo(
    () =>
      buildPartyContactPickerItems(parties, contacts).map((row) => ({
        ...row,
        createdAt: row.rawParty?.createdAt ?? null,
      })),
    [parties, contacts]
  );

  const getBalance = useCallback((row) => {
    if (row.source === 'contact') return 0;
    return getPartyNetDisplayBalance(row.rawParty);
  }, []);

  return {
    rows,
    parties,
    loading: partiesLoading || contactsLoading,
    error: partiesError || contactsError,
    permissionDenied,
    refresh,
    getBalance,
  };
}
