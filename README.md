# FRC Parts Inventory

Self-hosted shop inventory system designed for FRC teams. Team 2370 (the iBots) is the reference installation, but team-specific configuration should remain separate from the core application.

## Stack

- **Backend:** Node.js, Express, TypeScript, Prisma ORM
- **Database:** SQLite (embedded; no separate database server required)
- **Frontend:** React (Vite), MUI
- **Tooling:** ESLint + Prettier, npm workspaces

## Project structure

```
client/        React + Vite + MUI frontend
server/        Express + TypeScript API
prisma/        Prisma schema, migrations, and development seed
data/          Local runtime data (database/uploads; not committed)
```

## Development setup

1. Copy the environment template:
   ```
   copy .env.example .env
   ```
2. Install dependencies:
   ```
   npm install
   ```
3. Generate the Prisma client and create/apply the SQLite schema:
   ```
   npx prisma generate
   npx prisma migrate dev
   ```
4. Optional development sample data:
   ```
   npx prisma db seed
   ```
5. Start the application:
   ```
   npm run dev
   ```

- Client: http://localhost:5173
- Server: http://localhost:4000 (proxied under `/api` by the client dev server)

No PostgreSQL installation, Docker container, database account, or database port configuration is required.

## Database and application data

SQLite is the standard database for this project. The default development URL is:

```
DATABASE_URL=file:./data/inventory.db
```

Production packaging will keep persistent application data separate from installed program files. The application-data area will contain the SQLite database, uploaded images, configuration, and backups so upgrades do not overwrite team inventory.

The schema lives in `prisma/schema.prisma`. Prisma manages schema migrations and client generation.

Part images are stored on the local filesystem rather than inside the SQLite database. `IMAGE_UPLOAD_DIR` defaults to `./data/uploads` for development.

## Distribution goal

The production goal is a guided installer that a mentor with no programming experience can use on a clean computer. Normal installation should not require VS Code, Node/npm commands, Prisma commands, Docker, database administration, or manual configuration-file editing.

Planned production features include:

- guided first-run team setup
- automatic database creation and migrations
- persistent application-data directory
- graphical backup and restore
- safe upgrades that preserve inventory data
- Windows-first installer, with additional deployment options evaluated later

## Development scripts

- `npm run dev` — run client + server concurrently
- `npm run build` — build both workspaces
- `npm run lint` — lint both workspaces
- `npm run format` — format both workspaces
- `npm test` — run server tests

## Project specification

The Google Docs project scope and technical design is the living planning specification. The repository README is intentionally focused on implementation and developer setup.
