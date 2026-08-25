import { Router } from 'express';
import { prisma } from '../prisma.js';

export const inventoryRouter = Router();

inventoryRouter.get('/configuration', async (_req, res, next) => {
  try {
    const databaseUrl = process.env.DATABASE_URL ? new URL(process.env.DATABASE_URL) : null;
    res.json({
      database: databaseUrl
        ? { host: databaseUrl.hostname, port: databaseUrl.port || '5432', name: databaseUrl.pathname.slice(1), user: decodeURIComponent(databaseUrl.username) }
        : null,
      imageUploadDir: process.env.IMAGE_UPLOAD_DIR || './uploads',
    });
  } catch (error) {
    next(error);
  }
});

inventoryRouter.get('/suppliers', async (_req, res, next) => {
  try {
    res.json(await prisma.supplier.findMany({ where: { active: true }, orderBy: { name: 'asc' } }));
  } catch (error) {
    next(error);
  }
});

inventoryRouter.post('/suppliers', async (req, res, next) => {
  try {
    const body = req.body as Record<string, unknown>;
    const name = typeof body.name === 'string' ? body.name.trim() : '';
    if (!name) {
      res.status(400).json({ error: 'supplier name is required' });
      return;
    }
    const supplier = await prisma.supplier.create({
      data: {
        name,
        website: typeof body.website === 'string' ? body.website.trim() : undefined,
        phone: typeof body.phone === 'string' ? body.phone.trim() : undefined,
        email: typeof body.email === 'string' ? body.email.trim() : undefined,
      },
    });
    res.status(201).json(supplier);
  } catch (error) {
    next(error);
  }
});

inventoryRouter.post('/parts/:id/suppliers', async (req, res, next) => {
  try {
    const partId = Number(req.params.id);
    const body = req.body as Record<string, unknown>;
    const supplierId = Number(body.supplierId);
    if (!Number.isInteger(partId) || partId <= 0 || !Number.isInteger(supplierId) || supplierId <= 0) {
      res.status(400).json({ error: 'part and supplier are required' });
      return;
    }
    const link = await prisma.partSupplier.upsert({
      where: { partId_supplierId: { partId, supplierId } },
      update: {
        supplierPartNumber: typeof body.supplierPartNumber === 'string' ? body.supplierPartNumber.trim() : undefined,
        productUrl: typeof body.productUrl === 'string' ? body.productUrl.trim() : undefined,
        unitPrice: body.unitPrice === undefined || body.unitPrice === '' ? null : Number(body.unitPrice),
        preferred: body.preferred === true,
      },
      create: {
        partId,
        supplierId,
        supplierPartNumber: typeof body.supplierPartNumber === 'string' ? body.supplierPartNumber.trim() : undefined,
        productUrl: typeof body.productUrl === 'string' ? body.productUrl.trim() : undefined,
        unitPrice: body.unitPrice === undefined || body.unitPrice === '' ? undefined : Number(body.unitPrice),
        preferred: body.preferred === true,
      },
      include: { supplier: true },
    });
    if (link.preferred) {
      await prisma.partSupplier.updateMany({ where: { partId, id: { not: link.id } }, data: { preferred: false } });
    }
    res.status(201).json(link);
  } catch (error) {
    next(error);
  }
});

inventoryRouter.get('/reports/low-stock', async (_req, res, next) => {
  try {
    const parts = await prisma.part.findMany({
      where: { active: true },
      include: {
        category: true,
        inventory: true,
        suppliers: {
          where: { preferred: true },
          include: { supplier: true },
          take: 1,
        },
      },
      orderBy: { name: 'asc' },
    });

    const report = parts
      .map((part) => {
        const onHand = part.inventory.reduce((total, row) => total + Number(row.quantity), 0);
        const minimum = Number(part.minimumQuantity);
        const reorder = Number(part.reorderQuantity);
        return {
          id: part.id,
          sku: part.sku,
          name: part.name,
          unitOfMeasure: part.unitOfMeasure,
          category: part.category,
          onHand,
          minimumQuantity: minimum,
          suggestedQuantity: Math.max(reorder, minimum - onHand),
          supplier: part.suppliers[0]?.supplier || null,
          unitPrice: part.suppliers[0]?.unitPrice || null,
        };
      })
      .filter((part) => part.onHand <= part.minimumQuantity);

    res.json({ count: report.length, items: report });
  } catch (error) {
    next(error);
  }
});

inventoryRouter.get('/reports/summary', async (_req, res, next) => {
  try {
    const [parts, activeParts, activeLocations, categories] = await Promise.all([
      prisma.part.findMany({ where: { active: true }, select: { minimumQuantity: true, inventory: { select: { quantity: true } } } }),
      prisma.part.count({ where: { active: true } }),
      prisma.location.count({ where: { active: true } }),
      prisma.category.count(),
    ]);
    const totals = parts.map((part) => ({
      onHand: part.inventory.reduce((total, row) => total + Number(row.quantity), 0),
      minimum: Number(part.minimumQuantity),
    }));
    res.json({
      activeParts,
      activeLocations,
      categories,
      totalQuantity: totals.reduce((total, part) => total + part.onHand, 0),
      lowStock: totals.filter((part) => part.onHand <= part.minimum && part.minimum > 0).length,
      outOfStock: totals.filter((part) => part.onHand <= 0).length,
    });
  } catch (error) {
    next(error);
  }
});

inventoryRouter.get('/reports/history', async (req, res, next) => {
  try {
    const partId = typeof req.query.partId === 'string' ? Number(req.query.partId) : undefined;
    const locationId = typeof req.query.locationId === 'string' ? Number(req.query.locationId) : undefined;
    const type = typeof req.query.type === 'string' ? req.query.type : undefined;
    const limit = Math.min(Math.max(Number(req.query.limit) || 50, 1), 200);
    const validPartId = partId && Number.isInteger(partId) && partId > 0 ? partId : undefined;
    const validLocationId = locationId && Number.isInteger(locationId) && locationId > 0 ? locationId : undefined;
    const where = {
      ...(validPartId ? { partId: validPartId } : {}),
      ...(validLocationId
        ? { OR: [{ locationId: validLocationId }, { destinationId: validLocationId }] }
        : {}),
      ...(type && ['ADD', 'REMOVE', 'ADJUST', 'TRANSFER'].includes(type) ? { type: type as 'ADD' | 'REMOVE' | 'ADJUST' | 'TRANSFER' } : {}),
    };
    const transactions = await prisma.inventoryTransaction.findMany({
      where,
      include: { part: { include: { category: true } }, location: true, destination: true },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
    res.json(transactions);
  } catch (error) {
    next(error);
  }
});

inventoryRouter.get('/label-templates', async (_req, res, next) => {
  try {
    const templates = await prisma.labelTemplate.findMany({
      where: { active: true },
      orderBy: { name: 'asc' },
    });
    res.json(templates);
  } catch (error) {
    next(error);
  }
});

inventoryRouter.post('/label-templates', async (req, res, next) => {
  try {
    const body = req.body as Record<string, unknown>;
    const name = typeof body.name === 'string' ? body.name.trim() : '';
    if (!name) {
      res.status(400).json({ error: 'template name is required' });
      return;
    }
    const template = await prisma.labelTemplate.create({
      data: {
        name,
        target: typeof body.target === 'string' ? body.target : 'both',
        showCategory: body.showCategory !== false,
        showSku: body.showSku !== false,
        showManufacturerNumber: body.showManufacturerNumber !== false,
        showLocation: body.showLocation !== false,
        showContents: body.showContents !== false,
        showQrCode: body.showQrCode !== false,
        accentColor: typeof body.accentColor === 'string' ? body.accentColor : '#1d5d70',
      },
    });
    res.status(201).json(template);
  } catch (error) {
    next(error);
  }
});

inventoryRouter.get('/categories', async (_req, res, next) => {
  try {
    const categories = await prisma.category.findMany({
      orderBy: { name: 'asc' },
    });
    res.json(categories);
  } catch (error) {
    next(error);
  }
});

inventoryRouter.post('/categories', async (req, res, next) => {
  try {
    const body = req.body as Record<string, unknown>;
    const name = typeof body.name === 'string' ? body.name.trim() : '';
    const code = typeof body.code === 'string' ? body.code.trim().toUpperCase() : '';
    const color = typeof body.color === 'string' ? body.color.trim() : '';
    if (!name || !code || !/^#[0-9a-f]{6}$/i.test(color)) {
      res.status(400).json({ error: 'name, short code, and a six-digit hex color are required' });
      return;
    }
    const category = await prisma.category.create({
      data: {
        name,
        code,
        color,
        description: typeof body.description === 'string' ? body.description.trim() : undefined,
      },
    });
    res.status(201).json(category);
  } catch (error) {
    next(error);
  }
});

inventoryRouter.post('/locations', async (req, res, next) => {
  try {
    const { name, code, locationType, parentId, description } = req.body as Record<string, unknown>;
    if (typeof name !== 'string' || !name.trim() || typeof code !== 'string' || !code.trim()) {
      res.status(400).json({ error: 'name and code are required' });
      return;
    }
    const location = await prisma.location.create({
      data: {
        name: name.trim(),
        code: code.trim().toUpperCase(),
        locationType: typeof locationType === 'string' ? locationType : 'other',
        parentId: parentId === undefined ? undefined : Number(parentId),
        description: typeof description === 'string' ? description.trim() : undefined,
      },
    });
    res.status(201).json(location);
  } catch (error) {
    next(error);
  }
});

inventoryRouter.post('/parts', async (req, res, next) => {
  try {
    const body = req.body as Record<string, unknown>;
    const name = typeof body.name === 'string' ? body.name.trim() : '';
    const sku = typeof body.sku === 'string' ? body.sku.trim().toUpperCase() : '';
    const categoryId = Number(body.categoryId);
    if (!name || !Number.isInteger(categoryId) || categoryId <= 0) {
      res.status(400).json({ error: 'name and category are required' });
      return;
    }
    const part = await prisma.part.create({
      data: {
        name,
        sku: sku || undefined,
        categoryId,
        description: typeof body.description === 'string' ? body.description.trim() : undefined,
        manufacturer: typeof body.manufacturer === 'string' ? body.manufacturer.trim() : undefined,
        unitOfMeasure: typeof body.unitOfMeasure === 'string' ? body.unitOfMeasure.trim() || 'each' : 'each',
        minimumQuantity: body.minimumQuantity === undefined ? 0 : Number(body.minimumQuantity),
        reorderQuantity: body.reorderQuantity === undefined ? 0 : Number(body.reorderQuantity),
        aliases: Array.isArray(body.aliases)
          ? { create: body.aliases.filter((alias): alias is string => typeof alias === 'string' && Boolean(alias.trim())).map((alias) => ({ alias: alias.trim() })) }
          : undefined,
      },
      include: { category: true, aliases: true, inventory: true },
    });
    res.status(201).json({ ...part, totalQuantity: 0 });
  } catch (error) {
    next(error);
  }
});

inventoryRouter.put('/parts/:id', async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const body = req.body as Record<string, unknown>;
    const name = typeof body.name === 'string' ? body.name.trim() : '';
    const categoryId = Number(body.categoryId);
    if (!Number.isInteger(id) || id <= 0 || !name || !Number.isInteger(categoryId) || categoryId <= 0) {
      res.status(400).json({ error: 'part id, name, and category are required' });
      return;
    }

    const aliases = Array.isArray(body.aliases)
      ? [...new Set(body.aliases.filter((alias): alias is string => typeof alias === 'string' && Boolean(alias.trim())).map((alias) => alias.trim()))]
      : [];
    const part = await prisma.$transaction(async (tx) => {
      const updated = await tx.part.update({
        where: { id },
        data: {
          name,
          categoryId,
          description: typeof body.description === 'string' ? body.description.trim() : null,
          manufacturer: typeof body.manufacturer === 'string' ? body.manufacturer.trim() : null,
          manufacturerPartNumber: typeof body.manufacturerPartNumber === 'string' ? body.manufacturerPartNumber.trim() : null,
          manufacturerUrl: typeof body.manufacturerUrl === 'string' ? body.manufacturerUrl.trim() : null,
          unitOfMeasure: typeof body.unitOfMeasure === 'string' ? body.unitOfMeasure.trim() || 'each' : 'each',
          minimumQuantity: Number(body.minimumQuantity) || 0,
          reorderQuantity: Number(body.reorderQuantity) || 0,
          homeLocationId: body.homeLocationId ? Number(body.homeLocationId) : null,
          active: body.active !== false,
        },
      });
      if (typeof body.imageUrl === 'string') {
        await tx.partImage.deleteMany({ where: { partId: id, isPrimary: true } });
        if (body.imageUrl.trim()) {
          await tx.partImage.create({ data: { partId: id, imageType: 'external', externalUrl: body.imageUrl.trim(), isPrimary: true } });
        }
      }
      await tx.partAlias.deleteMany({ where: { partId: id } });
      if (aliases.length) await tx.partAlias.createMany({ data: aliases.map((alias) => ({ partId: id, alias })) });
      return updated;
    });
    res.json(part);
  } catch (error) {
    next(error);
  }
});

inventoryRouter.get('/locations', async (_req, res, next) => {
  try {
    const locations = await prisma.location.findMany({
      where: { active: true },
      orderBy: [{ parentId: 'asc' }, { name: 'asc' }],
    });
    res.json(locations);
  } catch (error) {
    next(error);
  }
});

inventoryRouter.get('/locations/:id', async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      res.status(400).json({ error: 'location id must be a positive integer' });
      return;
    }

    const location = await prisma.location.findUnique({
      where: { id, active: true },
      include: {
        parent: true,
        children: { where: { active: true }, orderBy: { name: 'asc' } },
        inventory: {
          where: { quantity: { gt: 0 } },
          include: { part: { include: { category: true } } },
          orderBy: { part: { name: 'asc' } },
        },
      },
    });

    if (!location) {
      res.status(404).json({ error: 'location not found' });
      return;
    }

    res.json(location);
  } catch (error) {
    next(error);
  }
});

inventoryRouter.get('/parts', async (req, res, next) => {
  try {
    const search = typeof req.query.search === 'string' ? req.query.search.trim() : undefined;
    const parts = await prisma.part.findMany({
      where: {
        active: true,
        ...(search
          ? {
              OR: [
                { name: { contains: search, mode: 'insensitive' } },
                { sku: { contains: search, mode: 'insensitive' } },
                { manufacturerPartNumber: { contains: search, mode: 'insensitive' } },
                { aliases: { some: { alias: { contains: search, mode: 'insensitive' } } } },
              ],
            }
          : {}),
      },
      include: {
        category: true,
        homeLocation: true,
        inventory: { include: { location: true } },
        images: { where: { isPrimary: true }, take: 1 },
      },
      orderBy: { name: 'asc' },
    });

    res.json(
      parts.map((part) => ({
        ...part,
        totalQuantity: part.inventory.reduce((total, row) => total + Number(row.quantity), 0),
      })),
    );
  } catch (error) {
    next(error);
  }
});

inventoryRouter.get('/parts/:id', async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      res.status(400).json({ error: 'part id must be a positive integer' });
      return;
    }

    const part = await prisma.part.findUnique({
      where: { id, active: true },
      include: {
        category: true,
        homeLocation: true,
        aliases: { orderBy: { alias: 'asc' } },
        suppliers: { include: { supplier: true }, orderBy: { preferred: 'desc' } },
        images: { orderBy: [{ isPrimary: 'desc' }, { sortOrder: 'asc' }] },
        inventory: { include: { location: true }, orderBy: { location: { name: 'asc' } } },
        transactions: {
          include: { location: true, destination: true },
          orderBy: { createdAt: 'desc' },
          take: 12,
        },
      },
    });

    if (!part) {
      res.status(404).json({ error: 'part not found' });
      return;
    }

    res.json({
      ...part,
      totalQuantity: part.inventory.reduce((total, row) => total + Number(row.quantity), 0),
    });
  } catch (error) {
    next(error);
  }
});
