import { Router } from 'express';
import { execFile } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import multer from 'multer';
import { prisma } from '../prisma.js';
import { importProductFromUrl } from '../services/product-importer.js';

export const inventoryRouter = Router();
const databaseUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 200 * 1024 * 1024 },
  fileFilter: (_req, file, callback) => {
    callback(null, file.originalname.toLowerCase().endsWith('.db'));
  },
});

function normalizeTagCode(input: string) {
  return input.toUpperCase().replace(/[^A-Z0-9]/g, '');
}

function codeBaseFromName(name: string) {
  const normalized = normalizeTagCode(name);
  return (normalized || 'TAG').slice(0, 8);
}

async function generateUniqueTagCode(name: string, excludeTagId?: number) {
  const base = codeBaseFromName(name);
  let candidate = base;
  let suffix = 2;
  while (true) {
    const existing = await prisma.tag.findUnique({ where: { code: candidate } });
    if (!existing || (excludeTagId && existing.id === excludeTagId)) break;
    const suffixText = String(suffix);
    const stem = base.slice(0, Math.max(1, 8 - suffixText.length));
    candidate = `${stem}${suffixText}`;
    suffix += 1;
  }
  return candidate;
}

inventoryRouter.post('/parts/import-url', async (req, res, next) => {
  try {
    const url = req.body && typeof req.body.url === 'string' ? req.body.url : '';
    res.json(await importProductFromUrl(url));
  } catch (error) {
    if (error instanceof Error) (error as Error & { statusCode?: number }).statusCode = 422;
    next(error);
  }
});

inventoryRouter.get('/configuration', async (_req, res, next) => {
  try {
    const rawDatabaseUrl = process.env.DATABASE_URL || '';
    let database = null;
    if (rawDatabaseUrl) {
      if (rawDatabaseUrl.startsWith('file:')) {
        database = {
          provider: 'sqlite',
          path: rawDatabaseUrl.slice('file:'.length),
          display: rawDatabaseUrl,
        };
      } else {
        const databaseUrl = new URL(rawDatabaseUrl);
        database = {
          provider: databaseUrl.protocol.replace(':', ''),
          host: databaseUrl.hostname,
          port: databaseUrl.port,
          name: databaseUrl.pathname.slice(1),
          user: decodeURIComponent(databaseUrl.username),
          display: rawDatabaseUrl,
        };
      }
    }
    res.json({
      database,
      imageUploadDir: process.env.IMAGE_UPLOAD_DIR || './uploads',
      serverPort: Number(process.env.PORT) || 80,
    });
  } catch (error) {
    next(error);
  }
});

inventoryRouter.post('/maintenance/backup', async (_req, res, next) => {
  try {
    const repoRoot = path.resolve(process.cwd(), '..');
    await new Promise<void>((resolve, reject) => {
      execFile('node', [path.join(repoRoot, 'scripts/sqlite-backup.mjs')], { cwd: repoRoot }, (error, stdout, stderr) => {
        if (error) {
          reject(new Error(stderr || error.message));
          return;
        }
        const match = stdout.match(/Backup created: (.+)$/m);
        const backupPath = match?.[1]?.trim();
        if (!backupPath) {
          reject(new Error('backup path not found in script output'));
          return;
        }
        res.download(backupPath, path.basename(backupPath), (downloadError) => {
          if (downloadError) reject(downloadError);
          else resolve();
        });
      });
    });
  } catch (error) {
    next(error);
  }
});

inventoryRouter.post('/maintenance/restore', databaseUpload.single('database'), async (req, res, next) => {
  try {
    const repoRoot = path.resolve(process.cwd(), '..');
    const databasePath = path.join(repoRoot, 'prisma', 'ibots.db');
    if (req.file?.buffer?.length) {
      fs.writeFileSync(databasePath, req.file.buffer);
      res.json({ ok: true, restoredFrom: req.file.originalname });
      return;
    }
    await new Promise<void>((resolve, reject) => {
      execFile('node', [path.join(repoRoot, 'scripts/sqlite-restore.mjs')], { cwd: repoRoot }, (error, stdout, stderr) => {
        if (error) {
          reject(new Error(stderr || error.message));
          return;
        }
        res.json({ ok: true, output: stdout.trim() });
        resolve();
      });
    });
  } catch (error) {
    next(error);
  }
});

inventoryRouter.get('/suppliers', async (req, res, next) => {
  try {
    res.json(await prisma.supplier.findMany({
      where: req.query.includeInactive === 'true' ? undefined : { active: true },
      orderBy: { name: 'asc' },
    }));
  } catch (error) {
    next(error);
  }
});

inventoryRouter.get('/containers', async (req, res, next) => {
  try {
    res.json(await prisma.container.findMany({
      where: req.query.includeInactive === 'true' ? undefined : { active: true },
      orderBy: { name: 'asc' },
    }));
  } catch (error) {
    next(error);
  }
});

inventoryRouter.post('/containers', async (req, res, next) => {
  try {
    const name = typeof req.body?.name === 'string' ? req.body.name.trim() : '';
    if (!name) {
      res.status(400).json({ error: 'container name is required' });
      return;
    }
    const existing = await prisma.container.findFirst({ where: { name: { equals: name } } });
    if (existing) {
      res.status(409).json({ error: `A container named "${name}" already exists` });
      return;
    }
    res.status(201).json(await prisma.container.create({ data: { name } }));
  } catch (error) {
    next(error);
  }
});

inventoryRouter.put('/containers/:id', async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const name = typeof req.body?.name === 'string' ? req.body.name.trim() : '';
    if (!Number.isInteger(id) || id <= 0 || !name) {
      res.status(400).json({ error: 'container id and name are required' });
      return;
    }
    const existing = await prisma.container.findFirst({ where: { name: { equals: name }, NOT: { id } } });
    if (existing) {
      res.status(409).json({ error: `A container named "${name}" already exists` });
      return;
    }
    res.json(await prisma.container.update({ where: { id }, data: { name, active: req.body?.active !== false } }));
  } catch (error) {
    next(error);
  }
});

inventoryRouter.delete('/containers/:id', async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      res.status(400).json({ error: 'valid container id is required' });
      return;
    }
    const container = await prisma.container.findUnique({ where: { id } });
    if (!container) {
      res.status(404).json({ error: 'container not found' });
      return;
    }
    const result = await prisma.$transaction(async (tx) => {
      const updated = await tx.location.updateMany({
        where: { locationType: container.name },
        data: { locationType: 'other' },
      });
      await tx.container.delete({ where: { id } });
      return { updatedLocations: updated.count };
    });
    res.json({ deleted: true, ...result });
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

inventoryRouter.put('/suppliers/:id', async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const body = req.body as Record<string, unknown>;
    const name = typeof body.name === 'string' ? body.name.trim() : '';
    if (!Number.isInteger(id) || id <= 0 || !name) {
      res.status(400).json({ error: 'supplier id and name are required' });
      return;
    }
    const supplier = await prisma.supplier.update({
      where: { id },
      data: {
        name,
        website: typeof body.website === 'string' ? body.website.trim() || null : null,
        phone: typeof body.phone === 'string' ? body.phone.trim() || null : null,
        email: typeof body.email === 'string' ? body.email.trim() || null : null,
        notes: typeof body.notes === 'string' ? body.notes.trim() || null : null,
        active: body.active !== false,
      },
    });
    res.json(supplier);
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
        tags: { include: { tag: true } },
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
          tags: part.tags.map(({ tag }) => tag),
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
    const [parts, activeParts, locations, tags] = await Promise.all([
      prisma.part.findMany({ where: { active: true }, select: { minimumQuantity: true, inventory: { select: { quantity: true } } } }),
      prisma.part.count({ where: { active: true } }),
      prisma.location.count(),
      prisma.tag.count(),
    ]);
    const totals = parts.map((part) => ({
      onHand: part.inventory.reduce((total, row) => total + Number(row.quantity), 0),
      minimum: Number(part.minimumQuantity),
    }));
    res.json({
      activeParts,
      locations,
      tags,
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
      ...(type && ['ADD', 'REMOVE', 'ADJUST', 'TRANSFER', 'RESERVE', 'UNRESERVE'].includes(type) ? { type: type as 'ADD' | 'REMOVE' | 'ADJUST' | 'TRANSFER' | 'RESERVE' | 'UNRESERVE' } : {}),
    };
    const transactions = await prisma.inventoryTransaction.findMany({
      where,
      include: { part: { include: { tags: { include: { tag: true } } } }, location: true, destination: true },
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
        showTag: body.showTag !== false,
        showSku: body.showSku !== false,
        showManufacturerNumber: body.showManufacturerNumber !== false,
        showLocation: body.showLocation !== false,
        showContents: body.showContents !== false,
        showQrCode: body.showQrCode !== false,
        accentColor: typeof body.accentColor === 'string' ? body.accentColor : '#1d5d70',
        borderThickness: Number.isInteger(Number(body.borderThickness)) ? Math.max(4, Math.min(80, Number(body.borderThickness))) : 22,
      },
    });
    res.status(201).json(template);
  } catch (error) {
    next(error);
  }
});

inventoryRouter.get('/tags', async (_req, res, next) => {
  try {
    const tags = await prisma.tag.findMany({
      orderBy: { name: 'asc' },
    });
    res.json(tags);
  } catch (error) {
    next(error);
  }
});

inventoryRouter.post('/tags', async (req, res, next) => {
  try {
    const body = req.body as Record<string, unknown>;
    const name = typeof body.name === 'string' ? body.name.trim() : '';
    const requestedCode = typeof body.code === 'string' ? body.code.trim() : '';
    const color = typeof body.color === 'string' ? body.color.trim() : '';
    if (!name || !/^#[0-9a-f]{6}$/i.test(color)) {
      res.status(400).json({ error: 'name and a six-digit hex color are required' });
      return;
    }
    const code = requestedCode
      ? normalizeTagCode(requestedCode)
      : await generateUniqueTagCode(name);
    if (!code) {
      res.status(400).json({ error: 'short code can only contain letters and numbers' });
      return;
    }
    const tag = await prisma.tag.create({
      data: {
        name,
        code,
        color,
        description: typeof body.description === 'string' ? body.description.trim() : undefined,
      },
    });
    res.status(201).json(tag);
  } catch (error) {
    if (typeof error === 'object' && error && 'code' in error && (error as { code?: string }).code === 'P2002') {
      res.status(409).json({ error: 'Tag name or short code already exists' });
      return;
    }
    next(error);
  }
});

inventoryRouter.put('/tags/:id', async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const body = req.body as Record<string, unknown>;
    const name = typeof body.name === 'string' ? body.name.trim() : '';
    const requestedCode = typeof body.code === 'string' ? body.code.trim() : '';
    const color = typeof body.color === 'string' ? body.color.trim() : '';
    if (!Number.isInteger(id) || id <= 0 || !name || !/^#[0-9a-f]{6}$/i.test(color)) {
      res.status(400).json({ error: 'tag id, name, and a six-digit hex color are required' });
      return;
    }
    const code = requestedCode
      ? normalizeTagCode(requestedCode)
      : await generateUniqueTagCode(name, id);
    if (!code) {
      res.status(400).json({ error: 'short code can only contain letters and numbers' });
      return;
    }
    const tag = await prisma.tag.update({
      where: { id },
      data: {
        name,
        code,
        color,
        description: typeof body.description === 'string' ? body.description.trim() : null,
      },
    });
    res.json(tag);
  } catch (error) {
    if (typeof error === 'object' && error && 'code' in error && (error as { code?: string }).code === 'P2002') {
      res.status(409).json({ error: 'Tag name or short code already exists' });
      return;
    }
    next(error);
  }
});

inventoryRouter.get('/tags/:id/impact', async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      res.status(400).json({ error: 'tag id must be a positive integer' });
      return;
    }
    const tag = await prisma.tag.findUnique({
      where: { id },
      include: {
        parts: {
          include: {
            part: {
              select: { id: true, name: true, sku: true },
            },
          },
          orderBy: { part: { name: 'asc' } },
        },
      },
    });
    if (!tag) {
      res.status(404).json({ error: 'tag not found' });
      return;
    }
    const parts = tag.parts.map(({ part }) => part);
    res.json({
      id: tag.id,
      name: tag.name,
      code: tag.code,
      affectedCount: parts.length,
      parts,
    });
  } catch (error) {
    next(error);
  }
});

inventoryRouter.delete('/tags/:id', async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      res.status(400).json({ error: 'tag id must be a positive integer' });
      return;
    }
    const existing = await prisma.tag.findUnique({ where: { id } });
    if (!existing) {
      res.status(404).json({ error: 'tag not found' });
      return;
    }
    const deleted = await prisma.$transaction(async (tx) => {
      const unlinkResult = await tx.partTag.deleteMany({ where: { tagId: id } });
      await tx.tag.delete({ where: { id } });
      return unlinkResult.count;
    });
    res.json({ deleted: true, affectedParts: deleted });
  } catch (error) {
    next(error);
  }
});

inventoryRouter.post('/locations', async (req, res, next) => {
  try {
    const { name, code, locationType, parentId, description, color } = req.body as Record<string, unknown>;
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
        color: typeof color === 'string' && /^#[0-9a-f]{6}$/i.test(color.trim()) ? color.trim() : '#1d5d70',
      },
    });
    res.status(201).json(location);
  } catch (error) {
    next(error);
  }
});

inventoryRouter.put('/locations/:id', async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const { name, code, locationType, parentId, description, color, active } = req.body as Record<string, unknown>;
    const nextName = typeof name === 'string' ? name.trim() : '';
    const nextCode = typeof code === 'string' ? code.trim().toUpperCase() : '';
    const nextParentId = parentId === undefined || parentId === '' ? null : Number(parentId);
    if (!Number.isInteger(id) || id <= 0 || !nextName || !nextCode) {
      res.status(400).json({ error: 'location id, name, and code are required' });
      return;
    }
    if (nextParentId === id || (nextParentId !== null && (!Number.isInteger(nextParentId) || nextParentId <= 0))) {
      res.status(400).json({ error: 'location parent is invalid' });
      return;
    }
    if (nextParentId !== null) {
      const parent = await prisma.location.findUnique({ where: { id: nextParentId } });
      if (!parent) {
        res.status(400).json({ error: 'parent location not found' });
        return;
      }
    }
    const location = await prisma.location.update({
      where: { id },
      data: {
        name: nextName,
        code: nextCode,
        locationType: typeof locationType === 'string' ? locationType : 'other',
        parentId: nextParentId,
        description: typeof description === 'string' ? description.trim() : null,
        color: typeof color === 'string' && /^#[0-9a-f]{6}$/i.test(color.trim()) ? color.trim() : '#1d5d70',
      },
    });
    res.json(location);
  } catch (error) {
    next(error);
  }
});

inventoryRouter.get('/locations/:id/impact', async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      res.status(400).json({ error: 'valid location id is required' });
      return;
    }
    const location = await prisma.location.findUnique({
      where: { id },
      include: {
        children: { select: { id: true, name: true, code: true }, orderBy: { name: 'asc' } },
        inventory: { select: { part: { select: { id: true, name: true, sku: true } } }, where: { quantity: { gt: 0 } }, orderBy: { part: { name: 'asc' } } },
        homeForParts: { select: { id: true, name: true, sku: true }, orderBy: { name: 'asc' } },
      },
    });
    if (!location) {
      res.status(404).json({ error: 'location not found' });
      return;
    }
    res.json({
      id: location.id,
      name: location.name,
      code: location.code,
      childCount: location.children.length,
      children: location.children,
      inventoryCount: location.inventory.length,
      inventoryParts: location.inventory.map((row) => row.part),
      homePartCount: location.homeForParts.length,
      homeParts: location.homeForParts,
      affectedCount: location.children.length + location.inventory.length + location.homeForParts.length,
    });
  } catch (error) {
    next(error);
  }
});

inventoryRouter.delete('/locations/:id', async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      res.status(400).json({ error: 'valid location id is required' });
      return;
    }
    const [childrenCount, inventoryCount, homePartCount, transactionCount] = await Promise.all([
      prisma.location.count({ where: { parentId: id } }),
      prisma.inventory.count({ where: { locationId: id } }),
      prisma.part.count({ where: { homeLocationId: id } }),
      prisma.inventoryTransaction.count({ where: { OR: [{ locationId: id }, { destinationId: id }] } }),
    ]);
    if (childrenCount || inventoryCount || homePartCount || transactionCount) {
      res.status(409).json({
        error: 'location cannot be deleted while it has children, stock, home parts, or transaction history',
        impact: { childrenCount, inventoryCount, homePartCount, transactionCount },
      });
      return;
    }
    await prisma.location.delete({ where: { id } });
    res.json({ deleted: true });
  } catch (error) {
    next(error);
  }
});

inventoryRouter.post('/parts', async (req, res, next) => {
  try {
    const body = req.body as Record<string, unknown>;
    const name = typeof body.name === 'string' ? body.name.trim() : '';
    const sku = typeof body.sku === 'string' ? body.sku.trim().toUpperCase() : '';
    const tagIds = Array.isArray(body.tagIds)
      ? [...new Set(body.tagIds.map(Number).filter((tagId) => Number.isInteger(tagId) && tagId > 0))]
      : [];
    if (!name || !tagIds.length) {
      res.status(400).json({ error: 'name and at least one tag are required' });
      return;
    }
    const part = await prisma.part.create({
      data: {
        name,
        sku: sku || undefined,
        tags: { create: tagIds.map((tagId) => ({ tag: { connect: { id: tagId } } })) },
        description: typeof body.description === 'string' ? body.description.trim() : undefined,
        manufacturer: typeof body.manufacturer === 'string' ? body.manufacturer.trim() : undefined,
        manufacturerPartNumber: typeof body.manufacturerPartNumber === 'string' ? body.manufacturerPartNumber.trim() : undefined,
        sourceUrl: typeof body.sourceUrl === 'string' ? body.sourceUrl.trim() : undefined,
        weightGrams: body.weightGrams === undefined || body.weightGrams === '' ? undefined : Number(body.weightGrams),
        unitOfMeasure: typeof body.unitOfMeasure === 'string' ? body.unitOfMeasure.trim() || 'each' : 'each',
        minimumQuantity: body.minimumQuantity === undefined ? 0 : Number(body.minimumQuantity),
        reorderQuantity: body.reorderQuantity === undefined ? 0 : Number(body.reorderQuantity),
        suppliers: body.supplierId && Number(body.supplierId) > 0
          ? { create: { supplierId: Number(body.supplierId), productUrl: typeof body.productUrl === 'string' && body.productUrl.trim() ? body.productUrl.trim() : undefined, unitPrice: body.supplierPrice === undefined || body.supplierPrice === '' ? undefined : Number(body.supplierPrice), preferred: true } }
          : undefined,
        aliases: Array.isArray(body.aliases)
          ? { create: body.aliases.filter((alias): alias is string => typeof alias === 'string' && Boolean(alias.trim())).map((alias) => ({ alias: alias.trim() })) }
          : undefined,
      },
      include: { tags: { include: { tag: true } }, aliases: true, inventory: true },
    });
    res.status(201).json({ ...part, tags: part.tags.map(({ tag }) => tag), totalQuantity: 0 });
  } catch (error) {
    next(error);
  }
});

inventoryRouter.put('/parts/:id', async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const body = req.body as Record<string, unknown>;
    const name = typeof body.name === 'string' ? body.name.trim() : '';
    const tagIds = Array.isArray(body.tagIds)
      ? [...new Set(body.tagIds.map(Number).filter((tagId) => Number.isInteger(tagId) && tagId > 0))]
      : [];
    if (!Number.isInteger(id) || id <= 0 || !name || !tagIds.length) {
      res.status(400).json({ error: 'part id, name, and at least one tag are required' });
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
          description: typeof body.description === 'string' ? body.description.trim() : null,
          manufacturer: typeof body.manufacturer === 'string' ? body.manufacturer.trim() : null,
          manufacturerPartNumber: typeof body.manufacturerPartNumber === 'string' ? body.manufacturerPartNumber.trim() : null,
          manufacturerUrl: typeof body.manufacturerUrl === 'string' ? body.manufacturerUrl.trim() : null,
          sourceUrl: typeof body.sourceUrl === 'string' ? body.sourceUrl.trim() : null,
          weightGrams: body.weightGrams === undefined || body.weightGrams === '' ? null : Number(body.weightGrams),
          unitOfMeasure: typeof body.unitOfMeasure === 'string' ? body.unitOfMeasure.trim() || 'each' : 'each',
          minimumQuantity: Number(body.minimumQuantity) || 0,
          reorderQuantity: Number(body.reorderQuantity) || 0,
          homeLocationId: body.homeLocationId ? Number(body.homeLocationId) : null,
          active: body.active !== false,
        },
      });
      await tx.partTag.deleteMany({ where: { partId: id } });
      await tx.partTag.createMany({ data: tagIds.map((tagId) => ({ partId: id, tagId })) });
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

inventoryRouter.get('/parts/:id/impact', async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      res.status(400).json({ error: 'valid part id is required' });
      return;
    }
    const [part, inventoryCount, transactionCount, supplierCount, imageCount, aliasCount, tagCount] = await Promise.all([
      prisma.part.findUnique({ where: { id }, select: { id: true, name: true, sku: true, active: true } }),
      prisma.inventory.count({ where: { partId: id } }),
      prisma.inventoryTransaction.count({ where: { partId: id } }),
      prisma.partSupplier.count({ where: { partId: id } }),
      prisma.partImage.count({ where: { partId: id } }),
      prisma.partAlias.count({ where: { partId: id } }),
      prisma.partTag.count({ where: { partId: id } }),
    ]);
    if (!part) {
      res.status(404).json({ error: 'part not found' });
      return;
    }
    res.json({
      id: part.id,
      name: part.name,
      sku: part.sku,
      active: part.active,
      inventoryCount,
      transactionCount,
      supplierCount,
      imageCount,
      aliasCount,
      tagCount,
      affectedCount: inventoryCount + transactionCount + supplierCount + imageCount + aliasCount + tagCount,
    });
  } catch (error) {
    next(error);
  }
});

inventoryRouter.delete('/parts/:id', async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      res.status(400).json({ error: 'valid part id is required' });
      return;
    }
    const [inventoryCount, transactionCount] = await Promise.all([
      prisma.inventory.count({ where: { partId: id, quantity: { not: 0 } } }),
      prisma.inventoryTransaction.count({ where: { partId: id } }),
    ]);
    if (inventoryCount || transactionCount) {
      res.status(409).json({ error: 'part cannot be deleted while it has stock or transaction history; make it inactive instead', impact: { inventoryCount, transactionCount } });
      return;
    }
    await prisma.part.delete({ where: { id } });
    res.json({ deleted: true });
  } catch (error) {
    next(error);
  }
});

inventoryRouter.get('/locations', async (_req, res, next) => {
  try {
    const locations = await prisma.location.findMany({
      where: undefined,
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
      where: { id },
      include: {
        parent: true,
        children: { orderBy: { name: 'asc' } },
        inventory: {
          where: { quantity: { gt: 0 } },
          include: { part: { include: { tags: { include: { tag: true } } } } },
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
    const includeInactive = req.query.includeInactive === 'true';
    const supplierIdQuery = typeof req.query.supplierId === 'string' ? Number(req.query.supplierId) : undefined;
    const supplierId = supplierIdQuery && Number.isInteger(supplierIdQuery) && supplierIdQuery > 0 ? supplierIdQuery : undefined;
    const parts = await prisma.part.findMany({
      where: {
        ...(includeInactive ? {} : { active: true }),
        ...(supplierId ? { suppliers: { some: { supplierId } } } : {}),
        ...(search
          ? {
              OR: [
                { name: { contains: search, mode: 'insensitive' } },
                { sku: { contains: search, mode: 'insensitive' } },
                { manufacturerPartNumber: { contains: search, mode: 'insensitive' } },
                { aliases: { some: { alias: { contains: search, mode: 'insensitive' } } } },
                { tags: { some: { tag: { name: { contains: search, mode: 'insensitive' } } } } },
              ],
            }
          : {}),
      },
      include: {
        tags: { include: { tag: true } },
        homeLocation: true,
        inventory: { include: { location: true } },
        suppliers: {
          where: { preferred: true },
          include: { supplier: true },
          take: 1,
        },
        images: { where: { isPrimary: true }, take: 1 },
      },
      orderBy: { name: 'asc' },
    });

    res.json(
      parts.map((part) => ({
        ...part,
        tags: part.tags.map(({ tag }) => tag),
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
      where: { id },
      include: {
        tags: { include: { tag: true } },
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
      tags: part.tags.map(({ tag }) => tag),
      totalQuantity: part.inventory.reduce((total, row) => total + Number(row.quantity), 0),
    });
  } catch (error) {
    next(error);
  }
});
