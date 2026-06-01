# Narang Fertilizers — Stock Management System

Full-stack inventory and sales management for **Narang Fertilizers**, an agricultural/fertilizer shop in Narang Mandi, Punjab, Pakistan.

## Project structure

```
stock-management-/
├── narang-backend/    # Node.js + Express + Prisma + PostgreSQL API
└── narang-mobile/     # React Native (Expo) mobile app
```

## Quick start

### 1. PostgreSQL

Create a database:

```sql
CREATE DATABASE narang_db;
```

Update `narang-backend/.env`:

```
DATABASE_URL=postgresql://USER:PASSWORD@localhost:5432/narang_db
JWT_SECRET=your_super_secret_key_here
PORT=5000
NODE_ENV=development
```

### 2. Backend

```bash
cd narang-backend
npm install
npx prisma migrate dev --name init
npm run db:seed
npm run dev
```

API: `http://localhost:5000`  
Health: `GET /health`

**Default admin:** `admin@narangfertilizers.com` / `admin123`

### 3. Mobile app

```bash
cd narang-mobile
npm install
```

Set `narang-mobile/.env`:

```
EXPO_PUBLIC_API_URL=http://localhost:5000
```

For a physical device, use your computer's LAN IP (e.g. `http://192.168.1.10:5000`).

```bash
npm start
```

## API overview

All routes: `/api/v1/`

| Module     | Endpoints |
|-----------|-----------|
| Auth      | `POST /auth/login`, `POST /auth/register` |
| Products  | CRUD + `?search=&categoryId=&lowStock=true` |
| Sales     | List, create (atomic stock deduction), get by id |
| Purchases | List, create (atomic stock increment) |
| Reports   | Dashboard (all users), summary/P&L/valuation (admin) |
| Settings  | Shop name, address, tax, invoice prefix |

## Features

- JWT auth (admin / cashier roles)
- Product stock with low-stock alerts
- Sales with invoice numbers (`NF-2026-0001`)
- Purchases that update stock and cost price
- Expenses, customers, suppliers, categories
- Dashboard & reports (PKR currency, DD/MM/YYYY dates)
- Invoice share as JPEG image (ViewShot + Sharing); reports export as PDF

## Tech stack

**Backend:** Node 20+, Express 4, PostgreSQL 15+, Prisma 5, JWT, bcrypt, Winston  

**Mobile:** Expo SDK 54, React Navigation 6, NativeWind 4, React Native Paper, Axios, react-hook-form + zod

## Seed data

Categories: Fertilizers, Pesticides, Seeds, Other  

Products: DAP 50kg, Urea 50kg, Potash 50kg, Weedicide 1L, Wheat Seeds 40kg
