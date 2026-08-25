import { Router } from 'express';
import { TransactionType } from '../generated/prisma/client.js';
import { prisma } from '../prisma.js';
import { recordInventoryMovement } from '../services/inventory-service.js';

export const inventoryMutationsRouter = Router();

inventoryMutationsRouter.post('/inventory/transactions', async (req, res, next) => {
  try {
    const body = req.body as Record<string, unknown>;
    const type = typeof body.type === 'string' ? body.type : '';
    const movement = await recordInventoryMovement(prisma, {
      partId: Number(body.partId),
      locationId: Number(body.locationId),
      destinationId: body.destinationId === undefined ? undefined : Number(body.destinationId),
      type: type as TransactionType,
      quantity: Number(body.quantity),
      notes: typeof body.notes === 'string' ? body.notes : undefined,
      operatorName: typeof body.operatorName === 'string' ? body.operatorName : undefined,
    });

    res.status(201).json(movement);
  } catch (error) {
    next(error);
  }
});
