import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from './generated/prisma/client.js';

const sourceDirectory = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(sourceDirectory, '..', '..', '.env') });
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
});

export const prisma = new PrismaClient({ adapter });
