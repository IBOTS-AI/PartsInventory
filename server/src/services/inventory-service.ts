import type { PrismaClient, TransactionType } from '../generated/prisma/client.js';

export type InventoryMovementInput = {
  partId: number;
  locationId: number;
  destinationId?: number;
  type: TransactionType;
  quantity: number;
  notes?: string;
  operatorName?: string;
};

export class InventoryMovementError extends Error {
  statusCode = 400;
}

type TransactionClient = Parameters<PrismaClient['$transaction']>[0] extends (
  client: infer Client,
) => Promise<unknown>
  ? Client
  : never;

function assertMovementQuantity(quantity: number, type: TransactionType) {
  if (type === 'ADJUST') {
    if (!Number.isFinite(quantity) || quantity === 0) {
      throw new InventoryMovementError('adjustment quantity must be a non-zero number');
    }
    return;
  }

  if (!Number.isFinite(quantity) || quantity <= 0) {
    throw new InventoryMovementError('quantity must be a positive number');
  }
}

function assertTransactionType(type: TransactionType) {
  if (!['ADD', 'REMOVE', 'ADJUST', 'TRANSFER', 'RESERVE', 'UNRESERVE'].includes(type)) {
    throw new InventoryMovementError('type must be ADD, REMOVE, ADJUST, TRANSFER, RESERVE, or UNRESERVE');
  }
}

function assertValidId(id: number, field: string) {
  if (!Number.isInteger(id) || id <= 0) {
    throw new InventoryMovementError(`${field} must be a positive integer`);
  }
}

async function changeQuantity(
  tx: TransactionClient,
  partId: number,
  locationId: number,
  delta: number,
) {
  const existing = await tx.inventory.findUnique({
    where: { partId_locationId: { partId, locationId } },
  });
  const currentQuantity = existing ? Number(existing.quantity) : 0;
  const nextQuantity = currentQuantity + delta;

  if (nextQuantity < 0) {
    throw new InventoryMovementError('insufficient inventory at the source location');
  }

  return tx.inventory.upsert({
    where: { partId_locationId: { partId, locationId } },
    update: { quantity: nextQuantity },
    create: { partId, locationId, quantity: nextQuantity },
  });
}

export async function recordInventoryMovement(prisma: PrismaClient, input: InventoryMovementInput) {
  assertTransactionType(input.type);
  assertValidId(input.partId, 'partId');
  assertValidId(input.locationId, 'locationId');
  assertMovementQuantity(input.quantity, input.type);

  if (input.type === 'TRANSFER') {
    assertValidId(input.destinationId ?? 0, 'destinationId');
    if (input.destinationId === input.locationId) {
      throw new InventoryMovementError('source and destination locations must be different');
    }
  }

  return prisma.$transaction(async (tx) => {
    const [part, location, destination] = await Promise.all([
      tx.part.findUnique({ where: { id: input.partId } }),
      tx.location.findUnique({ where: { id: input.locationId } }),
      input.destinationId
        ? tx.location.findUnique({ where: { id: input.destinationId } })
        : Promise.resolve(null),
    ]);

    if (!part || !part.active) throw new InventoryMovementError('part not found or inactive');
    if (!location) throw new InventoryMovementError('location not found');
    if (input.type === 'TRANSFER' && !destination) {
      throw new InventoryMovementError('destination location not found');
    }

    const delta = ['REMOVE', 'RESERVE'].includes(input.type) ? -input.quantity : input.quantity;
    if (input.type === 'TRANSFER') {
      await changeQuantity(tx, input.partId, input.locationId, -input.quantity);
      await changeQuantity(tx, input.partId, input.destinationId!, input.quantity);
    } else {
      await changeQuantity(tx, input.partId, input.locationId, delta);
    }

    return tx.inventoryTransaction.create({
      data: {
        partId: input.partId,
        locationId: input.locationId,
        destinationId: input.destinationId,
        type: input.type,
        quantity: ['REMOVE', 'RESERVE'].includes(input.type) ? -input.quantity : input.quantity,
        notes: input.notes,
        operatorName: input.operatorName,
      },
      include: { location: true, destination: true },
    });
  });
}
