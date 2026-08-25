import assert from 'node:assert/strict';
import test from 'node:test';
import type { PrismaClient } from '../generated/prisma/client.js';
import { recordInventoryMovement } from './inventory-service.js';

type InventoryRow = { id: number; partId: number; locationId: number; quantity: number };

type FakeTransaction = {
  inventory: {
    findUnique: (args: { where: { partId_locationId: { partId: number; locationId: number } } }) => Promise<InventoryRow | null>;
    upsert: (args: { where: { partId_locationId: { partId: number; locationId: number } }; update: { quantity: number }; create: Omit<InventoryRow, 'id'> }) => Promise<InventoryRow>;
  };
  part: { findUnique: () => Promise<{ id: number; active: boolean } | null> };
  location: { findUnique: (args: { where: { id: number } }) => Promise<{ id: number; active: boolean } | null> };
  inventoryTransaction: { create: (args: { data: Record<string, unknown> }) => Promise<Record<string, unknown>> };
  $executeRaw: () => Promise<number>;
};

function makePrisma(initialQuantity = 0) {
  const rows = new Map<string, InventoryRow>([['1:10', { id: 1, partId: 1, locationId: 10, quantity: initialQuantity }]]);
  const transactions: Record<string, unknown>[] = [];
  const tx: FakeTransaction = {
    inventory: {
      findUnique: async ({ where }) => rows.get(`${where.partId_locationId.partId}:${where.partId_locationId.locationId}`) || null,
      upsert: async ({ where, update, create }) => {
        const key = `${where.partId_locationId.partId}:${where.partId_locationId.locationId}`;
        const row = { id: rows.get(key)?.id || rows.size + 1, ...create, quantity: update.quantity };
        rows.set(key, row);
        return row;
      },
    },
    part: { findUnique: async () => ({ id: 1, active: true }) },
    location: {
      findUnique: async ({ where }) => (where.id === 10 || where.id === 20 ? { id: where.id, active: true } : null),
    },
    inventoryTransaction: {
      create: async ({ data }) => {
        transactions.push(data);
        return data;
      },
    },
    $executeRaw: async () => 1,
  };
  const prisma = { $transaction: async (callback: (client: FakeTransaction) => Promise<unknown>) => callback(tx) } as unknown as PrismaClient;
  return { prisma, rows, transactions };
}

test('adds stock and records a positive audit delta', async () => {
  const { prisma, rows, transactions } = makePrisma(5);
  await recordInventoryMovement(prisma, { partId: 1, locationId: 10, type: 'ADD', quantity: 3 });
  assert.equal(rows.get('1:10')?.quantity, 8);
  assert.equal(transactions[0].quantity, 3);
});

test('rejects removal when the source has insufficient stock', async () => {
  const { prisma, rows, transactions } = makePrisma(2);
  await assert.rejects(recordInventoryMovement(prisma, { partId: 1, locationId: 10, type: 'REMOVE', quantity: 3 }), /insufficient inventory/);
  assert.equal(rows.get('1:10')?.quantity, 2);
  assert.equal(transactions.length, 0);
});

test('transfers stock between locations atomically', async () => {
  const { prisma, rows, transactions } = makePrisma(10);
  await recordInventoryMovement(prisma, { partId: 1, locationId: 10, destinationId: 20, type: 'TRANSFER', quantity: 4 });
  assert.equal(rows.get('1:10')?.quantity, 6);
  assert.equal(rows.get('1:20')?.quantity, 4);
  assert.equal(transactions[0].quantity, 4);
});

test('allows a signed adjustment delta', async () => {
  const { prisma, rows, transactions } = makePrisma(10);
  await recordInventoryMovement(prisma, { partId: 1, locationId: 10, type: 'ADJUST', quantity: -2 });
  assert.equal(rows.get('1:10')?.quantity, 8);
  assert.equal(transactions[0].quantity, -2);
});
