import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../server/src/generated/prisma/client';

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL!,
});

const prisma = new PrismaClient({ adapter });

async function main() {
  // Categories
  const powerTransmission = await prisma.category.upsert({
    where: { code: 'PWR' },
    update: {},
    create: {
      name: 'Power Transmission',
      code: 'PWR',
      description: 'Sprockets, pulleys, gears, belts, chain, and related parts',
      color: '#2196F3',
    },
  });

  const wheels = await prisma.category.upsert({
    where: { code: 'WHL' },
    update: {},
    create: {
      name: 'Wheels',
      code: 'WHL',
      description: 'Robot wheels and related components',
      color: '#4CAF50',
    },
  });

  const fasteners = await prisma.category.upsert({
    where: { code: 'FST' },
    update: {},
    create: {
      name: 'Fasteners',
      code: 'FST',
      description: 'Bolts, nuts, washers, rivets, and other fasteners',
      color: '#F44336',
    },
  });

  await prisma.labelTemplate.upsert({
    where: { name: "Standard inventory label" },
    update: {},
    create: {
      name: "Standard inventory label",
      target: "both",
      accentColor: "#1d5d70",
    },
  });

  await prisma.labelTemplate.upsert({
    where: { name: "Compact bin label" },
    update: {},
    create: {
      name: "Compact bin label",
      target: "location",
      showCategory: false,
      showSku: false,
      showManufacturerNumber: false,
      showLocation: false,
      showContents: true,
      accentColor: "#e06e4e",
    },
  });

  // Locations
  const shop = await prisma.location.upsert({
    where: { code: 'SHOP' },
    update: {},
    create: {
      name: 'Main Shop',
      code: 'SHOP',
    },
  });

  const shelf1 = await prisma.location.upsert({
    where: { code: 'SHELF-01' },
    update: {},
    create: {
      name: 'Shelf 1',
      code: 'SHELF-01',
      parentId: shop.id,
    },
  });

  const bin1 = await prisma.location.upsert({
    where: { code: 'SHELF-01-BIN-01' },
    update: {},
    create: {
      name: 'Bin 1',
      code: 'SHELF-01-BIN-01',
      parentId: shelf1.id,
    },
  });

  const shelf2 = await prisma.location.upsert({
    where: { code: 'SHELF-02' },
    update: {},
    create: {
      name: 'Shelf 2',
      code: 'SHELF-02',
      parentId: shop.id,
    },
  });

  await prisma.location.upsert({
    where: { code: 'SHELF-02-BIN-01' },
    update: {},
    create: {
      name: 'Bin 1',
      code: 'SHELF-02-BIN-01',
      parentId: shelf2.id,
    },
  });

  // Sample part
  const bolt = await prisma.part.upsert({
    where: { sku: 'FST-0001' },
    update: {},
    create: {
      sku: 'FST-0001',
      name: '1/4-20 Hex Bolt',
      description: 'General purpose 1/4-20 hex bolt',
      categoryId: fasteners.id,
      unitOfMeasure: 'each',
      minimumQuantity: 50,
      reorderQuantity: 100,
    },
  });

  const supplier = await prisma.supplier.upsert({
    where: { name: "AndyMark" },
    update: {},
    create: { name: "AndyMark", website: "https://www.andymark.com" },
  });

  await prisma.partSupplier.upsert({
    where: { partId_supplierId: { partId: bolt.id, supplierId: supplier.id } },
    update: {},
    create: {
      partId: bolt.id,
      supplierId: supplier.id,
      supplierPartNumber: "am-1257",
      productUrl: "https://www.andymark.com/products/1-4-20-hex-bolt",
      unitPrice: 0.18,
      preferred: true,
    },
  });

  // Aliases
  await prisma.partAlias.upsert({
    where: {
      partId_alias: {
        partId: bolt.id,
        alias: 'quarter twenty bolt',
      },
    },
    update: {},
    create: {
      partId: bolt.id,
      alias: 'quarter twenty bolt',
    },
  });

  // Put some in inventory
  await prisma.inventory.upsert({
    where: {
      partId_locationId: {
        partId: bolt.id,
        locationId: bin1.id,
      },
    },
    update: {},
    create: {
      partId: bolt.id,
      locationId: bin1.id,
      quantity: 75,
    },
  });

  console.log('Team 2370 inventory seed complete.');
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
