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
const port = process.env.PORT ? Number(process.env.PORT) : 80;

app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(path.resolve(process.cwd(), 'uploads')));

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

app.listen(port, () => {
  console.log(`IBOTS Inventory API listening on port ${port}`);
});
