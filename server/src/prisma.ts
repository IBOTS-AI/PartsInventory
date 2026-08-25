import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import { PrismaLibSql } from '@prisma/adapter-libsql';
import { PrismaClient } from './generated/prisma/client.js';

const sourceDirectory = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(sourceDirectory, '..', '..', '.env') });
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

function resolveDatabaseUrl(rawUrl: string, projectRoot: string) {
  if (!rawUrl.startsWith('file:')) return rawUrl;
  const filePath = rawUrl.slice('file:'.length);
  if (path.isAbsolute(filePath)) return rawUrl;
  return `file:${path.resolve(projectRoot, filePath).replace(/\\/g, '/')}`;
}

const projectRoot = path.resolve(sourceDirectory, '..', '..');
const databaseUrl = resolveDatabaseUrl(process.env.DATABASE_URL || 'file:./prisma/ibots.db', projectRoot);

const adapter = new PrismaLibSql({
  url: databaseUrl,
});

export const prisma = new PrismaClient({ adapter });
