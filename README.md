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
- `MOTO_ADMIN_KEY` or `OPS_ADMIN_KEY`
- `LOG_ROOT`
- `IMG_ROOT`

## Run

```bash
npm install
npm run dev
```

Default local URL: `http://localhost:3000`
