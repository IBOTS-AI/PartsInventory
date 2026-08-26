import express from 'express';
import cors from 'cors';
import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { errorHandler } from './error-handler.js';
import { healthRouter } from './routes/health.js';
import { inventoryRouter } from './routes/inventory.js';
import { inventoryMutationsRouter } from './routes/inventory-mutations.js';
import { partImagesRouter } from './routes/part-images.js';

const app = express();
const initialPort = process.env.PORT ? Number(process.env.PORT) : 4000;
const uploadBaseDir = path.resolve(process.env.IMAGE_UPLOAD_DIR || path.resolve(process.cwd(), 'uploads'));

app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(uploadBaseDir));

app.use('/api/health', healthRouter);
app.use('/api', inventoryRouter);
app.use('/api', inventoryMutationsRouter);
app.use('/api', partImagesRouter);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const clientDistCandidates = [
  path.resolve(process.cwd(), 'client', 'dist'),
  path.resolve(process.cwd(), 'dist'),
  path.resolve(__dirname, '../../client/dist'),
  path.resolve(__dirname, '../client/dist'),
];

const clientDist = clientDistCandidates.find((dir) => fs.existsSync(path.join(dir, 'index.html')));

if (clientDist) {
  console.log(`Serving static client files from: ${clientDist}`);
  app.use(express.static(clientDist));

  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api') || req.path.startsWith('/uploads')) {
      return next();
    }
    res.sendFile(path.join(clientDist, 'index.html'));
  });
}

app.use(errorHandler);

function listenOnPort(portToTry: number) {
  const server = app.listen(portToTry, () => {
    const address = server.address();
    const activePort = typeof address === 'object' && address && typeof address === 'object' ? address.port : portToTry;
    console.log(`IBOTS Inventory API listening on port ${activePort}`);
    if (typeof process.send === 'function') {
      process.send({ type: 'SERVER_STARTED', port: activePort });
    }
  });

  server.on('error', (err: any) => {
    if ((err.code === 'EADDRINUSE' || err.code === 'EACCES') && portToTry !== 80) {
      console.warn(`Port ${portToTry} unavailable (${err.code}). Trying fallback port 80...`);
      listenOnPort(80);
    } else if ((err.code === 'EADDRINUSE' || err.code === 'EACCES') && portToTry === 80) {
      console.warn(`Port 80 unavailable (${err.code}). Trying dynamic port 0...`);
      listenOnPort(0);
    } else {
      console.error('Server failed to start:', err);
    }
  });
}

listenOnPort(initialPort);
