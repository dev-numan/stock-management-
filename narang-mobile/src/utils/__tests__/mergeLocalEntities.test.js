import { mergeServerWithLocal, isLocalEntityId } from '../mergeLocalEntities';

describe('mergeLocalEntities', () => {
  it('isLocalEntityId detects local ids', () => {
    expect(isLocalEntityId('local-customer-1')).toBe(true);
    expect(isLocalEntityId('uuid')).toBe(false);
  });

  it('mergeServerWithLocal keeps pending local rows', () => {
    const server = [{ id: 'a', name: 'Server A' }];
    const current = [
      { id: 'a', name: 'Server A' },
      { id: 'local-customer-9', name: 'Offline B', _local: true },
    ];
    const merged = mergeServerWithLocal(server, current);
    expect(merged).toHaveLength(2);
    expect(merged.find((r) => r.id === 'local-customer-9')?.name).toBe('Offline B');
  });

  it('mergeServerWithLocal drops local row once it appears on server', () => {
    const server = [{ id: 'real-id', name: 'Synced' }];
    const current = [{ id: 'local-customer-9', name: 'Old local', _local: true }];
    const pendingFromQueue = [
      { id: 'local-customer-9', name: 'From queue', _local: true },
    ];
    const merged = mergeServerWithLocal(server, current, { pendingFromQueue });
    expect(merged).toHaveLength(2);
  });
});
