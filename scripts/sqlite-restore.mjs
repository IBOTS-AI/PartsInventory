import fs from 'node:fs';
import path from 'node:path';
import dotenv from 'dotenv';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const sourcePathArg = process.argv[2];
if (!sourcePathArg) {
  console.error('Usage: npm run db:restore -- <backup-file>');
  process.exit(1);
}

const databaseUrl = process.env.DATABASE_URL || 'file:./prisma/ibots.db';
if (!databaseUrl.startsWith('file:')) {
  console.error('DATABASE_URL must use the SQLite file: format.');
  process.exit(1);
}

const sourcePath = path.resolve(process.cwd(), sourcePathArg);
if (!fs.existsSync(sourcePath)) {
  console.error(`Backup file not found: ${sourcePath}`);
  process.exit(1);
}

const databasePath = path.resolve(process.cwd(), databaseUrl.slice('file:'.length));
fs.mkdirSync(path.dirname(databasePath), { recursive: true });
fs.copyFileSync(sourcePath, databasePath);

console.log(`Database restored from ${sourcePath} to ${databasePath}`);
