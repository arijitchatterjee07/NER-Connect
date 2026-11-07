# NER Connect Backend

Beginner-friendly Node.js + Express + PostgreSQL/PostGIS backend for the NER AI Smart Logistics SIH prototype.

## Requirements
- Node.js 20+
- PostgreSQL 15+
- PostGIS extension recommended/required for the spatial `roads.geometry` column
- Postman or browser for API testing

## Setup

1. Copy `.env.example` to `.env` and update `DATABASE_URL` if your PostgreSQL credentials differ.
2. Create a PostgreSQL database named `ner_connect`.
3. Run:

```bash
npm install
npm run db:init
npm run db:seed
npm run dev
```

If PostGIS is installed, `db:init` enables the extension. If it is not installed, the script still creates the rest of the schema but the spatial geometry column is skipped. You can install PostGIS and run `npm run db:init` again.

## API

- `GET /api/health`
- `GET /api/dashboard`
- `GET /api/roads`
- `GET /api/roads/:id`
- `GET /api/vehicles`
- `GET /api/vehicles/:id`
- `POST /api/vehicles/:id/location`
- `GET /api/incidents`
- `GET /api/incidents/active`
- `POST /api/incidents`
- `PATCH /api/incidents/:id/resolve`
- `PATCH /api/incidents/:id/verify`
- `GET /api/weather`
- `GET /api/weather/:district`
- `POST /api/risk/calculate`
- `POST /api/routes/calculate`
- `POST /api/reroute/:vehicleId`
- `GET /api/deliveries`
- `GET /api/reports`
- `POST /api/reports`
- `POST /api/sync/reports`

## Example

```bash
curl http://localhost:5000/api/health
curl http://localhost:5000/api/vehicles
curl http://localhost:5000/api/incidents/active
```

For the existing frontend, keep it running as-is first. Once the API is verified, point its data layer to `http://localhost:5000/api`.
