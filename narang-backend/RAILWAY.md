# Railway backend setup

## Postgres URL for local `.env`

1. Open Railway → project **sunny-friendship** → **Postgres** service.
2. Go to **Variables**.
3. Copy **`DATABASE_PUBLIC_URL`** (best for your Mac / local `npm run dev`).
4. Paste into `narang-backend/.env`:

   ```env
   DATABASE_URL=<paste DATABASE_PUBLIC_URL>
   DIRECT_URL=<paste DATABASE_PUBLIC_URL>
   ```

   Use the **same** value for both unless you use a separate direct URL.

5. Run migrations and create admin (no sample products):

   ```bash
   cd narang-backend
   npx prisma migrate deploy
   npx prisma db seed
   # or only admin: npm run db:create-admin
   ```

   Fresh empty database (wipes all data):

   ```bash
   npm run db:reset
   ```

## API service on Railway (not local `.env`)

1. Create a second service from GitHub repo with **Root Directory** = `narang-backend`.
2. In the **API** service → **Variables** → **Add variable reference**:
   - `DATABASE_URL` → `${{Postgres.DATABASE_URL}}`
   - `DIRECT_URL` → `${{Postgres.DATABASE_URL}}` (or direct URL if shown)
3. Set `JWT_SECRET`, `NODE_ENV=production`. Railway sets `PORT` automatically.
4. **Release command:** `npx prisma migrate deploy`
5. Public URL: API service → Settings → Networking → generate domain.
6. Mobile app: `EXPO_PUBLIC_API_URL=https://your-api.up.railway.app`

## Networking reference (your Postgres)

| Use case | Host |
|----------|------|
| API on Railway (same project) | `postgres.railway.internal` |
| Local Mac / Prisma CLI | `zephyr.proxy.rlwy.net:50534` (from Variables) |

Do not commit `.env` — it is gitignored.
