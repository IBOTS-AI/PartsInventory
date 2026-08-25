import express from 'express';
import cors from 'cors';
import 'dotenv/config';
import path from 'node:path';
import { errorHandler } from './error-handler.js';
import { healthRouter } from './routes/health.js';
import { inventoryRouter } from './routes/inventory.js';
import { inventoryMutationsRouter } from './routes/inventory-mutations.js';
import { partImagesRouter } from './routes/part-images.js';

const app = express();
const port = process.env.PORT ? Number(process.env.PORT) : 4000;

app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(path.resolve(process.cwd(), 'uploads')));

app.use('/api/health', healthRouter);
app.use('/api', inventoryRouter);
app.use('/api', inventoryMutationsRouter);
app.use('/api', partImagesRouter);

app.use(errorHandler);

app.listen(port, () => {
  console.log(`IBOTS Inventory API listening on port ${port}`);
});
