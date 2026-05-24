import { PrismaClient } from '@prisma/client';
import { logger } from './logger.js';

/** Long timeouts for Neon cold starts / slow pooler. */
export const TRANSACTION_OPTS = {
  maxWait: 120_000,
  timeout: 120_000,
};

const POOL_PARAMS = {
  pool_timeout: '120',
  connect_timeout: '30',
  connection_limit: '5',
};

const withPoolParams = (url) => {
  if (!url) return url;
  try {
    const parsed = new URL(url);
    for (const [key, value] of Object.entries(POOL_PARAMS)) {
      if (!parsed.searchParams.has(key)) {
        parsed.searchParams.set(key, value);
      }
    }
    if (parsed.hostname.includes('pooler') && !parsed.searchParams.has('pgbouncer')) {
      parsed.searchParams.set('pgbouncer', 'true');
    }
    return parsed.toString();
  } catch {
    return url;
  }
};

const databaseUrl = withPoolParams(process.env.DATABASE_URL);

const globalForPrisma = globalThis;

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
    datasources: databaseUrl ? { db: { url: databaseUrl } } : undefined,
  });

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = db;
}

const isConnectionError = (err) => {
  const msg = String(err?.message || err || '').toLowerCase();
  return (
    err?.code === 'P1001' ||
    err?.code === 'P1008' ||
    err?.code === 'P1017' ||
    err?.code === 'P2024' ||
    msg.includes('connection pool') ||
    msg.includes('connection closed') ||
    msg.includes('e57p01') ||
    msg.includes('expired transaction')
  );
};

/** Wake Neon / recover from dropped connections (E57P01 on free tier). */
export async function ensureDbConnection() {
  try {
    await db.$queryRaw`SELECT 1`;
  } catch (err) {
    if (!isConnectionError(err)) throw err;
    logger.warn(`DB reconnect after: ${err.message}`);
    try {
      await db.$disconnect();
    } catch {
      // ignore
    }
    await db.$connect();
    await db.$queryRaw`SELECT 1`;
  }
}

export { isConnectionError };
