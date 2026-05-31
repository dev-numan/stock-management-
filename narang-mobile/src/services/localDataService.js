import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system/legacy';

const BASE_DIR = `${FileSystem.documentDirectory}narang/local/`;
const CACHE_DIR = `${BASE_DIR}cache/`;
const PENDING_PATH = `${BASE_DIR}pending-writes.json`;
const META_PATH = `${BASE_DIR}meta.json`;
const LEGACY_SYNC_KEY = 'narang-sync-queue';

let initPromise = null;

const readJson = async (path, fallback) => {
  try {
    const info = await FileSystem.getInfoAsync(path);
    if (!info.exists) return fallback;
    const raw = await FileSystem.readAsStringAsync(path);
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
};

const writeJson = async (path, data) => {
  await FileSystem.makeDirectoryAsync(BASE_DIR, { intermediates: true });
  await FileSystem.writeAsStringAsync(path, JSON.stringify(data, null, 0));
};

const migrateLegacyQueue = async () => {
  try {
    const raw = await AsyncStorage.getItem(LEGACY_SYNC_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    const legacyQueue = parsed?.state?.queue ?? parsed?.queue ?? [];
    if (Array.isArray(legacyQueue) && legacyQueue.length > 0) {
      await AsyncStorage.removeItem(LEGACY_SYNC_KEY);
      return legacyQueue;
    }
  } catch {
    /* ignore */
  }
  return [];
};

export const localDataService = {
  async init() {
    if (initPromise) return initPromise;
    initPromise = (async () => {
      await FileSystem.makeDirectoryAsync(CACHE_DIR, { intermediates: true });

      let writes = await readJson(PENDING_PATH, null);
      if (!Array.isArray(writes)) {
        const migrated = await migrateLegacyQueue();
        writes = migrated;
        if (writes.length) {
          await writeJson(PENDING_PATH, writes);
        } else {
          await writeJson(PENDING_PATH, []);
        }
      }

      const meta = await readJson(META_PATH, {});
      if (meta.migratedFromAsyncStorage !== true && writes.length) {
        await writeJson(META_PATH, { ...meta, migratedFromAsyncStorage: true });
      }

      return writes;
    })();
    return initPromise;
  },

  async getPendingWrites() {
    await this.init();
    const writes = await readJson(PENDING_PATH, []);
    return Array.isArray(writes) ? writes : [];
  },

  async savePendingWrites(writes) {
    await this.init();
    await writeJson(PENDING_PATH, writes);
  },

  async getMeta() {
    await this.init();
    return readJson(META_PATH, {});
  },

  async setMeta(patch) {
    const meta = await this.getMeta();
    const next = { ...meta, ...patch };
    await writeJson(META_PATH, next);
    return next;
  },

  async readCache(key) {
    const path = `${CACHE_DIR}${key}.json`;
    return readJson(path, null);
  },

  async writeCache(key, data) {
    await FileSystem.makeDirectoryAsync(CACHE_DIR, { intermediates: true });
    const path = `${CACHE_DIR}${key}.json`;
    await writeJson(path, data);
  },

  async clearReadCaches() {
    try {
      const info = await FileSystem.getInfoAsync(CACHE_DIR);
      if (info.exists) {
        await FileSystem.deleteAsync(CACHE_DIR, { idempotent: true });
      }
      await FileSystem.makeDirectoryAsync(CACHE_DIR, { intermediates: true });
    } catch {
      /* ignore */
    }
  },
};
