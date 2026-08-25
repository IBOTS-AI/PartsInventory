import fs from 'node:fs';
import path from 'node:path';
import dotenv from 'dotenv';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const databaseUrl = process.env.DATABASE_URL || 'file:./prisma/ibots.db';
if (!databaseUrl.startsWith('file:')) {
  console.error('DATABASE_URL must use the SQLite file: format.');
  process.exit(1);
}

const databasePath = path.resolve(process.cwd(), databaseUrl.slice('file:'.length));
if (!fs.existsSync(databasePath)) {
  console.error(`Database file not found: ${databasePath}`);
  process.exit(1);
}

const backupDir = path.resolve(process.cwd(), 'backups');
fs.mkdirSync(backupDir, { recursive: true });

const stamp = new Date().toISOString().replace(/[:.]/g, '-');
const backupPath = path.join(backupDir, `ibots-${stamp}.db`);
fs.copyFileSync(databasePath, backupPath);

console.log(`Backup created: ${backupPath}`);
