import { matchesPartySearch, findDuplicateParty, findExistingPartyByPhone } from '../partySearch';

describe('partySearch', () => {
  const parties = [
    { id: 'abc-123-def', name: 'Nomi', phone: '03001234567', partyType: 'CUSTOMER' },
    { id: 'xyz-789', name: 'Ali', phone: '+92 300 9876543', partyType: 'SUPPLIER' },
  ];

  it('matches by normalized phone digits', () => {
    expect(matchesPartySearch({ name: 'Nomi', phone: '03001234567' }, '3001234567')).toBe(true);
    expect(matchesPartySearch({ name: 'Ali', phone: '+92 300 9876543' }, '9876543')).toBe(true);
  });

  it('matches by party id fragment', () => {
    expect(
      matchesPartySearch({ id: 'abc-123-def', name: 'Nomi', rawParty: parties[0] }, 'abc-123')
    ).toBe(true);
  });

  it('finds duplicate by phone', () => {
    expect(findExistingPartyByPhone(parties, '03001234567')?.id).toBe('abc-123-def');
    expect(findDuplicateParty(parties, { phone: '3001234567' })?.name).toBe('Nomi');
    expect(findDuplicateParty(parties, { phone: '03009999999' })).toBeNull();
  });
});
