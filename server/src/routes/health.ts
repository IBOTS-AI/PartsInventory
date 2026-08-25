import { Router } from 'express';
import { prisma } from '../prisma.js';

export const healthRouter = Router();

healthRouter.get('/', async (_req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ status: 'ok', db: 'connected' });
  } catch (_err) {
    res.status(500).json({ status: 'error', db: 'unreachable' });
  }
});
