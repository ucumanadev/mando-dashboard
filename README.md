# mando-dashboard (Nuxt)

Nuxt 3 rewrite of the `moto-negocia-logs` Next.js admin app.

## Included Features

- Home dashboard (`/`)
- Logs viewer (`/logs`)
- TopUps approval flow (`/topups`)
- Driver document review (`/documents`)
- Vendor links (`/vendors`)
- Wiki links (`/wiki`)

## Server API (Nuxt)

- `GET /api/logs`
- `GET /api/topups`
- `POST /api/topups/:id/approve`
- `POST /api/topups/:id/reject`
- `GET /api/drivers/search`
- `GET /api/drivers/:id/documents`
- `GET /api/files`

## Environment

Copy `.env.example` to `.env` and set values.

Important values:

- `MOTO_API_BASE_URL` or `OPS_API_BASE_URL`
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `LOG_ROOT`
- `IMG_ROOT`

## Auth Flow

- Admin users sign in at `/login` with Supabase email/password.
- A Supabase access token is synced to a cookie and used by Nuxt server API routes.
- Nuxt server middleware requires a valid Supabase session for all `/api/*` calls.
- Backend requests now forward `Authorization: Bearer <token>` only.

## Run

```bash
npm install
npm run dev
```

Default local URL: `http://localhost:3000`
