# IBOTS Inventory App

Self-hosted inventory system for FRC Team 2370.

## Stack

- **Backend**: Node.js, Express, TypeScript, PostgreSQL, Prisma ORM
- **Frontend**: React (Vite), MUI
- **Tooling**: ESLint + Prettier in both workspaces, npm workspaces

## Project structure

```
client/   React + Vite + MUI frontend
server/   Express + TypeScript API
docker-compose.yml   Local Postgres for development
```

## Getting started

1. Start Postgres locally:
   ```
   docker compose up -d
   ```
2. Copy environment variables:
   ```
   copy .env.example server\.env
   ```
3. Install dependencies (from repo root):
   ```
   npm install
   ```
4. Apply the database schema and generate the Prisma client:
   ```
   npx prisma migrate dev
   npx prisma generate
   ```
5. Run both client and server in dev mode:
   ```
   npm run dev
   ```
   - Client: http://localhost:5173
   - Server: http://localhost:4000 (proxied under `/api` from the client dev server)

## Scripts (from repo root)

- `npm run dev` — run client + server concurrently
- `npm run build` — build both workspaces
- `npm run lint` — lint both workspaces
- `npm run format` — format both workspaces with Prettier

## Database

The schema lives in [prisma/schema.prisma](prisma/schema.prisma). During development, create and
apply migrations with `npx prisma migrate dev --name <change_name>`, then run `npx prisma generate`.
The seed data is in [prisma/seed.ts](prisma/seed.ts) and can be applied with `npx prisma db seed`.

Part images are stored on the local filesystem, not in PostgreSQL. Set `IMAGE_UPLOAD_DIR` to an
absolute or working-directory-relative folder when deploying on the shop server. The default is
`./uploads`. Users can upload JPEG/PNG/WebP files or import a public image URL; imported URLs are
downloaded and stored locally.
