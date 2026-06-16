import { getIsOnline } from '../stores/networkStore';
import { useSyncStore } from '../stores/syncStore';
import { shouldQueueOffline } from '../utils/connectivity';

/**
 * Run a write online, or persist it to the offline queue so it uploads on
 * reconnect. This is the single place every mutation funnels through so the
 * offline behaviour stays consistent:
 *
 *   - Online: call `online()`. If it succeeds, return the server result. If it
 *     fails with a network/timeout error (not a 4xx/5xx business error), fall
 *     through to the offline path so a flaky connection never loses the write.
 *   - Offline (or after a network failure): run `optimistic()` to patch the
 *     persisted stores immediately, then enqueue `{ type, payload, localId }`
 *     for `syncService` to replay later.
 *
 * @param {Object}   opts
 * @param {Function} opts.online      async fn performing the API call → server result
 * @param {string}   opts.type        sync queue op type (handled in syncService)
 * @param {Object}   opts.payload     data the sync handler needs to replay the op
 * @param {string}   [opts.localId]   local id of an offline-created entity, if any
 * @param {Function} [opts.optimistic] patches local stores on the offline path
 * @returns {Promise<{ queued: boolean, result?: any }>}
 */
export const queueOrRun = async ({ online, type, payload, localId, optimistic }) => {
  if (getIsOnline()) {
    try {
      const result = await online();
      return { queued: false, result };
    } catch (err) {
      if (!shouldQueueOffline(err)) throw err;
      // Network died mid-request — fall through and queue it instead of failing.
    }
  }

  optimistic?.();
  useSyncStore.getState().enqueue({ type, payload, localId });
  return { queued: true };
};
