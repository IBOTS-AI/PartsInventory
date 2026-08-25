import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';
import { PrismaClient } from './generated/prisma/client.js';

const sourceDirectory = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(sourceDirectory, '..', '..', '.env') });
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const url = process.env.DATABASE_URL ?? 'file:./data/inventory.db';
const adapter = new PrismaBetterSqlite3({ url });

export const prisma = new PrismaClient({ adapter });
