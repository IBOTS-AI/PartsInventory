import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { Router } from 'express';
import multer from 'multer';
import { prisma } from '../prisma.js';

const uploadDirectory = path.resolve(process.env.IMAGE_UPLOAD_DIR || path.resolve(process.cwd(), 'uploads'), 'parts');
fs.mkdirSync(uploadDirectory, { recursive: true });

const upload = multer({
  storage: multer.diskStorage({
    destination: uploadDirectory,
    filename: (_req, file, callback) => {
      callback(null, `${crypto.randomUUID()}${path.extname(file.originalname).toLowerCase()}`);
    },
  }),
  limits: { fileSize: 8 * 1024 * 1024 },
  fileFilter: (_req, file, callback) => {
    callback(null, ['image/jpeg', 'image/png', 'image/webp'].includes(file.mimetype));
  },
});

const maxRemoteImageBytes = 8 * 1024 * 1024;
const allowedImageTypes = new Set(['image/jpeg', 'image/png', 'image/webp']);

async function downloadImage(url: string) {
  let parsedUrl: URL;
  try {
    parsedUrl = new URL(url);
  } catch {
    throw new Error('image URL is invalid');
  }

  if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
    throw new Error('image URL must use HTTP or HTTPS');
  }
  if (['localhost', '127.0.0.1', '0.0.0.0', '[::1]'].includes(parsedUrl.hostname)) {
    throw new Error('image URL cannot point to the local server');
  }

  const response = await fetch(parsedUrl, { signal: AbortSignal.timeout(15000) });
  if (!response.ok) throw new Error(`image URL returned HTTP ${response.status}`);

  const contentType = response.headers.get('content-type')?.split(';')[0].toLowerCase() || '';
  if (!allowedImageTypes.has(contentType)) throw new Error('URL must point to a JPEG, PNG, or WebP image');

  const contentLength = Number(response.headers.get('content-length') || 0);
  if (contentLength > maxRemoteImageBytes) throw new Error('image must be 8 MB or smaller');

  const bytes = Buffer.from(await response.arrayBuffer());
  if (bytes.length > maxRemoteImageBytes) throw new Error('image must be 8 MB or smaller');

  const extension = contentType === 'image/jpeg' ? '.jpg' : contentType === 'image/png' ? '.png' : '.webp';
  const filename = `${crypto.randomUUID()}${extension}`;
  const filePath = path.join(uploadDirectory, filename);
  fs.writeFileSync(filePath, bytes, { flag: 'wx' });
  return { filename, filePath };
}

export const partImagesRouter = Router();

partImagesRouter.post('/parts/:id/images', upload.single('image'), async (req, res, next) => {
  try {
    const partId = Number(req.params.id);
    if (!Number.isInteger(partId) || partId <= 0 || !req.file) {
      res.status(400).json({ error: 'a valid part and image file are required' });
      return;
    }
    const part = await prisma.part.findUnique({ where: { id: partId, active: true } });
    if (!part) {
      fs.unlinkSync(req.file.path);
      res.status(404).json({ error: 'part not found' });
      return;
    }
    const image = await prisma.partImage.create({
      data: {
        partId,
        imageType: 'upload',
        localPath: `/uploads/parts/${req.file.filename}`,
        isPrimary: true,
      },
    });
    await prisma.partImage.updateMany({ where: { partId, id: { not: image.id } }, data: { isPrimary: false } });
    res.status(201).json(image);
  } catch (error) {
    if (req.file) fs.rmSync(req.file.path, { force: true });
    next(error);
  }
});

partImagesRouter.post('/parts/:id/images/from-url', async (req, res) => {
  let downloadedPath: string | undefined;
  try {
    const partId = Number(req.params.id);
    const url = typeof req.body?.url === 'string' ? req.body.url.trim() : '';
    if (!Number.isInteger(partId) || partId <= 0 || !url) {
      res.status(400).json({ error: 'a valid part and image URL are required' });
      return;
    }

    const part = await prisma.part.findUnique({ where: { id: partId, active: true } });
    if (!part) {
      res.status(404).json({ error: 'part not found' });
      return;
    }

    const downloaded = await downloadImage(url);
    downloadedPath = downloaded.filePath;
    const image = await prisma.partImage.create({
      data: { partId, imageType: 'download', localPath: `/uploads/parts/${downloaded.filename}`, isPrimary: true },
    });
    await prisma.partImage.updateMany({ where: { partId, id: { not: image.id } }, data: { isPrimary: false } });
    res.status(201).json(image);
  } catch (error) {
    if (downloadedPath) fs.rmSync(downloadedPath, { force: true });
    const message = error instanceof Error ? error.message : 'unable to download image';
    res.status(400).json({ error: message });
  }
});
