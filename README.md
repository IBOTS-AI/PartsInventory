# IBOTS Inventory App

Self-hosted inventory system for FRC Team 2370.

## Stack

- **Backend**: Node.js, Express, TypeScript, SQLite, Prisma ORM
- **Frontend**: React (Vite), MUI
- **Tooling**: ESLint + Prettier in both workspaces, npm workspaces

## Project structure

```
client/   React + Vite + MUI frontend
server/   Express + TypeScript API
prisma/   Prisma schema and local SQLite database file
```

## Getting started

1. Copy environment variables:
   ```
   copy .env.example .env
   ```
2. Install dependencies (from repo root):
   ```
   npm install
   ```
3. Initialize the SQLite database and Prisma client:
   ```
   npm run db:init
   ```
4. Run both client and server in dev mode:
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
- `npm run db:init` — create/update SQLite schema, generate Prisma client, and seed defaults
- `npm run db:backup` — create a timestamped SQLite backup in `backups/`
- `npm run db:restore -- <backup-file>` — restore SQLite database from a backup file
- `npm run service:install` — install and start the server as an automatic Windows Service (requires Admin prompt)
- `npm run service:uninstall` — stop and remove the background Windows Service (requires Admin prompt)

## Production & Windows Service Deployment

When built with `npm run build`, the Express backend automatically serves the compiled static client (`client/dist`) and handles API routes on port 80. Any device on the local network can access the web interface directly via `http://<server-ip>`.

To run the app automatically on system boot:

1. Open PowerShell or Command Prompt **as Administrator**.
2. Run `npm run service:install` (this automatically initializes the DB, builds client & server, and installs the Windows service).
3. The server will run in the background as the `IBOTS Inventory Server` service and start on boot.
4. To remove the service later, run `npm run service:uninstall` from an Admin terminal.

## Database

The schema lives in [prisma/schema.prisma](prisma/schema.prisma). This project is SQLite-only and
stores data in a single file configured by `DATABASE_URL` (default: `file:./prisma/ibots.db`).
Use `npm run db:push` after schema changes, then `npm run db:generate` to refresh Prisma client types.
The seed data is in [prisma/seed.ts](prisma/seed.ts) and can be applied with `npm run db:seed`.

Part images are stored on the local filesystem, not in SQLite. Set `IMAGE_UPLOAD_DIR` to an
absolute or working-directory-relative folder when deploying on the shop server. The default is
`./uploads`. Users can upload JPEG/PNG/WebP files or import a public image URL; imported URLs are
downloaded and stored locally.

## Windows installer versioning

- Update `version` in `package.json` before each release.
- Build installer with: `npm run release:win`
- If signing is not configured on the machine, use: `npm run release:win:unsigned`
- Installer output is written under `dist/` with versioned filenames.

