import { processSyncQueue } from './syncService';
import { useSyncStore } from '../stores/syncStore';
import { getIsOnline } from '../stores/networkStore';

/** Upload pending local writes to the server (More → Backup data). */
export async function backupPendingData() {
  if (!getIsOnline()) {
    return { synced: 0, failed: 0, alreadySynced: false, offline: true };
  }

  await useSyncStore.getState().hydrate();
  const pendingBefore = useSyncStore.getState().queue.length;

  if (pendingBefore === 0) {
    return { synced: 0, failed: 0, alreadySynced: true, offline: false };
  }

  const result = await processSyncQueue();
  const pendingAfter = useSyncStore.getState().queue.length;

  return {
    ...result,
    alreadySynced: pendingBefore === 0,
    offline: false,
    pendingRemaining: pendingAfter,
  };
}
